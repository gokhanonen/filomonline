import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import { toast } from "sonner";

import { Button, Checkbox, Input, Select } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import { useAuthContext } from "@/app/contexts/auth/context";
import type {
  AdminRole,
  AdminUser,
  MembershipInput,
  UserFormValues,
} from "@/@types/userAdmin";
import {
  createUser,
  listRoles,
  setUserMemberships,
  updateUser,
} from "@/services/userService";

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  user?: AdminUser | null;
}

interface MembershipRow {
  included: boolean;
  roleId: string;
  isAdmin: boolean;
}

export function UserForm({ open, onClose, onSaved, user }: Props) {
  const isEdit = !!user;
  const { companies } = useAuthContext();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [rows, setRows] = useState<Record<string, MembershipRow>>({});

  const schema = useMemo(
    () =>
      Yup.object().shape({
        name: Yup.string().trim().min(2, "En az 2 karakter").required("Zorunlu"),
        email: Yup.string().trim().email("Geçersiz e-posta").required("Zorunlu"),
        password: isEdit
          ? Yup.string().trim().min(6, "En az 6 karakter").optional()
          : Yup.string().trim().min(6, "En az 6 karakter").required("Zorunlu"),
        phone: Yup.string().trim().optional(),
        extension: Yup.string().trim().optional(),
      }),
    [isEdit],
  );

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: { name: "", email: "" },
  });

  useEffect(() => {
    if (open && roles.length === 0) {
      listRoles().then(setRoles).catch(() => toast.error("Roller yüklenemedi"));
    }
  }, [open, roles.length]);

  useEffect(() => {
    if (!open) return;
    reset({
      name: user?.name ?? "",
      email: user?.email ?? "",
      password: "",
      phone: user?.phone ?? "",
      extension: user?.extension ?? "",
    });
    const init: Record<string, MembershipRow> = {};
    companies.forEach((c) => {
      const m = user?.memberships.find((mm) => mm.company.id === c.id);
      init[c.id] = {
        included: !!m,
        roleId: m?.roles[0]?.id ?? "",
        isAdmin: m?.isAdmin ?? false,
      };
    });
    setRows(init);
  }, [open, user, companies, reset]);

  const setRow = (companyId: string, patch: Partial<MembershipRow>) =>
    setRows((prev) => ({ ...prev, [companyId]: { ...prev[companyId], ...patch } }));

  const buildMemberships = (): MembershipInput[] => {
    const included = companies.filter((c) => rows[c.id]?.included);
    return included.map((c, i) => ({
      companyId: c.id,
      roleIds: rows[c.id].roleId ? [rows[c.id].roleId] : [],
      isAdmin: rows[c.id].isAdmin,
      isDefault: i === 0,
    }));
  };

  const onSubmit = async (values: UserFormValues) => {
    const memberships = buildMemberships();
    if (!isEdit && memberships.length === 0) {
      toast.error("En az bir firma seçin");
      return;
    }
    try {
      if (isEdit) {
        const basic: Partial<UserFormValues> = {
          name: values.name,
          phone: values.phone,
          extension: values.extension,
        };
        if (values.password) basic.password = values.password;
        await updateUser(user!.id, basic);
        await setUserMemberships(user!.id, memberships);
        toast.success("Kullanıcı güncellendi");
      } else {
        await createUser({ ...values, memberships });
        toast.success("Kullanıcı oluşturuldu");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "İşlem başarısız");
    }
  };

  const roleOptions = [
    { value: "", label: "Rol yok" },
    ...roles.map((r) => ({ value: r.id, label: r.name })),
  ];

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Kullanıcı Düzenle" : "Yeni Kullanıcı"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input label="Ad Soyad" {...register("name")} error={errors.name?.message} />
          <Input
            label="E-posta"
            type="email"
            disabled={isEdit}
            {...register("email")}
            error={errors.email?.message}
          />
          <Input
            label={isEdit ? "Yeni Şifre (boş bırak = değişmez)" : "Şifre"}
            type="password"
            {...register("password")}
            error={errors.password?.message}
          />
          <Input label="Telefon" {...register("phone")} />
          <Input label="Dahili No" {...register("extension")} />
        </div>

        <div>
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
            Firma Erişimi ve Roller
          </h3>
          <div className="space-y-2 rounded-lg border border-gray-200 p-3 dark:border-dark-500">
            {companies.length === 0 && (
              <p className="text-sm text-gray-400">Erişilebilir firma yok.</p>
            )}
            {companies.map((c) => {
              const row = rows[c.id];
              if (!row) return null;
              return (
                <div
                  key={c.id}
                  className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1.5fr_1.5fr_auto]"
                >
                  <Checkbox
                    label={c.name}
                    checked={row.included}
                    onChange={(e) => setRow(c.id, { included: e.target.checked })}
                  />
                  <Select
                    data={roleOptions}
                    value={row.roleId}
                    disabled={!row.included}
                    onChange={(e) => setRow(c.id, { roleId: e.target.value })}
                  />
                  <Checkbox
                    label="Yönetici"
                    checked={row.isAdmin}
                    disabled={!row.included}
                    onChange={(e) => setRow(c.id, { isAdmin: e.target.checked })}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-1">
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
