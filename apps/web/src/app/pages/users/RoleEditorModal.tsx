import { useMemo, useState } from "react";
import { toast } from "sonner";
import { TbEye, TbPlus, TbPencil, TbTrash } from "react-icons/tb";

import { Button, Card, Input, Spinner, Switch } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import { createRole, updateRole, type PermissionCatalog } from "@/services/authzService";
import type { AdminRole } from "@/@types/userAdmin";

interface Props {
  role: AdminRole | null; // null = yeni
  catalog: PermissionCatalog;
  onClose: () => void;
  onSaved: () => void;
}

const ACTION_META: Record<string, { label: string; Icon: React.ElementType }> = {
  read: { label: "Görüntüle", Icon: TbEye },
  create: { label: "Ekle", Icon: TbPlus },
  write: { label: "Düzenle", Icon: TbPencil },
  delete: { label: "Sil", Icon: TbTrash },
};

const ACTION_ORDER = ["read", "create", "write", "delete"] as const;

export function RoleEditorModal({ role, catalog, onClose, onSaved }: Props) {
  const allKeys = useMemo(
    () => [
      ...catalog.modules.flatMap((m) => m.actions.map((a) => `${m.key}.${a}`)),
      ...catalog.dataScopes.map((s) => s.key),
    ],
    [catalog],
  );

  const initial = useMemo(() => {
    const perms = role?.permissions ?? [];
    return new Set(perms.includes("*") ? allKeys : perms);
  }, [role, allKeys]);

  const [name, setName] = useState(role?.name ?? "");
  const [description, setDescription] = useState(role?.description ?? "");
  const [sel, setSel] = useState<Set<string>>(initial);
  const [saving, setSaving] = useState(false);

  const has = (k: string) => sel.has(k);
  const toggle = (k: string) =>
    setSel((s) => {
      const n = new Set(s);
      n.has(k) ? n.delete(k) : n.add(k);
      return n;
    });
  const setMany = (keys: string[], on: boolean) =>
    setSel((s) => {
      const n = new Set(s);
      keys.forEach((k) => (on ? n.add(k) : n.delete(k)));
      return n;
    });

  const applyPreset = (permissions: string[]) =>
    setSel(new Set(permissions.includes("*") ? allKeys : permissions));

  const save = async () => {
    if (!name.trim()) {
      toast.error("Rol adı zorunlu.");
      return;
    }
    const permissions = allKeys.every((k) => sel.has(k)) ? ["*"] : [...sel];
    setSaving(true);
    try {
      if (role) await updateRole(role.id, { name: name.trim(), description, permissions });
      else await createRole({ name: name.trim(), description, permissions });
      toast.success("Rol kaydedildi.");
      onSaved();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Kaydedilemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={role ? "Rolü Düzenle" : "Yeni Rol"} className="max-w-3xl">
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input label="Rol adı *" value={name} onChange={(e) => setName(e.target.value)} />
          <Input label="Açıklama" value={description ?? ""} onChange={(e) => setDescription(e.target.value)} />
        </div>

        {!role && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-gray-500">Şablondan başla:</span>
            {catalog.rolePresets.map((p) => (
              <button
                key={p.name}
                type="button"
                onClick={() => {
                  applyPreset(p.permissions);
                  if (!name) setName(p.name);
                  if (!description) setDescription(p.description);
                }}
                className="rounded-full border border-dashed border-gray-300 px-3 py-1 text-xs font-semibold text-gray-600 hover:border-primary-500 hover:text-primary-600 dark:border-dark-500 dark:text-dark-200"
              >
                {p.name}
              </button>
            ))}
          </div>
        )}

        {/* İzin matrisi — Görüntüle / Ekle / Düzenle / Sil. Düzenle, Ekle'yi kapsar. */}
        <Card className="overflow-hidden p-0">
          <div className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-gray-150 bg-gray-50 px-3 py-2 text-tiny font-semibold text-gray-500 dark:border-dark-600 dark:bg-dark-800">
            <span>Modül</span>
            <span className="flex pr-1">
              {ACTION_ORDER.map((a) => (
                <span key={a} className="w-14 text-center">
                  {ACTION_META[a].label}
                </span>
              ))}
            </span>
          </div>
          {catalog.modules.map((m) => {
            const moduleKeys = m.actions.map((a) => `${m.key}.${a}`);
            const allOn = moduleKeys.every((k) => sel.has(k));
            const writeOn = has(`${m.key}.write`);
            return (
              <div
                key={m.key}
                className="grid grid-cols-[1fr_auto] items-center gap-2 border-b border-gray-100 px-3 py-1.5 last:border-0 dark:border-dark-700"
              >
                <button
                  type="button"
                  onClick={() => setMany(moduleKeys, !allOn)}
                  className="text-left text-sm text-gray-700 hover:text-primary-600 dark:text-dark-100"
                  title="Tümünü aç/kapa"
                >
                  {m.label}
                </button>
                <span className="flex items-center pr-1">
                  {ACTION_ORDER.map((a) => {
                    // Düzenle (write) seçiliyse Ekle (create) örtük olarak açıktır.
                    const impliedCreate = a === "create" && writeOn;
                    return (
                      <span key={a} className="flex w-14 justify-center">
                        {m.actions.includes(a) ? (
                          <input
                            type="checkbox"
                            className="size-4 accent-primary-600 disabled:opacity-60"
                            checked={impliedCreate || has(`${m.key}.${a}`)}
                            disabled={impliedCreate}
                            onChange={() => toggle(`${m.key}.${a}`)}
                            aria-label={`${m.label} ${ACTION_META[a].label}`}
                            title={
                              impliedCreate
                                ? "Düzenle yetkisi Ekle'yi de kapsar"
                                : ACTION_META[a].label
                            }
                          />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </span>
                    );
                  })}
                </span>
              </div>
            );
          })}
        </Card>

        {/* Hassas veri scope'ları */}
        <div>
          <p className="mb-2 text-xs font-semibold text-gray-600 dark:text-dark-200">
            Hassas Veri Görünürlüğü
          </p>
          <div className="space-y-2">
            {catalog.dataScopes.map((s) => (
              <Card key={s.key} className="flex items-center justify-between p-3">
                <div className="min-w-0 pr-3">
                  <p className="text-sm font-medium text-gray-800 dark:text-dark-50">{s.label}</p>
                  <p className="text-tiny text-gray-500 dark:text-dark-300">{s.description}</p>
                </div>
                <Switch checked={has(s.key)} onChange={() => toggle(s.key)} />
              </Card>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-gray-150 pt-3 dark:border-dark-600">
          <Button variant="outlined" onClick={onClose}>Vazgeç</Button>
          <Button color="primary" disabled={saving} onClick={save}>
            {saving ? <Spinner className="size-4" /> : "Rolü Kaydet"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
