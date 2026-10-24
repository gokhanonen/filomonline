// Import Dependencies
import {
  Dialog,
  DialogPanel,
  Transition,
  TransitionChild,
} from "@headlessui/react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import {
  MagnifyingGlassIcon,
  ChevronRightIcon,
  XMarkIcon,
  TruckIcon,
  DocumentTextIcon,
  ReceiptPercentIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  DocumentDuplicateIcon,
  TagIcon,
  WrenchScrewdriverIcon,
  SparklesIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import { Link, useNavigate } from "react-router";
import { useHotkeys } from "react-hotkeys-hook";
import clsx from "clsx";

// Local Imports
import { Button, Spinner } from "@/components/ui";
import { useDisclosure, useFuse } from "@/hooks";
import { useThemeContext } from "@/app/contexts/theme/context";
import { navigation } from "@/app/navigation";
import { Highlight } from "@/components/shared/Highlight";
import { settings } from "@/app/navigation/segments/settings";
import { NavigationTree } from "@/@types/navigation";
import { GlobalSearchResult, searchGlobal } from "@/services/searchService";

// ----------------------------------------------------------------------

interface SearchProps {
  renderButton?: (openFn: () => void) => React.ReactNode;
}

interface SearchDialogProps {
  close: () => void;
}

type CategoryFilter =
  | "all"
  | "vehicles"
  | "invoices"
  | "expenses"
  | "accounts"
  | "rentals"
  | "contracts"
  | "options"
  | "products"
  | "navigation";

const CATEGORY_LABELS: Record<CategoryFilter, string> = {
  all: "Tümü",
  vehicles: "Araçlar",
  invoices: "Faturalar",
  expenses: "Masraflar",
  accounts: "Cariler",
  contracts: "Sözleşmeler",
  rentals: "Kiralamalar",
  options: "Opsiyonlar",
  products: "Hizmet / Ürün",
  navigation: "Menü / Sayfalar",
};

const CATEGORY_ICONS: Record<
  string,
  React.ComponentType<React.SVGProps<SVGSVGElement>>
> = {
  vehicles: TruckIcon,
  invoices: DocumentTextIcon,
  expenses: ReceiptPercentIcon,
  accounts: UserGroupIcon,
  rentals: CalendarDaysIcon,
  contracts: DocumentDuplicateIcon,
  options: TagIcon,
  products: WrenchScrewdriverIcon,
  navigation: SparklesIcon,
};

const BADGE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  primary: {
    bg: "bg-primary-500/10 dark:bg-primary-500/20",
    text: "text-primary-600 dark:text-primary-300",
    border: "border-primary-500/25",
  },
  success: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    text: "text-emerald-600 dark:text-emerald-300",
    border: "border-emerald-500/25",
  },
  warning: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    text: "text-amber-700 dark:text-amber-300",
    border: "border-amber-500/25",
  },
  danger: {
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    text: "text-rose-600 dark:text-rose-300",
    border: "border-rose-500/25",
  },
  info: {
    bg: "bg-sky-500/10 dark:bg-sky-500/20",
    text: "text-sky-600 dark:text-sky-300",
    border: "border-sky-500/25",
  },
  purple: {
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    text: "text-purple-600 dark:text-purple-300",
    border: "border-purple-500/25",
  },
};

