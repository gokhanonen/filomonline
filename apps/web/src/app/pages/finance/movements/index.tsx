import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import clsx from "clsx";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import {
  TbArrowDownLeft,
  TbArrowUpRight,
  TbArrowsExchange,
  TbCar,
  TbClockHour4,
  TbFileInvoice,
  TbFilterOff,
  TbListDetails,
  TbMinus,
  TbPlus,
  TbTrash,
  TbUser,
  TbX,
} from "react-icons/tb";
import { toast } from "sonner";

import { Page } from "@/components/shared/Page";
import { InfiniteSentinel } from "@/components/shared/InfiniteSentinel";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import { Button, Input, Select } from "@/components/ui";
import { useInfiniteList } from "@/hooks/useInfiniteList";
import { useAuthContext } from "@/app/contexts/auth/context";
import type { FinanceModule, FinanceMovement, FinanceMovementType } from "@/@types/finance";
import { deleteMovementGroup, listMovements } from "@/services/financeService";
import {
  ACCOUNT_TYPE_META,
  FinanceNav,
  INVOICE_TYPE_LABEL,
  Kpi,
  MODULE_LABEL,
  MOVEMENT_TYPE_LABEL,
  MovementTypeBadge,
  errMsg,
  financeAccountOptions,
  fmtDate,
  fmtMoney,
  useAccountOptions,
  useFinanceAccounts,
} from "../shared";
import { OperationModal, type OperationDefaults, type OperationMode } from "../OperationModal";
import { DeleteGroupModal } from "./DeleteGroupModal";
import { DateRangeInput } from "./DateRangeInput";

const PAGE_SIZE = 40;

const moduleOptions = [
  { value: "", label: "Tüm modüller" },
  ...(Object.keys(MODULE_LABEL) as FinanceModule[]).map((k) => ({ value: k, label: MODULE_LABEL[k] })),
];

const typeOptions = [
  { value: "", label: "Tüm işlem tipleri" },
  ...(Object.keys(MOVEMENT_TYPE_LABEL) as FinanceMovementType[]).map((k) => ({ value: k, label: MOVEMENT_TYPE_LABEL[k] })),
];

const isModule = (v: string | null): v is FinanceModule => !!v && v in MODULE_LABEL;
const isType = (v: string | null): v is FinanceMovementType => !!v && v in MOVEMENT_TYPE_LABEL;

/** Aynı groupId'ye sahip ardışık hareketleri tek blokta topla */
function groupConsecutive(items: FinanceMovement[]) {
  const groups: { groupId: string; legs: FinanceMovement[] }[] = [];
  for (const m of items) {
    const last = groups[groups.length - 1];
    if (last && last.groupId === m.groupId) last.legs.push(m);
    else groups.push({ groupId: m.groupId, legs: [m] });
  }
  return groups;
}

