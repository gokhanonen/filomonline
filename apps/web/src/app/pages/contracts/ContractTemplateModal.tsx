import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Modal } from "@/components/shared/Modal";
import { Button, Checkbox, Input, Select, Spinner } from "@/components/ui";
import {
  createContractTemplate,
  updateContractTemplate,
} from "@/services/contractService";
import type { ContractKind, ContractTemplate } from "@/@types/contract";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  template?: ContractTemplate | null;
}

const VARIABLES = [
  { tag: "{{firma_unvan}}", desc: "Şirket Unvanı" },
  { tag: "{{firma_vergi_no}}", desc: "Şirket VKN" },
  { tag: "{{firma_vergi_dairesi}}", desc: "Şirket Vergi Dairesi" },
  { tag: "{{firma_adres}}", desc: "Şirket Adresi" },
  { tag: "{{firma_telefon}}", desc: "Şirket Telefonu" },
  { tag: "{{musteri_adi}}", desc: "Müşteri Adı / Unvanı" },
  { tag: "{{musteri_tc_vkn}}", desc: "Müşteri TCKN / VKN" },
  { tag: "{{musteri_telefon}}", desc: "Müşteri Telefon" },
  { tag: "{{musteri_adres}}", desc: "Müşteri Adres" },
  { tag: "{{plaka}}", desc: "Araç Plakası" },
  { tag: "{{marka_model}}", desc: "Araç Marka Model" },
  { tag: "{{yil}}", desc: "Model Yılı" },
  { tag: "{{sasi_no}}", desc: "Şasi Numarası" },
  { tag: "{{motor_no}}", desc: "Motor Numarası" },
  { tag: "{{renk}}", desc: "Araç Rengi" },
  { tag: "{{sozlesme_no}}", desc: "Evrak Numarası" },
  { tag: "{{sozlesme_tarihi}}", desc: "Sözleşme Tarihi" },
  { tag: "{{toplam_tutar}}", desc: "Satış Bedeli" },
  { tag: "{{alinan_pesinat}}", desc: "Alınan Peşinat" },
  { tag: "{{kalan_bakiye}}", desc: "Kalan Bakiye" },
  { tag: "{{odeme_tablosu}}", desc: "Taksit / Senet Tablosu" },
  { tag: "{{kira_suresi_ay}}", desc: "Kira Süresi (Ay)" },
  { tag: "{{km_limiti}}", desc: "KM Sınırı" },
  { tag: "{{tutar}}", desc: "Aylık Kira Bedeli" },
  { tag: "{{suruculer}}", desc: "Yetkili Sürücüler" },
];

export function ContractTemplateModal({
  open,
  onClose,
  onSaved,
  template,
}: Props) {
  const isEditing = !!template;
  const [name, setName] = useState("");
  const [type, setType] = useState<ContractKind>("SALES");
  const [content, setContent] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (template) {
      setName(template.name);
      setType(template.type);
      setContent(template.content);
      setIsDefault(template.isDefault);
    } else {
      setName("");
      setType("SALES");
      setContent("");
      setIsDefault(false);
    }
  }, [open, template]);

  const copyVariable = (tag: string) => {
    navigator.clipboard.writeText(tag);
    toast.success(`${tag} panoya kopyalandı`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Lütfen bir şablon adı girin");
      return;
    }
    if (!content.trim()) {
      toast.error("Lütfen şablon HTML içeriği girin");
      return;
    }

    setSaving(true);
    try {
      if (isEditing) {
        await updateContractTemplate(template.id, {
          name: name.trim(),
          type,
          content,
          isDefault,
        });
        toast.success("Şablon güncellendi");
      } else {
        await createContractTemplate({
          name: name.trim(),
          type,
          content,
          isDefault,
        });
        toast.success("Şablon oluşturuldu");
      }

      onSaved();
      onClose();
    } catch (err: any) {
      toast.error(err.response?.data?.message || err.message || "İşlem başarısız");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={isEditing ? `Şablonu Düzenle — ${name}` : "Yeni Sözleşme Şablonu"}
      className="max-w-4xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
              Şablon Adı *
            </label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Örn: Özel Kurumsal Satış Sözleşmesi"
              required
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
              Sözleşme Türü *
            </label>
            <Select
              value={type}
              onChange={(e) => setType(e.target.value as ContractKind)}
            >
              <option value="SALES">Satış Sözleşmesi</option>
              <option value="RENTAL">Kira Sözleşmesi</option>
            </Select>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Checkbox
            checked={isDefault}
            onChange={(e) => setIsDefault(e.target.checked)}
          />
          <span className="text-xs text-gray-700 dark:text-dark-200">
            Bu türdeki sözleşmeler için varsayılan şablon olarak kullan
          </span>
        </div>

        {/* Değişken İpuçları */}
        <div>
          <label className="mb-1.5 block text-xs font-medium text-gray-600 dark:text-dark-300">
            Kullanılabilir Değişkenler (Tıklayarak kopyalayabilirsiniz):
          </label>
          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto rounded-lg border border-gray-200 bg-gray-50/70 p-2 dark:border-dark-700 dark:bg-dark-800">
            {VARIABLES.map((v) => (
              <button
                key={v.tag}
                type="button"
                onClick={() => copyVariable(v.tag)}
                title={v.desc}
                className="rounded bg-white px-2 py-0.5 font-mono text-[11px] text-primary-700 shadow-xs hover:bg-primary-50 dark:bg-dark-700 dark:text-primary-300 dark:hover:bg-dark-600"
              >
                {v.tag}
              </button>
            ))}
          </div>
        </div>

        {/* HTML İçerik */}
        <div>
          <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-dark-300">
            HTML Şablon Kodu *
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={12}
            placeholder="<html><body>...{{musteri_adi}}...</body></html>"
            className="w-full rounded-lg border border-gray-200 bg-gray-900 p-3 font-mono text-xs text-emerald-400 dark:border-dark-700 dark:bg-dark-900 focus:outline-hidden"
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-3 border-t border-gray-150 dark:border-dark-700">
          <Button variant="outlined" type="button" onClick={onClose} disabled={saving}>
            İptal
          </Button>
          <Button color="primary" type="submit" disabled={saving} className="gap-2">
            {saving && <Spinner className="size-4" />}
            {isEditing ? "Şablonu Güncelle" : "Şablonu Kaydet"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
