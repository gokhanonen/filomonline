import { useEffect, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import { toast } from "sonner";

import { Button, Input, NumericInput, Select } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import {
  RENTAL_STATUS_LABELS,
  type RentalContract,
  type RentalFormValues,
} from "@/@types/rental";
import type { Account } from "@/@types/account";
import type { Vehicle } from "@/@types/vehicle";
import { listAccounts } from "@/services/accountService";
import { listVehicles } from "@/services/vehicleService";
import { createRental, updateRental } from "@/services/rentalService";

const schema = Yup.object().shape({
  vehicleId: Yup.string().required("Araç zorunlu"),
  customerName: Yup.string().trim().min(2).required("Müşteri zorunlu"),
  durationMonths: Yup.number().min(1).required("Süre zorunlu"),
  monthlyPrice: Yup.number().min(0).required("Aylık ücret zorunlu"),
  startDate: Yup.string().required("Başlangıç zorunlu"),
  contractDate: Yup.string().required("Sözleşme tarihi zorunlu"),
  kmLimit: Yup.number().min(0).optional(),
  vatRate: Yup.number().min(0).max(100).optional(),
});

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  rental?: RentalContract | null;
}

const statusOpts = Object.keys(RENTAL_STATUS_LABELS).map((k) => ({
  value: k,
  label: RENTAL_STATUS_LABELS[k as keyof typeof RENTAL_STATUS_LABELS],
}));

export function RentalForm({ open, onClose, onSaved, rental }: Props) {
  const isEdit = !!rental;
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [customers, setCustomers] = useState<Account[]>([]);

  const {
    register,
    control,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<RentalFormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: {
      vehicleId: "",
      customerName: "",
      durationMonths: 12,
      monthlyPrice: 0,
      vatRate: 20,
      startDate: new Date().toISOString().slice(0, 10),
      contractDate: new Date().toISOString().slice(0, 10),
      status: "DRAFT",
    },
  });

  useEffect(() => {
    if (!open) return;
    listVehicles({ pageSize: 200 }).then((r) => setVehicles(r.items)).catch(() => void 0);
    listAccounts({ type: "CUSTOMER", onlyActive: true, pageSize: 200 })
      .then((r) => setCustomers(r.items))
      .catch(() => void 0);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    reset({
      vehicleId: rental?.vehicleId ?? "",
      customerId: rental?.customerId ?? "",
      customerName: rental?.customerName ?? "",
      customerPhone: rental?.customerPhone ?? "",
      customerAddress: rental?.customerAddress ?? "",
      customerTcTaxNo: rental?.customerTcTaxNo ?? "",
      durationMonths: rental?.durationMonths ?? 12,
      kmLimit: rental?.kmLimit ?? 0,
      monthlyPrice: rental ? Number(rental.monthlyPrice) : 0,
      vatRate: rental ? Number(rental.vatRate) : 20,
      startDate: rental?.startDate ? rental.startDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      contractDate: rental?.contractDate ? rental.contractDate.slice(0, 10) : new Date().toISOString().slice(0, 10),
      documentNo: rental?.documentNo ?? "",
      status: rental?.status ?? "DRAFT",
    });
  }, [open, rental, reset]);

  const onSubmit = async (values: RentalFormValues) => {
    try {
      if (isEdit) {
        await updateRental(rental!.id, values);
        toast.success("Sözleşme güncellendi");
      } else {
        await createRental(values);
        toast.success("Sözleşme oluşturuldu");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "İşlem başarısız");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Kira Sözleşmesi Düzenle" : "Yeni Kira Sözleşmesi"} className="max-w-3xl">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller name="vehicleId" control={control} render={({ field }) => (
            <Select
              label="Araç"
              data={[{ value: "", label: "Seçiniz" }, ...vehicles.map((v) => ({ value: v.id, label: `${v.plate} ${v.brandName ?? ""}`.trim() }))]}
              value={field.value}
              onChange={field.onChange}
              name={field.name}
              error={errors.vehicleId?.message}
            />
          )} />
          <Controller name="customerId" control={control} render={({ field }) => (
            <Select
              label="Müşteri (cari)"
              data={[{ value: "", label: "Seçiniz / elle gir" }, ...customers.map((c) => ({ value: c.id, label: c.name }))]}
              value={field.value ?? ""}
              onChange={(e) => {
                field.onChange(e);
                const c = customers.find((x) => x.id === e.target.value);
                if (c) {
                  setValue("customerName", c.name);
                  setValue("customerPhone", c.phone ?? "");
                }
              }}
              name={field.name}
            />
          )} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Input label="Müşteri Adı" {...register("customerName")} error={errors.customerName?.message} />
          <Input label="Telefon" {...register("customerPhone")} />
          <Input label="TC / Vergi No" {...register("customerTcTaxNo")} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Input label="Süre (ay)" type="number" {...register("durationMonths", { valueAsNumber: true })} error={errors.durationMonths?.message} />
          <Controller
            name="kmLimit"
            control={control}
            render={({ field }) => (
              <NumericInput
                label="KM Limiti"
                suffix=" km"
                numeralDecimalScale={0}
                value={field.value}
                onValueChange={(val) => field.onChange(val)}
                error={errors.kmLimit?.message}
              />
            )}
          />
          <Controller
            name="monthlyPrice"
            control={control}
            render={({ field }) => (
              <NumericInput
                label="Aylık Ücret"
                value={field.value}
                onValueChange={(val) => field.onChange(val)}
                error={errors.monthlyPrice?.message}
              />
            )}
          />
          <Input label="KDV %" type="number" {...register("vatRate", { valueAsNumber: true })} />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Input label="Başlangıç" type="date" {...register("startDate")} error={errors.startDate?.message} />
          <Input label="Sözleşme Tarihi" type="date" {...register("contractDate")} error={errors.contractDate?.message} />
          <Input label="Belge No" {...register("documentNo")} />
          <Controller name="status" control={control} render={({ field }) => (
            <Select label="Durum" data={statusOpts} value={field.value ?? "DRAFT"} onChange={field.onChange} name={field.name} />
          )} />
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
