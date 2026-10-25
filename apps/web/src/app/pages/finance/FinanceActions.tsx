import { useState } from "react";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import clsx from "clsx";
import {
  TbArrowDownLeft,
  TbArrowUpRight,
  TbArrowsExchange,
  TbChevronDown,
  TbFileInvoice,
  TbPlus,
  TbReceipt,
  TbShoppingCart,
} from "react-icons/tb";

import { useAuthContext } from "@/app/contexts/auth/context";
import { InvoiceForm } from "@/app/pages/invoices/InvoiceForm";
import { ExpenseForm } from "@/app/pages/expenses/ExpenseForm";
import { OperationModal, type OperationDefaults, type OperationMode } from "./OperationModal";

export type FinanceAction = OperationMode | "salesInvoice" | "purchaseInvoice" | "expense";

const ACTIONS: { id: FinanceAction; label: string; hint: string; Icon: React.ElementType; tone: string; perm: string; group: "money" | "doc" }[] = [
  { id: "collection", label: "Tahsilat", hint: "Nakit, havale, POS, çek", Icon: TbArrowDownLeft, tone: "bg-success/10 text-success", perm: "finance.write", group: "money" },
  { id: "payment", label: "Ödeme", hint: "Nakit, havale, şirket kartı, çek", Icon: TbArrowUpRight, tone: "bg-error/10 text-error", perm: "finance.write", group: "money" },
  { id: "transfer", label: "Virman", hint: "Hesaplar arası, kart borcu", Icon: TbArrowsExchange, tone: "bg-info/10 text-info", perm: "finance.write", group: "money" },
  { id: "salesInvoice", label: "Satış Faturası", hint: "Araç satışı", Icon: TbFileInvoice, tone: "bg-primary-500/10 text-primary-600 dark:text-primary-400", perm: "invoices.write", group: "doc" },
  { id: "purchaseInvoice", label: "Alış Faturası", hint: "Araç alışı", Icon: TbShoppingCart, tone: "bg-secondary/10 text-secondary", perm: "invoices.write", group: "doc" },
  { id: "expense", label: "Masraf", hint: "Bakım, sigorta, yakıt…", Icon: TbReceipt, tone: "bg-warning/10 text-warning", perm: "expenses.write", group: "doc" },
];

interface Props {
  onDone: () => void;
  /** dropdown: başlıktaki "Yeni" menüsü · tiles: panelde hızlı işlem kutuları */
  variant?: "dropdown" | "tiles";
}

/** Finanstaki tüm "yeni kayıt" girişleri tek yerde: para hareketleri + faturalar + masraf */
export function FinanceActions({ onDone, variant = "dropdown" }: Props) {
  const { can } = useAuthContext();
  const [active, setActive] = useState<{ action: FinanceAction; defaults?: OperationDefaults } | null>(null);
  const actions = ACTIONS.filter((a) => can(a.perm));
  if (!actions.length) return null;

  const open = (action: FinanceAction) => setActive({ action });
  const close = () => setActive(null);
  const isOp = active && (active.action === "collection" || active.action === "payment" || active.action === "transfer");

  return (
    <>
      {variant === "dropdown" ? (
        <Menu as="div" className="relative inline-block text-start">
          <MenuButton className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary-600 px-3.5 text-sm font-semibold text-white shadow-xs transition hover:bg-primary-700">
            <TbPlus className="size-4.5" /> Yeni <TbChevronDown className="size-4 opacity-80" />
          </MenuButton>
          <MenuItems
            anchor="bottom end"
            className="z-100 mt-1.5 w-64 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg outline-hidden dark:border-dark-500 dark:bg-dark-700"
          >
            {(["money", "doc"] as const).map((g) => {
              const items = actions.filter((a) => a.group === g);
              if (!items.length) return null;
              return (
                <div key={g} className={clsx(g === "doc" && "mt-1 border-t border-gray-100 pt-1 dark:border-dark-600")}>
                  <p className="px-2.5 pb-1 pt-1.5 text-tiny font-semibold uppercase tracking-wide text-gray-400">{g === "money" ? "Para hareketi" : "Belge"}</p>
                  {items.map(({ id, label, hint, Icon, tone }) => (
                    <MenuItem key={id}>
                      <button
                        type="button"
                        onClick={() => open(id)}
                        className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left data-focus:bg-gray-100 dark:data-focus:bg-dark-600"
                      >
                        <span className={clsx("flex size-8 shrink-0 items-center justify-center rounded-lg", tone)}>
                          <Icon className="size-4.5" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-sm font-semibold text-gray-800 dark:text-dark-50">{label}</span>
                          <span className="block truncate text-xs text-gray-400">{hint}</span>
                        </span>
                      </button>
                    </MenuItem>
                  ))}
                </div>
              );
            })}
          </MenuItems>
        </Menu>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {actions.map(({ id, label, Icon, tone }) => (
            <button
              key={id}
              type="button"
              onClick={() => open(id)}
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-gray-150 bg-white px-2 py-3 text-xs font-semibold text-gray-700 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-dark-600 dark:bg-dark-700 dark:text-dark-100"
            >
              <span className={clsx("flex size-10 items-center justify-center rounded-xl", tone)}>
                <Icon className="size-5" />
              </span>
              {label}
            </button>
          ))}
        </div>
      )}

      {isOp && <OperationModal open onClose={close} onDone={onDone} mode={active.action as OperationMode} defaults={active.defaults} />}
      <InvoiceForm
        open={active?.action === "salesInvoice" || active?.action === "purchaseInvoice"}
        onClose={close}
        onSaved={onDone}
        initialType={active?.action === "purchaseInvoice" ? "purchase" : "sales"}
      />
      <ExpenseForm open={active?.action === "expense"} onClose={close} onSaved={onDone} />
    </>
  );
}
