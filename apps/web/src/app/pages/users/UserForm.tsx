import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as Yup from "yup";
import { toast } from "sonner";
import { PhotoIcon } from "@heroicons/react/24/outline";

import { Avatar, Button, Checkbox, Input, Switch } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import { useAuthContext } from "@/app/contexts/auth/context";
import { uploadBlob, useFileUrl } from "@/services/storageService";
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
import { getPermissionCatalog, type PermissionCatalog } from "@/services/authzService";

function initialsOf(name?: string | null): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  user?: AdminUser | null;
}

interface MembershipRow {
  included: boolean;
  roleIds: string[];
  grant: string[]; // bireysel eklenen scope/izin
  deny: string[]; // bireysel kaldırılan scope/izin
  isAdmin: boolean;
}

export function UserForm({ open, onClose, onSaved, user }: Props) {
  const isEdit = !!user;
  const { companies } = useAuthContext();
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalog | null>(null);
  const [rows, setRows] = useState<Record<string, MembershipRow>>({});
  const [avatarKey, setAvatarKey] = useState<string>("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const avatarPreviewUrl = useFileUrl(avatarKey);

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
    watch,
    formState: { errors, isSubmitting },
  } = useForm<UserFormValues>({
    resolver: yupResolver(schema) as never,
    defaultValues: { name: "", email: "" },
  });

  const watchedName = watch("name");

  useEffect(() => {
    if (!open) return;
    if (roles.length === 0)
      listRoles().then(setRoles).catch(() => toast.error("Roller yüklenemedi"));
    if (!catalog)
      getPermissionCatalog().then(setCatalog).catch(() => void 0);
  }, [open, roles.length, catalog]);

  useEffect(() => {
    if (!open) return;
    setAvatarKey(user?.avatarUrl ?? "");
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
        roleIds: m?.roles.map((r) => r.id) ?? [],
        grant: m?.permissionsGrant ?? [],
        deny: m?.permissionsDeny ?? [],
        isAdmin: m?.isAdmin ?? false,
      };
    });
    setRows(init);
  }, [open, user, companies, reset]);

  // Yeni kullanıcı: varsayılan rolü (Satış Danışmanı) henüz rol seçilmemiş firmalara ön-seç.
  useEffect(() => {
    if (!open || isEdit || !catalog || roles.length === 0) return;
    const def = roles.find((r) => r.name === catalog.defaultRole);
    if (!def) return;
    setRows((prev) => {
      const next = { ...prev };
      for (const id of Object.keys(next)) {
        if (next[id].roleIds.length === 0) next[id] = { ...next[id], roleIds: [def.id] };
      }
      return next;
    });
  }, [open, isEdit, catalog, roles]);

  const setRow = (companyId: string, patch: Partial<MembershipRow>) =>
    setRows((prev) => ({ ...prev, [companyId]: { ...prev[companyId], ...patch } }));

  const toggleRole = (companyId: string, roleId: string) =>
    setRows((prev) => {
      const row = prev[companyId];
      const has = row.roleIds.includes(roleId);
      return {
        ...prev,
        [companyId]: {
          ...row,
          roleIds: has ? row.roleIds.filter((r) => r !== roleId) : [...row.roleIds, roleId],
        },
      };
    });

  /** Seçili rollerin bu scope'u verip vermediği. */
  const rolesHave = (roleIds: string[], key: string) =>
    roleIds.some((rid) => {
      const r = roles.find((x) => x.id === rid);
      return r && (r.permissions.includes("*") || r.permissions.includes(key));
    });

  /** Scope kullanıcıda etkin mi (roller ∪ grant) − deny. */
  const scopeEffective = (row: MembershipRow, key: string) =>
    (rolesHave(row.roleIds, key) || row.grant.includes(key)) && !row.deny.includes(key);

  /** Tek-tık: scope'u aç/kapat; rol tabanına göre grant/deny hesapla. */
  const setScope = (companyId: string, key: string, desired: boolean) =>
    setRows((prev) => {
      const row = prev[companyId];
      const base = rolesHave(row.roleIds, key);
      let grant = row.grant.filter((k) => k !== key);
      let deny = row.deny.filter((k) => k !== key);
      if (desired && !base) grant = [...grant, key]; // roller vermiyorsa ekle
      if (!desired && base) deny = [...deny, key]; // roller veriyorsa kaldır
      return { ...prev, [companyId]: { ...row, grant, deny } };
    });

  const buildMemberships = (): MembershipInput[] => {
    const included = companies.filter((c) => rows[c.id]?.included);
    return included.map((c, i) => ({
      companyId: c.id,
      roleIds: rows[c.id].roleIds,
      permissionsGrant: rows[c.id].grant,
      permissionsDeny: rows[c.id].deny,
      isAdmin: rows[c.id].isAdmin,
      isDefault: i === 0,
    }));
  };

  const onAvatarFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setIsUploadingAvatar(true);
      const key = await uploadBlob(file, file.name, "avatars");
      setAvatarKey(key);
      toast.success("Fotoğraf yüklendi");
    } catch (err) {
      toast.error((err as Error).message || "Fotoğraf yüklenemedi");
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = "";
    }
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
          avatarUrl: avatarKey || undefined,
        };
        if (values.password) basic.password = values.password;
        await updateUser(user!.id, basic);
        await setUserMemberships(user!.id, memberships);
        toast.success("Kullanıcı güncellendi");
      } else {
        await createUser({ ...values, avatarUrl: avatarKey || undefined, memberships });
        toast.success("Kullanıcı oluşturuldu");
      }
      onSaved();
      onClose();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "İşlem başarısız");
    }
  };

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Kullanıcı Düzenle" : "Yeni Kullanıcı"}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Avatar Yükleme Alanı */}
        <div className="flex items-center gap-4 rounded-xl border border-gray-150 p-3 bg-gray-50/50 dark:border-dark-600 dark:bg-dark-800/40">
          <Avatar
            size={14}
            src={avatarPreviewUrl}
            initialColor="primary"
            alt={watchedName || user?.name || "Profil"}
            className="ring-2 ring-primary-500/20 shadow-xs"
          >
            {initialsOf(watchedName || user?.name)}
          </Avatar>
          <div className="flex flex-col gap-1.5 min-w-0">
            <div className="flex items-center gap-2">
              <label className="cursor-pointer">
                <span className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition shadow-xs">
                  <PhotoIcon className="size-3.5" />
                  {isUploadingAvatar ? "Yükleniyor..." : avatarKey ? "Fotoğrafı Değiştir" : "Fotoğraf Yükle"}
                </span>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                  disabled={isUploadingAvatar}
                  onChange={onAvatarFileChange}
                />
              </label>
              {avatarKey && (
                <button
                  type="button"
                  onClick={() => setAvatarKey("")}
                  className="px-2.5 py-1.5 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                >
                  Kaldır
                </button>
              )}
            </div>
            <p className="text-tiny text-gray-400 dark:text-dark-300">
              Profil avatarı (JPG, PNG veya WebP)
            </p>
          </div>
        </div>

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
                  className="rounded-lg border border-gray-100 p-2.5 dark:border-dark-600"
                >
                  <div className="flex items-center justify-between">
                    <Checkbox
                      label={c.name}
                      checked={row.included}
                      onChange={(e) => setRow(c.id, { included: e.target.checked })}
                    />
                    <Checkbox
                      label="Yönetici (tüm yetkiler)"
                      checked={row.isAdmin}
                      disabled={!row.included}
                      onChange={(e) => setRow(c.id, { isAdmin: e.target.checked })}
                    />
                  </div>

                  {row.included && !row.isAdmin && (
                    <div className="mt-2 space-y-2 border-t border-gray-100 pt-2 dark:border-dark-700">
                      {/* Roller (çoklu) */}
                      <div className="flex flex-wrap gap-1.5">
                        {roles.map((r) => {
                          const on = row.roleIds.includes(r.id);
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => toggleRole(c.id, r.id)}
                              className={
                                on
                                  ? "rounded-full bg-primary-600 px-3 py-1 text-xs font-semibold text-white"
                                  : "rounded-full border border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-primary-500 dark:border-dark-500 dark:text-dark-200"
                              }
                            >
                              {r.name}
                            </button>
                          );
                        })}
                        {roles.length === 0 && (
                          <span className="text-tiny text-gray-400">Rol tanımlı değil.</span>
                        )}
                      </div>

                      {/* Hassas veri — tek tık */}
                      {catalog && (
                        <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                          {catalog.dataScopes.map((s) => (
                            <label
                              key={s.key}
                              className="flex items-center justify-between gap-2 rounded-lg bg-gray-50 px-2.5 py-1.5 dark:bg-dark-700"
                              title={s.description}
                            >
                              <span className="text-xs text-gray-600 dark:text-dark-200">{s.label}</span>
                              <Switch
                                checked={scopeEffective(row, s.key)}
                                onChange={(e) => setScope(c.id, s.key, e.target.checked)}
                              />
                            </label>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
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
