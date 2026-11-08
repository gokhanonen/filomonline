import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TbPlus, TbEdit, TbTrash, TbShieldLock } from "react-icons/tb";

import { Button, Card, Spinner } from "@/components/ui";
import { listRoles } from "@/services/userService";
import {
  getPermissionCatalog,
  deleteRole,
  type PermissionCatalog,
} from "@/services/authzService";
import type { AdminRole } from "@/@types/userAdmin";
import { RoleEditorModal } from "./RoleEditorModal";

/**
 * Roller yönetimi — Yetkilendirme sayfasının "Roller" sekmesi (inline panel).
 * Rol düzenleme hâlâ modal (RoleEditorModal).
 */
export function RolesManagerPanel() {
  const [roles, setRoles] = useState<AdminRole[]>([]);
  const [catalog, setCatalog] = useState<PermissionCatalog | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<AdminRole | null | undefined>(undefined); // undefined=kapalı, null=yeni
  const [confirm, setConfirm] = useState<string | null>(null);

  const load = async () => {
    try {
      const [r, c] = await Promise.all([listRoles(), getPermissionCatalog()]);
      setRoles(r);
      setCatalog(c);
    } catch {
      toast.error("Roller yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, []);

  const remove = async (id: string) => {
    try {
      await deleteRole(id);
      toast.success("Rol silindi.");
      setConfirm(null);
      load();
    } catch (e: any) {
      toast.error(
        e?.response?.data?.message || "Silinemedi (rol kullanımda olabilir).",
      );
    }
  };

  const permCount = (r: AdminRole) =>
    r.permissions.includes("*") ? "tüm yetkiler" : `${r.permissions.length} izin`;

  if (loading || !catalog) {
    return (
      <div className="flex justify-center py-12">
        <Spinner className="size-6" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500 dark:text-dark-300">
          Rol şablonları ve izinleri. Kullanıcılara bu roller atanır (çoklu rol + bireysel
          ince ayar).
        </p>
        <Button color="primary" className="gap-1.5" onClick={() => setEditing(null)}>
          <TbPlus className="size-4" /> Yeni Rol
        </Button>
      </div>

      {roles.map((r) => (
        <Card key={r.id} className="flex items-center justify-between p-3">
          <div className="flex items-center gap-3">
            <TbShieldLock className="size-5 text-primary-500" />
            <div>
              <p className="font-semibold text-gray-800 dark:text-dark-50">{r.name}</p>
              <p className="text-tiny text-gray-500 dark:text-dark-300">
                {r.description || permCount(r)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outlined" className="gap-1.5" onClick={() => setEditing(r)}>
              <TbEdit className="size-4" /> Düzenle
            </Button>
            {confirm === r.id ? (
              <>
                <Button color="error" className="h-8 px-2.5 text-xs" onClick={() => remove(r.id)}>
                  Sil
                </Button>
                <Button variant="flat" className="h-8 px-2.5 text-xs" onClick={() => setConfirm(null)}>
                  Vazgeç
                </Button>
              </>
            ) : (
              <Button
                variant="flat"
                isIcon
                className="size-8 text-gray-400 hover:text-error"
                onClick={() => setConfirm(r.id)}
                title="Sil"
              >
                <TbTrash className="size-4" />
              </Button>
            )}
          </div>
        </Card>
      ))}
      {roles.length === 0 && (
        <p className="py-6 text-center text-sm text-gray-400">Henüz rol yok.</p>
      )}

      {editing !== undefined && catalog && (
        <RoleEditorModal
          role={editing}
          catalog={catalog}
          onClose={() => setEditing(undefined)}
          onSaved={() => {
            setEditing(undefined);
            load();
          }}
        />
      )}
    </div>
  );
}
