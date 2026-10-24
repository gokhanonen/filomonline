import { useCallback, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  TbArrowsRightLeft,
  TbArrowRight,
  TbCheck,
  TbClock,
  TbExclamationCircle,
  TbHistory,
  TbMapPin,
  TbRotateClockwise,
  TbTool,
  TbTruck,
  TbX,
} from "react-icons/tb";

import { Button, Spinner, Textarea } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import { SearchableSelect, type SearchableOption } from "@/components/shared/SearchableSelect";
import type { Account } from "@/@types/account";
import type { Location } from "@/@types/location";
import type { Vehicle } from "@/@types/vehicle";
import type {
  VehicleLocationDisplay,
  VehicleTransferItem,
} from "@/@types/vehicleLocation";
import { listAccounts } from "@/services/accountService";
import { listLocations } from "@/services/locationService";
import {
  cancelVehicleTransfer,
  confirmVehicleTransfer,
  createVehicleTransfer,
  getVehicleLocation,
  getVehicleTransfers,
  returnVehicleFromExternal,
} from "@/services/vehicleLocationService";

interface Props {
  open: boolean;
  onClose: () => void;
  vehicle: Vehicle | null;
  onSuccess?: () => void;
}

const fmtDate = (iso?: string | null) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return (
    d.toLocaleDateString("tr-TR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }) +
    " " +
    d.toLocaleTimeString("tr-TR", {
      hour: "2-digit",
      minute: "2-digit",
    })
  );
};

