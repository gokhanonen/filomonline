import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpTrayIcon, TrashIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

import { Spinner } from "@/components/ui";
import type { VehiclePhoto } from "@/@types/vehicle";
import {
  resizeWithThumbnail,
  VEHICLE_PHOTO_MAX_BYTES,
} from "@/utils/imageResize";
import { presignDownload, uploadBlob } from "@/services/storageService";
import {
  addVehiclePhotos,
  deleteVehiclePhoto,
  getVehicle,
  type PhotoInput,
} from "@/services/vehicleService";

interface ResolvedPhoto extends VehiclePhoto {
  resolvedUrl?: string;
}

type PhotoTab = "COVER" | "INTERIOR" | "EXTERIOR";

const TABS: { key: PhotoTab; label: string }[] = [
  { key: "COVER", label: "Kapak Fotoğrafı" },
  { key: "INTERIOR", label: "İç Fotoğraflar" },
  { key: "EXTERIOR", label: "Dış Fotoğraflar" },
];

export function VehiclePhotos({ vehicleId }: { vehicleId: string }) {
  const [photos, setPhotos] = useState<ResolvedPhoto[]>([]);
  const [activeTab, setActiveTab] = useState<PhotoTab>("COVER");
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const v = await getVehicle(vehicleId);
      const list = (v.photos ?? []) as ResolvedPhoto[];
      await Promise.all(
        list.map(async (p) => {
          try {
            p.resolvedUrl = await presignDownload(p.thumbKey ?? p.fileKey);
          } catch {
            p.resolvedUrl = undefined;
          }
        }),
      );
      setPhotos([...list]);
    } catch {
      toast.error("Fotoğraflar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [vehicleId]);

  useEffect(() => {
    load();
  }, [load]);

  const currentPhotos = photos.filter((p) => p.category === activeTab);
  const coverCount = photos.filter((p) => p.category === "COVER").length;
  const interiorCount = photos.filter((p) => p.category === "INTERIOR").length;
  const exteriorCount = photos.filter((p) => p.category === "EXTERIOR").length;

  const canAddPhoto = activeTab === "COVER" ? coverCount < 1 : true;

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (activeTab === "COVER" && files.length + coverCount > 1) {
      toast.error("Kapak fotoğrafı en fazla 1 adet olabilir.");
      return;
    }
    setUploading(true);
    try {
      const inputs: PhotoInput[] = [];
      for (const file of Array.from(files)) {
        if (!file.type.startsWith("image/")) continue;
        const base = file.name.replace(/\.[^.]+$/, "");
        const { full, thumb } = await resizeWithThumbnail(file, VEHICLE_PHOTO_MAX_BYTES);
        const [fileKey, thumbKey] = await Promise.all([
          uploadBlob(full, `${base}.jpg`, "vehicle-photos"),
          uploadBlob(thumb, `${base}-thumb.jpg`, "vehicle-photos"),
        ]);
        inputs.push({ category: activeTab, fileKey, thumbKey });
      }
      if (inputs.length) {
        await addVehiclePhotos(vehicleId, inputs);
        toast.success(`${inputs.length} fotoğraf yüklendi`);
        await load();
      }
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Yükleme başarısız");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (photoId: string) => {
    try {
      await deleteVehiclePhoto(vehicleId, photoId);
      setPhotos((prev) => prev.filter((p) => p.id !== photoId));
      toast.success("Fotoğraf silindi");
    } catch {
      toast.error("Silinemedi");
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Bar */}
      <div className="flex border-b border-gray-200 dark:border-dark-600">
        {TABS.map((tab) => {
          const count =
            tab.key === "COVER"
              ? coverCount
              : tab.key === "INTERIOR"
                ? interiorCount
                : exteriorCount;
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-semibold transition ${
                isActive
                  ? "border-primary-600 text-primary-600 dark:border-primary-400 dark:text-primary-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:text-dark-300 dark:hover:text-dark-100"
              }`}
            >
              <span>{tab.label}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                  isActive
                    ? "bg-primary-100 text-primary-700 dark:bg-primary-950/40 dark:text-primary-300"
                    : "bg-gray-100 text-gray-600 dark:bg-dark-700 dark:text-dark-300"
                }`}
              >
                {tab.key === "COVER" ? `${count}/1` : count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Kapak Bilgilendirme */}
      {activeTab === "COVER" && (
        <p className="text-xs text-gray-500 dark:text-dark-300">
          💡 Kapak fotoğrafı araç listesinde ve önizlemelerde gösterilir. Sadece 1 adet eklenebilir.
        </p>
      )}

      {/* Action / Grid */}
      {loading ? (
        <div className="flex justify-center py-8">
          <Spinner className="size-6" />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 md:grid-cols-5">
          {currentPhotos.map((p) => (
            <div
              key={p.id}
              className="group relative aspect-video overflow-hidden rounded-lg border border-gray-200 bg-gray-100 dark:border-dark-600 dark:bg-dark-800"
            >
              {p.resolvedUrl ? (
                <img src={p.resolvedUrl} alt="" className="size-full object-cover" />
              ) : (
                <div className="flex size-full items-center justify-center text-xs text-gray-400">
                  Görsel yüklenemedi
                </div>
              )}
              <button
                type="button"
                onClick={() => handleDelete(p.id)}
                className="absolute right-1.5 top-1.5 rounded-full bg-red-600/80 p-1 text-white opacity-0 transition group-hover:opacity-100 hover:bg-red-700"
                title="Sil"
              >
                <TrashIcon className="size-3.5" />
              </button>
            </div>
          ))}

          {/* Upload Button */}
          {canAddPhoto && (
            <label
              className={`flex aspect-video cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-2 text-center transition hover:border-primary-500 hover:bg-primary-50/20 dark:border-dark-500 dark:hover:border-primary-400 dark:hover:bg-primary-950/10 ${
                uploading ? "pointer-events-none opacity-50" : ""
              }`}
            >
              {uploading ? (
                <Spinner className="size-5 text-primary-500" />
              ) : (
                <>
                  <ArrowUpTrayIcon className="size-5 text-gray-400 group-hover:text-primary-500" />
                  <span className="mt-1 text-[11px] font-medium text-gray-600 dark:text-dark-200">
                    Fotoğraf Yükle
                  </span>
                  <span className="text-[10px] text-gray-400">(max 300KB)</span>
                </>
              )}
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple={activeTab !== "COVER"}
                className="hidden"
                disabled={uploading}
                onChange={(e) => handleFiles(e.target.files)}
              />
            </label>
          )}
        </div>
      )}

      {currentPhotos.length === 0 && !loading && (
        <p className="py-2 text-center text-xs text-gray-400 dark:text-dark-400">
          Bu kategoride henüz fotoğraf bulunmuyor.
        </p>
      )}
    </div>
  );
}
