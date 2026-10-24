import { useCallback, useEffect, useState } from "react";
import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

import { Page } from "@/components/shared/Page";
import { Button, Input } from "@/components/ui";
import { InfiniteSentinel } from "@/components/shared/InfiniteSentinel";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useAuthContext } from "@/app/contexts/auth/context";
import type { Location } from "@/@types/location";
import { deactivateLocation, listLocations } from "@/services/locationService";
import { LocationCard } from "./LocationCard";
import { LocationForm } from "./LocationForm";

const PAGE_SIZE = 24;

export default function LocationsPage() {
  const { can } = useAuthContext();
  const canWrite = can("locations.write");

  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    (page: number) => {
      void refreshKey;
      return listLocations({ page, pageSize: PAGE_SIZE, search: debounced || undefined });
    },
    [debounced, refreshKey],
  );

  const { items, total, loading, hasMore, loadMore, removeItem } =
    useInfiniteList<Location>(fetchPage);

  const handleDelete = async (l: Location) => {
    if (!window.confirm(`"${l.name}" pasifleştirilsin mi?`)) return;
    try {
      await deactivateLocation(l.id);
      toast.success("Lokasyon pasifleştirildi");
      removeItem((x) => x.id === l.id);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "İşlem başarısız");
    }
  };

  return (
    <Page title="Lokasyonlar">
      <div className="w-full px-(--margin-x) py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-medium text-gray-800 dark:text-dark-50">Lokasyonlar</h2>
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
              <PlusIcon className="size-5" /> Yeni Lokasyon
            </Button>
          )}
        </div>

        <div className="mt-4">
          <Input
            placeholder="Ad, kod veya il ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix={<MagnifyingGlassIcon className="size-5" />}
            className="sm:max-w-xs"
          />
        </div>

        {items.length === 0 && !loading ? (
          <div className="py-16 text-center text-gray-400 dark:text-dark-300">Kayıt bulunamadı.</div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {items.map((l) => (
              <LocationCard
                key={l.id}
                location={l}
                onEdit={() => {
                  setEditing(l);
                  setFormOpen(true);
                }}
                onDelete={canWrite && l.isActive ? () => handleDelete(l) : undefined}
              />
            ))}
            <InfiniteSentinel onReach={loadMore} hasMore={hasMore} loading={loading} />
          </div>
        )}
      </div>

      <LocationForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => setRefreshKey((k) => k + 1)}
        location={editing}
      />
    </Page>
  );
}
