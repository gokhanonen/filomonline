import { useEffect, useState } from "react";
import { PlusIcon, BuildingOffice2Icon, BuildingStorefrontIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

import { Page } from "@/components/shared/Page";
import { Button, Card, Input, Spinner, Tag } from "@/components/ui";
import { useAuthContext } from "@/app/contexts/auth/context";
import {
  createCompany,
  createTenant,
  listCompanies,
  listTenants,
  type AdminCompany,
  type Tenant,
} from "@/services/adminService";

export default function AdminConsolePage() {
  const { isSuperAdmin } = useAuthContext();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [companies, setCompanies] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTenant, setNewTenant] = useState("");
  const [newCompany, setNewCompany] = useState("");

  const loadTenants = async () => {
    setLoading(true);
    try {
      const t = await listTenants();
      setTenants(t);
      if (!selected && t.length) selectTenant(t[0]);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Holdingler alınamadı");
    } finally {
      setLoading(false);
    }
  };

  const selectTenant = async (t: Tenant) => {
    setSelected(t);
    try {
      setCompanies(await listCompanies(t.id));
    } catch {
      setCompanies([]);
    }
  };

  useEffect(() => {
    if (isSuperAdmin) loadTenants();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuperAdmin]);

  const addTenant = async () => {
    if (newTenant.trim().length < 2) return;
    try {
      const t = await createTenant(newTenant.trim());
      setNewTenant("");
      toast.success("Holding oluşturuldu");
      await loadTenants();
      selectTenant(t);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "İşlem başarısız");
    }
  };

  const addCompany = async () => {
    if (!selected || newCompany.trim().length < 2) return;
    try {
      await createCompany(selected.id, newCompany.trim());
      setNewCompany("");
      toast.success("Firma oluşturuldu");
      selectTenant(selected);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "İşlem başarısız");
    }
  };

  if (!isSuperAdmin) {
    return (
      <Page title="Platform Yönetimi">
        <div className="w-full px-(--margin-x) py-6">
          <Card className="p-8 text-center text-gray-400">
            Bu alan yalnızca platform yöneticisine açıktır.
          </Card>
        </div>
      </Page>
    );
  }

  return (
    <Page title="Platform Yönetimi">
      <div className="w-full px-(--margin-x) py-6">
        <h2 className="text-xl font-medium text-gray-800 dark:text-dark-50">Platform Yönetimi</h2>
        <p className="text-sm text-gray-400 dark:text-dark-300">Holdingler ve altındaki firmalar</p>

        {loading ? (
          <div className="flex justify-center py-16"><Spinner className="size-8" /></div>
        ) : (
          <div className="mt-5 grid grid-cols-1 gap-4 lg:grid-cols-[360px_1fr]">
            {/* Holdingler */}
            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2 text-gray-700 dark:text-dark-100">
                <BuildingOffice2Icon className="size-5" />
                <h3 className="font-medium">Holdingler</h3>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Yeni holding adı"
                  value={newTenant}
                  onChange={(e) => setNewTenant(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addTenant()}
                />
                <Button color="primary" isIcon onClick={addTenant}><PlusIcon className="size-5" /></Button>
              </div>
              <div className="mt-3 space-y-1">
                {tenants.map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => selectTenant(t)}
                    className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm ${
                      selected?.id === t.id
                        ? "bg-primary-50 font-medium text-primary-700 dark:bg-primary-500/15 dark:text-primary-300"
                        : "hover:bg-gray-100 dark:hover:bg-dark-600"
                    }`}
                  >
                    <span className="truncate">{t.name}</span>
                    <Tag color={t.isActive ? "success" : "neutral"} className="text-tiny">
                      {t._count?.companies ?? 0} firma
                    </Tag>
                  </button>
                ))}
              </div>
            </Card>

            {/* Seçili holdingin firmaları */}
            <Card className="p-4">
              <div className="mb-3 flex items-center gap-2 text-gray-700 dark:text-dark-100">
                <BuildingStorefrontIcon className="size-5" />
                <h3 className="font-medium">{selected ? `${selected.name} — Firmalar` : "Firmalar"}</h3>
              </div>
              {selected ? (
                <>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Yeni firma adı"
                      value={newCompany}
                      onChange={(e) => setNewCompany(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && addCompany()}
                    />
                    <Button color="primary" isIcon onClick={addCompany}><PlusIcon className="size-5" /></Button>
                  </div>
                  <div className="mt-3 space-y-1">
                    {companies.length === 0 ? (
                      <p className="py-6 text-center text-sm text-gray-400">Henüz firma yok.</p>
                    ) : (
                      companies.map((c) => (
                        <div
                          key={c.id}
                          className="flex items-center justify-between rounded-lg border border-gray-150 px-3 py-2 text-sm dark:border-dark-600"
                        >
                          <span className="truncate text-gray-800 dark:text-dark-100">{c.name}</span>
                          <Tag color={c.isActive ? "success" : "neutral"} className="text-tiny">
                            {c._count?.memberships ?? 0} kullanıcı
                          </Tag>
                        </div>
                      ))
                    )}
                  </div>
                </>
              ) : (
                <p className="py-6 text-center text-sm text-gray-400">Soldan bir holding seçin.</p>
              )}
            </Card>
          </div>
        )}
      </div>
    </Page>
  );
}
