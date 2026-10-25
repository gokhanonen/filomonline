import { ContractKind } from "@prisma/client";

/**
 * Yapılandırılmış sözleşme şablonu (ContractTemplate.content içinde JSON).
 * Görünüm sabittir (Turgut Auto örnek sözleşmeleri: gri başlık şeritleri, çerçeveli tablolar);
 * kullanıcı başlığı, bölümleri, özet cümlelerini ve "Diğer Bilgi ve Şartlar" maddelerini düzenler.
 * Metinlerde {{degisken}} yer tutucuları kullanılabilir (bkz. LAYOUT_VARIABLES).
 */
export interface ContractLayout {
  kind: "layout";
  version: 1;
  title: string;
  accentColor: string; // başlık şeritleri
  showLogo: boolean;
  showCurrencyColumns: boolean; // USD / EURO kolonları
  installmentRows: number; // taksit tablosunda en az kaç satır
  blankRowTypes: string[]; // boş taksit satırlarında basılı ödeme türleri
  showPaymentNotes: boolean;
  showWitness: boolean;
  usagePurpose: string; // ruhsat "kullanım amacı" varsayılanı
  jurisdiction: string; // {{yetkili_mahkeme}}
  summaryLines: string[];
  clauses: string[];
}

export const isLayout = (content: string | null | undefined): boolean => {
  if (!content || !content.trimStart().startsWith("{")) return false;
  try {
    return (JSON.parse(content) as ContractLayout).kind === "layout";
  } catch {
    return false;
  }
};

const BLANK = "........................";
const SHARED_DELIVERY =
  "Aracın satıcı tarafından alıcıya teslim tarihi {{teslim_tarihi}} olarak kararlaştırılmıştır.\nAyrıca aracın noter huzurunda yapılacak satış tarihine kadar kullanılmasından doğan mesuliyetleri ve her türlü idari/adli/vergisel cezai mesuliyet ve mükellefiyetleri satıcıya, teslim tarihinden sonraki mesuliyet ve mükellefiyetler ise alıcıya aittir.";
const SHARED_TRANSFER =
  "Araç ruhsat devir tarihi ile teslim tarihi arasında fark olması durumunda, teslim tarihi ile devir tarihi arasında araçta meydana gelecek her türlü zarardan Alıcı sorumludur.";
const SHARED_JURISDICTION =
  "İşbu sözleşmeden doğan ihtilaflarda {{yetkili_mahkeme}} Mahkemeleri ve İcra Daireleri yetkilidir. Ayrıca bu sözleşme {{sozlesme_tarihi}} tarihinde 1 sayfa olarak 2 nüsha halinde imzalanmış taraflar teslim almıştır.";

const base = (title: string, summaryLines: string[], clauses: string[], extra: Partial<ContractLayout> = {}): ContractLayout => ({
  kind: "layout",
  version: 1,
  title,
  accentColor: "#6b6b6b",
  showLogo: true,
  showCurrencyColumns: true,
  installmentRows: 6,
  blankRowTypes: ["HAVALE", "SENET", "SENET", "SENET", "ÇEK", "SENET"],
  showPaymentNotes: true,
  showWitness: true,
  usagePurpose: "Hususi",
  jurisdiction: "Bakırköy",
  summaryLines,
  clauses,
  ...extra,
});

