import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button, Input, Select, Textarea, Spinner } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import { listVehicles } from "@/services/vehicleService";
import { createLead, type LeadSource, type LeadStatus } from "@/services/crmService";
import { LEAD_SOURCE_CONFIG, LEAD_STATUS_CONFIG } from "./constants";
import type { Vehicle } from "@/@types/vehicle";

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function NewLeadModal({ open, onClose, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  // Form alanları
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [source, setSource] = useState<LeadSource>("WALK_IN");
  const [status, setStatus] = useState<LeadStatus>("NEW");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");
  const [selectedVehicleIds, setSelectedVehicleIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      // AI ön-doldurma verisi kontrolü
      const aiPrefillStr = sessionStorage.getItem("filomonline_ai_lead_prefill");
      let initialName = "";
      let initialPhone = "";
      let initialNotes = "";
      if (aiPrefillStr) {
        try {
          const parsed = JSON.parse(aiPrefillStr);
          if (parsed.fullName) initialName = parsed.fullName;
          if (parsed.phone) initialPhone = parsed.phone;
          if (parsed.notes) initialNotes = parsed.notes;
          sessionStorage.removeItem("filomonline_ai_lead_prefill");
        } catch {}
      }

      setFullName(initialName);
      setPhone(initialPhone);
      setEmail("");
      setSource("WALK_IN");
      setStatus("NEW");
      setBudget("");
      setNotes(initialNotes);
      setSelectedVehicleIds([]);

      // Stoktaki araçları yükle
      setVehiclesLoading(true);
      listVehicles({ status: "STOKTA", pageSize: 100 })
        .then((res) => {
          setVehicles(res.items || []);
        })
        .catch(() => {
          setVehicles([]);
        })
        .finally(() => {
          setVehiclesLoading(false);
        });
    }
  }, [open]);

  const toggleVehicle = (id: string) => {
    setSelectedVehicleIds((prev) =>
      prev.includes(id) ? prev.filter((vId) => vId !== id) : [...prev, id],
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim()) {
      toast.error("Lütfen müşteri adayı adını ve soyadını girin.");
      return;
    }

    setLoading(true);
    try {
      await createLead({
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
        email: email.trim() || undefined,
        source,
        status,
        budget: budget ? Number(budget) : undefined,
        notes: notes.trim() || undefined,
        interestedVehicleIds: selectedVehicleIds.length ? selectedVehicleIds : undefined,
      });

      toast.success("Potansiyel alıcı başarıyla kaydedildi.");
      onSuccess();
      onClose();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Aday kaydedilirken hata oluştu.");
    } finally {
      setLoading(false);
    }
  };

  const sourceOptions = Object.entries(LEAD_SOURCE_CONFIG).map(([val, cfg]) => ({
    value: val,
    label: cfg.label,
  }));

  const statusOptions = Object.entries(LEAD_STATUS_CONFIG).map(([val, cfg]) => ({
    value: val,
    label: cfg.label,
  }));

  return (
    <Modal open={open} onClose={onClose} title="Yeni Potansiyel Alıcı (Lead)" className="max-w-2xl">
      <form onSubmit={handleSubmit} className="space-y-4 pt-2">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Ad Soyad *"
            placeholder="Örn: Mehmet Özkan"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            autoFocus
          />
          <Input
            label="Telefon"
            placeholder="0532..."
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input
            label="E-posta"
            type="email"
            placeholder="ornek@mail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Select
            label="Aday Kaynağı"
            data={sourceOptions}
            value={source}
            onChange={(e) => setSource(e.target.value as LeadSource)}
          />
          <Select
            label="Başlangıç Aşaması"
            data={statusOptions}
            value={status}
            onChange={(e) => setStatus(e.target.value as LeadStatus)}
          />
        </div>

        <Input
          label="Hedef / Maksimum Bütçe (TL)"
          type="number"
          placeholder="Örn: 1500000"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
        />

        {/* İlgilendiği Stoktaki Araçlar */}
        <div>
          <label className="mb-1.5 block text-xs font-semibold text-gray-700 dark:text-dark-200">
            İlgilendiği Araçlar (Stoktaki Araçlar)
          </label>
          {vehiclesLoading ? (
            <div className="flex items-center gap-2 py-4 text-xs text-gray-500">
              <Spinner className="size-4" /> Araçlar listeleniyor...
            </div>
          ) : vehicles.length === 0 ? (
            <p className="rounded-lg border border-dashed border-gray-200 p-3 text-xs text-gray-400 dark:border-dark-600">
              Şu an stokta aktif araç bulunmuyor veya araçlar yüklenemedi.
            </p>
          ) : (
            <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-xl border border-gray-200 p-2 dark:border-dark-600">
              {vehicles.map((v) => {
                const isSelected = selectedVehicleIds.includes(v.id);
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => toggleVehicle(v.id)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition-colors ${
                      isSelected
                        ? "bg-primary-50 font-semibold text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
                        : "hover:bg-gray-100 text-gray-700 dark:text-dark-200 dark:hover:bg-dark-700"
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold">{v.plate}</span>
                      <span>
                        {v.brandName} {v.modelName} ({v.year})
                      </span>
                    </div>
                    {v.saleAmount && (
                      <span className="font-semibold text-gray-900 dark:text-white">
                        {Number(v.saleAmount).toLocaleString("tr-TR")} TL
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
          {selectedVehicleIds.length > 0 && (
            <p className="mt-1 text-tiny text-primary-600 dark:text-primary-400">
              {selectedVehicleIds.length} araç seçildi.
            </p>
          )}
        </div>

        <Textarea
          label="İlk Görüşme & Müşteri Tercih Notları"
          placeholder="Müşteri ne tür araç arıyor, takas düşünüyor mu, özel istekleri..."
          rows={3}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <div className="flex justify-end gap-3 pt-3">
          <Button type="button" variant="outlined" onClick={onClose} disabled={loading}>
            Vazgeç
          </Button>
          <Button type="submit" color="primary" disabled={loading}>
            {loading ? <Spinner className="size-4" /> : "Adayı Kaydet"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
