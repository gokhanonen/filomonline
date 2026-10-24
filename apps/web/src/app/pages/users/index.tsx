import { useCallback, useEffect, useState } from "react";
import { PencilSquareIcon, PlusIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

import { Page } from "@/components/shared/Page";
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
    <Page title="Kullanıcılar">
      <div className="w-full px-(--margin-x) py-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-medium text-gray-800 dark:text-dark-50">Kullanıcılar</h2>
            <p className="text-sm text-gray-400 dark:text-dark-300">Toplam {items.length} kullanıcı</p>
          </div>
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
                    <Th>Firmalar</Th>
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
                        <div className="flex flex-wrap gap-1">
                          {u.memberships.length === 0 ? (
                            <span className="text-gray-400">—</span>
                          ) : (
                            u.memberships.map((m) => (
                              <Tag key={m.id} color="info" className="text-xs">
                                {m.company.name}
                                {m.isAdmin ? " (yön.)" : ""}
                              </Tag>
                            ))
                          )}
                        </div>
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
      </div>

      <UserForm open={formOpen} onClose={() => setFormOpen(false)} onSaved={fetchData} user={editing} />
    </Page>
  );
}