export const DEFAULT_LAYOUTS: Record<ContractKind, ContractLayout> = {
  SALES: base(
    "ARAÇ SATIŞ SÖZLEŞMESİ",
    [
      "{{plaka}} PLAKALI {{marka_model}} ARAÇ {{toplam_tutar}} BEDEL İLE SATILMIŞTIR.",
      "{{pesin_odeme}} PEŞİN ÖDENMİŞ OLUP, KALAN {{kalan_bakiye}} YUKARIDAKİ ŞEKİLDE TAKSİTLENDİRİLMİŞTİR",
    ],
    [
      SHARED_DELIVERY,
      "Araç halihazır durumuyla satın alınmış olup, Alıcı aracı görerek ve her türlü incelemesini yaparak satın almıştır. Alıcı, aracı satın almadan önce ekspertiz yaptırmak zorundadır. Eksper yapılmadan aracın satın alınması halinde Satıcı, varsa gizli ayıp vb sorumlu değildir.",
      SHARED_TRANSFER,
      "Sözleşmenin imzalanmasından sonra Alıcı'nın Sözleşmeden cayması durumunda {{cezai_sart}} cezai şartı Satıcı'ya başkaca hiçbir ihtara gerek olmaksızın ödemeyi kabul, beyan ve taahhüt eder.",
      "Satıcı, Sözleşmenin imzalanmasından sonra sözleşmeden dönmesi durumunda aldığı tüm tutarları Alıcı'ya geri ödemeyi kabul, beyan ve taahhüt eder.",
      "Alıcı satın aldığı işbu vasıtayı görüp, beğenip, eksiksiz olarak teslim almıştır.",
      SHARED_JURISDICTION,
    ],
  ),
  PURCHASE: base(
    "ARAÇ ALIŞ SÖZLEŞMESİ",
    [
      "{{plaka}} PLAKALI {{marka_model}} ARAÇ {{toplam_tutar}} BEDEL İLE SATIN ALINMIŞTIR.",
      "{{pesin_odeme}} PEŞİN ÖDENMİŞ OLUP, KALAN {{kalan_bakiye}} YUKARIDAKİ ŞEKİLDE ÖDENECEKTİR.",
    ],
    [
      SHARED_DELIVERY,
      "Satıcı, Sözleşmeye konu aracın ilandaki özelliklere haiz olduğunu, satıştan önce Ekspertiz yapıldığında, ilandaki özelliklerden farklı arıza ve sorunların tespit edilmesi halinde Ekspertiz ücretinin kendisinin ödeyeceğini kabul, beyan ve taahhüt eder.",
      "Satıcı, Ekspertiz yapılsa dahi araçta mevcut gizli ayıplardan satış sonrası da hiçbir hak düşürücü süreye bağlı olmaksızın maddi olarak tam sorumlu olduğunu kabul, beyan ve taahhüt eder.",
      SHARED_TRANSFER,
      "Satıcı, Sözleşmenin imzalanmasından sonra sözleşmeden dönmesi durumunda aldığı tüm tutarları Alıcı'ya geri ödemeyi, bununla beraber {{cezai_sart}} cezai şart ödemeyi kabul, beyan ve taahhüt eder.",
      "Alıcı satın aldığı işbu vasıtayı görüp, beğenip, eksiksiz olarak teslim almıştır.",
      SHARED_JURISDICTION,
    ],
    { blankRowTypes: ["BANKA HAVALE", "BANKA HAVALE", "NAKİT", "KREDİ KARTI", "ÇEK", "SENET"] },
  ),
  RENTAL: base(
    "ARAÇ KİRALAMA SÖZLEŞMESİ",
    ["{{plaka}} PLAKALI {{marka_model}} ARAÇ {{kira_suresi_ay}} AY SÜREYLE AYLIK {{tutar}} + KDV BEDEL İLE KİRALANMIŞTIR."],
    [
      "Kira süresi {{baslangic_tarihi}} tarihinde başlar ve {{kira_suresi_ay}} ay sürer. Aylık azami kullanım {{km_limiti}} km olup aşım halinde km başına aşım bedeli uygulanır.",
      "Aylık kira bedeli fatura tebliğinden itibaren en geç 3 (üç) iş günü içinde Kiraya Veren'in bildirdiği banka hesabına ödenir. Gecikmelerde yasal gecikme faizi uygulanır.",
      "Araç yalnızca sözleşmede belirtilen yetkili sürücüler tarafından kullanılabilir: {{suruculer}}.",
      "Kiracı, aracı teslim aldığı şekilde özenle kullanmak, periyodik bakımlarını Kiraya Veren'in yönlendirdiği servislerde yaptırmakla yükümlüdür.",
      "Kira süresi boyunca doğan trafik, otoyol, köprü ve otopark cezaları ile kullanım kaynaklı tüm idari para cezaları Kiracı'ya aittir.",
      "Kiracı'nın sözleşmeyi süresinden önce sona erdirmesi halinde {{cezai_sart}} cezai şartı ödemeyi kabul, beyan ve taahhüt eder.",
      "İşbu sözleşmeden doğan ihtilaflarda {{yetkili_mahkeme}} Mahkemeleri ve İcra Daireleri yetkilidir. Bu sözleşme {{sozlesme_tarihi}} tarihinde 2 nüsha halinde imzalanmıştır.",
    ],
    { showCurrencyColumns: false },
  ),
};

