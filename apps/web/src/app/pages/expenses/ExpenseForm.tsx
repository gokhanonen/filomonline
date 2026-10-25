import { useEffect, useMemo, useState } from "react";
import { Controller, useFieldArray, useForm, useWatch } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import { toast } from "sonner";
import { PlusIcon, TrashIcon } from "@heroicons/react/24/outline";

import { Button, Input, NumericInput, Select } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import { SearchableSelect } from "@/components/shared/SearchableSelect";
import {
  EXPENSE_TARGET_LABELS,
  type Expense,
  type ExpenseFormValues,
} from "@/@types/expense";
import type { Account } from "@/@types/account";
import type { Vehicle } from "@/@types/vehicle";
import type { Location } from "@/@types/location";
import { listAccounts } from "@/services/accountService";
import { listVehicles } from "@/services/vehicleService";
import { listLocations } from "@/services/locationService";
import { listProducts } from "@/services/productService";
import { createExpense, getExpense, updateExpense } from "@/services/expenseService";
import type { Product } from "@/@types/product";

const schema = Yup.object().shape({
  invoiceType: Yup.string().oneOf(["RECEIVED", "PROVIDED"]).required(),
  expenseType: Yup.string().oneOf(["VEHICLE", "LOCATION", "GENERAL"]).required(),
  documentDate: Yup.string().required("Tarih zorunlu"),
  lines: Yup.array()
    .of(
      Yup.object().shape({
        type: Yup.string().required(),
        productId: Yup.string().optional().nullable(),
        name: Yup.string().trim().required("Ad zorunlu"),
        code: Yup.string().trim().optional(),
        quantity: Yup.number().min(0).required(),
        unitPrice: Yup.number().min(0).required(),
        vatRate: Yup.number().min(0).max(100).required(),
      }),
    )
    .min(1, "En az bir satır ekleyin"),
});

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  expense?: Expense | null;
  initialVehicleId?: string; // kart "Masraf Ekle" ile ön-seçim
}

const targetOpts = Object.keys(EXPENSE_TARGET_LABELS).map((k) => ({
  value: k,
  label: EXPENSE_TARGET_LABELS[k as keyof typeof EXPENSE_TARGET_LABELS],
}));

const emptyLine = {
  type: "RECEIVED_SERVICE" as const,
  productId: "",
  code: "",
  name: "",
  quantity: 1,
  unitPrice: 0,
  vatRate: 20,
};

