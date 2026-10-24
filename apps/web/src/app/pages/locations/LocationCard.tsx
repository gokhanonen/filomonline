import { TbMapPin, TbPhone, TbPencil, TbTrash, TbBuildingWarehouse } from "react-icons/tb";
import type { Location } from "@/@types/location";

interface Props {
  location: Location;
  onEdit: () => void;
  onDelete?: () => void;
}

export function LocationCard({ location: l, onEdit, onDelete }: Props) {
  return (
    <div className="group flex flex-col rounded-2xl border border-gray-150 bg-white p-4 shadow-sm transition hover:shadow-lg dark:border-dark-600 dark:bg-dark-700">
      <div className="flex items-start gap-3">
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-xl ${l.isExternal ? "bg-warning/15 text-warning" : "bg-primary-100 text-primary-600 dark:bg-primary-500/20"}`}>
          <TbBuildingWarehouse className="size-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-gray-800 dark:text-dark-50">{l.name}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-tiny text-gray-400">{l.code}</span>
            <span className={`rounded px-1.5 py-0.5 text-tiny font-medium ${l.isExternal ? "bg-warning/15 text-warning" : "bg-info/15 text-info"}`}>
              {l.isExternal ? "Dış" : "İç"}
            </span>
            {!l.isActive && <span className="text-tiny text-error">Pasif</span>}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-sm text-gray-600 dark:text-dark-200">
        <div className="flex items-center gap-2"><TbMapPin className="size-4 shrink-0 text-gray-400" /><span className="truncate">{[l.address, l.city].filter(Boolean).join(", ") || "—"}</span></div>
        <div className="flex items-center gap-2"><TbPhone className="size-4 shrink-0 text-gray-400" /><span>{l.phone || "—"}</span></div>
      </div>

      <div className="mt-3 flex items-center justify-end border-t border-gray-150 pt-3 dark:border-dark-500">
        <div className="flex gap-1.5 opacity-0 transition group-hover:opacity-100">
          <button type="button" onClick={onEdit} title="Düzenle" className="flex size-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:text-primary-600 dark:bg-dark-600 dark:text-dark-200">
            <TbPencil className="size-4" />
          </button>
          {onDelete && (
            <button type="button" onClick={onDelete} title="Pasifleştir" className="flex size-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 hover:text-error dark:bg-dark-600 dark:text-dark-200">
              <TbTrash className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
