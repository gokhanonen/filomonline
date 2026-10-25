import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { toast } from "sonner";
import { TbAlertTriangle, TbCar, TbSteeringWheel } from "react-icons/tb";

import { Button, Input } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import { LeadPicker, emptyLeadChoice, leadChoiceValid, type LeadChoice } from "@/components/shared/LeadPicker";
import type { Vehicle } from "@/@types/vehicle";
import { createLead, createTestDrive, listTestDrives, type LeadTestDrive } from "@/services/crmService";

interface Props {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
}

const DURATIONS = [15, 30, 45, 60];
const pad = (n: number) => String(n).padStart(2, "0");
/** Bir sonraki yarım saat (yerel saat, datetime-local biçimi) */
const nextSlot = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() < 30 ? 30 : 60, 0, 0);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

/** Araç kartından tek adımda potansiyele deneme sürüşü planla */
export function QuickTestDriveModal({ open, onClose, vehicle }: Props) {
  const [lead, setLead] = useState<LeadChoice>(emptyLeadChoice);
  const [at, setAt] = useState(nextSlot());
  const [duration, setDuration] = useState(30);
  const [license, setLicense] = useState("");
  const [note, setNote] = useState("");
  const [existing, setExisting] = useState<LeadTestDrive[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !vehicle) return;
    setLead(emptyLeadChoice);
    setAt(nextSlot());
    setDuration(30);
    setLicense("");
    setNote("");
    listTestDrives({ vehicleId: vehicle.id, status: "SCHEDULED" }).then(setExisting).catch(() => setExisting([]));
  }, [open, vehicle]);

  // Aynı araca çakışan planlı sürüş
  const conflict = useMemo(() => {
    const start = new Date(at).getTime();
    const end = start + duration * 60_000;
    return existing.find((t) => {
      const s = new Date(t.scheduledAt).getTime();
      return s < end && start < s + (t.durationMinutes || 30) * 60_000;
    });
  }, [existing, at, duration]);

  const save = async () => {
    if (!vehicle || !leadChoiceValid(lead)) return;
    if (new Date(at) < new Date(Date.now() - 5 * 60_000)) return toast.error("Geçmiş bir saate sürüş planlanamaz");
    setSaving(true);
    try {
      const leadId =
        lead.mode === "existing"
          ? lead.leadId
          : (await createLead({ fullName: lead.fullName.trim(), phone: lead.phone || undefined, email: lead.email || undefined, source: "WALK_IN" })).id;
      await createTestDrive({
        leadId,
        vehicleId: vehicle.id,
        scheduledAt: new Date(at).toISOString(),
        durationMinutes: duration,
        driverLicenseNo: license.trim() || undefined,
        feedbackNotes: note.trim() || undefined,
      });
      toast.success(`Deneme sürüşü planlandı: ${new Date(at).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" })}`);
      onClose();
    } catch (err) {
      toast.error([(err as { message?: string | string[] })?.message ?? "Kaydedilemedi"].flat().join(", "));
    } finally {
      setSaving(false);
    }
  };

  if (!vehicle) return null;

  return (
    <Modal open={open} onClose={onClose} title="Deneme Sürüşü Planla" className="max-w-2xl">
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-2xl bg-gray-50 p-3 dark:bg-dark-800">
          {vehicle.coverUrl ? (
            <img src={vehicle.coverUrl} alt={vehicle.plate} className="size-14 rounded-xl object-cover" />
          ) : (
            <span className="flex size-14 items-center justify-center rounded-xl bg-gray-200 text-gray-400 dark:bg-dark-600">
              <TbCar className="size-6" />
            </span>
          )}
          <div className="min-w-0">
            <p className="font-mono text-sm font-bold text-gray-800 dark:text-dark-50">{vehicle.plate}</p>
            <p className="truncate text-sm text-gray-600 dark:text-dark-200">{[vehicle.brandName, vehicle.modelName, vehicle.year].filter(Boolean).join(" ")}</p>
          </div>
          {existing.length > 0 && (
            <span className="ml-auto rounded-full bg-info/10 px-2.5 py-1 text-xs font-semibold text-info">{existing.length} planlı sürüş</span>
          )}
        </div>

        <LeadPicker value={lead} onChange={setLead} open={open} />

        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Tarih ve saat *" type="datetime-local" value={at} onChange={(e) => setAt(e.target.value)} />
          <div>
            <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-100">Süre</span>
            <div className="flex gap-1.5">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setDuration(d)}
                  className={clsx(
                    "flex-1 rounded-lg border py-2 text-sm font-semibold",
                    duration === d ? "border-primary-500 bg-primary-500 text-white" : "border-gray-200 text-gray-600 dark:border-dark-500 dark:text-dark-200",
                  )}
                >
                  {d} dk
                </button>
              ))}
            </div>
          </div>
          <Input label="Ehliyet No" placeholder="Opsiyonel" value={license} onChange={(e) => setLicense(e.target.value)} />
          <Input label="Not" placeholder="Opsiyonel" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>

        {conflict && (
          <div className="flex items-start gap-2 rounded-xl bg-warning/10 px-3 py-2 text-sm text-warning">
            <TbAlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>
              Bu araç {new Date(conflict.scheduledAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}'de{" "}
              {conflict.lead?.fullName ?? "başka bir müşteri"} ile deneme sürüşünde. Yine de planlayabilirsiniz.
            </span>
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-gray-150 pt-4 dark:border-dark-500">
          <Button variant="flat" onClick={onClose}>Vazgeç</Button>
          <Button color="primary" className="gap-1.5" onClick={save} disabled={!leadChoiceValid(lead) || !at || saving}>
            <TbSteeringWheel className="size-4.5" /> {saving ? "Kaydediliyor…" : "Planla"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
