import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { PencilSquareIcon, PlusIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

import { Page } from "@/components/shared/Page";
import { AuthzNav } from "@/components/shared/AuthzNav";
import { RolesManagerPanel } from "./RolesManagerPanel";
import {
  Button,
  Card,
  Spinner,
  Table,
  TBody,
  Td,
  Th,
  THead,
  Tr,
  Tag,
} from "@/components/ui";
import type { AdminUser } from "@/@types/userAdmin";
import { listUsers } from "@/services/userService";
import { UserForm } from "./UserForm";

export default function UsersPage() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") === "roles" ? "roles" : "users";
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      setItems(await listUsers());
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Liste alınamadı");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <Page title="Yetkilendirme">
      <div className="w-full space-y-4 px-(--margin-x) py-5">
        <AuthzNav activeId={tab} />

        {tab === "roles" ? (
          <RolesManagerPanel />
        ) : (
          <>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-medium text-gray-800 dark:text-dark-50">Kullanıcılar</h2>
            <p className="text-sm text-gray-400 dark:text-dark-300">Toplam {items.length} kullanıcı</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              color="primary"
              isIcon
              onClick={() => {
                setEditing(null);
                setFormOpen(true);
              }}
              className="size-9.5 rounded-lg shrink-0 shadow-xs"
              title="Yeni Kullanıcı"
              aria-label="Yeni Kullanıcı"
            >
              <PlusIcon className="size-5" />
            </Button>
          </div>
        </div>

        <Card className="mt-4 p-4">
          <div className="overflow-x-auto">
            {loading ? (
              <div className="flex justify-center py-12">
                <Spinner className="size-8" />
              </div>
            ) : items.length === 0 ? (
              <div className="py-12 text-center text-gray-400 dark:text-dark-300">Kayıt yok.</div>
            ) : (
              <Table hoverable className="w-full text-left">
                <THead>
                  <Tr>
                    <Th>Ad Soyad</Th>
                    <Th>E-posta</Th>
                    <Th>Rol</Th>
                    <Th>Durum</Th>
                    <Th className="text-right">İşlem</Th>
                  </Tr>
                </THead>
                <TBody>
                  {items.map((u) => (
                    <Tr key={u.id}>
                      <Td className="font-medium text-gray-800 dark:text-dark-100">{u.name}</Td>
                      <Td>{u.email}</Td>
                      <Td>
                        {u.memberships.length === 0 ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          (() => {
                            // Firmalar arası rolleri tekilleştir (admin → "Yönetici").
                            const roleSet = new Set<string>();
                            u.memberships.forEach((m) => {
                              if (m.isAdmin) roleSet.add("Yönetici");
                              else m.roles.forEach((r) => roleSet.add(r.name));
                            });
                            const roles = [...roleSet];
                            return (
                              <div className="flex flex-wrap items-center gap-1">
                                {roles.length === 0 ? (
                                  <span className="text-xs text-gray-400">rol yok</span>
                                ) : (
                                  roles.map((r) => (
                                    <Tag
                                      key={r}
                                      color={r === "Yönetici" ? "primary" : "info"}
                                      className="text-xs"
                                    >
                                      {r}
                                    </Tag>
                                  ))
                                )}
                                <span className="text-tiny text-gray-400 dark:text-dark-300">
                                  · {u.memberships.length} firma
                                </span>
                              </div>
                            );
                          })()
                        )}
                      </Td>
                      <Td>
                        <Tag color={u.isActive ? "success" : "neutral"}>
                          {u.isActive ? "Aktif" : "Pasif"}
                        </Tag>
                      </Td>
                      <Td className="text-right">
                        <button
                          type="button"
                          onClick={() => {
                            setEditing(u);
                            setFormOpen(true);
                          }}
                          className="rounded p-1.5 text-gray-500 hover:bg-gray-100 hover:text-primary-600 dark:text-dark-300 dark:hover:bg-dark-600"
                          title="Düzenle"
                        >
                          <PencilSquareIcon className="size-4.5" />
                        </button>
                      </Td>
                    </Tr>
                  ))}
                </TBody>
              </Table>
            )}
          </div>
        </Card>
          </>
        )}
      </div>

      <UserForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={fetchData} user={editing} />
    </Page>
  );
}
