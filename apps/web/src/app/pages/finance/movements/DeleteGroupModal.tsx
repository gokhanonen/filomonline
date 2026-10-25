import { useState } from "react";
import clsx from "clsx";
import { ExclamationTriangleIcon } from "@heroicons/react/24/outline";

import { Modal } from "@/components/shared/Modal";
import { Button, GhostSpinner } from "@/components/ui";
import type { FinanceMovement } from "@/@types/finance";
import { MODULE_LABEL, MovementTypeBadge, fmtDate, fmtMoney } from "../shared";

interface Props {
  open: boolean;
  legs: FinanceMovement[];
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

/** İşlem grubu silme onayı — gruptaki tüm bacaklar birlikte silinir */
export function DeleteGroupModal({ open, legs, onClose, onConfirm }: Props) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={busy ? () => void 0 : onClose} className="max-w-md" hideHeader>
      <div className="text-center">
        <ExclamationTriangleIcon className="mx-auto size-16 text-warning" />
        <h3 className="mt-3 text-lg font-semibold text-gray-800 dark:text-dark-50">İşlem silinsin mi?</h3>
        <p className="mx-auto mt-1 max-w-xs text-sm text-gray-500 dark:text-dark-300">
          {legs.length > 1
            ? `Bu işleme ait ${legs.length} hareket birlikte silinecek. Bu işlem geri alınamaz.`
            : "Hareket ve bağlı fatura eşleştirmeleri silinecek. Bu işlem geri alınamaz."}
        </p>
      </div>

      {legs.length > 0 && (
        <div className="mt-4 divide-y divide-gray-100 rounded-xl border border-gray-150 dark:divide-dark-600 dark:border-dark-600">
          {legs.map((m) => (
            <div key={m.id} className="flex items-center justify-between gap-2 px-3 py-2 text-xs">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <MovementTypeBadge type={m.type} />
                  <span className="truncate font-medium text-gray-700 dark:text-dark-100">
                    {m.cheque ? `#${m.cheque.serialNo}` : m.cashRegister?.name ?? MODULE_LABEL[m.module]}
                  </span>
                </div>
                <p className="mt-0.5 text-gray-400 dark:text-dark-300">{fmtDate(m.date)}</p>
              </div>
              <span className={clsx("whitespace-nowrap font-bold tabular-nums", m.direction === "IN" ? "text-success" : "text-error")}>
                {m.direction === "IN" ? "+" : "−"}
                {fmtMoney(m.amount, m.currency)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-5 flex justify-center gap-3">
        <Button variant="outlined" className="h-9 min-w-[7rem]" onClick={onClose} disabled={busy}>
          Vazgeç
        </Button>
        <Button color="error" className="h-9 min-w-[7rem] gap-2" onClick={confirm} disabled={busy}>
          {busy && <GhostSpinner variant="soft" className="size-4 border-2" />}
          İşlemi Sil
        </Button>
      </div>
    </Modal>
  );
}
