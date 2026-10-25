// Import Dependencies
import { useState } from "react";
import { MagnifyingGlassIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { useNavigate } from "react-router";

// Local Imports
import { Input, Spinner } from "@/components/ui";
import { useDebounceValue } from "@/hooks";

// ----------------------------------------------------------------------

interface NavSearchItem {
  id: string;
  title: string;
  category: string;
  to: string;
}

const SEARCH_INDEX: NavSearchItem[] = [
  { id: "1", title: "Araç Listesi & Filo", category: "Araçlar", to: "/vehicles" },
  { id: "2", title: "Yeni Araç Girişi", category: "Araçlar", to: "/vehicles" },
  { id: "3", title: "Cari Hesaplar & Müşteriler", category: "Cariler", to: "/accounts" },
  { id: "4", title: "CRM / Potansiyel Müşteriler", category: "CRM", to: "/crm/leads" },
  { id: "5", title: "Deneme Sürüşleri", category: "CRM", to: "/crm/test-drives" },
  { id: "6", title: "Teklifler", category: "CRM", to: "/crm/quotes" },
  { id: "7", title: "Sözleşmeler (Kiralama & Satış)", category: "Sözleşmeler", to: "/contracts" },
  { id: "8", title: "Faturalar & Tahsilat", category: "Finans", to: "/invoices" },
  { id: "9", title: "Masraflar & Bakım", category: "Finans", to: "/expenses" },
  { id: "10", title: "Katalog & Tanımlar", category: "Tanımlar", to: "/catalog" },
  { id: "11", title: "Evrak Tanımları", category: "Tanımlar", to: "/catalog?tab=documents" },
  { id: "12", title: "Aktivite & Log Akışı", category: "Sistem", to: "/activity" },
  { id: "13", title: "Kullanıcılar & Roller", category: "Yönetim", to: "/users" },
  { id: "14", title: "Sistem Ayarları", category: "Ayarlar", to: "/settings" },
];

interface SearchProps {
  close?: () => void;
}

export function Search({ close }: SearchProps) {
  const [search, setSearch] = useState<string>("");
  const [deferredSearch] = useDebounceValue(search, 200);
  const navigate = useNavigate();

  const query = deferredSearch.trim().toLowerCase();
  const results = query
    ? SEARCH_INDEX.filter(
        (item) =>
          item.title.toLowerCase().includes(query) ||
          item.category.toLowerCase().includes(query)
      )
    : [];

  const handleSelect = (to: string) => {
    setSearch("");
    close?.();
    navigate(to);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && results.length > 0) {
      handleSelect(results[0].to);
    }
  };

  return (
    <div className="relative px-3 py-1">
      <Input
        placeholder="Menü, modül veya işlem ara..."
        unstyled
        className="h-8.5 w-full rounded-lg bg-gray-150 px-9 py-2 text-xs ring-primary-500/50 placeholder:text-gray-400 focus:ring-2 dark:bg-dark-900 dark:placeholder:text-dark-200/70"
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onKeyDown={handleKeyDown}
        prefix={
          deferredSearch !== search ? (
            <Spinner
              color="primary"
              variant="soft"
              className="size-4 border-2"
            />
          ) : (
            <MagnifyingGlassIcon className="size-4 text-gray-400" />
          )
        }
        suffix={
          search ? (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-100"
            >
              <XMarkIcon className="size-3.5" />
            </button>
          ) : undefined
        }
      />

      {/* Instant matching results dropdown */}
      {query && (
        <div className="absolute left-3 right-3 top-10 z-20 mt-1 max-h-56 overflow-y-auto rounded-lg border border-gray-200 bg-white p-1.5 shadow-lg dark:border-dark-600 dark:bg-dark-700">
          {results.length > 0 ? (
            results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item.to)}
                className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-gray-100 dark:hover:bg-dark-600"
              >
                <span className="font-medium text-gray-800 dark:text-dark-100">
                  {item.title}
                </span>
                <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-medium text-gray-500 dark:bg-dark-800 dark:text-dark-300">
                  {item.category}
                </span>
              </button>
            ))
          ) : (
            <div className="px-3 py-2 text-center text-xs text-gray-400 dark:text-dark-300">
              Sonuç bulunamadı
            </div>
          )}
        </div>
      )}
    </div>
  );
}
