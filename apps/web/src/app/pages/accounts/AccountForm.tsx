import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import { toast } from "sonner";

import { Button, Input, Select } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import { AddressSelect } from "@/components/shared/AddressSelect";
import {
  ACCOUNT_TYPE_LABELS,
  ENTITY_TYPE_LABELS,
  type Account,
  type AccountFormValues,
  type AccountLedgerCode,
  LEDGER_CODE_LABELS,
} from "@/@types/account";
import { createAccount, updateAccount } from "@/services/accountService";

const ledgerOptions = [
  { value: "", label: "Otomatik (tipe göre)" },
  ...(Object.keys(LEDGER_CODE_LABELS) as AccountLedgerCode[]).map((k) => ({ value: k, label: LEDGER_CODE_LABELS[k] })),
];

const schema = Yup.object().shape({
  type: Yup.string().oneOf(["CUSTOMER", "SUPPLIER", "BOTH"]).required(),
  entityType: Yup.string().oneOf(["INDIVIDUAL", "CORPORATE"]).required(),
  name: Yup.string().trim().min(2, "En az 2 karakter").required("Zorunlu"),
  phone: Yup.string().trim().optional(),
  email: Yup.string().trim().email("Geçersiz e-posta").optional(),
  contactPerson: Yup.string().trim().optional(),
  city: Yup.string().trim().optional(),
  district: Yup.string().trim().optional(),
  neighborhood: Yup.string().trim().optional(),
  postalCode: Yup.string().trim().optional(),
  address: Yup.string().trim().optional(),
  taxOffice: Yup.string().trim().optional(),
  taxNumber: Yup.string().trim().optional(),
  tckn: Yup.string().trim().optional(),
  integrationCode: Yup.string().trim().optional(),
  ledgerCode: Yup.string().oneOf(["", "L120", "L320", "L329"]).optional(),
});

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  account?: Account | null;
}

const typeOptions = (
  Object.keys(ACCOUNT_TYPE_LABELS) as Array<keyof typeof ACCOUNT_TYPE_LABELS>
).map((k) => ({ value: k, label: ACCOUNT_TYPE_LABELS[k] }));

const entityOptions = (
  Object.keys(ENTITY_TYPE_LABELS) as Array<keyof typeof ENTITY_TYPE_LABELS>
).map((k) => ({ value: k, label: ENTITY_TYPE_LABELS[k] }));

export function AccountForm({ open, onClose, onSaved, account }: Props) {
  const isEdit = !!account;
  const {
    register,
    control,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<AccountFormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: {
      type: "CUSTOMER",
      entityType: "INDIVIDUAL",
      name: "",
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        type: account?.type ?? "CUSTOMER",
        entityType: account?.entityType ?? "INDIVIDUAL",
        name: account?.name ?? "",
        phone: account?.phone ?? "",
        email: account?.email ?? "",
        contactPerson: account?.contactPerson ?? "",
        city: account?.city ?? "",
        district: account?.district ?? "",
        neighborhood: account?.neighborhood ?? "",
        postalCode: account?.postalCode ?? "",
        address: account?.address ?? "",
        taxOffice: account?.taxOffice ?? "",
        taxNumber: account?.taxNumber ?? "",
        tckn: account?.tckn ?? "",
        integrationCode: account?.integrationCode ?? "",
        ledgerCode: account?.ledgerCode ?? "",
      });
    }
  }, [open, account, reset]);

  const entityType = watch("entityType");

  const onSubmit = async (form: AccountFormValues) => {
    // Hesap grubu boşsa cari tipinden: müşteri → 120, tedarikçi → 320
    const values = {
      ...form,
      ledgerCode: form.ledgerCode || (form.type === "CUSTOMER" ? "L120" : form.type === "SUPPLIER" ? "L320" : undefined),
    } as AccountFormValues;
    try {
      if (isEdit) {
        await updateAccount(account!.id, values);
        toast.success("Cari güncellendi");
      } else {
        await createAccount(values);
        toast.success("Cari oluşturuldu");
      }
      onSaved();
      onClose();
    } catch (err) {
      const msg = (err as { message?: string })?.message ?? "İşlem başarısız";
      toast.error(msg);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Cari Düzenle" : "Yeni Cari"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Cari tipi + Tür */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select
                label="Cari Tipi"
                data={typeOptions}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                error={errors.type?.message}
              />
            )}
          />
          <Controller
            name="entityType"
            control={control}
            render={({ field }) => (
              <Select
                label="Tür"
                data={entityOptions}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                error={errors.entityType?.message}
              />
            )}
          />
          <Controller
            name="ledgerCode"
            control={control}
            render={({ field }) => (
              <Select
                label="Hesap Grubu"
                data={ledgerOptions}
                value={field.value ?? ""}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
              />
            )}
          />
        </div>

        {/* Ad / Ünvan */}
        <Input
          label={entityType === "CORPORATE" ? "Firma Unvanı" : "Ad Soyad"}
          placeholder={
            entityType === "CORPORATE" ? "Örn: ABC Ltd. Şti." : "Örn: Ahmet Yılmaz"
          }
          {...register("name")}
          error={errors.name?.message}
        />

        {/* İletişim */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Telefon"
            placeholder="05xx xxx xx xx"
            {...register("phone")}
            error={errors.phone?.message}
          />
          <Input
            label="E-posta"
            type="email"
            {...register("email")}
            error={errors.email?.message}
          />
        </div>

        {/* Firma / Şahıs özel alanlar */}
        {entityType === "CORPORATE" ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Input label="İlgili Kişi" {...register("contactPerson")} />
            <Input label="Vergi Dairesi" {...register("taxOffice")} />
            <Input label="Vergi No (VKN)" {...register("taxNumber")} />
          </div>
        ) : (
          <Input label="T.C. Kimlik No" {...register("tckn")} />
        )}

        {/* ── Adres: İl / İlçe / Mahalle / Posta Kodu (ilişkisel cascade) ── */}
        <AddressSelect
          city={watch("city")}
          district={watch("district")}
          neighborhood={watch("neighborhood")}
          postalCode={watch("postalCode")}
          onChange={(field, value) =>
            setValue(field, value, { shouldDirty: true })
          }
          errors={{
            city: errors.city?.message,
            district: errors.district?.message,
          }}
        />

        <Input label="Adres (Açık)" {...register("address")} />
        <Input label="Entegrasyon Kodu" {...register("integrationCode")} />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="outlined" onClick={onClose}>
            İptal
          </Button>
          <Button type="submit" color="primary" disabled={isSubmitting}>
            {isSubmitting ? "Kaydediliyor..." : isEdit ? "Güncelle" : "Oluştur"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