export function ExpenseForm({ open, onClose, onSaved, expense, initialVehicleId }: Props) {
  const isEdit = !!expense;
  const [suppliers, setSuppliers] = useState<Account[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<ExpenseFormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: {
      invoiceType: "RECEIVED",
      expenseType: "GENERAL",
      documentDate: new Date().toISOString().slice(0, 10),
      lines: [emptyLine],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "lines" });
  const watchedLines = useWatch({ control, name: "lines" });
  const expenseType = useWatch({ control, name: "expenseType" });

  useEffect(() => {
    if (!open) return;
    listAccounts({ type: "SUPPLIER", onlyActive: true, pageSize: 200 })
      .then((r) => setSuppliers(r.items))
      .catch(() => void 0);
    listVehicles({ pageSize: 200 }).then((r) => setVehicles(r.items)).catch(() => void 0);
    listLocations({ onlyActive: true, pageSize: 200 }).then((r) => setLocations(r.items)).catch(() => void 0);
    listProducts({ onlyActive: true, pageSize: 200 }).then((r) => setProducts(r.items)).catch(() => void 0);
  }, [open]);

  // Autocomplete Seçenekleri (SearchableOptions)
  const supplierOptions = useMemo(
    () =>
      suppliers.map((s) => ({
        value: s.id,
        label: s.name,
        subLabel: s.city ? `${s.city}${s.district ? ` / ${s.district}` : ""}` : undefined,
        badge: s.taxNumber ? `VKN: ${s.taxNumber}` : undefined,
      })),
    [suppliers],
  );

  const vehicleOptions = useMemo(
    () =>
      vehicles.map((v) => ({
        value: v.id,
        label: v.plate,
        subLabel: [v.brandName, v.modelName, v.year ? String(v.year) : ""].filter(Boolean).join(" "),
        badge: v.status,
      })),
    [vehicles],
  );

  const locationOptions = useMemo(
    () =>
      locations.map((l) => ({
        value: l.id,
        label: l.name,
        subLabel: l.city || undefined,
      })),
    [locations],
  );

  const productOptions = useMemo(
    () =>
      products.map((p) => ({
        value: p.id,
        label: p.name,
        subLabel: `${Number(p.buyingPrice || 0).toLocaleString("tr-TR")} ₺`,
        badge: p.type === "RECEIVED_SERVICE" ? "Hizmet" : "Malzeme",
      })),
    [products],
  );

  const applyExpenseToForm = (exp?: Expense | null) => {
    reset({
      invoiceType: exp?.invoiceType ?? "RECEIVED",
      expenseType: exp?.expenseType ?? (initialVehicleId ? "VEHICLE" : "GENERAL"),
      vehicleId: exp?.vehicleId ?? initialVehicleId ?? "",
      locationId: exp?.locationId ?? "",
      supplierId: exp?.supplierId ?? "",
      documentNo: exp?.documentNo ?? "",
      documentDate: exp?.documentDate
        ? exp.documentDate.slice(0, 10)
        : new Date().toISOString().slice(0, 10),
      dueDate: exp?.dueDate ? exp.dueDate.slice(0, 10) : "",
      category: exp?.category ?? "",
      description: exp?.description ?? "",
      lines:
        exp?.lines && exp.lines.length > 0
          ? exp.lines.map((l) => ({
              type: l.type,
              productId: l.productId ?? "",
              code: l.code ?? "",
              name: l.name ?? "",
              quantity: Number(l.quantity) || 1,
              unitPrice: Number(l.unitPrice) || 0,
              vatRate: Number(l.vatRate) || 20,
              description: l.description ?? "",
            }))
          : [emptyLine],
    });
  };

  useEffect(() => {
    if (!open) return;
    if (expense?.id && (!expense.lines || expense.lines.length === 0)) {
      getExpense(expense.id)
        .then((full) => applyExpenseToForm(full))
        .catch(() => applyExpenseToForm(expense));
    } else {
      applyExpenseToForm(expense);
    }
  }, [open, expense, initialVehicleId, reset]);

  const onSelectProduct = (index: number, prodId: string) => {
    const p = products.find((x) => x.id === prodId);
    if (p) {
      setValue(`lines.${index}.productId`, p.id);
      setValue(`lines.${index}.type`, p.type);
      setValue(`lines.${index}.name`, p.name);
      setValue(`lines.${index}.code`, p.code);
      setValue(`lines.${index}.unitPrice`, Number(p.buyingPrice) || 0);
      setValue(`lines.${index}.vatRate`, Number(p.taxRate) || 20);
    } else {
      setValue(`lines.${index}.productId`, "");
    }
  };

  const totals = (watchedLines ?? []).reduce(
    (acc, l) => {
      const net = (Number(l?.quantity) || 0) * (Number(l?.unitPrice) || 0);
      acc.sub += net;
      acc.vat += (net * (Number(l?.vatRate) || 0)) / 100;
      return acc;
    },
    { sub: 0, vat: 0 },
  );
  const grand = totals.sub + totals.vat;
  const fmt = (n: number) => n.toLocaleString("tr-TR", { minimumFractionDigits: 2 });

  const onSubmit = async (form: ExpenseFormValues) => {
    const values = { ...form, dueDate: form.dueDate || undefined };
    try {
      if (isEdit) {
        await updateExpense(expense!.id, values);
        toast.success("Masraf güncellendi");
      } else {
        await createExpense(values);
        toast.success("Masraf oluşturuldu");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "İşlem başarısız");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Masraf Düzenle" : "Yeni Masraf"} className="max-w-4xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Üst Bilgiler */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Controller
            name="expenseType"
            control={control}
            render={({ field }) => (
              <Select
                label="Masraf Yeri"
                data={targetOpts}
                value={field.value}
                onChange={field.onChange}
                name={field.name}
              />
            )}
          />

          {expenseType === "VEHICLE" && (
            <Controller
              name="vehicleId"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  label="Araç"
                  placeholder="Plaka veya model ara..."
                  options={vehicleOptions}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                />
              )}
            />
          )}

          {expenseType === "LOCATION" && (
            <Controller
              name="locationId"
              control={control}
              render={({ field }) => (
                <SearchableSelect
                  label="Lokasyon"
                  placeholder="Lokasyon ara..."
                  options={locationOptions}
                  value={field.value ?? ""}
                  onChange={field.onChange}
                />
              )}
            />
          )}

          {expenseType === "GENERAL" && (
            <Input
              label="Kategori / Masraf Grubu"
              placeholder="Örn: Genel Gider, Ofis..."
              {...register("category")}
            />
          )}

          <Controller
            name="supplierId"
            control={control}
            render={({ field }) => (
              <SearchableSelect
                label="Tedarikçi"
                placeholder="Tedarikçi ara..."
                options={supplierOptions}
                value={field.value ?? ""}
                onChange={field.onChange}
              />
            )}
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Input label="Belge No" placeholder="Fatura / Fiş No" {...register("documentNo")} />
          <Input label="Belge Tarihi" type="date" {...register("documentDate")} error={errors.documentDate?.message} />
          <Input label="Vade Tarihi" type="date" {...register("dueDate")} />
          <Input label="Açıklama" placeholder="Not veya detay..." {...register("description")} />
        </div>

        {/* Satırlar */}
        <div>
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
              Satırlar ({fields.length})
            </h3>
            <Button type="button" variant="outlined" className="gap-1 py-1 text-xs" onClick={() => append(emptyLine)}>
              <PlusIcon className="size-4" /> Satır Ekle
            </Button>
          </div>

          <div className="hidden grid-cols-[2fr_1.6fr_0.6fr_0.8fr_0.6fr_auto] gap-2 px-2 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 sm:grid">
            <span>Hizmet / Masraf Kartı</span>
            <span>Açıklama / Kalem Adı</span>
            <span>Adet</span>
            <span>Birim (₺)</span>
            <span>KDV (%)</span>
            <span className="w-8"></span>
          </div>

          <div className="space-y-2">
            {fields.map((f, i) => (
              <div
                key={f.id}
                className="grid grid-cols-1 gap-2 rounded-lg border border-gray-200 bg-gray-50/40 p-2 dark:border-dark-500 dark:bg-dark-700/40 sm:grid-cols-[2fr_1.6fr_0.6fr_0.8fr_0.6fr_auto]"
              >
                <Controller
                  name={`lines.${i}.productId`}
                  control={control}
                  render={({ field }) => (
                    <SearchableSelect
                      options={productOptions}
                      value={field.value ?? ""}
                      onChange={(val) => onSelectProduct(i, val)}
                      placeholder="Hizmet / kart arayın..."
                    />
                  )}
                />
                <Input
                  placeholder="Kalem adı / detay"
                  {...register(`lines.${i}.name`)}
                  error={errors.lines?.[i]?.name?.message}
                />
                <Input
                  placeholder="Adet"
                  type="number"
                  step="0.01"
                  {...register(`lines.${i}.quantity`, { valueAsNumber: true })}
                />
                <Controller
                  control={control}
                  name={`lines.${i}.unitPrice`}
                  render={({ field }) => (
                    <NumericInput
                      placeholder="Birim ₺"
                      value={field.value}
                      onValueChange={(val) => field.onChange(val ?? 0)}
                    />
                  )}
                />
                <Input
                  placeholder="KDV%"
                  type="number"
                  {...register(`lines.${i}.vatRate`, { valueAsNumber: true })}
                />
                <button
                  type="button"
                  onClick={() => fields.length > 1 && remove(i)}
                  className="flex items-center justify-center rounded p-1.5 text-gray-400 hover:text-error transition"
                  title="Satırı sil"
                >
                  <TrashIcon className="size-4.5" />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Toplamlar */}
        <div className="flex justify-end">
          <div className="w-full max-w-xs space-y-1 text-sm">
            <div className="flex justify-between text-gray-500 dark:text-dark-300">
              <span>Ara Toplam</span><span>{fmt(totals.sub)} ₺</span>
            </div>
            <div className="flex justify-between text-gray-500 dark:text-dark-300">
              <span>KDV</span><span>{fmt(totals.vat)} ₺</span>
            </div>
            <div className="flex justify-between border-t border-gray-200 pt-1 font-semibold text-gray-800 dark:border-dark-500 dark:text-dark-50">
              <span>Genel Toplam</span><span>{fmt(grand)} ₺</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-1">
          <Button type="button" variant="outlined" onClick={onClose}>İptal</Button>
          <Button type="submit" color="primary" disabled={isSubmitting}>
            {isSubmitting ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Oluştur"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
