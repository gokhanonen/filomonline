import { useEffect, useState } from "react";
import { toast } from "sonner";
import { TbPlus, TbDeviceFloppy } from "react-icons/tb";

import { Button, Card, Input, NumericInput, Spinner, Switch } from "@/components/ui";
import {
  adminListPackages,
  adminUpsertPackage,
  type CreditPackage,
} from "@/services/creditsService";

/** Süper admin: satılık kontör paketleri. (Abonelik kademeleri "Abonelik" sekmesinde.) */
export function CreditsAdminTab() {
  const [packages, setPackages] = useState<CreditPackage[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      setPackages(await adminListPackages());
    } catch {
      toast.error("Veriler yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    load();
  }, []);

  if (loading)
    return (
      <div className="flex justify-center py-16">
        <Spinner className="size-6" />
      </div>
    );

  return (
    <div className="space-y-8">
      <p className="rounded-lg bg-info/10 p-3 text-xs text-info">
        Abonelik kademeleri ve aylık hediye kontör miktarı artık <b>Abonelik</b> sekmesinden yönetilir.
        Burada yalnız satılık kontör paketleri yönetilir.
      </p>
      <PackagesSection packages={packages} onChanged={load} />
    </div>
  );
}

// --- Paketler --------------------------------------------------------------

function PackagesSection({
  packages,
  onChanged,
}: {
  packages: CreditPackage[];
  onChanged: () => void;
}) {
  const [draft, setDraft] = useState<{ name: string; credits?: number; price?: number }>({
    name: "",
  });
  const [saving, setSaving] = useState(false);

  const create = async () => {
    if (!draft.name.trim() || !draft.credits || !draft.price) {
      toast.error("Ad, kontör ve fiyat zorunlu.");
      return;
    }
    setSaving(true);
    try {
      await adminUpsertPackage({
        name: draft.name.trim(),
        credits: draft.credits,
        price: draft.price,
      });
      toast.success("Paket eklendi.");
      setDraft({ name: "" });
      onChanged();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "Eklenemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <section>
      <h3 className="mb-1 text-sm font-semibold text-gray-800 dark:text-dark-50">
        Kontör Paketleri
      </h3>
      <p className="mb-3 text-xs text-gray-500 dark:text-dark-300">
        Firmaların kredi kartıyla satın alabileceği paketler. Satın alınan kontör süresizdir.
      </p>
      <div className="space-y-2">
        {packages.map((k) => (
          <PackageRow key={k.id} pkg={k} onChanged={onChanged} />
        ))}
      </div>

      <Card className="mt-3 flex flex-wrap items-end gap-3 p-4">
        <Input
          label="Paket adı"
          placeholder="1.000 Kontör"
          value={draft.name}
          onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
          className="w-44"
        />
        <NumericInput
          label="Kontör adedi"
          value={draft.credits ?? null}
          onValueChange={(v) => setDraft((d) => ({ ...d, credits: v }))}
          numeralDecimalScale={0}
          className="w-40"
        />
        <NumericInput
          label="Fiyat (₺)"
          value={draft.price ?? null}
          onValueChange={(v) => setDraft((d) => ({ ...d, price: v }))}
          className="w-40"
        />
        <Button color="primary" className="gap-1.5" disabled={saving} onClick={create}>
          <TbPlus className="size-4" /> Paket Ekle
        </Button>
      </Card>
    </section>
  );
}

function PackageRow({ pkg, onChanged }: { pkg: CreditPackage; onChanged: () => void }) {
  const [name, setName] = useState(pkg.name);
  const [credits, setCredits] = useState<number | undefined>(pkg.credits);
  const [price, setPrice] = useState<number | undefined>(Number(pkg.price));
  const [saving, setSaving] = useState(false);

  const dirty =
    name !== pkg.name || credits !== pkg.credits || price !== Number(pkg.price);

  const save = async (patch?: { isActive?: boolean }) => {
    setSaving(true);
    try {
      await adminUpsertPackage(
        { name, credits: credits ?? 0, price: price ?? 0, ...patch },
        pkg.id,
      );
      toast.success("Paket güncellendi.");
      onChanged();
    } catch {
      toast.error("Güncellenemedi.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="flex flex-wrap items-end gap-3 p-3">
      <Input label="Ad" value={name} onChange={(e) => setName(e.target.value)} className="w-40" />
      <NumericInput
        label="Kontör"
        value={credits ?? null}
        onValueChange={setCredits}
        numeralDecimalScale={0}
        className="w-32"
      />
      <NumericInput label="Fiyat (₺)" value={price ?? null} onValueChange={setPrice} className="w-32" />
      <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-dark-200">
        <Switch checked={pkg.isActive} onChange={() => save({ isActive: !pkg.isActive })} />
        Aktif
      </label>
      {dirty && (
        <Button className="gap-1.5" disabled={saving} onClick={() => save()}>
          <TbDeviceFloppy className="size-4" /> Kaydet
        </Button>
      )}
    </Card>
  );
}
