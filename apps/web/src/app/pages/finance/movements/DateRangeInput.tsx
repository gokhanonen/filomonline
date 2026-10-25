import clsx from "clsx";
import { TbCalendar, TbX } from "react-icons/tb";

interface Props {
  label: string;
  from: string;
  to: string;
  onFromChange: (v: string) => void;
  onToChange: (v: string) => void;
  className?: string;
}

/** Tek kutuda başlangıç – bitiş tarih aralığı (filtre çubukları için) */
export function DateRangeInput({ label, from, to, onFromChange, onToChange, className }: Props) {
  const dateCls =
    "min-w-0 flex-1 bg-transparent text-xs text-gray-700 outline-hidden dark:text-dark-100 dark:[color-scheme:dark] [&::-webkit-calendar-picker-indicator]:opacity-50";
  return (
    <div
      className={clsx(
        "flex h-9.5 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-2.5 shadow-2xs transition hover:border-gray-400 focus-within:border-primary-600 dark:border-dark-450 dark:bg-dark-700 dark:hover:border-dark-400 dark:focus-within:border-primary-500",
        className,
      )}
    >
      <TbCalendar className="size-4 shrink-0 text-gray-400" />
      <span className="shrink-0 text-tiny font-semibold uppercase text-gray-400 dark:text-dark-300">{label}</span>
      <input type="date" aria-label={`${label} başlangıç`} value={from} max={to || undefined} onChange={(e) => onFromChange(e.target.value)} className={dateCls} />
      <span className="text-gray-300 dark:text-dark-500">–</span>
      <input type="date" aria-label={`${label} bitiş`} value={to} min={from || undefined} onChange={(e) => onToChange(e.target.value)} className={dateCls} />
      {(from || to) && (
        <button
          type="button"
          onClick={() => {
            onFromChange("");
            onToChange("");
          }}
          title="Tarihleri temizle"
          className="shrink-0 rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-dark-600"
        >
          <TbX className="size-3.5" />
        </button>
      )}
    </div>
  );
}