export default function FinanceMovementsPage() {
  const { can } = useAuthContext();
  const canWrite = can("finance.write");
  const canDelete = can("finance.delete");
  const [searchParams, setSearchParams] = useSearchParams();

  // ---- Filtreler (URL'den başlangıç değerleri: diğer sayfalardan derin bağlantı) ----
  const [search, setSearch] = useState(() => searchParams.get("search") || "");
  const [debounced, setDebounced] = useState(() => searchParams.get("search") || "");
  const [module, setModule] = useState<FinanceModule | "">(() => {
    const v = searchParams.get("module");
    return isModule(v) ? v : "";
  });
  const [type, setType] = useState<FinanceMovementType | "">(() => {
    const v = searchParams.get("type");
    return isType(v) ? v : "";
  });
  const [cashRegisterId, setCashRegisterId] = useState(() => searchParams.get("cashRegisterId") || "");
  const [accountId, setAccountId] = useState(() => searchParams.get("accountId") || "");
  const [chequeId, setChequeId] = useState(() => searchParams.get("chequeId") || "");
  const [from, setFrom] = useState(() => searchParams.get("from") || "");
  const [to, setTo] = useState(() => searchParams.get("to") || "");

  const [refreshKey, setRefreshKey] = useState(0);
  const [op, setOp] = useState<OperationMode | null>(null);
  const [deleting, setDeleting] = useState<{ groupId: string; legs: FinanceMovement[] } | null>(null);

  const { accounts } = useFinanceAccounts();
  const { options: cariOptions } = useAccountOptions();

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 350);
    return () => clearTimeout(t);
  }, [search]);

  // Filtreleri URL ile senkron tut (paylaşılabilir / geri tuşu dostu)
  useEffect(() => {
    const next = new URLSearchParams();
    const entries: [string, string][] = [
      ["search", debounced],
      ["module", module],
      ["type", type],
      ["cashRegisterId", cashRegisterId],
      ["accountId", accountId],
      ["chequeId", chequeId],
      ["from", from],
      ["to", to],
    ];
    for (const [k, v] of entries) if (v) next.set(k, v);
    if (next.toString() !== searchParams.toString()) setSearchParams(next, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced, module, type, cashRegisterId, accountId, chequeId, from, to]);

  const fetchPage = useCallback(
    (page: number) => {
      void refreshKey;
      return listMovements({
        page,
        pageSize: PAGE_SIZE,
        search: debounced || undefined,
        module: module || undefined,
        type: type || undefined,
        cashRegisterId: cashRegisterId || undefined,
        accountId: accountId || undefined,
        chequeId: chequeId || undefined,
        from: from || undefined,
        to: to || undefined,
      });
    },
    [debounced, module, type, cashRegisterId, accountId, chequeId, from, to, refreshKey],
  );

  const { items, total, loading, hasMore, loadMore } = useInfiniteList<FinanceMovement>(fetchPage);
  const groups = useMemo(() => groupConsecutive(items), [items]);

  const sums = useMemo(() => {
    let inTry = 0;
    let outTry = 0;
    for (const m of items) {
      if (m.direction === "IN") inTry += Number(m.amountTry || 0);
      else outTry += Number(m.amountTry || 0);
    }
    return { inTry, outTry, net: inTry - outTry };
  }, [items]);

  const finOptions = useMemo(
    () => financeAccountOptions(accounts, module && module !== "CHEQUE" ? [module] : undefined),
    [accounts, module],
  );

  const chequeLabel = useMemo(() => {
    if (!chequeId) return "";
    const c = items.find((m) => m.cheque?.id === chequeId)?.cheque;
    return c ? `${c.kind === "NOTE" ? "Senet" : "Çek"} #${c.serialNo}` : "Seçili çek/senet";
  }, [chequeId, items]);

  const hasFilters = !!(search || module || type || cashRegisterId || accountId || chequeId || from || to);
  const clearFilters = () => {
    setSearch("");
    setDebounced("");
    setModule("");
    setType("");
    setCashRegisterId("");
    setAccountId("");
    setChequeId("");
    setFrom("");
    setTo("");
  };

  const opDefaults: OperationDefaults | undefined = useMemo(() => {
    if (op === "transfer") return cashRegisterId ? { fromId: cashRegisterId } : undefined;
    const d: OperationDefaults = {};
    if (accountId) d.accountId = accountId;
    if (cashRegisterId) {
      d.cashRegisterId = cashRegisterId;
      const acc = accounts.find((a) => a.id === cashRegisterId);
      if (acc) d.module = acc.type;
    }
    return Object.keys(d).length ? d : undefined;
  }, [op, accountId, cashRegisterId, accounts]);

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteMovementGroup(deleting.groupId);
      toast.success("İşlem silindi");
      setDeleting(null);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      toast.error(errMsg(err, "İşlem silinemedi"));
    }
  };

  return (
    <Page title="Finans - Hareketler">
      <div className="w-full space-y-4 px-(--margin-x) py-4">
        <FinanceNav
          actions={
            canWrite && (
              <>
                <Button color="success" className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold" onClick={() => setOp("collection")}>
                  <TbArrowDownLeft className="size-4" /> Tahsilat
                </Button>
                <Button color="error" className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold" onClick={() => setOp("payment")}>
                  <TbArrowUpRight className="size-4" /> Ödeme
                </Button>
                <Button color="info" className="h-8 gap-1.5 rounded-lg px-3 text-xs font-semibold" onClick={() => setOp("transfer")}>
                  <TbArrowsExchange className="size-4" /> Virman
                </Button>
              </>
            )
          }
        />

        {/* Filtreler */}
        <div className="rounded-2xl border border-gray-150 bg-white p-3 shadow-sm dark:border-dark-600 dark:bg-dark-700">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
            <Input
              placeholder="Açıklama, belge no, çek no..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              prefix={<MagnifyingGlassIcon className="size-4" />}
              classNames={{ root: "2xl:col-span-2" }}
            />
            <Select
              data={moduleOptions}
              value={module}
              onChange={(e) => {
                const v = e.target.value as FinanceModule | "";
                setModule(v);
                if (v === "CHEQUE") setCashRegisterId("");
                else if (v && cashRegisterId && accounts.find((a) => a.id === cashRegisterId)?.type !== v) setCashRegisterId("");
              }}
            />
            <Select data={typeOptions} value={type} onChange={(e) => setType(e.target.value as FinanceMovementType | "")} />
            <SearchableSelect
              options={finOptions}
              value={cashRegisterId}
              onChange={setCashRegisterId}
              placeholder="Kasa / banka / POS / KK"
              disabled={module === "CHEQUE"}
            />
            <SearchableSelect options={cariOptions} value={accountId} onChange={setAccountId} placeholder="Cari seçin" />
            <DateRangeInput label="Tarih" from={from} to={to} onFromChange={setFrom} onToChange={setTo} className="sm:col-span-2" />
          </div>
          {(chequeId || hasFilters) && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {chequeId && (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400">
                  {chequeLabel}
                  <button type="button" onClick={() => setChequeId("")} className="rounded-full p-0.5 hover:bg-amber-500/20" title="Çek filtresini kaldır">
                    <TbX className="size-3" />
                  </button>
                </span>
              )}
              {hasFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-dark-300 dark:hover:bg-dark-600"
                >
                  <TbFilterOff className="size-3.5" /> Filtreleri temizle
                </button>
              )}
            </div>
          )}
        </div>

        {/* Özet şeridi */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Kpi label="Hareket" value={total.toLocaleString("tr-TR")} hint={items.length < total ? `${items.length} yüklendi` : "Tümü yüklendi"} Icon={TbListDetails} />
          <Kpi label="Σ Giriş (TL)" value={fmtMoney(sums.inTry)} tone="success" hint="Yüklenen kayıtlar" Icon={TbPlus} />
          <Kpi label="Σ Çıkış (TL)" value={fmtMoney(sums.outTry)} tone="error" hint="Yüklenen kayıtlar" Icon={TbMinus} />
          <Kpi label="Net (TL)" value={fmtMoney(sums.net)} tone={sums.net > 0 ? "success" : sums.net < 0 ? "error" : "default"} hint="Giriş − çıkış" Icon={TbArrowsExchange} />
        </div>

        {/* Liste */}
        {items.length === 0 && !loading ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-gray-200 py-16 text-center text-gray-400 dark:border-dark-600 dark:text-dark-300">
            <TbListDetails className="size-10 text-gray-300 dark:text-dark-500" />
            <p>Hareket bulunamadı.</p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="hidden px-4 text-tiny font-semibold uppercase tracking-wide text-gray-400 dark:text-dark-300 lg:grid lg:grid-cols-[92px_minmax(0,1.2fr)_minmax(0,1.5fr)_96px_minmax(150px,auto)_36px] lg:gap-3">
              <span>Tarih</span>
              <span>İşlem / Hesap</span>
              <span>Cari / Açıklama</span>
              <span>Araç</span>
              <span className="text-right">Tutar</span>
              <span />
            </div>
            {groups.map((g) => (
              <GroupBlock
                key={`${g.groupId}-${g.legs[0].id}`}
                legs={g.legs}
                onDelete={canDelete ? () => setDeleting(g) : undefined}
              />
            ))}
            <InfiniteSentinel onReach={loadMore} hasMore={hasMore} loading={loading} />
          </div>
        )}
      </div>

      <OperationModal
        open={op !== null}
        mode={op ?? "collection"}
        defaults={opDefaults}
        onClose={() => setOp(null)}
        onDone={() => {
          setOp(null);
          setRefreshKey((k) => k + 1);
        }}
      />

      <DeleteGroupModal
        open={!!deleting}
        legs={deleting?.legs ?? []}
        onClose={() => setDeleting(null)}
        onConfirm={handleDelete}
      />
    </Page>
  );
}

