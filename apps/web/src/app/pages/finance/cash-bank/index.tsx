import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import {
  ArrowDownLeftIcon,
  ArrowUpRightIcon,
  ArrowsRightLeftIcon,
  BuildingLibraryIcon,
  BanknotesIcon,
  CreditCardIcon,
  PlusIcon,
  PencilSquareIcon,
  TrashIcon,
  DocumentDuplicateIcon,
  MagnifyingGlassIcon,
} from "@heroicons/react/24/outline";

import { Page } from "@/components/shared/Page";
import {
  Button,
  Card,
  Input,
  Select,
  Spinner,
  Table,
  Tag,
  TBody,
  Td,
  Th,
  THead,
  Tr,
} from "@/components/ui";
import {
  deleteCashRegister,
  deleteCashTransaction,
  getCashSummary,
  listCashRegisters,
  listCashTransactions,
} from "@/services/cashRegisterService";
import type {
  CashRegister,
  CashSummary,
  CashTransaction,
  CashTransactionType,
} from "@/@types/cashRegister";
import { CashRegisterModal } from "./CashRegisterModal";
import { CashTransactionModal } from "./CashTransactionModal";

function fmtTL(val?: number | null): string {
  if (val === null || val === undefined) return "0,00 ₺";
  return (
    Number(val).toLocaleString("tr-TR", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }) + " ₺"
  );
}

function fmtDate(d?: string | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("tr-TR");
}

