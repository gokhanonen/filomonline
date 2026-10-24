import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import { toast } from "sonner";

import { Button, Checkbox, Input } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import type { Location, LocationFormValues } from "@/@types/location";
import { createLocation, updateLocation } from "@/services/locationService";

const schema = Yup.object().shape({
  name: Yup.string().trim().min(2, "En az 2 karakter").required("Zorunlu"),
  code: Yup.string().trim().required("Zorunlu"),
  city: Yup.string().trim().optional(),
  phone: Yup.string().trim().optional(),
  address: Yup.string().trim().optional(),
  workplaceInfo: Yup.string().trim().optional(),
  warehouseInfo: Yup.string().trim().optional(),
  isExternal: Yup.boolean().optional(),
});

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  location?: Location | null;
}

export function LocationForm({ open, onClose, onSaved, location }: Props) {
  const isEdit = !!location;
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<LocationFormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: { name: "", code: "", isExternal: false },
  });

  useEffect(() => {
    if (open) {
      reset({
        name: location?.name ?? "",
        code: location?.code ?? "",
        city: location?.city ?? "",
        phone: location?.phone ?? "",
        address: location?.address ?? "",
        workplaceInfo: location?.workplaceInfo ?? "",
        warehouseInfo: location?.warehouseInfo ?? "",
        isExternal: location?.isExternal ?? false,
      });
    }
  }, [open, location, reset]);

  const onSubmit = async (values: LocationFormValues) => {
    try {
      if (isEdit) {
        await updateLocation(location!.id, values);
        toast.success("Lokasyon güncellendi");
      } else {
        await createLocation(values);
        toast.success("Lokasyon oluşturuldu");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "İşlem başarısız");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Lokasyon Düzenle" : "Yeni Lokasyon"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Ad" placeholder="Örn: İstoç Şube" {...register("name")} error={errors.name?.message} />
          <Input label="Kod" placeholder="Lokasyon kodu" {...register("code")} error={errors.code?.message} />
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="İl" {...register("city")} />
          <Input label="Telefon" {...register("phone")} />
        </div>
        <Input label="Adres" {...register("address")} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="İşyeri Bilgisi (ERP)" {...register("workplaceInfo")} />
          <Input label="Depo Bilgisi (ERP)" {...register("warehouseInfo")} />
        </div>
        <Checkbox label="Dış lokasyon (kaporta, boyacı vb. — transfer onayı gerektirmez)" {...register("isExternal")} />

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