// ---------------------------------------------------------------------------

function GroupBlock({ legs, onDelete }: { legs: FinanceMovement[]; onDelete?: () => void }) {
  const multi = legs.length > 1;
  return (
    <div
      className={clsx(
        "group relative overflow-hidden rounded-2xl border border-gray-150 bg-white shadow-sm transition hover:shadow-md dark:border-dark-600 dark:bg-dark-700",
        multi && "border-l-4 border-l-primary-400 dark:border-l-primary-500",
      )}
    >
      {multi && (
        <div className="flex items-center gap-1.5 border-b border-dashed border-gray-150 bg-gray-50/70 px-4 py-1 text-tiny font-semibold uppercase tracking-wide text-gray-400 dark:border-dark-600 dark:bg-dark-800/40 dark:text-dark-300">
          <TbArrowsExchange className="size-3.5" />
          {MOVEMENT_TYPE_LABEL[legs[0].type]} · {legs.length} bacaklı işlem
        </div>
      )}
      <div className="divide-y divide-gray-100 dark:divide-dark-600">
        {legs.map((m, i) => (
          <MovementRow key={m.id} m={m} action={i === 0 ? onDelete : undefined} showActionSlot />
        ))}
      </div>
    </div>
  );
}

function MovementRow({ m, action, showActionSlot }: { m: FinanceMovement; action?: () => void; showActionSlot?: boolean }) {
  const meta = ACCOUNT_TYPE_META[m.module];
  const isIn = m.direction === "IN";
  const foreign = m.currency !== "TRY";
  const isPosCollection = m.module === "POS" && m.type === "POS_COLLECTION";

  const mainName = m.cheque
    ? `${m.cheque.kind === "NOTE" ? "Senet" : "Çek"} #${m.cheque.serialNo}`
    : m.cashRegister?.name ?? MODULE_LABEL[m.module];
  const mainSub = m.cheque ? `Vade ${fmtDate(m.cheque.dueDate)}` : m.cashRegister?.bankName || MODULE_LABEL[m.module];

  const allocTitle = m.allocations
    .map((a) => `${INVOICE_TYPE_LABEL[a.invoiceType]}: ${fmtMoney(a.amount, m.currency)}`)
    .join("\n");

  return (
    <div className="flex flex-col gap-2 px-4 py-3 lg:grid lg:grid-cols-[92px_minmax(0,1.2fr)_minmax(0,1.5fr)_96px_minmax(150px,auto)_36px] lg:items-center lg:gap-3">
      {/* Tarih */}
      <div className="flex items-center justify-between lg:block">
        <span className="text-sm font-medium text-gray-700 dark:text-dark-100">{fmtDate(m.date)}</span>
        <span className="lg:hidden">
          <MovementTypeBadge type={m.type} />
        </span>
      </div>

      {/* İşlem + ana kayıt */}
      <div className="flex min-w-0 items-center gap-3">
        <div className={clsx("flex size-9 shrink-0 items-center justify-center rounded-xl", meta.soft)}>
          <meta.Icon className="size-5" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="hidden lg:inline">
              <MovementTypeBadge type={m.type} />
            </span>
            <span className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">{mainName}</span>
          </div>
          <p className="truncate text-xs text-gray-400 dark:text-dark-300">{mainSub}</p>
        </div>
      </div>

      {/* Cari + açıklama */}
      <div className="min-w-0">
        {m.account ? (
          <p className="flex items-center gap-1 truncate text-sm font-medium text-gray-700 dark:text-dark-100">
            <TbUser className="size-3.5 shrink-0 text-gray-400" />
            <span className="truncate">{m.account.name}</span>
          </p>
        ) : null}
        <p className="truncate text-xs text-gray-500 dark:text-dark-300" title={m.description ?? undefined}>
          {m.documentNo && <span className="mr-1.5 rounded bg-gray-100 px-1 py-px font-mono text-tiny text-gray-600 dark:bg-dark-600 dark:text-dark-200">{m.documentNo}</span>}
          {m.description || (!m.account && !m.documentNo ? "—" : "")}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1 empty:hidden">
          {m.allocations.length > 0 && (
            <span title={allocTitle} className="inline-flex items-center gap-1 rounded bg-primary-500/10 px-1.5 py-px text-tiny font-semibold text-primary-600 dark:text-primary-400">
              <TbFileInvoice className="size-3" /> {m.allocations.length} fatura
            </span>
          )}
          {m.valueDate && (m.module === "POS" || m.type === "POS_SETTLEMENT") && (
            <span className="inline-flex items-center gap-1 rounded bg-violet-500/10 px-1.5 py-px text-tiny font-semibold text-violet-600 dark:text-violet-400">
              Valör {fmtDate(m.valueDate)}
            </span>
          )}
          {isPosCollection && !m.settled && (
            <span className="inline-flex items-center gap-1 rounded bg-warning/15 px-1.5 py-px text-tiny font-semibold text-warning">
              <TbClockHour4 className="size-3" /> Bekliyor
            </span>
          )}
        </div>
      </div>

      {/* Araç */}
      <div className="min-w-0">
        {m.vehicle ? (
          <span className="inline-flex items-center gap-1 rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 font-mono text-xs font-semibold text-gray-700 dark:border-dark-500 dark:bg-dark-800 dark:text-dark-100">
            <TbCar className="size-3.5 text-gray-400" />
            {m.vehicle.plate}
          </span>
        ) : (
          <span className="hidden text-xs text-gray-300 dark:text-dark-500 lg:inline">—</span>
        )}
      </div>

      {/* Tutar */}
      <div className="flex items-end justify-between gap-2 lg:block lg:text-right">
        <span className="text-xs text-gray-400 lg:hidden">{isIn ? "Giriş" : "Çıkış"}</span>
        <div>
          <p className={clsx("whitespace-nowrap text-base font-bold tabular-nums", isIn ? "text-success" : "text-error")}>
            {isIn ? "+" : "−"}
            {fmtMoney(m.amount, m.currency)}
          </p>
          {foreign && (
            <p className="whitespace-nowrap text-tiny text-gray-400 tabular-nums dark:text-dark-300">
              ≈ {fmtMoney(m.amountTry)} · kur {Number(m.exchangeRate).toLocaleString("tr-TR", { maximumFractionDigits: 4 })}
            </p>
          )}
        </div>
      </div>

      {/* Eylem */}
      {showActionSlot && (
        <div className={clsx("flex justify-end", !action && "hidden lg:flex")}>
          {action && (
            <button
              type="button"
              onClick={action}
              title="İşlemi Sil"
              aria-label="İşlemi Sil"
              className="flex size-8 items-center justify-center rounded-full bg-gray-100 text-gray-500 transition hover:bg-error/10 hover:text-error lg:opacity-0 lg:group-hover:opacity-100 dark:bg-dark-600 dark:text-dark-200"
            >
              <TbTrash className="size-4" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