const QUICK_SHORTCUTS = [
  {
    title: "Araç Kartları",
    desc: "Filo envanteri, detay ve durumlar",
    to: "/vehicles",
    icon: TruckIcon,
    accent: "text-primary-500 bg-primary-500/10 dark:bg-primary-500/20",
  },
  {
    title: "Satış & Alış Faturaları",
    desc: "Fatura listesi, tahsilat ve ödemeler",
    to: "/invoices",
    icon: DocumentTextIcon,
    accent: "text-emerald-500 bg-emerald-500/10 dark:bg-emerald-500/20",
  },
  {
    title: "Masraf & Giderler",
    desc: "Yakıt, servis, bakım, kasko giderleri",
    to: "/expenses",
    icon: ReceiptPercentIcon,
    accent: "text-amber-500 bg-amber-500/10 dark:bg-amber-500/20",
  },
  {
    title: "Cari Hesaplar",
    desc: "Müşteri ve tedarikçi kartları",
    to: "/accounts",
    icon: UserGroupIcon,
    accent: "text-purple-500 bg-purple-500/10 dark:bg-purple-500/20",
  },
  {
    title: "Kiralama & Sözleşmeler",
    desc: "Aktif sözleşmeler ve rezervasyonlar",
    to: "/rentals",
    icon: CalendarDaysIcon,
    accent: "text-sky-500 bg-sky-500/10 dark:bg-sky-500/20",
  },
  {
    title: "Ürün ve Hizmetler",
    desc: "Yedek parça, işçilik ve servisler",
    to: "/products",
    icon: WrenchScrewdriverIcon,
    accent: "text-gray-600 bg-gray-500/10 dark:text-dark-100 dark:bg-dark-500/20",
  },
];

const navData = flattenNav([...navigation, settings]);

export function Search({ renderButton }: SearchProps) {
  const [isOpen, { open, close }] = useDisclosure(false);

  useHotkeys("/", () => open(), {
    ignoreModifiers: true,
    preventDefault: true,
  });

  useHotkeys("mod+k", () => open(), {
    preventDefault: true,
  });

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog
          as="div"
          className="fixed inset-0 z-100 flex flex-col items-center justify-start pt-12 sm:pt-20 px-3 sm:px-4 overflow-hidden"
          onClose={close}
        >
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-250"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-150"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity dark:bg-black/60" />
          </TransitionChild>
          <TransitionChild
            as={Fragment}
            enter="ease-out duration-250"
            enterFrom="opacity-0 scale-95 -translate-y-2"
            enterTo="opacity-100 scale-100 translate-y-0"
            leave="ease-in duration-150"
            leaveFrom="opacity-100 scale-100 translate-y-0"
            leaveTo="opacity-0 scale-95 -translate-y-2"
          >
            <DialogPanel className="dark:bg-dark-750 relative flex h-full max-h-[82vh] w-full max-w-3xl flex-col bg-white shadow-2xl transition-all rounded-2xl overflow-hidden border border-gray-200/80 dark:border-dark-600/80">
              <SearchDialog close={close} />
            </DialogPanel>
          </TransitionChild>
        </Dialog>
      </Transition>

      {renderButton ? renderButton(open) : null}
    </>
  );
}