export function VehicleTransferModal({ open, onClose, vehicle, onSuccess }: Props) {
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [locationInfo, setLocationInfo] = useState<VehicleLocationDisplay | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [suppliers, setSuppliers] = useState<Account[]>([]);
  const [history, setHistory] = useState<VehicleTransferItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);

  // Form state
  const [targetLocationId, setTargetLocationId] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [returnLocationId, setReturnLocationId] = useState("");
  const [notes, setNotes] = useState("");
  const [isDirect, setIsDirect] = useState(true); // Varsayılan hızlı/anında taşıma

  const loadData = useCallback(async () => {
    if (!vehicle) return;
    setLoading(true);
    try {
      const [locInfo, locRes, supRes, historyRes] = await Promise.all([
        getVehicleLocation(vehicle.id),
        listLocations({ onlyActive: true, pageSize: 300 }),
        listAccounts({ type: "SUPPLIER", onlyActive: true, pageSize: 300 }),
        getVehicleTransfers(vehicle.id),
      ]);
      setLocationInfo(locInfo);
      setLocations(locRes.items);
      setSuppliers(supRes.items);
      setHistory(historyRes);

      // Default return location to current location if exists
      if (locInfo.currentLocation?.id) {
        setReturnLocationId(locInfo.currentLocation.id);
      }
    } catch {
      toast.error("Lokasyon bilgileri yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [vehicle]);

  useEffect(() => {
    if (open && vehicle) {
      setTargetLocationId("");
      setSupplierId("");
      setNotes("");
      setIsDirect(true);
      setShowHistory(false);
      loadData();
    }
  }, [open, vehicle, loadData]);

  const selectedTargetLocation = useMemo(
    () => locations.find((l) => l.id === targetLocationId),
    [locations, targetLocationId],
  );

  const isExternalTarget = selectedTargetLocation?.isExternal === true;

  // Hedef lokasyon seçenekleri (Mevcut lokasyon hariç)
  const targetLocationOptions: SearchableOption[] = useMemo(() => {
    return locations
      .filter((l) => l.id !== locationInfo?.currentLocation?.id)
      .map((l) => ({
        value: l.id,
        label: `${l.name} (${l.code})`,
        description: l.isExternal
          ? "⚡ Dış Lokasyon (Kaporta, Boya, Servis)"
          : l.city || undefined,
      }));
  }, [locations, locationInfo?.currentLocation?.id]);

  // Dönüş lokasyonu seçenekleri (Sadece iç lokasyonlar)
  const returnLocationOptions: SearchableOption[] = useMemo(() => {
    return locations
      .filter((l) => !l.isExternal)
      .map((l) => ({
        value: l.id,
        label: `${l.name} (${l.code})`,
        description: l.city || undefined,
      }));
  }, [locations]);

  // Tedarikçi seçenekleri
  const supplierOptions: SearchableOption[] = useMemo(() => {
    return suppliers.map((s) => ({
      value: s.id,
      label: s.name,
      description: s.phone ? `Tel: ${s.phone}` : undefined,
    }));
  }, [suppliers]);

  // Transfer başlat / taşı
  const handleTransfer = async () => {
    if (!vehicle || !targetLocationId) {
      toast.error("Lütfen hedef lokasyon seçin");
      return;
    }

    if (isExternalTarget) {
      if (!supplierId) {
        toast.error("Dış lokasyon için tedarikçi / servis seçimi zorunludur");
        return;
      }
      if (!returnLocationId) {
        toast.error("Dış lokasyon için dönüş lokasyonu seçimi zorunludur");
        return;
      }
    }

    setActionLoading(true);
    try {
      const res = await createVehicleTransfer(vehicle.id, {
        toLocationId: targetLocationId,
        notes: notes.trim() || undefined,
        isDirect: isExternalTarget ? true : isDirect,
        supplierId: isExternalTarget ? supplierId : undefined,
        returnLocationId: isExternalTarget ? returnLocationId : undefined,
      });
      toast.success(res.message || "İşlem başarılı");
      setTargetLocationId("");
      setSupplierId("");
      setNotes("");
      await loadData();
      onSuccess?.();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Transfer işlemi başarısız",
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Transferi onayla (Teslim Al)
  const handleConfirmTransfer = async () => {
    if (!vehicle || !locationInfo?.pendingTransfer?.id) return;
    setActionLoading(true);
    try {
      const res = await confirmVehicleTransfer(
        vehicle.id,
        locationInfo.pendingTransfer.id,
      );
      toast.success(res.message || "Araç teslim alındı");
      await loadData();
      onSuccess?.();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Onay işlemi başarısız",
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Transferi iptal et
  const handleCancelTransfer = async () => {
    if (!vehicle || !locationInfo?.pendingTransfer?.id) return;
    if (!window.confirm("Bu transfer sürecini iptal etmek istediğinize emin misiniz?")) {
      return;
    }
    setActionLoading(true);
    try {
      const res = await cancelVehicleTransfer(
        vehicle.id,
        locationInfo.pendingTransfer.id,
      );
      toast.success(res.message || "Transfer iptal edildi");
      await loadData();
      onSuccess?.();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "İptal işlemi başarısız",
      );
    } finally {
      setActionLoading(false);
    }
  };

  // Dış lokasyondan teslim al (Dönüş)
  const handleReturnFromExternal = async () => {
    if (!vehicle) return;
    setActionLoading(true);
    try {
      const res = await returnVehicleFromExternal(vehicle.id, {
        returnLocationId: returnLocationId || undefined,
        notes: notes.trim() || undefined,
      });
      toast.success(res.message || "Araç dış lokasyondan teslim alındı");
      setNotes("");
      await loadData();
      onSuccess?.();
    } catch (err) {
      toast.error(
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? "Dönüş işlemi başarısız",
      );
    } finally {
      setActionLoading(false);
    }
  };

  if (!open || !vehicle) return null;

  const currentStatus = locationInfo?.status ?? "NO_LOCATION";
  const isInTransfer = currentStatus === "IN_TRANSFER";
  const isAtExternal = currentStatus === "AT_EXTERNAL";
  const isAtLocation = currentStatus === "AT_LOCATION";
  const isNoLocation = currentStatus === "NO_LOCATION";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={
        <div className="flex items-center gap-3">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400">
            <TbMapPin className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-sm font-black tracking-wide text-gray-900 dark:text-white">
                {vehicle.plate}
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs font-semibold text-gray-600 dark:text-dark-200">
                {[vehicle.brandName, vehicle.modelName].filter(Boolean).join(" ")}
              </span>
            </div>
            <p className="text-xs text-gray-400">Lokasyon Yönetimi ve Araç Transferi</p>
          </div>
        </div>
      }
      className="max-w-2xl"
    >
      <div className="space-y-5">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner className="size-8 text-primary-500" />
          </div>
        ) : (
          <>
            {/* DURUM BİLGİ KARTI */}
            <div className="rounded-2xl border border-gray-150 bg-gradient-to-br from-gray-50 to-white p-4 shadow-sm dark:border-dark-600 dark:from-dark-800 dark:to-dark-750">
              {isInTransfer && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-amber-800 dark:bg-amber-950/50 dark:text-amber-300">
                      <TbTruck className="size-4 animate-bounce" /> Transfer Aşamasında
                    </span>
                    <span className="text-xs text-gray-400">
                      {fmtDate(locationInfo?.pendingTransfer?.initiatedAt)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between rounded-xl bg-white p-3.5 shadow-xs dark:bg-dark-700">
                    <div className="flex-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Çıkış Lokasyonu
                      </p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {locationInfo?.currentLocation?.name ?? "Bilinmiyor"}
                      </p>
                      <p className="text-xs text-gray-400">
                        [{locationInfo?.currentLocation?.code}]
                      </p>
                    </div>

                    <div className="flex flex-col items-center px-4">
                      <TbArrowRight className="size-6 text-primary-500 animate-pulse" />
                      <span className="text-[10px] font-semibold text-primary-600 dark:text-primary-400">
                        Yolda
                      </span>
                    </div>

                    <div className="flex-1 text-right">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Hedef Lokasyon
                      </p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {locationInfo?.targetLocation?.name ?? "Bilinmiyor"}
                      </p>
                      <p className="text-xs text-gray-400">
                        [{locationInfo?.targetLocation?.code}]
                      </p>
                    </div>
                  </div>

                  {locationInfo?.pendingTransfer?.notes && (
                    <p className="text-xs text-gray-600 dark:text-dark-200 bg-amber-50/50 dark:bg-amber-950/20 p-2.5 rounded-lg border border-amber-200/50 dark:border-amber-900/30">
                      <b>Not:</b> {locationInfo.pendingTransfer.notes}
                    </p>
                  )}

                  {/* Transfer Onay & İptal Butonları */}
                  <div className="flex gap-2.5 pt-1">
                    <Button
                      color="success"
                      className="flex-1 gap-2 py-2.5 text-xs font-bold"
                      onClick={handleConfirmTransfer}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <Spinner className="size-4" />
                      ) : (
                        <TbCheck className="size-4" />
                      )}
                      Teslim Al (Transferi Tamamla)
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      className="gap-2 py-2.5 text-xs font-bold"
                      onClick={handleCancelTransfer}
                      disabled={actionLoading}
                    >
                      <TbX className="size-4" /> Transferi İptal Et
                    </Button>
                  </div>
                </div>
              )}

              {isAtExternal && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-100 px-3 py-1 text-xs font-bold uppercase tracking-wider text-purple-800 dark:bg-purple-950/50 dark:text-purple-300">
                      <TbTool className="size-4" /> Dış Serviste / Tedarikçide
                    </span>
                    <span className="text-xs text-gray-400">
                      {fmtDate(locationInfo?.pendingTransfer?.confirmedAt)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 rounded-xl bg-white p-3.5 shadow-xs dark:bg-dark-700">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Dış Lokasyon / İşlem
                      </p>
                      <p className="font-bold text-gray-900 dark:text-white">
                        {locationInfo?.currentLocation?.name ?? "Dış Servis"}
                      </p>
                      <p className="text-xs text-gray-400">
                        [{locationInfo?.currentLocation?.code}]
                      </p>
                    </div>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Tedarikçi / Servis
                      </p>
                      <p className="font-bold text-purple-600 dark:text-purple-400">
                        {locationInfo?.supplier?.name ?? "Belirtilmemiş"}
                      </p>
                      {locationInfo?.supplier?.phone && (
                        <p className="text-xs text-gray-400">
                          Tel: {locationInfo.supplier.phone}
                        </p>
                      )}
                    </div>
                  </div>

                  {locationInfo?.returnLocation && (
                    <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-dark-300">
                      <TbRotateClockwise className="size-4 text-primary-500" />
                      <span>
                        Planlanan Dönüş Lokasyonu:{" "}
                        <b>{locationInfo.returnLocation.name}</b>
                      </span>
                    </div>
                  )}

                  {/* Dış Lokasyondan Teslim Al */}
                  <div className="pt-1">
                    <Button
                      color="primary"
                      className="w-full gap-2 py-2.5 text-xs font-bold"
                      onClick={handleReturnFromExternal}
                      disabled={actionLoading}
                    >
                      {actionLoading ? (
                        <Spinner className="size-4" />
                      ) : (
                        <TbCheck className="size-4" />
                      )}
                      Dış Lokasyondan Teslim Al (Geri Getir)
                    </Button>
                  </div>
                </div>
              )}

              {isAtLocation && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                      <TbMapPin className="size-6" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        Mevcut Lokasyon
                      </span>
                      <h4 className="text-base font-extrabold text-gray-900 dark:text-white">
                        {locationInfo?.currentLocation?.name}
                      </h4>
                      <p className="text-xs text-gray-400">
                        Kod: {locationInfo?.currentLocation?.code} •{" "}
                        {locationInfo?.currentLocation?.city || "Şehir belirtilmemiş"}
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-600/20 dark:bg-emerald-950/30 dark:text-emerald-300">
                    Lokasyonda
                  </span>
                </div>
              )}

              {isNoLocation && (
                <div className="flex items-center gap-3 text-amber-800 dark:text-amber-200">
                  <TbExclamationCircle className="size-6 shrink-0 text-amber-500" />
                  <div>
                    <p className="text-xs font-bold">Lokasyon Atanmamış</p>
                    <p className="text-[11px] text-amber-700/80 dark:text-amber-300/80">
                      Bu araç için henüz kayıtlı bir lokasyon bulunmuyor. Aşağıdaki formdan
                      hedef seçerek ilk atamayı gerçekleştirebilirsiniz.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* YENİ TRANSFER / TAŞIMA FORMU (Eğer araç transferde veya serviste değilse) */}
            {(isAtLocation || isNoLocation) && (
              <div className="space-y-4 rounded-2xl border border-gray-150 bg-white p-4.5 shadow-xs dark:border-dark-600 dark:bg-dark-750">
                <div className="flex items-center gap-2 border-b border-gray-100 pb-2.5 dark:border-dark-600">
                  <TbArrowsRightLeft className="size-5 text-primary-500" />
                  <h4 className="text-sm font-bold text-gray-900 dark:text-white">
                    {isNoLocation ? "İlk Lokasyonu Ata" : "Aracı Başka Lokasyona Taşı"}
                  </h4>
                </div>

                {/* Hedef Lokasyon Seçimi */}
                <div>
                  <SearchableSelect
                    label="Hedef Lokasyon *"
                    placeholder="Taşınacak lokasyonu seçin..."
                    options={targetLocationOptions}
                    value={targetLocationId}
                    onChange={setTargetLocationId}
                  />
                </div>

                {/* Dış Lokasyon Ek Alanları */}
                {isExternalTarget && (
                  <div className="space-y-3.5 rounded-xl border border-purple-200 bg-purple-50/50 p-3.5 dark:border-purple-900/40 dark:bg-purple-950/20">
                    <div className="flex items-center gap-2 text-xs font-bold text-purple-800 dark:text-purple-300">
                      <TbTool className="size-4" />
                      <span>Dış Lokasyon Seçildi (Kaporta, Boya, Bakım Servisi)</span>
                    </div>

                    <div>
                      <SearchableSelect
                        label="Hizmet Veren Cari / Tedarikçi *"
                        placeholder="Tedarikçi cari seçin..."
                        options={supplierOptions}
                        value={supplierId}
                        onChange={setSupplierId}
                      />
                    </div>

                    <div>
                      <SearchableSelect
                        label="İşlem Bitince Dönüş Lokasyonu *"
                        placeholder="Dönüşte geleceği iç lokasyon..."
                        options={returnLocationOptions}
                        value={returnLocationId}
                        onChange={setReturnLocationId}
                      />
                    </div>

                    <p className="text-[11px] text-purple-700/80 dark:text-purple-300/80">
                      💡 Dış lokasyon transferleri teslim-tesellüm onayı gerektirmez, doğrudan
                      dış servis kaydı olarak işlenir.
                    </p>
                  </div>
                )}

                {/* İç Lokasyon Transfer Modu */}
                {!isExternalTarget && !isNoLocation && targetLocationId && (
                  <div className="rounded-xl border border-gray-150 bg-gray-50/70 p-3 dark:border-dark-600 dark:bg-dark-700/50">
                    <label className="text-xs font-bold text-gray-700 dark:text-dark-100 mb-2 block">
                      Transfer Onay Yöntemi
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setIsDirect(true)}
                        className={`flex flex-col items-start rounded-lg border p-2.5 text-left transition ${
                          isDirect
                            ? "border-primary-500 bg-white ring-2 ring-primary-500/20 shadow-xs dark:bg-dark-600"
                            : "border-gray-200 bg-transparent hover:bg-white/50 dark:border-dark-500"
                        }`}
                      >
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          ⚡ Hızlı Taşı (Doğrudan)
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-dark-300">
                          Aracı anında yeni lokasyona kaydırır, onay beklemez.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsDirect(false)}
                        className={`flex flex-col items-start rounded-lg border p-2.5 text-left transition ${
                          !isDirect
                            ? "border-primary-500 bg-white ring-2 ring-primary-500/20 shadow-xs dark:bg-dark-600"
                            : "border-gray-200 bg-transparent hover:bg-white/50 dark:border-dark-500"
                        }`}
                      >
                        <span className="text-xs font-bold text-gray-900 dark:text-white">
                          🚚 Transfer Başlat
                        </span>
                        <span className="text-[11px] text-gray-500 dark:text-dark-300">
                          Teslim-tesellüm bekler. Araç varış noktasında teslim alınır.
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Transfer Notu */}
                <div>
                  <label className="text-xs font-bold text-gray-700 dark:text-dark-100 mb-1 block">
                    Transfer Notu (Opsiyonel)
                  </label>
                  <Textarea
                    rows={2}
                    placeholder="Transfer nedeni, şoför veya açıklama..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>

                {/* İşlem Butonu */}
                <div className="flex gap-2 pt-1">
                  <Button
                    color="primary"
                    className="flex-1 gap-2 py-2.5 text-xs font-bold"
                    onClick={handleTransfer}
                    disabled={
                      actionLoading ||
                      !targetLocationId ||
                      (isExternalTarget && (!supplierId || !returnLocationId))
                    }
                  >
                    {actionLoading ? (
                      <Spinner className="size-4" />
                    ) : (
                      <TbTruck className="size-4" />
                    )}
                    {isNoLocation
                      ? "Lokasyonu Kaydet"
                      : isDirect
                        ? "Aracı Yeni Lokasyona Taşı"
                        : "Transfer Sürecini Başlat"}
                  </Button>
                </div>
              </div>
            )}

            {/* HAREKET VE TRANSFER GEÇMİŞİ */}
            <div className="border-t border-gray-150 pt-3 dark:border-dark-600">
              <button
                type="button"
                onClick={() => setShowHistory((s) => !s)}
                className="flex w-full items-center justify-between py-1 text-xs font-bold text-gray-500 hover:text-gray-700 dark:text-dark-300 dark:hover:text-dark-100"
              >
                <span className="flex items-center gap-1.5">
                  <TbHistory className="size-4" />
                  Lokasyon ve Hareket Geçmişi ({history.length})
                </span>
                <span>{showHistory ? "Gizle ▲" : "Göster ▼"}</span>
              </button>

              {showHistory && (
                <div className="mt-3 max-h-56 space-y-2.5 overflow-y-auto pr-1">
                  {history.length === 0 ? (
                    <p className="py-4 text-center text-xs text-gray-400">
                      Henüz geçmiş lokasyon hareketi bulunmuyor.
                    </p>
                  ) : (
                    history.map((t) => (
                      <div
                        key={t.id}
                        className="rounded-xl border border-gray-150 bg-gray-50/70 p-3 text-xs dark:border-dark-600 dark:bg-dark-800"
                      >
                        <div className="flex items-center justify-between mb-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-gray-900 dark:text-white">
                              {t.fromLocation ? t.fromLocation.name : "İlk Atama"}
                            </span>
                            <TbArrowRight className="size-3.5 text-gray-400" />
                            <span className="font-bold text-primary-600 dark:text-primary-400">
                              {t.toLocation?.name ?? "Bilinmiyor"}
                            </span>
                          </div>

                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                              t.status === "CONFIRMED"
                                ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                                : t.status === "PENDING"
                                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300"
                                  : "bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300"
                            }`}
                          >
                            {t.status === "CONFIRMED"
                              ? "Tamamlandı"
                              : t.status === "PENDING"
                                ? "Bekliyor"
                                : "İptal Edildi"}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <TbClock className="size-3" />
                            {fmtDate(t.confirmedAt || t.initiatedAt)}
                          </span>

                          {t.initiatedByUser && (
                            <span>İşlem: {t.initiatedByUser.name}</span>
                          )}

                          {t.confirmedByUser && (
                            <span>Onaylayan: {t.confirmedByUser.name}</span>
                          )}

                          {t.supplier && (
                            <span className="text-purple-600 dark:text-purple-400">
                              Servis: {t.supplier.name}
                            </span>
                          )}
                        </div>

                        {t.notes && (
                          <p className="mt-1.5 text-[11px] text-gray-600 dark:text-dark-200 bg-white/70 dark:bg-dark-700/50 p-1.5 rounded">
                            {t.notes}
                          </p>
                        )}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </>
        )}

        {/* Modal Kapat Butonu */}
        <div className="flex justify-end pt-2 border-t border-gray-100 dark:border-dark-600">
          <Button variant="outlined" onClick={onClose} className="px-4 py-2 text-xs">
            Kapat
          </Button>
        </div>
      </div>
    </Modal>
  );
}
