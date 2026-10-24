import { Injectable, NotFoundException } from "@nestjs/common";
import { ContractKind, Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreateContractTemplateDto,
  RenderContractDto,
  UpdateContractTemplateDto,
} from "./dto/contract-template.dto";
import {
  DEFAULT_RENTAL_CONTRACT_HTML,
  DEFAULT_SALES_CONTRACT_HTML,
} from "./default-templates";

@Injectable()
export class ContractTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(tenantId: string, type?: ContractKind) {
    let templates = await this.prisma.contractTemplate.findMany({
      where: {
        tenantId,
        ...(type ? { type } : {}),
      },
      orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
    });

    // Eğer tenant için hiç şablon yoksa varsayılanları oluştur
    if (templates.length === 0) {
      await this.seedDefaults(tenantId);
      templates = await this.prisma.contractTemplate.findMany({
        where: {
          tenantId,
          ...(type ? { type } : {}),
        },
        orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
      });
    }

    return templates;
  }

  async findOne(tenantId: string, id: string) {
    const template = await this.prisma.contractTemplate.findFirst({
      where: { id, tenantId },
    });
    if (!template) {
      throw new NotFoundException("Sözleşme şablonu bulunamadı");
    }
    return template;
  }

  async create(tenantId: string, dto: CreateContractTemplateDto) {
    if (dto.isDefault) {
      await this.prisma.contractTemplate.updateMany({
        where: { tenantId, type: dto.type },
        data: { isDefault: false },
      });
    }

    return this.prisma.contractTemplate.create({
      data: {
        tenantId,
        type: dto.type,
        name: dto.name,
        content: dto.content,
        isDefault: dto.isDefault ?? false,
      },
    });
  }

  async update(tenantId: string, id: string, dto: UpdateContractTemplateDto) {
    const existing = await this.findOne(tenantId, id);

    if (dto.isDefault && dto.type) {
      await this.prisma.contractTemplate.updateMany({
        where: { tenantId, type: dto.type, id: { not: id } },
        data: { isDefault: false },
      });
    }

    return this.prisma.contractTemplate.update({
      where: { id: existing.id },
      data: {
        ...dto,
      },
    });
  }

  async remove(tenantId: string, id: string) {
    await this.findOne(tenantId, id);
    await this.prisma.contractTemplate.delete({ where: { id } });
    return { success: true };
  }

  async render(tenantId: string, companyId: string, dto: RenderContractDto): Promise<{ html: string; title: string }> {
    // 1. Şablonu Bul
    let template = dto.templateId
      ? await this.prisma.contractTemplate.findFirst({
          where: { id: dto.templateId, tenantId },
        })
      : await this.prisma.contractTemplate.findFirst({
          where: { tenantId, type: dto.contractType, isDefault: true },
        });

    let htmlTemplate = template?.content;
    if (!htmlTemplate) {
      htmlTemplate =
        dto.contractType === ContractKind.SALES
          ? DEFAULT_SALES_CONTRACT_HTML
          : DEFAULT_RENTAL_CONTRACT_HTML;
    }

    // 2. Firma Bilgilerini Getir
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
    });

    const fmtMoney = (val?: number | string | Prisma.Decimal | null) => {
      if (val === null || val === undefined) return "0,00 ₺";
      return (
        Number(val).toLocaleString("tr-TR", {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }) + " ₺"
      );
    };

    const fmtDate = (d?: Date | string | null) => {
      if (!d) return "—";
      return new Date(d).toLocaleDateString("tr-TR");
    };

    const replacements: Record<string, string> = {
      "{{firma_unvan}}": company?.name || "TURGUT AUTO FİLO ARAÇ KİRALAMA TİC. LTD. ŞTİ.",
      "{{firma_vergi_no}}": company?.taxNumber || "8700692728",
      "{{firma_vergi_dairesi}}": company?.taxOffice || "Güneşli",
      "{{firma_adres}}": company?.address || "İstoç Oto Ticaret Merkezi A1 Blok No:49-50 Bağcılar / İSTANBUL",
      "{{firma_telefon}}": company?.phone || "0212 659 34 21",
      "{{bugunun_tarihi}}": fmtDate(new Date()),
    };

    let title = "Sözleşme";

    // 3. Sözleşme Tipine Göre Değişkenleri Doldur
    if (dto.contractType === ContractKind.SALES) {
      const contract = await this.prisma.salesContract.findFirst({
        where: { id: dto.contractId, companyId },
        include: {
          installments: { orderBy: { sortOrder: "asc" } },
        },
      });

      if (!contract) {
        throw new NotFoundException("Satış sözleşmesi bulunamadı");
      }

      title = `Satış Sözleşmesi — ${contract.documentNo}`;

      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: contract.vehicleId },
      });

      const totalInst = contract.installments.reduce(
        (sum, inst) => sum + Number(inst.amount),
        0,
      );
      const grandTotal = Number(contract.grandTotal || contract.price);
      const downPayment = Math.max(0, grandTotal - totalInst);

      let installmentsHtml = "";
      if (contract.installments.length > 0) {
        installmentsHtml = `
          <table style="width: 100%; border-collapse: collapse; font-size: 11px; margin-top: 6px;">
            <thead>
              <tr style="background-color: #f3f4f6; border-bottom: 1px solid #000;">
                <th style="padding: 4px; text-align: left; border: 1px solid #d1d5db;">Taksit No</th>
                <th style="padding: 4px; text-align: left; border: 1px solid #d1d5db;">Vade Tarihi</th>
                <th style="padding: 4px; text-align: right; border: 1px solid #d1d5db;">Tutar</th>
                <th style="padding: 4px; text-align: left; border: 1px solid #d1d5db;">Ödeme Türü</th>
              </tr>
            </thead>
            <tbody>
              ${contract.installments
                .map(
                  (inst, i) => `
                <tr style="border-bottom: 1px solid #e5e7eb;">
                  <td style="padding: 4px; border: 1px solid #d1d5db;">${i + 1}. Taksit</td>
                  <td style="padding: 4px; border: 1px solid #d1d5db;">${fmtDate(inst.date)}</td>
                  <td style="padding: 4px; text-align: right; font-weight: bold; border: 1px solid #d1d5db;">${fmtMoney(inst.amount)}</td>
                  <td style="padding: 4px; border: 1px solid #d1d5db;">${inst.type || "SENET / HAVALE"}</td>
                </tr>
              `,
                )
                .join("")}
            </tbody>
          </table>
        `;
      } else {
        installmentsHtml = `<p style="font-size: 11px; font-style: italic; color: #4b5563; margin-top: 4px;">Peşin satış (Taksit planı bulunmuyor).</p>`;
      }

      Object.assign(replacements, {
        "{{sozlesme_no}}": contract.documentNo || "—",
        "{{sozlesme_tarihi}}": fmtDate(contract.contractDate),
        "{{gecerlilik_tarihi}}": fmtDate(contract.validUntil) || fmtDate(contract.contractDate),
        "{{musteri_adi}}": contract.customerName || "—",
        "{{musteri_tc_vkn}}": contract.customerTaxNumber || contract.customerIdentityNumber || "—",
        "{{musteri_adres}}": [contract.customerAddress, contract.customerDistrict, contract.customerCity].filter(Boolean).join(" / ") || "—",
        "{{musteri_telefon}}": contract.customerPhone || "—",
        "{{plaka}}": vehicle?.plate || "—",
        "{{marka_model}}": [vehicle?.brandName, vehicle?.modelName].filter(Boolean).join(" ") || "—",
        "{{yil}}": vehicle?.year ? String(vehicle.year) : "—",
        "{{sasi_no}}": vehicle?.chassisNo || "—",
        "{{motor_no}}": vehicle?.engineNo || "—",
        "{{renk}}": vehicle?.colorName || "—",
        "{{toplam_tutar}}": fmtMoney(grandTotal),
        "{{alinan_pesinat}}": fmtMoney(downPayment),
        "{{kalan_bakiye}}": fmtMoney(totalInst),
        "{{odeme_tablosu}}": installmentsHtml,
      });
    } else {
      // RENTAL
      const contract = await this.prisma.rentalContract.findFirst({
        where: { id: dto.contractId, companyId },
      });

      if (!contract) {
        throw new NotFoundException("Kira sözleşmesi bulunamadı");
      }

      title = `Kira Sözleşmesi — ${contract.documentNo || contract.customerName}`;

      const vehicle = await this.prisma.vehicle.findUnique({
        where: { id: contract.vehicleId },
      });

      const drivers = Array.isArray(contract.drivers)
        ? (contract.drivers as string[]).join(", ")
        : "—";

      Object.assign(replacements, {
        "{{sozlesme_no}}": contract.documentNo || "—",
        "{{sozlesme_tarihi}}": fmtDate(contract.contractDate),
        "{{musteri_adi}}": contract.customerName || "—",
        "{{musteri_tc_vkn}}": contract.customerTcTaxNo || "—",
        "{{musteri_adres}}": contract.customerAddress || "—",
        "{{musteri_telefon}}": contract.customerPhone || "—",
        "{{plaka}}": vehicle?.plate || "—",
        "{{marka_model}}": [vehicle?.brandName, vehicle?.modelName].filter(Boolean).join(" ") || "—",
        "{{yil}}": vehicle?.year ? String(vehicle.year) : "—",
        "{{sasi_no}}": vehicle?.chassisNo || "—",
        "{{motor_no}}": vehicle?.engineNo || "—",
        "{{renk}}": vehicle?.colorName || "—",
        "{{kira_suresi_ay}}": String(contract.durationMonths || 12),
        "{{km_limiti}}": Number(contract.kmLimit || 0).toLocaleString("tr-TR"),
        "{{tutar}}": fmtMoney(contract.monthlyPrice),
        "{{suruculer}}": drivers || "Belirtilmemiş",
      });
    }

    // 4. Placeholder Değiştirme
    let renderedHtml = htmlTemplate;
    for (const [key, val] of Object.entries(replacements)) {
      renderedHtml = renderedHtml.split(key).join(val);
    }

    return { html: renderedHtml, title };
  }

  private async seedDefaults(tenantId: string) {
    await this.prisma.contractTemplate.createMany({
      data: [
        {
          tenantId,
          type: ContractKind.SALES,
          name: "Standart Araç Satış & Kapora Sözleşmesi",
          content: DEFAULT_SALES_CONTRACT_HTML,
          isDefault: true,
        },
        {
          tenantId,
          type: ContractKind.RENTAL,
          name: "Uzun Dönem Araç Kiralama Sözleşmesi",
          content: DEFAULT_RENTAL_CONTRACT_HTML,
          isDefault: true,
        },
      ],
    });
  }
}
