import { useEffect } from "react";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import { toast } from "sonner";

import { Button, Input, NumericInput, Select, Textarea } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import {
  COMMON_UNITS,
  PRODUCT_TYPE_LABELS,
  type Product,
  type ProductFormValues,
} from "@/@types/product";
import { createProduct, updateProduct } from "@/services/productService";

const schema = Yup.object().shape({
  type: Yup.string()
    .oneOf(["MATERIAL", "RECEIVED_SERVICE", "PROVIDED_SERVICE", "VEHICLE"])
    .required(),
  name: Yup.string().trim().min(2, "En az 2 karakter").required("Zorunlu"),
  code: Yup.string().trim().required("Zorunlu"),
  unit: Yup.string().trim().required("Zorunlu"),
  integrationCode: Yup.string().trim().optional(),
  description: Yup.string().trim().optional(),
  buyingPrice: Yup.number().min(0).optional(),
  sellingPrice: Yup.number().min(0).optional(),
  taxRate: Yup.number().min(0).max(100).optional(),
});

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  product?: Product | null;
}

const typeOptions = (
  Object.keys(PRODUCT_TYPE_LABELS) as Array<keyof typeof PRODUCT_TYPE_LABELS>
).map((k) => ({ value: k, label: PRODUCT_TYPE_LABELS[k] }));

const unitOptions = COMMON_UNITS.map((u) => ({ value: u, label: u }));

export function ProductForm({ open, onClose, onSaved, product }: Props) {
  const isEdit = !!product;
  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: { type: "MATERIAL", name: "", code: "", unit: "Adet", taxRate: 20 },
  });

  useEffect(() => {
    if (open) {
      reset({
        type: product?.type ?? "MATERIAL",
        name: product?.name ?? "",
        code: product?.code ?? "",
        unit: product?.unit ?? "Adet",
        integrationCode: product?.integrationCode ?? "",
        description: product?.description ?? "",
        buyingPrice: product ? Number(product.buyingPrice) : 0,
        sellingPrice: product ? Number(product.sellingPrice) : 0,
        taxRate: product ? Number(product.taxRate) : 20,
      });
    }
  }, [open, product, reset]);

  const onSubmit = async (values: ProductFormValues) => {
    try {
      if (isEdit) {
        await updateProduct(product!.id, values);
        toast.success("Ürün güncellendi");
      } else {
        await createProduct(values);
        toast.success("Ürün oluşturuldu");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "İşlem başarısız");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Ürün Düzenle" : "Yeni Ürün / Hizmet"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Controller
            name="type"
            control={control}
            render={({ field }) => (
              <Select
                label="Tür"
                data={typeOptions}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                error={errors.type?.message}
              />
            )}
          />
          <Input label="Kod" placeholder="Stok/Hizmet kodu" {...register("code")} error={errors.code?.message} />
        </div>

        <Input label="Ad" placeholder="Ürün/Hizmet adı" {...register("name")} error={errors.name?.message} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
          <Controller
            name="unit"
            control={control}
            render={({ field }) => (
              <Select
                label="Birim"
                data={unitOptions}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                name={field.name}
                error={errors.unit?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="buyingPrice"
            render={({ field }) => (
              <NumericInput
                label="Alış Fiyatı"
                value={field.value}
                onValueChange={(val) => field.onChange(val)}
                error={errors.buyingPrice?.message}
              />
            )}
          />
          <Controller
            control={control}
            name="sellingPrice"
            render={({ field }) => (
              <NumericInput
                label="Satış Fiyatı"
                value={field.value}
                onValueChange={(val) => field.onChange(val)}
                error={errors.sellingPrice?.message}
              />
            )}
          />
          <Input
            label="KDV %"
            type="number"
            step="0.01"
            {...register("taxRate", { valueAsNumber: true })}
            error={errors.taxRate?.message}
          />
        </div>

        <Input label="Entegrasyon Kodu" {...register("integrationCode")} />
        <Textarea label="Açıklama" {...register("description")} />

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