/** Düzenleyicide gösterilen yer tutucular */
export const LAYOUT_VARIABLES: { tag: string; desc: string; types?: ContractKind[] }[] = [
  { tag: "{{plaka}}", desc: "Plaka" },
  { tag: "{{marka_model}}", desc: "Marka model" },
  { tag: "{{sozlesme_tarihi}}", desc: "Sözleşme tarihi" },
  { tag: "{{teslim_tarihi}}", desc: "Teslim tarihi", types: ["SALES", "PURCHASE"] },
  { tag: "{{toplam_tutar}}", desc: "Toplam bedel", types: ["SALES", "PURCHASE"] },
  { tag: "{{pesin_odeme}}", desc: "Peşin ödeme", types: ["SALES", "PURCHASE"] },
  { tag: "{{kalan_bakiye}}", desc: "Kalan bakiye", types: ["SALES", "PURCHASE"] },
  { tag: "{{cezai_sart}}", desc: "Cezai şart tutarı" },
  { tag: "{{satici_unvan}}", desc: "Satıcı / kiraya veren" },
  { tag: "{{alici_unvan}}", desc: "Alıcı / kiracı" },
  { tag: "{{yetkili_mahkeme}}", desc: "Yetkili mahkeme" },
  { tag: "{{baslangic_tarihi}}", desc: "Kira başlangıcı", types: ["RENTAL"] },
  { tag: "{{kira_suresi_ay}}", desc: "Kira süresi (ay)", types: ["RENTAL"] },
  { tag: "{{km_limiti}}", desc: "Aylık KM limiti", types: ["RENTAL"] },
  { tag: "{{tutar}}", desc: "Aylık kira", types: ["RENTAL"] },
  { tag: "{{suruculer}}", desc: "Yetkili sürücüler", types: ["RENTAL"] },
];

// ---------------------------------------------------------------------------
// Bağlam ve render
// ---------------------------------------------------------------------------

export interface ContractParty {
  title: string;
  address?: string | null;
  phone?: string | null;
  district?: string | null;
  city?: string | null;
  taxOffice?: string | null;
  taxNo?: string | null;
  mersisNo?: string | null;
  tradeRegistryNo?: string | null;
}

export interface ContractContext {
  printDate: string;
  company: ContractParty & { email?: string | null; website?: string | null; logoUrl?: string | null };
  seller: ContractParty;
  buyer: ContractParty;
  vehicle: { plate: string; engineNo: string; brand: string; chassisNo: string; model: string; fuel: string; color: string };
  /** Satış / alış */
  money?: { total: number; downPayment: number; remaining: number; usd?: number; eur?: number; installments: { date: string; amount: number; type: string }[] };
  /** Kira */
  rental?: { startDate: string; months: number; kmLimit: number; monthly: number; drivers: string };
  paymentNotes?: string | null;
  vars: Record<string, string>;
}

export const fmtTl = (n?: number | null) =>
  `${Number(n ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} TL`;
