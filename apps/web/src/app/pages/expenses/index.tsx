import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import {
  MagnifyingGlassIcon,
  PencilSquareIcon,
  PlusIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

import { Page } from "@/components/shared/Page";
import {
  Button,
  Card,
  Select,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Tag,
} from "@/components/ui";
import { InfiniteSentinel } from "@/components/shared/InfiniteSentinel";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useAuthContext } from "@/app/contexts/auth/context";
import {
  EXPENSE_INVOICE_LABELS,
  EXPENSE_TARGET_LABELS,
  type Expense,
  type ExpenseInvoiceType,
} from "@/@types/expense";
import { deleteExpense, listExpenses } from "@/services/expenseService";
import { ExpenseForm } from "./ExpenseForm";

const PAGE_SIZE = 30;

const typeFilter = [
  { value: "", label: "Tüm belgeler" },
  ...Object.keys(EXPENSE_INVOICE_LABELS).map((k) => ({
    value: k,
    label: EXPENSE_INVOICE_LABELS[k as ExpenseInvoiceType],
  })),
];

function money(v: string): string {
  return Number(v).toLocaleString("tr-TR", { minimumFractionDigits: 2 }) + " ₺";
}
function fmtDate(d: string): string {
  return new Date(d).toLocaleDateString("tr-TR");
}

export default function ExpensesPage() {
  const { can } = useAuthContext();
  const canWrite = can("expenses.write");
  const canDelete = can("expenses.delete");
  const [searchParams] = useSearchParams();
  const urlSearch = searchParams.get("search") || "";

  const [invoiceType, setInvoiceType] = useState<ExpenseInvoiceType | "">("");
  const [search, setSearch] = useState(urlSearch);
  const [refreshKey, setRefreshKey] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Expense | null>(null);

  useEffect(() => {
    const s = searchParams.get("search");
    if (s !== null) {
      setSearch(s);
    }
  }, [searchParams]);

  const fetchPage = useCallback(
    (page: number) => {
      void refreshKey;
      return listExpenses({
        page,
        pageSize: PAGE_SIZE,
        invoiceType: invoiceType || undefined,
        search: search || undefined,
      });
    },
    [invoiceType, search, refreshKey],
  );

  const { items, total, loading, hasMore, loadMore, removeItem } =
    useInfiniteList<Expense>(fetchPage);

  const handleDelete = async (e: Expense) => {
    if (!window.confirm("Bu masraf silinsin mi?")) return;
    try {
      await deleteExpense(e.id);
      toast.success("Masraf silindi");
      removeItem((x) => x.id === e.id);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "İşlem başarısız");
    }
  };

  return (
    <Page title="Masraflar">
      <div className="w-full px-(--margin-x) py-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-medium text-gray-800 dark:text-dark-50">Masraflar</h2>
            <p className="text-sm text-gray-400 dark:text-dark-300">{total} belge</p>
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
              <PlusIcon className="size-5" /> Yeni Masraf
            </Button>
          )}
        </div>

        <Card className="mt-4 p-4">
          <Select
            data={typeFilter}
            value={invoiceType}
            onChange={(e) => setInvoiceType(e.target.value as ExpenseInvoiceType | "")}
            prefix={<MagnifyingGlassIcon className="size-5" />}
            className="sm:max-w-52"
          />

          <div className="mt-4 overflow-x-auto">
            {items.length === 0 && !loading ? (
              <div className="py-12 text-center text-gray-400 dark:text-dark-300">Kayıt bulunamadı.</div>
            ) : (
              <Table hoverable className="w-full text-left">
                <THead>
                  <Tr>
                    <Th>Tarih</Th>
                    <Th>Belge No</Th>
                    <Th>Tip</Th>
                    <Th>Yer</Th>
                    <Th className="text-right">Genel Toplam</Th>
                    <Th className="text-right">İşlem</Th>
                  </Tr>
                </THead>
                <TBody>
                  {items.map((e) => (
                    <Tr key={e.id}>
                      <Td>{fmtDate(e.documentDate)}</Td>
                      <Td className="font-mono text-xs">{e.documentNo ?? "—"}</Td>
                      <Td>
                        <Tag color={e.invoiceType === "RECEIVED" ? "error" : "success"}>
                          {EXPENSE_INVOICE_LABELS[e.invoiceType]}
                        </Tag>
                      </Td>
                      <Td>{EXPENSE_TARGET_LABELS[e.expenseType]}</Td>
                      <Td className="text-right font-medium">{money(e.grandTotal)}</Td>
                      <Td className="text-right">
                        <div className="flex justify-end gap-1">
                          {canWrite && (
                            <button type="button" onClick={() => { setEditing(e); setFormOpen(true); }} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-primary-600 dark:text-dark-300 dark:hover:bg-dark-600" title="Düzenle">
                              <PencilSquareIcon className="size-4.5" />
                            </button>
                          )}
                          {canDelete && (
                            <button type="button" onClick={() => handleDelete(e)} className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-error dark:text-dark-300 dark:hover:bg-dark-600" title="Sil">
                              <TrashIcon className="size-4.5" />
                            </button>
                          )}
                        </div>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
            <InfiniteSentinel onReach={loadMore} hasMore={hasMore} loading={loading} />
          </div>
        </Card>
      </div>

      <ExpenseForm
        open={formOpen}
        onClose={() => setFormOpen(false)}
        onSaved={() => setRefreshKey((k) => k + 1)}
        expense={editing}
      />
    </Page>
  );
}