export default function CashBankPage() {
  const [registers, setRegisters] = useState<CashRegister[]>([]);
  const [summary, setSummary] = useState<CashSummary | null>(null);
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [txLoading, setTxLoading] = useState(false);

  // Filtreler
  const [search, setSearch] = useState("");
  const [filterRegisterId, setFilterRegisterId] = useState("");
  const [filterType, setFilterType] = useState<CashTransactionType | "">("");

  // Modallar
  const [registerModalOpen, setRegisterModalOpen] = useState(false);
  const [editingRegister, setEditingRegister] = useState<CashRegister | null>(null);

  const [txModalOpen, setTxModalOpen] = useState(false);
  const [defaultTxRegisterId, setDefaultTxRegisterId] = useState<string | undefined>(undefined);
  const [defaultTxType, setDefaultTxType] = useState<CashTransactionType>("COLLECTION");

  const loadData = async () => {
    try {
      setLoading(true);
      const [regs, summ] = await Promise.all([
        listCashRegisters(),
        getCashSummary().catch(() => null),
      ]);
      setRegisters(regs);
      setSummary(summ);
    } catch (err: any) {
      toast.error("Kasa ve banka verileri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      setTxLoading(true);
      const res = await listCashTransactions({
        cashRegisterId: filterRegisterId || undefined,
        type: filterType || undefined,
        pageSize: 50,
      });
      setTransactions(res.items);
    } catch {
      toast.error("Finansal hareketler yüklenemedi.");
    } finally {
      setTxLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadTransactions();
  }, [filterRegisterId, filterType]);

  const handleCopyIban = (iban: string) => {
    navigator.clipboard.writeText(iban);
    toast.success("IBAN panoya kopyalandı: " + iban);
  };

  const handleDeleteRegister = async (id: string, name: string) => {
    if (!confirm(`"${name}" hesabını silmek istediğinize emin misiniz?`)) return;
    try {
      await deleteCashRegister(id);
      toast.success("Hesap silindi.");
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Hesap silinemedi.");
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    if (!confirm("Bu finansal hareketi iptal etmek/silmek istediğinize emin misiniz?")) return;
    try {
      await deleteCashTransaction(id);
      toast.success("Hareket silindi ve ilgili bakiye güncellendi.");
      loadData();
      loadTransactions();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Hareket silinemedi.");
    }
  };

  const openTxModalFor = (registerId?: string, type: CashTransactionType = "COLLECTION") => {
    setDefaultTxRegisterId(registerId);
    setDefaultTxType(type);
    setTxModalOpen(true);
  };

  // İstemci tarafı arama filtresi
  const filteredTransactions = useMemo(() => {
    if (!search.trim()) return transactions;
    const q = search.toLowerCase();
    return transactions.filter((t) => {
      const desc = t.description?.toLowerCase() || "";
      const doc = t.documentNo?.toLowerCase() || "";
      const acc = t.account?.name?.toLowerCase() || "";
      const reg = t.cashRegister?.name?.toLowerCase() || "";
      const plate = t.vehicle?.plate?.toLowerCase() || "";
      return desc.includes(q) || doc.includes(q) || acc.includes(q) || reg.includes(q) || plate.includes(q);
    });
  }, [transactions, search]);

  return (
    <Page title="Kasa & Banka">
      <div className="w-full px-(--margin-x) py-6 space-y-6">
        {/* ÜST BAŞLIK VE BUTONLAR */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-dark-50">
              Kasa & Banka Yönetimi
            </h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-dark-300">
              Nakit kasalar, şirket banka hesapları, POS terminalleri ve finansal nakit akışı
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="flat"
              className="flex items-center gap-1.5 border border-gray-200 dark:border-dark-600 bg-white dark:bg-dark-750"
              onClick={() => {
                setEditingRegister(null);
                setRegisterModalOpen(true);
              }}
            >
              <PlusIcon className="size-4" />
              <span>Yeni Hesap Ekle</span>
            </Button>

            <Button
              color="primary"
              className="flex items-center gap-1.5 shadow-sm"
              onClick={() => openTxModalFor(undefined, "COLLECTION")}
            >
              <ArrowsRightLeftIcon className="size-4" />
              <span>Finansal Hareket Ekle</span>
            </Button>
          </div>
        </div>

        {/* KPI / ÖZET KARTLARI */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Toplam Likidite */}
          <div className="relative overflow-hidden rounded-2xl bg-linear-to-br from-indigo-600 via-indigo-700 to-purple-800 p-5 text-white shadow-lg">
            <div className="flex items-center justify-between text-indigo-100">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Toplam Likidite
              </span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-white/15">
                <BanknotesIcon className="size-5 text-white" />
              </div>
            </div>
            <p className="mt-3 text-2xl font-black tracking-tight">
              {summary ? fmtTL(summary.grandTotal) : "..."}
            </p>
            <div className="mt-2 flex items-center justify-between text-xs text-indigo-200">
              <span>{summary?.activeAccountsCount ?? registers.length} Aktif Hesap</span>
              <span className="font-medium text-emerald-300">Net Mevduat</span>
            </div>
            <div className="pointer-events-none absolute -right-6 -bottom-6 size-28 rounded-full bg-white/10 blur-xl" />
          </div>

          {/* Nakit Kasalar */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-dark-700 dark:bg-dark-800">
            <div className="flex items-center justify-between text-gray-500 dark:text-dark-300">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Nakit Kasalar
              </span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                <BanknotesIcon className="size-5" />
              </div>
            </div>
            <p className="mt-3 text-xl font-bold text-gray-900 dark:text-dark-50">
              {summary ? fmtTL(summary.totalCash) : "..."}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-dark-400">
              {registers.filter((r) => r.type === "CASH").length} nakit kasa aktif
            </p>
          </div>

          {/* Banka Hesapları */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-dark-700 dark:bg-dark-800">
            <div className="flex items-center justify-between text-gray-500 dark:text-dark-300">
              <span className="text-xs font-semibold uppercase tracking-wider">
                Banka Hesapları
              </span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400">
                <BuildingLibraryIcon className="size-5" />
              </div>
            </div>
            <p className="mt-3 text-xl font-bold text-gray-900 dark:text-dark-50">
              {summary ? fmtTL(summary.totalBank) : "..."}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-dark-400">
              {registers.filter((r) => r.type === "BANK").length} vadesiz ticari hesap
            </p>
          </div>

          {/* POS Terminalleri */}
          <div className="relative overflow-hidden rounded-2xl border border-gray-100 bg-white p-5 shadow-xs dark:border-dark-700 dark:bg-dark-800">
            <div className="flex items-center justify-between text-gray-500 dark:text-dark-300">
              <span className="text-xs font-semibold uppercase tracking-wider">
                POS & Terminaller
              </span>
              <div className="flex size-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                <CreditCardIcon className="size-5" />
              </div>
            </div>
            <p className="mt-3 text-xl font-bold text-gray-900 dark:text-dark-50">
              {summary ? fmtTL(summary.totalPos) : "..."}
            </p>
            <p className="mt-1 text-xs text-gray-500 dark:text-dark-400">
              {registers.filter((r) => r.type === "POS").length} aktif terminal
            </p>
          </div>
        </div>

        {/* HESAP KARTLARI GRID */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-700 dark:text-dark-200">
              Kasa & Banka Hesapları
            </h2>
            <span className="text-xs text-gray-500">
              Toplam {registers.length} kayıtlı hesap
            </span>
          </div>

          {loading ? (
            <div className="flex h-32 items-center justify-center">
              <Spinner className="size-8 text-primary-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {registers.map((reg) => {
                const isBank = reg.type === "BANK";
                const isPos = reg.type === "POS";
                return (
                  <Card
                    key={reg.id}
                    className="relative flex flex-col justify-between overflow-hidden p-4.5 border border-gray-200/90 dark:border-dark-650 hover:shadow-md transition-shadow"
                  >
                    <div>
                      {/* Üst Kısım: İkon + Tip + Aksiyonlar */}
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2.5">
                          <div
                            className={`flex size-10 items-center justify-center rounded-xl ${
                              isBank
                                ? "bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300"
                                : isPos
                                  ? "bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300"
                                  : "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                            }`}
                          >
                            {isBank ? (
                              <BuildingLibraryIcon className="size-5" />
                            ) : isPos ? (
                              <CreditCardIcon className="size-5" />
                            ) : (
                              <BanknotesIcon className="size-5" />
                            )}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
                              {reg.type === "CASH" ? "Nakit Kasa" : reg.type === "BANK" ? "Banka Hesabı" : "POS"}
                            </span>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-dark-50 line-clamp-1">
                              {reg.name}
                            </h3>
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setEditingRegister(reg);
                              setRegisterModalOpen(true);
                            }}
                            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-dark-700"
                            title="Düzenle"
                          >
                            <PencilSquareIcon className="size-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteRegister(reg.id, reg.name)}
                            className="rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                            title="Sil"
                          >
                            <TrashIcon className="size-4" />
                          </button>
                        </div>
                      </div>

                      {/* Banka & Şube & IBAN */}
                      {isBank && (
                        <div className="mt-3 rounded-lg bg-gray-50 p-2.5 dark:bg-dark-750/50">
                          <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-dark-300">
                            <span>{reg.bankName || "Banka"}</span>
                            <span>{reg.branchName || "—"}</span>
                          </div>
                          {reg.iban && (
                            <div className="mt-1.5 flex items-center justify-between gap-1 text-[11px] font-mono text-gray-700 dark:text-dark-200">
                              <span className="truncate">{reg.iban}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyIban(reg.iban!)}
                                className="shrink-0 text-primary-600 hover:text-primary-700 dark:text-primary-400"
                                title="IBAN Kopyala"
                              >
                                <DocumentDuplicateIcon className="size-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bakiye & Hızlı Aksiyon */}
                    <div className="mt-4 pt-3 border-t border-gray-100 dark:border-dark-700 flex items-end justify-between">
                      <div>
                        <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider block">
                          Güncel Bakiye
                        </span>
                        <span
                          className={`text-lg font-black tracking-tight ${
                            reg.balance < 0 ? "text-rose-600 dark:text-rose-400" : "text-gray-900 dark:text-dark-50"
                          }`}
                        >
                          {fmtTL(reg.balance)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openTxModalFor(reg.id, "COLLECTION")}
                          className="flex size-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                          title="Tahsilat / Giriş Ekle"
                        >
                          <ArrowDownLeftIcon className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openTxModalFor(reg.id, "PAYMENT")}
                          className="flex size-7 items-center justify-center rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-300"
                          title="Tediye / Çıkış Ekle"
                        >
                          <ArrowUpRightIcon className="size-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => openTxModalFor(reg.id, "TRANSFER")}
                          className="flex size-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300"
                          title="Virman / Transfer Yap"
                        >
                          <ArrowsRightLeftIcon className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* HAREKETLER LİSTESİ */}
        <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-xs dark:border-dark-700 dark:bg-dark-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-gray-100 dark:border-dark-700">
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-dark-50">
                Finansal Hareketler (Nakit Akışı)
              </h2>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Tahsilat, tediye ve virman transfer hareketlerinin dökümü
              </p>
            </div>

            {/* Filtre Barı */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative w-48">
                <MagnifyingGlassIcon className="absolute left-2.5 top-2.5 size-4 text-gray-400" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Açıklama, cari, plaka..."
                  className="pl-8 text-xs py-1.5"
                />
              </div>

              <Select
                value={filterRegisterId}
                onChange={(e) => setFilterRegisterId(e.target.value)}
                className="text-xs py-1.5 w-40"
              >
                <option value="">Tüm Hesaplar</option>
                {registers.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </Select>

              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="text-xs py-1.5 w-32"
              >
                <option value="">Tüm Tipler</option>
                <option value="COLLECTION">Tahsilat (+)</option>
                <option value="PAYMENT">Tediye (-)</option>
                <option value="TRANSFER">Virman (⇄)</option>
              </Select>
            </div>
          </div>

          {txLoading ? (
            <div className="flex h-36 items-center justify-center">
              <Spinner className="size-8 text-primary-500" />
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="py-12 text-center text-gray-400 text-sm">
              Henüz kaydedilmiş bir finansal hareket bulunamadı.
            </div>
          ) : (
            <Table>
              <THead>
                <Tr>
                  <Th>Tarih</Th>
                  <Th>Tür</Th>
                  <Th>Hesap / Kasa</Th>
                  <Th>İlişkili Cari</Th>
                  <Th>İlişkili Araç</Th>
                  <Th>Belge / Dekont No</Th>
                  <Th>Açıklama</Th>
                  <Th className="text-right">Tutar</Th>
                  <Th className="w-12 text-center">İşlem</Th>
                </Tr>
              </THead>
              <TBody>
                {filteredTransactions.map((tx) => {
                  const isCol = tx.type === "COLLECTION";
                  const isPay = tx.type === "PAYMENT";
                  const isTrf = tx.type === "TRANSFER";

                  return (
                    <Tr key={tx.id} className="hover:bg-gray-50/70 dark:hover:bg-dark-750/50">
                      <Td className="whitespace-nowrap font-medium text-xs text-gray-700 dark:text-dark-200">
                        {fmtDate(tx.date)}
                      </Td>
                      <Td className="whitespace-nowrap">
                        {isCol && (
                          <Tag className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 text-[11px] font-semibold">
                            ↓ Tahsilat
                          </Tag>
                        )}
                        {isPay && (
                          <Tag className="bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-300 text-[11px] font-semibold">
                            ↑ Tediye
                          </Tag>
                        )}
                        {isTrf && (
                          <Tag className="bg-indigo-50 text-indigo-700 border-indigo-200 dark:bg-indigo-950/40 dark:text-indigo-300 text-[11px] font-semibold">
                            ⇄ Virman
                          </Tag>
                        )}
                      </Td>
                      <Td className="text-xs font-semibold text-gray-900 dark:text-dark-100">
                        {tx.cashRegister?.name || "—"}
                        {isTrf && tx.targetRegister && (
                          <span className="block text-[11px] font-normal text-indigo-600 dark:text-indigo-400">
                            → {tx.targetRegister.name}
                          </span>
                        )}
                      </Td>
                      <Td className="text-xs text-gray-600 dark:text-dark-300 font-medium">
                        {tx.account?.name || "—"}
                      </Td>
                      <Td className="text-xs font-mono text-gray-700 dark:text-dark-200">
                        {tx.vehicle ? (
                          <span className="inline-block rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-800 dark:bg-dark-700 dark:text-dark-100">
                            {tx.vehicle.plate}
                          </span>
                        ) : (
                          "—"
                        )}
                      </Td>
                      <Td className="text-xs font-mono text-gray-500">
                        {tx.documentNo || "—"}
                      </Td>
                      <Td className="text-xs text-gray-600 dark:text-dark-300 max-w-xs truncate">
                        {tx.description || "—"}
                      </Td>
                      <Td className="text-right whitespace-nowrap font-bold text-xs">
                        <span
                          className={
                            isCol
                              ? "text-emerald-600 dark:text-emerald-400"
                              : isPay
                                ? "text-rose-600 dark:text-rose-400"
                                : "text-indigo-600 dark:text-indigo-400"
                          }
                        >
                          {isCol ? "+ " : isPay ? "- " : ""}{fmtTL(tx.amount)}
                        </span>
                      </Td>
                      <Td className="text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteTransaction(tx.id)}
                          className="rounded p-1 text-gray-400 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30 transition-colors"
                          title="Hareketi Sil"
                        >
                          <TrashIcon className="size-4" />
                        </button>
                      </Td>
                    </Tr>
                  );
                })}
              </TBody>
            </Table>
          )}
        </div>
      </div>

      {/* MODALLAR */}
      <CashRegisterModal
        open={registerModalOpen}
        onClose={() => setRegisterModalOpen(false)}
        onSaved={loadData}
        editingRegister={editingRegister}
      />

      <CashTransactionModal
        open={txModalOpen}
        onClose={() => setTxModalOpen(false)}
        onSaved={() => {
          loadData();
          loadTransactions();
        }}
        registers={registers}
        defaultRegisterId={defaultTxRegisterId}
        defaultType={defaultTxType}
      />
    </Page>
  );
}
