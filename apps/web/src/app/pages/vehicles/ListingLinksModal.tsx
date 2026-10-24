import { useEffect, useState } from "react";
import { toast } from "sonner";
import { PlusIcon, TrashIcon, LinkIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";

import { Button, Input, Select } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import type { Vehicle, VehicleListingUrl } from "@/@types/vehicle";
import { listingSourceIcon, matchListingSource, type ListingSource } from "@/@types/catalog";
import { addListingUrl, listListingUrls, removeListingUrl } from "@/services/vehicleService";

interface Props {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  sources: ListingSource[];
  /** Liste değişince (kartı tazelemek için) */
  onChanged?: (urls: VehicleListingUrl[]) => void;
}

/** Araca ait ilan linklerini (Sahibinden, Arabam, DOD ...) yönetir. */
export function ListingLinksModal({ open, onClose, vehicle, sources, onChanged }: Props) {
  const [urls, setUrls] = useState<VehicleListingUrl[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [newUrl, setNewUrl] = useState("");
  const [sourceId, setSourceId] = useState(""); // "" = otomatik (alan adından)

  useEffect(() => {
    if (!open || !vehicle) return;
    setNewUrl("");
    setSourceId("");
    setUrls(vehicle.listingUrls ?? []);
    setLoading(true);
    listListingUrls(vehicle.id)
      .then(setUrls)
      .catch(() => void 0)
      .finally(() => setLoading(false));
  }, [open, vehicle]);

  const add = async () => {
    if (!vehicle || !newUrl.trim()) return;
    let url = newUrl.trim();
    if (!/^https?:\/\//i.test(url)) url = "https://" + url;
    setSaving(true);
    try {
      const next = await addListingUrl(vehicle.id, url, sourceId || undefined);
      setUrls(next);
      onChanged?.(next);
      setNewUrl("");
      toast.success("İlan linki eklendi");
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Link eklenemedi");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (u: VehicleListingUrl) => {
    if (!vehicle) return;
    if (!window.confirm("Bu ilan linki silinsin mi?")) return;
    try {
      await removeListingUrl(vehicle.id, u.id);
      const next = urls.filter((x) => x.id !== u.id);
      setUrls(next);
      onChanged?.(next);
    } catch {
      toast.error("Silinemedi");
    }
  };

  const sourceOpts = [
    { value: "", label: "Kaynak: otomatik algıla" },
    ...sources.map((s) => ({ value: s.id, label: s.label })),
  ];

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <span>
          İlan Linkleri{" "}
          {vehicle && <span className="text-sm font-normal text-gray-400">— {vehicle.plate}</span>}
        </span>
      }
      className="max-w-lg"
    >
      <div className="space-y-4">
        {/* Mevcut linkler */}
        <div className="space-y-2">
          {loading && urls.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-400">Yükleniyor...</p>
          )}
          {!loading && urls.length === 0 && (
            <p className="py-6 text-center text-sm text-gray-400 dark:text-dark-300">
              Henüz ilan linki eklenmemiş.
            </p>
          )}
          {urls.map((u) => {
            const src = matchListingSource(u.url, sources, u.listingSourceId);
            const icon = listingSourceIcon(src);
            return (
              <div
                key={u.id}
                className="group flex items-center gap-3 rounded-xl border border-gray-150 bg-gray-50 p-2.5 dark:border-dark-500 dark:bg-dark-600"
              >
                <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm dark:bg-dark-700">
                  {icon ? (
                    <img src={icon} alt={src?.label ?? ""} className="size-7 object-contain" />
                  ) : (
                    <LinkIcon className="size-5 text-fuchsia-500" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-gray-800 dark:text-dark-50">
                    {src?.label ?? "Diğer kaynak"}
                  </p>
                  <a
                    href={u.url}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-xs text-primary-600 hover:underline dark:text-primary-400"
                  >
                    {u.url}
                  </a>
                </div>
                <a
                  href={u.url}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-full p-1.5 text-gray-400 hover:bg-white hover:text-primary-600 dark:hover:bg-dark-700"
                  title="İlanı aç"
                >
                  <ArrowTopRightOnSquareIcon className="size-4" />
                </a>
                <button
                  type="button"
                  onClick={() => remove(u)}
                  className="rounded-full p-1.5 text-gray-400 hover:bg-white hover:text-error dark:hover:bg-dark-700"
                  title="Sil"
                >
                  <TrashIcon className="size-4" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Yeni link */}
        <div className="rounded-xl border border-dashed border-gray-300 p-3 dark:border-dark-500">
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-400">Yeni Link</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="https://www.sahibinden.com/ilan/..."
              value={newUrl}
              onChange={(e) => setNewUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && add()}
              disabled={saving}
              className="flex-1"
            />
            <Select
              data={sourceOpts}
              value={sourceId}
              onChange={(e) => setSourceId(e.target.value)}
              className="sm:w-48"
            />
            <Button color="primary" onClick={add} disabled={!newUrl.trim() || saving} className="gap-1">
              <PlusIcon className="size-5" /> Ekle
            </Button>
          </div>
          <p className="mt-2 text-xs text-gray-400">
            Kaynak seçilmezse alan adına göre otomatik tanınır (Tanımlar → İlan Kaynakları).
          </p>
        </div>

        <div className="flex justify-end pt-1">
          <Button variant="outlined" onClick={onClose}>Kapat</Button>
        </div>
      </div>
    </Modal>
  );
}