export const fmtNum = (n?: number | null) => Number(n ?? 0).toLocaleString("tr-TR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
export const fmtDay = (d?: Date | string | null) => (d ? new Date(d).toLocaleDateString("tr-TR") : "");
export const penaltyText = (n?: number | null) => (n ? fmtTl(n) : BLANK);

const esc = (s: unknown) =>
  String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

/** Kullanıcı metni: önce kaçış, sonra yer tutucu, satır sonu → <br> */
const fill = (text: string, vars: Record<string, string>) =>
  esc(text)
    .replace(/\{\{\s*([a-z_]+)\s*\}\}/g, (_, k: string) => esc(vars[k] ?? BLANK))
    .replace(/\n/g, "<br>");

const PARTY_LABELS: Record<ContractKind, { seller: string; buyer: string; terms: string; price: string; signatures: [string, string] }> = {
  SALES: { seller: "SATICI", buyer: "ALICI", terms: "ARAÇ SATIŞ BİLGİ VE ŞARTLARI", price: "SATIŞ BEDELİ", signatures: ["SATICI", "ALICI"] },
  PURCHASE: { seller: "SATICI", buyer: "ALICI", terms: "ARAÇ ALIŞ BİLGİ VE ŞARTLARI", price: "SATIŞ BEDELİ", signatures: ["ALICI (Biz)", "SATICI"] },
  RENTAL: { seller: "KİRAYA VEREN", buyer: "KİRACI", terms: "ARAÇ KİRALAMA BİLGİ VE ŞARTLARI", price: "AYLIK KİRA BEDELİ", signatures: ["KİRAYA VEREN", "KİRACI"] },
};

export function renderLayout(type: ContractKind, layout: ContractLayout, ctx: ContractContext): string {
  const L = PARTY_LABELS[type];
  const c = ctx.company;
  const vars = { ...ctx.vars, yetkili_mahkeme: layout.jurisdiction || ctx.vars.yetkili_mahkeme || "" };
  const bar = (text: string, right?: string) =>
    `<tr><td colspan="${right ? 3 : 4}" class="bar">${esc(text)}</td>${right ? `<td class="bar right">${esc(right)}</td>` : ""}</tr>`;
  const row = (label: string, value: string, label2?: string, value2?: string) =>
    label2 !== undefined
      ? `<tr><th>${esc(label)}</th><td>${value}</td><th>${esc(label2)}</th><td>${value2 ?? ""}</td></tr>`
      : `<tr><th>${esc(label)}</th><td colspan="3">${value}</td></tr>`;

  const party = (title: string, p: ContractParty, right?: string) =>
    [
      bar(`${title} BİLGİLERİ`, right),
      row(`${title} ÜNVANI`, esc(p.title)),
      row(`${title} ADRESİ`, esc(p.address ?? "")),
      row("TELEFON", esc(p.phone ?? ""), p.mersisNo || p.tradeRegistryNo ? "MERSİS / TİC. SİCİL" : p.district || p.city ? "İLÇE / İL" : "",
        esc(p.mersisNo || p.tradeRegistryNo ? [p.mersisNo, p.tradeRegistryNo].filter(Boolean).join(" · ") : [p.district, p.city].filter(Boolean).join(" / "))),
      row("VERGİ DAİRESİ - NO", esc([p.taxOffice && `Vergi Dairesi: ${p.taxOffice}`, p.taxNo && `${p.taxNo.length === 11 ? "TCKN" : "Vergi No"}: ${p.taxNo}`].filter(Boolean).join("   "))),
    ].join("");

  const v = ctx.vehicle;
  const vehicleRows = [
    bar("ARAÇ RUHSAT BİLGİLERİ"),
    row("PLAKA", esc(v.plate), "MOTOR NO", esc(v.engineNo)),
    row("MARKASI", esc(v.brand), "ŞASE NO", esc(v.chassisNo)),
    row("TİPİ - TİCARİ ADI", esc(v.model), "YAKIT CİNSİ", esc(v.fuel)),
    row("RENGİ", esc(v.color), "KULLANIM AMACI", esc(layout.usagePurpose)),
  ].join("");

  let termsRows = "";
  if (type === "RENTAL" && ctx.rental) {
    const r = ctx.rental;
    termsRows = [
      bar(L.terms),
      row("BAŞLANGIÇ TARİHİ", esc(r.startDate), "KİRA SÜRESİ", esc(`${r.months} AY`)),
      row(L.price, `<b class="money">${esc(fmtTl(r.monthly))}</b> + KDV`, "AYLIK KM LİMİTİ", esc(`${r.kmLimit.toLocaleString("tr-TR")} KM`)),
      row("YETKİLİ SÜRÜCÜLER", esc(r.drivers)),
    ].join("");
  } else if (ctx.money) {
    const m = ctx.money;
    const rows = Math.max(layout.installmentRows, m.installments.length);
    const instRows = Array.from({ length: rows }, (_, i) => {
      const it = m.installments[i];
      return `<tr><td>${i + 1}. TAKSİT TARİHİ</td><td>${esc(it?.date ?? "")}</td><td>TUTARI</td><td class="r">${it ? esc(fmtTl(it.amount)) : ""}</td><td>${esc(it?.type ?? layout.blankRowTypes[i] ?? "")}</td></tr>`;
    }).join("");
    const instTotal = m.installments.reduce((s, x) => s + x.amount, 0);
    const currency = layout.showCurrencyColumns
      ? `<td class="r">${esc(fmtNum(m.usd))} USD</td><td class="r">${esc(fmtNum(m.eur))} EURO</td>`
      : `<td colspan="2"></td>`;
    termsRows =
      bar(L.terms) +
      `<tr><td colspan="4" class="nested"><table class="inst">
        <tr><th class="lbl">${esc(L.price)}</th><td class="money r">${esc(fmtTl(m.total))}</td><td>T.L.</td>${currency}</tr>
        <tr><th class="lbl">PEŞİN ÖDEME</th><td class="money r">${esc(fmtTl(m.downPayment))}</td><td>KALAN BAKİYE</td><td class="r" colspan="2">${esc(fmtTl(m.remaining))}</td></tr>
      </table></td></tr>` +
      `<tr><td colspan="4" class="nested"><table class="inst">
        <tr><th class="side" rowspan="${rows + 2}">TAKSİT<br>BİLGİLERİ</th><td colspan="4"></td><th>ÖDEME TÜRÜ</th></tr>
        ${instRows}
        <tr><td></td><td class="b">TOPLAM</td><td class="r b">${esc(fmtTl(instTotal))}</td><td colspan="2"></td></tr>
      </table></td></tr>`;
  }

  const summary = layout.summaryLines
    .filter((s) => s.trim())
    .map((s) => `<tr><td colspan="4" class="summary">${fill(s, vars)}</td></tr>`)
    .join("");
  const notes = layout.showPaymentNotes
    ? `<tr><td colspan="4" class="summary">ÖDEMEYE EK NOTLAR : ${esc(ctx.paymentNotes ?? "").replace(/\n/g, "<br>")}</td></tr>`
    : "";
  const clauses = layout.clauses
    .filter((s) => s.trim())
    .map((s, i) => `<tr><td class="no">${i + 1}</td><td>${fill(s, vars)}</td></tr>`)
    .join("");
  const [sigA, sigB] = L.signatures;
  const [nameA, nameB] = type === "PURCHASE" ? [ctx.buyer.title, ctx.seller.title] : [ctx.seller.title, ctx.buyer.title];
  const sigCols = layout.showWitness ? 3 : 2;

  return `<!doctype html><html lang="tr"><head><meta charset="utf-8"><title>${esc(layout.title)}</title>
<style>
  @page { size: A4; margin: 10mm; }
  * { box-sizing: border-box; }
  body { margin: 0; font-family: "Times New Roman", Times, serif; font-size: 10.5px; color: #111; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .page { max-width: 190mm; margin: 0 auto; padding: 6mm 0; }
  .head { display: flex; align-items: center; gap: 18px; border-bottom: 1px solid #999; padding-bottom: 8px; margin-bottom: 10px; }
  .logo { height: 54px; max-width: 170px; object-fit: contain; }
  .logo-box { background: #111; color: #fff; font: 600 22px/54px Arial, sans-serif; letter-spacing: 2px; padding: 0 14px; white-space: nowrap; }
  .co-name { font-size: 15px; font-weight: bold; }
  .co-line { font-size: 10.5px; margin-top: 3px; }
  table { width: 100%; border-collapse: collapse; }
  .doc td, .doc th { border: 1px solid #444; padding: 3px 5px; vertical-align: top; text-align: left; }
  .doc th { font-weight: bold; width: 21%; white-space: nowrap; }
  .doc .title { background: ${esc(layout.accentColor)}; color: #fff; text-align: center; font-weight: bold; font-size: 12px; padding: 5px; border: 1px solid #444; }
  .bar { background: ${esc(layout.accentColor)}; color: #fff; font-weight: bold; text-transform: uppercase; }
  .bar.right { text-align: right; background: #fff; color: #111; }
  .money { color: #c00; font-weight: bold; }
  .r { text-align: right; } .b { font-weight: bold; }
  .nested { padding: 0 !important; }
  .inst td, .inst th { border: 1px solid #444; padding: 2px 5px; }
  .inst .side { background: #e6e6e6; width: 13%; text-align: center; vertical-align: middle; }
  .inst .lbl { width: 21%; text-align: left; }
  .summary { font-weight: bold; }
  .inst .no { width: 3%; text-align: center; font-weight: bold; vertical-align: top; }
  .sig { table-layout: fixed; }
  .sig td, .sig th { border: 1px solid #444; text-align: center; }
  .doc .bar { text-align: left; }
  .doc .bar.right { text-align: right; }
  .sig th { background: ${esc(layout.accentColor)}; color: #fff; padding: 4px; }
  .sig td { height: 80px; vertical-align: middle; }
  @media print { .page { padding: 0; } }
</style></head><body><div class="page">
  <div class="head">
    ${layout.showLogo ? (c.logoUrl ? `<img class="logo" src="${esc(c.logoUrl)}" alt="">` : `<div class="logo-box">${esc((c.title.split(" ")[0] ?? "").toUpperCase())}</div>`) : ""}
    <div>
      <div class="co-name">${esc(c.title)}</div>
      ${c.address ? `<div class="co-line">${esc(c.address)}</div>` : ""}
      <div class="co-line">${esc([c.website, c.email, c.phone].filter(Boolean).join("   "))}</div>
    </div>
  </div>
  <table class="doc">
    <tr><td colspan="4" class="title">${esc(layout.title)}</td></tr>
    ${party(L.seller, ctx.seller, ctx.printDate)}
    ${party(L.buyer, ctx.buyer)}
    ${vehicleRows}
    ${termsRows}
    ${summary}
    ${notes}
    ${clauses ? bar("DİĞER BİLGİ VE ŞARTLAR") + `<tr><td colspan="4" class="nested"><table class="inst">${clauses}</table></td></tr>` : ""}
  </table>
  <table class="sig" style="margin-top:10px">
    <tr><th>${esc(sigA)}</th><th>${esc(sigB)}</th>${sigCols === 3 ? "<th>ŞAHİT</th>" : ""}</tr>
    <tr><td>${esc(nameA)}</td><td>${esc(nameB)}</td>${sigCols === 3 ? "<td></td>" : ""}</tr>
  </table>
</div></body></html>`;
}

/** Önizleme için örnek bağlam (kullanıcının gönderdiği örnek satış sözleşmesi) */
export function sampleContext(type: ContractKind, company: ContractContext["company"]): ContractContext {
  const customer: ContractParty = {
    title: type === "PURCHASE" ? "Cabir Oto İnşaat San.ve Tic.A.Ş." : "Dr Oto Kiralama ve İnş.San.Tic.Ltd.Şti.",
    address: type === "PURCHASE" ? "Yenibosna Merkez Mah. Değirmenbahçe Cad. A1 A1A - A1B No:17" : "Göztepe Mah. İstoç 2. Cadde A - 4 Blok No:1 / 2 C",
    district: "Bağcılar",
    city: "İstanbul",
    taxNo: type === "PURCHASE" ? "1960755713" : "3130560834",
  };
  const installments = [
    { date: "12.06.2026", amount: 887500, type: "HAVALE" },
    { date: "26.06.2026", amount: 887500, type: "SENET" },
    { date: "10.07.2026", amount: 887500, type: "SENET" },
    { date: "24.07.2026", amount: 887500, type: "SENET" },
  ];
  const sellerIsCompany = type !== "PURCHASE";
  return {
    printDate: fmtDay(new Date()),
    company,
    seller: sellerIsCompany ? company : customer,
    buyer: sellerIsCompany ? customer : company,
    vehicle: { plate: "34NHE601", engineNo: "EAN613257", brand: "Skoda", chassisNo: "TMBAW8NZ5SC050810", model: "Superb", fuel: "Benzin", color: "Gri" },
    money: type === "RENTAL" ? undefined : { total: 3550000, downPayment: 0, remaining: 3550000, installments },
    rental: type === "RENTAL" ? { startDate: "11.06.2026", months: 24, kmLimit: 3000, monthly: 85000, drivers: "Ahmet Yılmaz, Mehmet Kaya" } : undefined,
    paymentNotes: "Plaka: 34NHE601 · Şase No: TMBAW8NZ5SC050810 · Yıl: 2025 · Kilometre: 10.000 km",
    vars: {
      plaka: "34NHE601",
      marka_model: "Skoda Superb",
      sozlesme_tarihi: "11.06.2026",
      teslim_tarihi: "11.06.2026",
      toplam_tutar: fmtTl(3550000),
      pesin_odeme: fmtTl(0),
      kalan_bakiye: fmtTl(3550000),
      cezai_sart: BLANK,
      satici_unvan: (sellerIsCompany ? company : customer).title,
      alici_unvan: (sellerIsCompany ? customer : company).title,
      yetkili_mahkeme: "Bakırköy",
      baslangic_tarihi: "11.06.2026",
      kira_suresi_ay: "24",
      km_limiti: "3.000",
      tutar: fmtTl(85000),
      suruculer: "Ahmet Yılmaz, Mehmet Kaya",
    },
  };
}
