import { TbPhone, TbMapPin, TbPencil, TbTrash, TbId, TbBuildingBank } from "react-icons/tb";
import {
  ACCOUNT_TYPE_LABELS,
  ENTITY_TYPE_LABELS,
  type Account,
} from "@/@types/account";

const TYPE_BADGE: Record<string, string> = {
  CUSTOMER: "bg-info/15 text-info",
  SUPPLIER: "bg-warning/15 text-warning",
  BOTH: "bg-secondary/15 text-secondary",
};

function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((p) => p[0]?.toUpperCase() ?? "").join("");
}
function money(v: string): string {
  return Number(v).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " ₺";
}

interface Props {
  account: Account;
  onEdit: () => void;
  onDelete?: () => void;
}

export function AccountCard({ account: a, onEdit, onDelete }: Props) {
  const balance = Number(a.balance);
  return (
    <div className="group flex flex-col rounded-2xl border border-gray-150 bg-white p-4 shadow-sm transition hover:shadow-lg dark:border-dark-600 dark:bg-dark-700">
      <div className="flex items-start gap-3">
        <div className={`flex size-11 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${TYPE_BADGE[a.type]}`}>
          {initials(a.name)}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold text-gray-800 dark:text-dark-50">{a.name}</h3>
          <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
            <span className={`rounded px-1.5 py-0.5 text-tiny font-medium ${TYPE_BADGE[a.type]}`}>
              {ACCOUNT_TYPE_LABELS[a.type]}
            </span>
            <span className="text-tiny text-gray-400">{ENTITY_TYPE_LABELS[a.entityType]}</span>
            {!a.isActive && <span className="text-tiny text-error">Pasif</span>}
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-1.5 text-sm text-gray-600 dark:text-dark-200">
        <Row Icon={TbPhone}>{a.phone || "—"}</Row>
        <Row Icon={TbMapPin}>{[a.district, a.city].filter(Boolean).join(", ") || "—"}</Row>
        <Row Icon={a.entityType === "CORPORATE" ? TbBuildingBank : TbId}>
          {a.taxNumber || a.tckn || "—"}
        </Row>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-gray-150 pt-3 dark:border-dark-500">
        <div>
          <p className="text-tiny uppercase text-gray-400">Bakiye</p>
          <p className={`font-semibold ${balance > 0 ? "text-success" : balance < 0 ? "text-error" : "text-gray-700 dark:text-dark-100"}`}>
            {money(a.balance)}
          </p>
        </div>
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

function Row({ Icon, children }: { Icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="size-4 shrink-0 text-gray-400" />
      <span className="truncate">{children}</span>
    </div>
  );
}
