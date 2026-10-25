import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BuildingOffice2Icon,
  CheckIcon,
  EnvelopeIcon,
  IdentificationIcon,
  PhoneIcon,
  PhotoIcon,
  TrashIcon,
} from "@heroicons/react/24/outline";

import { useAuthContext } from "@/app/contexts/auth/context";
import { Button, Input, Textarea, Spinner } from "@/components/ui";
import { uploadBlob, useFileUrl } from "@/services/storageService";
import {
  getCurrentCompany,
  updateCurrentCompany,
} from "@/services/adminService";

export function CompanySettingsCard() {
  const { activeCompanyId, isCompanyAdmin, isSuperAdmin, refreshUser } =
    useAuthContext();

  const [companyName, setCompanyName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [taxOffice, setTaxOffice] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [website, setWebsite] = useState("");
  const [mersisNo, setMersisNo] = useState("");
  const [tradeRegistryNo, setTradeRegistryNo] = useState("");
  const [logoKey, setLogoKey] = useState("");
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);

  const resolvedLogoUrl = useFileUrl(logoKey);

  const loadCompany = async () => {
    if (!activeCompanyId) return;
    try {
      setIsLoadingCompany(true);
      const data = await getCurrentCompany();
      setCompanyName(data.name ?? "");
      setLegalName(data.legalName ?? "");
      setTaxOffice(data.taxOffice ?? "");
      setTaxNumber(data.taxNumber ?? "");
      setCompanyPhone(data.phone ?? "");
      setCompanyEmail(data.email ?? "");
      setCompanyAddress(data.address ?? "");
      setWebsite(data.website ?? "");
      setMersisNo(data.mersisNo ?? "");
      setTradeRegistryNo(data.tradeRegistryNo ?? "");
      setLogoKey(data.logoUrl ?? "");
    } catch (err) {
      console.error("Firma detayları yüklenemedi:", err);
    } finally {
      setIsLoadingCompany(false);
    }
  };

  useEffect(() => {
    void loadCompany();
  }, [activeCompanyId]);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Lütfen geçerli bir logo görseli seçin");
      return;
    }

    try {
      setIsUploadingLogo(true);
      const key = await uploadBlob(file, file.name, "logos");
      setLogoKey(key);
      toast.success("Firma logosu yüklendi. Değişiklikleri kaydetmeyi unutmayın.");
    } catch (err) {
      toast.error((err as Error).message || "Logo yüklenemedi");
    } finally {
      setIsUploadingLogo(false);
      e.target.value = "";
    }
  };

  const handleRemoveLogo = () => {
    setLogoKey("");
    toast.info("Firma logosu kaldırıldı. Kaydet butonuna basarak onaylayın.");
  };

  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName.trim()) {
      toast.error("Firma adı zorunludur");
      return;
    }

    try {
      setIsSavingCompany(true);
      await updateCurrentCompany({
        name: companyName.trim(),
        legalName: legalName.trim() || null,
        taxOffice: taxOffice.trim() || null,
        taxNumber: taxNumber.trim() || null,
        phone: companyPhone.trim() || null,
        email: companyEmail.trim() || null,
        address: companyAddress.trim() || null,
        website: website.trim() || null,
        mersisNo: mersisNo.trim() || null,
        tradeRegistryNo: tradeRegistryNo.trim() || null,
        logoUrl: logoKey || null,
      });
      await refreshUser();
      await loadCompany();
      toast.success("Firma bilgileri ve logo başarıyla güncellendi");
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Firma bilgileri güncellenemedi");
    } finally {
      setIsSavingCompany(false);
    }
  };

  const canEditCompany = isCompanyAdmin || isSuperAdmin;

  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs dark:border-dark-600 dark:bg-dark-750">
      <div className="flex items-center justify-between pb-5 border-b border-gray-150 dark:border-dark-600">
        <div className="flex items-center gap-3">
          <div className="flex size-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
            <BuildingOffice2Icon className="size-5" />
          </div>
          <div>
            <h5 className="text-base font-semibold text-gray-800 dark:text-dark-100">
              Firma Bilgileri & Kurumsal Logo
            </h5>
            <p className="text-xs text-gray-500 dark:text-dark-300">
              Aktif firmanızın logosunu, fatura ve sözleşmelerde kullanılacak resmi bilgilerini yönetin.
            </p>
          </div>
        </div>
        {!canEditCompany && (
          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700 dark:bg-amber-950/40 dark:text-amber-300">
            Görüntüleme Modu (Yönetici İzni Gerekir)
          </span>
        )}
      </div>

      {isLoadingCompany ? (
        <div className="flex flex-col items-center justify-center py-12 gap-3">
          <Spinner className="size-7 text-primary-500" />
          <p className="text-sm text-gray-500 dark:text-dark-300">Firma bilgileri yükleniyor...</p>
        </div>
      ) : (
        <form onSubmit={handleSaveCompany} className="mt-6 space-y-6">
          {/* Firma Logo Alanı */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 rounded-xl bg-gray-50 dark:bg-dark-800/60 border border-gray-150 dark:border-dark-600">
            <div className="flex size-20 items-center justify-center rounded-2xl border border-gray-200 bg-white p-2 shadow-xs dark:border-dark-500 dark:bg-dark-800 shrink-0">
              {resolvedLogoUrl ? (
                <img
                  src={resolvedLogoUrl}
                  alt="Firma Logosu"
                  className="max-h-full max-w-full object-contain"
                />
              ) : (
                <BuildingOffice2Icon className="size-10 text-gray-300 dark:text-dark-400" />
              )}
            </div>

            <div className="flex-1 space-y-2">
              {canEditCompany && (
                <div className="flex flex-wrap items-center gap-2">
                  <label className="cursor-pointer">
                    <span className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition shadow-xs">
                      <PhotoIcon className="size-4" />
                      {isUploadingLogo
                        ? "Yükleniyor..."
                        : logoKey
                          ? "Logoyu Değiştir"
                          : "Firma Logosu Yükle"}
                    </span>
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/svg+xml"
                      className="hidden"
                      disabled={isUploadingLogo}
                      onChange={handleLogoUpload}
                    />
                  </label>

                  {logoKey && (
                    <Button
                      type="button"
                      variant="flat"
                      className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1.5 px-3 py-2"
                      onClick={handleRemoveLogo}
                    >
                      <TrashIcon className="size-4" />
                      Kaldır
                    </Button>
                  )}
                </div>
              )}
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Logo; üst menüde, sözleşmelerde ve teklif çıktılarında kullanılır. Şeffaf PNG veya SVG önerilir.
              </p>
            </div>
          </div>

          {/* Firma Form Alanları */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Firma Adı (Kısa / Ticari Ad)"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              disabled={!canEditCompany}
              placeholder="Örn: Acıbadem Filo"
              prefix={<BuildingOffice2Icon className="size-4.5 text-gray-400" />}
              required
            />
            <Input
              label="Resmi Ticari Ünvan"
              value={legalName}
              onChange={(e) => setLegalName(e.target.value)}
              disabled={!canEditCompany}
              placeholder="Örn: Acıbadem Filo Kiralama A.Ş."
              prefix={<IdentificationIcon className="size-4.5 text-gray-400" />}
            />
            <Input
              label="Vergi Dairesi"
              value={taxOffice}
              onChange={(e) => setTaxOffice(e.target.value)}
              disabled={!canEditCompany}
              placeholder="Örn: Kadıköy V.D."
              prefix={<IdentificationIcon className="size-4.5 text-gray-400" />}
            />
            <Input
              label="Vergi Numarası"
              value={taxNumber}
              onChange={(e) => setTaxNumber(e.target.value)}
              disabled={!canEditCompany}
              placeholder="10 haneli VKN veya 11 haneli TCKN"
              prefix={<IdentificationIcon className="size-4.5 text-gray-400" />}
            />
            <Input
              label="Firma Telefonu"
              value={companyPhone}
              onChange={(e) => setCompanyPhone(e.target.value)}
              disabled={!canEditCompany}
              placeholder="Örn: 0 (216) XXX XX XX"
              prefix={<PhoneIcon className="size-4.5 text-gray-400" />}
            />
            <Input
              label="Firma E-posta Adresi"
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
              disabled={!canEditCompany}
              placeholder="info@firmaniz.com"
              prefix={<EnvelopeIcon className="size-4.5 text-gray-400" />}
            />
            {/* Sözleşme başlığında ve satıcı bilgilerinde kullanılır */}
            <Input
              label="Web Sitesi"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              disabled={!canEditCompany}
              placeholder="www.firmaniz.com.tr"
            />
            <div className="grid grid-cols-2 gap-3">
              <Input label="MERSİS No" value={mersisNo} onChange={(e) => setMersisNo(e.target.value)} disabled={!canEditCompany} />
              <Input label="Ticaret Sicil No" value={tradeRegistryNo} onChange={(e) => setTradeRegistryNo(e.target.value)} disabled={!canEditCompany} />
            </div>
            <div className="sm:col-span-2">
              <Textarea
                label="Firma Resmi Adresi"
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                disabled={!canEditCompany}
                placeholder="Firma tebligat ve merkez adresi..."
                rows={3}
              />
            </div>
          </div>

          {canEditCompany && (
            <div className="flex justify-end pt-2">
              <Button
                type="submit"
                color="success"
                disabled={isSavingCompany || isUploadingLogo}
                className="gap-2 px-5 py-2.5 font-medium shadow-xs"
              >
                <CheckIcon className="size-4.5" />
                {isSavingCompany ? "Kaydediliyor..." : "Firma Bilgilerini Kaydet"}
              </Button>
            </div>
          )}
        </form>
      )}
    </section>
  );
}
