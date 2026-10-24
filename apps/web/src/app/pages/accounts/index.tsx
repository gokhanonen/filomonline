import { useCallback, useEffect, useState } from "react";
import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

import { Page } from "@/components/shared/Page";
import { Button, Input, Select } from "@/components/ui";
import { InfiniteSentinel } from "@/components/shared/InfiniteSentinel";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useAuthContext } from "@/app/contexts/auth/context";
import {
  ACCOUNT_TYPE_LABELS,
  type Account,
  type AccountType,
} from "@/@types/account";
import { deactivateAccount, listAccounts } from "@/services/accountService";
import { AccountCard } from "./AccountCard";
import { AccountForm } from "./AccountForm";

const PAGE_SIZE = 24;

const typeFilterOptions = [
  { value: "", label: "Tüm tipler" },
  ...(Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((k) => ({
    value: k,
    label: ACCOUNT_TYPE_LABELS[k],
  })),
];

export default function AccountsPage() {
  const { can } = useAuthContext();
  const canWrite = can("accounts.write");
  const canDelete = can("accounts.delete");

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [typeFilter, setTypeFilter] = useState<AccountType | "">("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    (page: number) => {
      void refreshKey;
      return listAccounts({
        page,
        pageSize: PAGE_SIZE,
        search: debounced || undefined,
        type: typeFilter || undefined,
      });
    },
    [debounced, typeFilter, refreshKey],
  );

  const { items, total, loading, hasMore, loadMore, removeItem } =
    useInfiniteList<Account>(fetchPage);

  const handleDelete = async (a: Account) => {
    if (!window.confirm(`"${a.name}" pasifleştirilsin mi?`)) return;
    try {
      await deactivateAccount(a.id);
      toast.success("Cari pasifleştirildi");
      removeItem((x) => x.id === a.id);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "İşlem başarısız");
    }
  };

  return (
    <Page title="Cariler">
      <div className="w-full px-(--margin-x) py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-medium text-gray-800 dark:text-dark-50">Cariler</h2>
            <p className="text-sm text-gray-400 dark:text-dark-300">{total} kayıt</p>
          </div>
          {canWrite && (
            <Button
              color="primary"
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="gap-2"
            >
              <PlusIcon className="size-5" /> Yeni Cari
            </Button>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Ad, telefon, vergi no ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix={<MagnifyingGlassIcon className="size-5" />}
            className="sm:max-w-xs"
          />
          <Select
            data={typeFilterOptions}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as AccountType | "")}
            className="sm:max-w-48"
          />
        </div>

        {items.length === 0 && !loading ? (
          <div className="py-16 text-center text-gray-400 dark:text-dark-300">Kayıt bulunamadı.</div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {items.map((a) => (
              <AccountCard
                key={a.id}
                account={a}
                onEdit={() => {
                  setEditing(a);
                  setFormOpen(true);
                }}
                onDelete={canDelete && a.isActive ? () => handleDelete(a) : undefined}
              />
            ))}
            <InfiniteSentinel onReach={loadMore} hasMore={hasMore} loading={loading} />
          </div>
        )}
      </div>

      <AccountForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => setRefreshKey((k) => k + 1)}
        account={editing}
      />
    </Page>
  );
}
