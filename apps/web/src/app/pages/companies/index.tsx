import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BuildingOffice2Icon,
  PlusIcon,
  XMarkIcon,
} from "@heroicons/react/24/outline";

import { Page } from "@/components/shared/Page";
import { Button, Card, Input, Spinner } from "@/components/ui";
import { useAuthContext } from "@/app/contexts/auth/context";
import {
  AdminCompany,
  createHoldingCompany,
  listHoldingCompanies,
} from "@/services/adminService";

const empty = {
  name: "",
  taxNumber: "",
  taxOffice: "",
  phone: "",
  email: "",
  address: "",
};

export default function CompaniesPage() {
  const { holdingName, isCompanyAdmin, isSuperAdmin, refreshUser } =
    useAuthContext();
  const canManage = isCompanyAdmin || isSuperAdmin;

  const [items, setItems] = useState<AdminCompany[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...empty });

  const load = async () => {
    try {
      setLoading(true);
      setItems(await listHoldingCompanies());
    } catch {
      toast.error("Firmalar yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const submit = async () => {
    if (form.name.trim().length < 2) {
      toast.error("Firma adı en az 2 karakter olmalı.");
      return;
    }
    try {
      setSaving(true);
      await createHoldingCompany({
        name: form.name.trim(),
        taxNumber: form.taxNumber.trim() || undefined,
        taxOffice: form.taxOffice.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
      });
      toast.success("Firma oluşturuldu. Merkez + Şube lokasyonları hazır.");
      setForm({ ...empty });
      setShowForm(false);
      await load();
      await refreshUser(); // yeni firma sağ üstteki Firma→Lokasyon seçicisine düşsün
    } catch (e) {
      toast.error(
        (e as { message?: string })?.message ?? "Firma oluşturulamadı.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Page title="Firmalar">
      <div className="w-full space-y-5 px-(--margin-x) py-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-11 items-center justify-center rounded-xl bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">
              <BuildingOffice2Icon className="size-6" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
                Firmalar
              </h1>
              <p className="text-sm text-gray-400 dark:text-dark-300">
                {holdingName ?? "Holding"} altındaki firmalar
              </p>
            </div>
          </div>
          {canManage && (
            <Button color="primary" onClick={() => setShowForm((s) => !s)}>
              {showForm ? (
                <XMarkIcon className="size-5" />
              ) : (
                <PlusIcon className="size-5" />
              )}
              <span>{showForm ? "Vazgeç" : "Yeni Firma"}</span>
            </Button>
          )}
        </div>

        {!canManage && (
          <Card className="p-4 text-sm text-gray-500 dark:text-dark-200">
            Firma eklemek için holding/firma yöneticisi olmalısınız.
          </Card>
        )}

        {showForm && canManage && (
          <Card className="space-y-4 p-5">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-dark-100">
              Yeni Firma
            </h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs-plus font-medium text-gray-600 dark:text-dark-200">
                  Firma Adı *
                </label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Örn. Kaleli Oto Kiralama A.Ş."
                />
              </div>
              <div>
                <label className="mb-1 block text-xs-plus font-medium text-gray-600 dark:text-dark-200">
                  Vergi No
                </label>
                <Input
                  value={form.taxNumber}
                  onChange={(e) =>
                    setForm({ ...form, taxNumber: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs-plus font-medium text-gray-600 dark:text-dark-200">
                  Vergi Dairesi
                </label>
                <Input
                  value={form.taxOffice}
                  onChange={(e) =>
                    setForm({ ...form, taxOffice: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="mb-1 block text-xs-plus font-medium text-gray-600 dark:text-dark-200">
                  Telefon
                </label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs-plus font-medium text-gray-600 dark:text-dark-200">
                  E-posta
                </label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-xs-plus font-medium text-gray-600 dark:text-dark-200">
                  Adres
                </label>
                <Input
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outlined" onClick={() => setShowForm(false)}>
                İptal
              </Button>
              <Button color="primary" onClick={submit} disabled={saving}>
                {saving ? <Spinner className="size-4" /> : "Oluştur"}
              </Button>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Spinner className="size-7" />
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((c) => (
              <Card key={c.id} className="flex items-center gap-3 p-4">
                <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary-100 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">
                  <BuildingOffice2Icon className="size-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-gray-800 dark:text-dark-50">
                    {c.name}
                  </p>
                  <p className="truncate text-tiny text-gray-400 dark:text-dark-300">
                    {c.taxNumber ? `VKN ${c.taxNumber}` : "VKN yok"}
                    {c._count ? ` · ${c._count.memberships} kullanıcı` : ""}
                  </p>
                </div>
                {!c.isActive && (
                  <span className="shrink-0 rounded bg-gray-100 px-1.5 py-0.5 text-tiny text-gray-500 dark:bg-dark-600 dark:text-dark-200">
                    Pasif
                  </span>
                )}
              </Card>
            ))}
            {items.length === 0 && (
              <Card className="col-span-full p-6 text-center text-sm text-gray-400">
                Henüz firma yok.
              </Card>
            )}
          </div>
        )}
      </div>
    </Page>
  );
}
