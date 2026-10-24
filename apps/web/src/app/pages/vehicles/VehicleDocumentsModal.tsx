import { Modal } from "@/components/shared/Modal";
import { DocumentManager } from "@/components/shared/DocumentManager";
import type { Vehicle } from "@/@types/vehicle";

interface Props {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
}

/** Tekerlek menüden veya butonla doğrudan açılan Araç Evrakları Modalı */
export function VehicleDocumentsModal({ open, onClose, vehicle }: Props) {
  if (!vehicle) return null;

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <span className="font-bold">{vehicle.plate}</span>
          <span className="text-xs text-gray-400">
            {[vehicle.brandName, vehicle.modelName, vehicle.year].filter(Boolean).join(" ")}
          </span>
          <span className="text-xs font-normal text-gray-500">— Evrak Yönetimi</span>
        </div>
      }
      className="max-w-3xl"
    >
      <div className="space-y-4">
        <p className="text-xs text-gray-500 dark:text-dark-300">
          Ruhsat, sigorta, kasko, ekspertiz ve noter gibi araca ait evrakları yükleyin ve yönetin.
        </p>
        <DocumentManager referenceType="VEHICLE" referenceId={vehicle.id} />
      </div>
    </Modal>
  );
}