export function SearchDialog({ close }: SearchDialogProps) {
  const navigate = useNavigate();
  const { isDark } = useThemeContext();
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<CategoryFilter>("all");
  const [results, setResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const inputRef = useRef<HTMLInputElement>(null);
  const resultsContainerRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLAnchorElement | null)[]>([]);

  // Fuse search for navigation menu
  const { result: navResults } = useFuse(navData, {
    keys: ["title"],
    threshold: 0.25,
    matchAllOnEmptyQuery: false,
  });

  // Focus input automatically
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced API search
  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await searchGlobal(trimmed);
        setResults(data);
      } catch (err) {
        console.error("Global search error:", err);
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);

    return () => clearTimeout(timer);
  }, [query]);

  // Combine backend results + navigation results
  const unifiedResults = useMemo(() => {
    const list: GlobalSearchResult[] = [...results];

    // Append navigation matching items if any
    if (query.trim().length >= 2 && navResults.length > 0) {
      navResults.slice(0, 5).forEach((r, idx) => {
        list.push({
          id: `nav-${idx}`,
          category: "products" as any, // fallback category
          moduleName: "Menü / Sayfa",
          badgeColor: "purple",
          title: r.item.title || "Sayfa",
          subtitle: `Menü yönlendirmesi • ${r.item.path || ""}`,
          targetUrl: r.item.path || "#",
        });
      });
    }

    return list;
  }, [results, navResults, query]);

  // Filtered by selected category chip
  const filteredResults = useMemo(() => {
    if (activeCategory === "all") return unifiedResults;
    if (activeCategory === "navigation") {
      return unifiedResults.filter((r) => r.moduleName === "Menü / Sayfa");
    }
    return unifiedResults.filter((r) => r.category === activeCategory);
  }, [unifiedResults, activeCategory]);

  // Reset selectedIndex when results or category change
  useEffect(() => {
    setSelectedIndex(0);
  }, [filteredResults, activeCategory]);

  // Keep active item scrolled into view
  useEffect(() => {
    const el = itemRefs.current[selectedIndex];
    if (el) {
      el.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [selectedIndex]);

  // Category counts
  const categoryCounts = useMemo(() => {
    const counts: Partial<Record<CategoryFilter, number>> = {};
    unifiedResults.forEach((r) => {
      if (r.moduleName === "Menü / Sayfa") {
        counts.navigation = (counts.navigation || 0) + 1;
      } else {
        counts[r.category] = (counts[r.category] || 0) + 1;
      }
    });
    return counts;
  }, [unifiedResults]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (filteredResults.length === 0) return;
      setSelectedIndex((prev) => (prev < filteredResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (filteredResults.length === 0) return;
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : filteredResults.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredResults[selectedIndex]) {
        navigate(filteredResults[selectedIndex].targetUrl);
        close();
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      close();
    }
  };

  const hasQuery = query.trim().length >= 2;

  return (
    <div
      data-search-wrapper
      className="flex flex-col h-full max-h-[82vh] overflow-hidden"
      onKeyDown={handleKeyDown}
    >
      {/* Top Search Bar */}
      <div className="relative flex items-center gap-3 px-4 sm:px-6 py-3.5 border-b border-gray-150 dark:border-dark-600 bg-gray-50/70 dark:bg-dark-800/80">
        <div className="shrink-0 text-gray-400 dark:text-dark-300">
          {loading ? (
            <Spinner color="primary" className="size-5 border-2" />
          ) : (
            <MagnifyingGlassIcon className="size-5.5 text-primary-500" />
          )}
        </div>

        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Burada ara... (Araç, fatura no, masraf, cari, sözleşme, opsiyon, şasi...)"
          className="flex-1 bg-transparent text-sm sm:text-base font-medium text-gray-900 dark:text-dark-50 placeholder:text-gray-400 dark:placeholder:text-dark-300 outline-none"
        />

        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              inputRef.current?.focus();
            }}
            className="p-1 rounded-md text-gray-400 hover:text-gray-600 dark:text-dark-300 dark:hover:text-dark-100 transition-colors"
            title="Temizle"
          >
            <XMarkIcon className="size-4.5" />
          </button>
        )}

        <Button
          onClick={close}
          variant={isDark ? "filled" : "outlined"}
          className="px-2.5 py-1 text-xs font-semibold rounded-md shrink-0"
        >
          ESC
        </Button>
      </div>

      {/* Category Filter Chips (Visible when searching) */}
      {hasQuery && unifiedResults.length > 0 && (
        <div className="flex items-center gap-1.5 px-4 sm:px-6 py-2.5 overflow-x-auto border-b border-gray-100 dark:border-dark-650 bg-gray-50/40 dark:bg-dark-800/40 no-scrollbar">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={clsx(
              "px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all",
              activeCategory === "all"
                ? "bg-primary-500 text-white shadow-xs"
                : "bg-gray-150 hover:bg-gray-200 dark:bg-dark-600 dark:hover:bg-dark-500 text-gray-700 dark:text-dark-150",
            )}
          >
            {CATEGORY_LABELS.all} ({unifiedResults.length})
          </button>

          {(
            [
              "vehicles",
              "invoices",
              "expenses",
              "accounts",
              "contracts",
              "rentals",
              "options",
              "products",
              "navigation",
            ] as CategoryFilter[]
          ).map((cat) => {
            const count = categoryCounts[cat] || 0;
            if (count === 0) return null;
            const Icon = CATEGORY_ICONS[cat] || SparklesIcon;
            const isSelected = activeCategory === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={clsx(
                  "inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-all",
                  isSelected
                    ? "bg-primary-500 text-white shadow-xs"
                    : "bg-gray-150 hover:bg-gray-200 dark:bg-dark-600 dark:hover:bg-dark-500 text-gray-700 dark:text-dark-150",
                )}
              >
                <Icon className="size-3.5" />
                <span>{CATEGORY_LABELS[cat]}</span>
                <span className={clsx("opacity-75 text-[11px]")}>({count})</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Content Area */}
      <div
        ref={resultsContainerRef}
        className="flex-1 overflow-y-auto px-3 sm:px-6 py-4 space-y-1.5 focus:outline-none"
      >
        {/* Case 1: Empty Query - Quick Access & Search Tips */}
        {!hasQuery && (
          <div className="space-y-5">
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-300">
                  Hızlı Erişim Modülleri
                </h3>
                <span className="text-xs text-gray-400 dark:text-dark-400">
                  Doğrudan gitmek için tıklayın
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {QUICK_SHORTCUTS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      onClick={close}
                      className="group flex items-center gap-3 p-3 rounded-xl border border-gray-150 dark:border-dark-600/70 hover:border-primary-400 dark:hover:border-primary-500 hover:bg-primary-50/30 dark:hover:bg-primary-500/5 transition-all"
                    >
                      <div
                        className={clsx(
                          "size-10 rounded-lg flex items-center justify-center shrink-0 transition-transform group-hover:scale-105",
                          item.accent,
                        )}
                      >
                        <Icon className="size-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-gray-900 dark:text-dark-50 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
                          {item.title}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-dark-300 truncate">
                          {item.desc}
                        </div>
                      </div>
                      <ChevronRightIcon className="size-4 text-gray-300 group-hover:text-primary-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Smart Search Tips Box */}
            <div className="p-3.5 rounded-xl bg-gradient-to-r from-primary-500/5 via-sky-500/5 to-purple-500/5 border border-primary-500/15 dark:border-primary-500/20">
              <div className="flex items-center gap-2 mb-2">
                <SparklesIcon className="size-4.5 text-primary-500" />
                <h4 className="text-xs font-semibold text-gray-900 dark:text-dark-100">
                  Gelişmiş Evrensel Arama
                </h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-gray-600 dark:text-dark-200">
                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-primary-600 dark:text-primary-400">🚗</span>
                  <span><strong>Plaka / Şasi:</strong> 34AB1245 veya şasi numarası</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-amber-600 dark:text-amber-400">🧾</span>
                  <span><strong>Fatura & Masraf:</strong> Belge no, plaka, tutar, tarih</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <span className="font-bold text-purple-600 dark:text-purple-400">🏢</span>
                  <span><strong>Cari & Sözleşme:</strong> Unvan, yetkili, tel, sözleşme no</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Case 2: Query entered, but no results found */}
        {hasQuery && !loading && filteredResults.length === 0 && (
          <div className="py-12 px-4 text-center">
            <div className="size-14 mx-auto mb-3 rounded-full bg-gray-100 dark:bg-dark-600 flex items-center justify-center text-gray-400 dark:text-dark-300">
              <MagnifyingGlassIcon className="size-7" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-dark-50">
              "{query}" ile eşleşen sonuç bulunamadı
            </h3>
            <p className="mt-1 text-xs text-gray-500 dark:text-dark-300 max-w-sm mx-auto">
              Araç plakası, fatura numarası, masraf kalemi, cari unvanı veya sözleşme numarasını kontrol edip tekrar deneyin.
            </p>
          </div>
        )}

        {/* Case 3: Results List */}
        {hasQuery && filteredResults.length > 0 && (
          <div className="space-y-1.5">
            {filteredResults.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const Icon = CATEGORY_ICONS[item.category] || SparklesIcon;
              const badgeStyle =
                BADGE_STYLES[item.badgeColor] || BADGE_STYLES.primary;

              return (
                <Link
                  key={`${item.id}-${idx}`}
                  ref={(el) => {
                    itemRefs.current[idx] = el;
                  }}
                  to={item.targetUrl}
                  onClick={close}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={clsx(
                    "group flex items-start gap-3 sm:gap-3.5 p-3 sm:p-3.5 rounded-xl transition-all border outline-none",
                    isSelected
                      ? "bg-primary-50/70 border-primary-500/40 dark:bg-primary-500/10 dark:border-primary-500/40 shadow-xs"
                      : "bg-gray-50/60 dark:bg-dark-700/60 border-gray-150/80 dark:border-dark-600/60 hover:bg-gray-100/70 dark:hover:bg-dark-650",
                  )}
                >
                  {/* Category Icon */}
                  <div
                    className={clsx(
                      "size-9.5 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border transition-transform",
                      badgeStyle.bg,
                      badgeStyle.text,
                      badgeStyle.border,
                      isSelected && "scale-105",
                    )}
                  >
                    <Icon className="size-5" />
                  </div>

                  {/* Content details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      {/* Module Badge */}
                      <span
                        className={clsx(
                          "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border",
                          badgeStyle.bg,
                          badgeStyle.text,
                          badgeStyle.border,
                        )}
                      >
                        {item.moduleName}
                      </span>

                      {/* Main Title */}
                      <span className="text-sm font-semibold text-gray-900 dark:text-dark-50 truncate">
                        <Highlight query={query}>{item.title}</Highlight>
                      </span>
                    </div>

                    {/* Subtitle / Metadata Details (e.g. Masraf Faturası • 34AB1245 • 23.10.2026 • 4.500 ₺) */}
                    <div className="text-xs text-gray-600 dark:text-dark-200 line-clamp-2 leading-relaxed">
                      <Highlight query={query}>{item.subtitle}</Highlight>
                    </div>
                  </div>

                  {/* Action arrow */}
                  <div className="shrink-0 flex items-center gap-1 self-center text-gray-300 dark:text-dark-400 group-hover:text-primary-500 transition-colors">
                    <span className="text-xs font-medium hidden sm:inline-block opacity-0 group-hover:opacity-100 transition-opacity text-primary-600 dark:text-primary-400">
                      Git
                    </span>
                    <ArrowRightIcon className="size-4 transition-transform group-hover:translate-x-1" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

      {/* Footer Bar with Keyboard Navigation Hints */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2.5 bg-gray-100/70 dark:bg-dark-800 border-t border-gray-150 dark:border-dark-600 text-xs text-gray-500 dark:text-dark-300">
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded-sm bg-white dark:bg-dark-650 border border-gray-200 dark:border-dark-500 text-[10px] font-semibold shadow-2xs">
              ↑
            </kbd>
            <kbd className="px-1.5 py-0.5 rounded-sm bg-white dark:bg-dark-650 border border-gray-200 dark:border-dark-500 text-[10px] font-semibold shadow-2xs">
              ↓
            </kbd>
            <span>Gezin</span>
          </span>

          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded-sm bg-white dark:bg-dark-650 border border-gray-200 dark:border-dark-500 text-[10px] font-semibold shadow-2xs">
              ↵
            </kbd>
            <span>Aç</span>
          </span>

          <span className="inline-flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 rounded-sm bg-white dark:bg-dark-650 border border-gray-200 dark:border-dark-500 text-[10px] font-semibold shadow-2xs">
              ESC
            </kbd>
            <span>Kapat</span>
          </span>
        </div>

        {hasQuery && filteredResults.length > 0 && (
          <div className="font-medium text-gray-600 dark:text-dark-200">
            {filteredResults.length} sonuç listeleniyor
          </div>
        )}
      </div>
    </div>
  );
}

function flattenNav(items: NavigationTree[]): NavigationTree[] {
  let flatArray: NavigationTree[] = [];
  items.forEach((item) => {
    if (item.path && item.type !== "collapse") {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { transKey, ...filteredItem } = item;
      flatArray.push(filteredItem);
    }
    if (item.childs) {
      flatArray = flatArray.concat(flattenNav(item.childs));
    }
  });
  return flatArray;
}
