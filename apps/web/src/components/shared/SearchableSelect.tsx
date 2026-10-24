import { useEffect, useRef, useState, useMemo } from "react";
import clsx from "clsx";
import { TbChevronDown, TbSearch, TbX } from "react-icons/tb";

export interface SearchableOption {
  value: string;
  label: string;
  subLabel?: string;
  badge?: string;
  colorHex?: string;
}

interface Props {
  options: SearchableOption[];
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  label?: string;
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  className?: string;
  buttonClassName?: string;
}

function trNormalize(text: string): string {
  return String(text || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

export function SearchableSelect({
  options,
  value,
  onChange,
  onClear,
  label,
  placeholder = "Seçiniz...",
  error,
  disabled = false,
  className,
  buttonClassName,
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Dışarı tıklama kontrolü
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Dropdown açıldığında arama kutusuna odaklan
  useEffect(() => {
    if (open && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [open]);

  const selectedOption = useMemo(
    () => options.find((o) => o.value === value),
    [options, value]
  );

  const filteredOptions = useMemo(() => {
    if (!query.trim()) return options;
    const nq = trNormalize(query);
    return options.filter(
      (o) =>
        trNormalize(o.label).includes(nq) ||
        (o.subLabel && trNormalize(o.subLabel).includes(nq)) ||
        (o.badge && trNormalize(o.badge).includes(nq))
    );
  }, [options, query]);

  return (
    <div ref={containerRef} className={clsx("relative w-full", open && "z-30", className)}>
      {label && (
        <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-dark-200">
          {label}
        </label>
      )}

      {/* Tetikleyici Buton */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            setOpen((prev) => !prev);
            setQuery("");
          }
        }}
        className={clsx(
          "flex h-10 w-full items-center justify-between rounded-lg border bg-white px-3 py-2 text-left text-xs transition shadow-2xs",
          "border-gray-300 hover:border-gray-400 dark:border-dark-500 dark:bg-dark-700 dark:hover:border-dark-400",
          "focus:border-primary-500 focus:outline-hidden focus:ring-1 focus:ring-primary-500/20",
          error && "border-error! focus:border-error!",
          disabled && "cursor-not-allowed bg-gray-100 opacity-60 dark:bg-dark-600",
          buttonClassName,
        )}
      >
        <span className={clsx("truncate pr-2", !selectedOption && "text-gray-400 dark:text-dark-300")}>
          {selectedOption ? (
            <span className="flex items-center gap-2">
              {selectedOption.colorHex && (
                <span
                  className="size-3.5 shrink-0 rounded-full border border-black/20 shadow-2xs"
                  style={{ backgroundColor: selectedOption.colorHex }}
                />
              )}
              <span className="font-medium text-gray-800 dark:text-dark-100">{selectedOption.label}</span>
              {selectedOption.subLabel && (
                <span className="text-xs text-gray-400 dark:text-dark-300">({selectedOption.subLabel})</span>
              )}
            </span>
          ) : (
            placeholder
          )}
        </span>

        <div className="flex shrink-0 items-center gap-1">
          {value && !disabled && (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                if (onClear) onClear();
                else onChange("");
                setOpen(false);
              }}
              className="rounded p-0.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-dark-600 dark:hover:text-dark-200"
            >
              <TbX className="size-3.5" />
            </span>
          )}
          <TbChevronDown
            className={clsx(
              "size-4 text-gray-400 transition-transform duration-200 dark:text-dark-300",
              open && "rotate-180"
            )}
          />
        </div>
      </button>

      {/* Açılır Panel */}
      {open && !disabled && (
        <div className="absolute z-50 mt-1 max-h-64 w-full min-w-[200px] overflow-hidden rounded-lg border border-gray-200 bg-white shadow-xl dark:border-dark-500 dark:bg-dark-700">
          {/* Arama Alanı */}
          <div className="border-b border-gray-100 p-2 dark:border-dark-600">
            <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 py-1 dark:border-dark-500 dark:bg-dark-800">
              <TbSearch className="size-3.5 shrink-0 text-gray-400 dark:text-dark-300" />
              <input
                ref={searchInputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Hızlı ara..."
                className="w-full bg-transparent text-xs text-gray-700 outline-hidden placeholder:text-gray-400 dark:text-dark-100 dark:placeholder:text-dark-400"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-200"
                >
                  <TbX className="size-3" />
                </button>
              )}
            </div>
          </div>

          {/* Liste */}
          <ul className="max-h-48 overflow-y-auto py-1 text-xs">
            {filteredOptions.length === 0 ? (
              <li className="px-3 py-3 text-center text-gray-400 dark:text-dark-300">
                Sonuç bulunamadı.
              </li>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = opt.value === value;
                return (
                  <li
                    key={opt.value}
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                      setQuery("");
                    }}
                    className={clsx(
                      "flex cursor-pointer items-center justify-between px-3 py-2 transition",
                      isSelected
                        ? "bg-primary-50 font-semibold text-primary-600 dark:bg-primary-950/40 dark:text-primary-400"
                        : "text-gray-700 hover:bg-gray-100 dark:text-dark-200 dark:hover:bg-dark-600/70"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate">
                      {opt.colorHex && (
                        <span
                          className="size-3 shrink-0 rounded-full border border-black/20 shadow-2xs"
                          style={{ backgroundColor: opt.colorHex }}
                        />
                      )}
                      <span>{opt.label}</span>
                      {opt.subLabel && (
                        <span className="text-[11px] text-gray-400 dark:text-dark-400">
                          {opt.subLabel}
                        </span>
                      )}
                    </div>
                    {opt.badge && (
                      <span className="ml-2 shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-600 dark:bg-dark-800 dark:text-dark-300">
                        {opt.badge}
                      </span>
                    )}
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-error">{error}</p>}
    </div>
  );
}
