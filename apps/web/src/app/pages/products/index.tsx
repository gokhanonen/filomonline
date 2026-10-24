import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

import { Page } from "@/components/shared/Page";
import { Button, Input, Select } from "@/components/ui";
import { InfiniteSentinel } from "@/components/shared/InfiniteSentinel";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useAuthContext } from "@/app/contexts/auth/context";
import {
  PRODUCT_TYPE_LABELS,
  type Product,
  type ProductType,
} from "@/@types/product";
import { deactivateProduct, listProducts } from "@/services/productService";
import { ProductCard } from "./ProductCard";
import { ProductForm } from "./ProductForm";

const PAGE_SIZE = 24;

const typeFilterOptions = [
  { value: "", label: "Tüm türler" },
  ...(Object.keys(PRODUCT_TYPE_LABELS) as ProductType[]).map((k) => ({
    value: k,
    label: PRODUCT_TYPE_LABELS[k],
  })),
];

export default function ProductsPage() {
  const { can } = useAuthContext();
  const canWrite = can("products.write");
  const canDelete = can("products.delete");
  const [searchParams] = useSearchParams();

  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [debounced, setDebounced] = useState("");
  const [typeFilter, setTypeFilter] = useState<ProductType | "">("");
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  const fetchPage = useCallback(
    (page: number) => {
      void refreshKey;
      return listProducts({
        page,
        pageSize: PAGE_SIZE,
        search: debounced || undefined,
        type: typeFilter || undefined,
      });
    },
    [debounced, typeFilter, refreshKey],
  );

  const { items, total, loading, hasMore, loadMore, removeItem } =
    useInfiniteList<Product>(fetchPage);

  const handleDelete = async (p: Product) => {
    if (!window.confirm(`"${p.name}" pasifleştirilsin mi?`)) return;
    try {
      await deactivateProduct(p.id);
      toast.success("Ürün pasifleştirildi");
      removeItem((x) => x.id === p.id);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "İşlem başarısız");
    }
  };

  return (
    <Page title="Malzeme / Hizmet">
      <div className="w-full px-(--margin-x) py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-medium text-gray-800 dark:text-dark-50">Malzeme / Hizmet</h2>
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
              <PlusIcon className="size-5" /> Yeni Kayıt
            </Button>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <Input
            placeholder="Ad veya kod ara..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            prefix={<MagnifyingGlassIcon className="size-5" />}
            className="sm:max-w-xs"
          />
          <Select
            data={typeFilterOptions}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as ProductType | "")}
            className="sm:max-w-48"
          />
        </div>

        {items.length === 0 && !loading ? (
          <div className="py-16 text-center text-gray-400 dark:text-dark-300">Kayıt bulunamadı.</div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {items.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onEdit={() => {
                  setEditing(p);
                  setFormOpen(true);
                }}
                onDelete={canDelete && p.isActive ? () => handleDelete(p) : undefined}
              />
            ))}
            <InfiniteSentinel onReach={loadMore} hasMore={hasMore} loading={loading} />
          </div>
        )}
      </div>

      <ProductForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => setRefreshKey((k) => k + 1)}
        product={editing}
      />
    </Page>
  );
}
