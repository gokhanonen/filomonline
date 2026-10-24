import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  BuildingOffice2Icon,
  CheckIcon,
  EnvelopeIcon,
  IdentificationIcon,
  KeyIcon,
  PhoneIcon,
  PhotoIcon,
  TrashIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

import { useAuthContext } from "@/app/contexts/auth/context";
import { Avatar, Button, Input, Textarea } from "@/components/ui";
import { uploadBlob, useFileUrl } from "@/services/storageService";
import { updateProfile } from "@/services/userService";
import {
  getCurrentCompany,
  updateCurrentCompany,
} from "@/services/adminService";

function initialsOf(name?: string | null): string {
  if (!name) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export default function General() {
  const { user, activeCompanyId, isCompanyAdmin, isSuperAdmin, refreshUser } =
    useAuthContext();

  // --- Kullanıcı Profil Durumu ---
  const [profileName, setProfileName] = useState("");
  const [profilePhone, setProfilePhone] = useState("");
  const [profileExtension, setProfileExtension] = useState("");
  const [profilePassword, setProfilePassword] = useState("");
  const [avatarKey, setAvatarKey] = useState<string>("");
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  const resolvedAvatarUrl = useFileUrl(avatarKey);

  useEffect(() => {
    if (user) {
      setProfileName(user.name ?? "");
      setProfilePhone(user.phone ?? "");
      setProfileExtension(user.extension ?? "");
      setAvatarKey(user.avatarUrl ?? "");
    }
  }, [user]);

  // --- Firma Durumu ---
  const [companyName, setCompanyName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [taxOffice, setTaxOffice] = useState("");
  const [taxNumber, setTaxNumber] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [companyEmail, setCompanyEmail] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [logoKey, setLogoKey] = useState<string>("");
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const [isSavingCompany, setIsSavingCompany] = useState(false);
  const [isLoadingCompany, setIsLoadingCompany] = useState(false);

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

  // --- Kullanıcı Avatar Yükleme ---
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Lütfen geçerli bir resim dosyası seçin");
      return;
    }

    try {
      setIsUploadingAvatar(true);
      const key = await uploadBlob(file, file.name, "avatars");
      setAvatarKey(key);
      toast.success("Fotoğraf yüklendi. Değişiklikleri kaydetmeyi unutmayın.");
    } catch (err) {
      toast.error((err as Error).message || "Fotoğraf yüklenemedi");
    } finally {
      setIsUploadingAvatar(false);
      e.target.value = "";
    }
  };

  const handleRemoveAvatar = () => {
    setAvatarKey("");
    toast.info("Fotoğraf kaldırıldı. Kaydet butonuna basarak onaylayın.");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      toast.error("Ad Soyad alanı zorunludur");
      return;
    }

    try {
      setIsSavingProfile(true);
      await updateProfile({
        name: profileName.trim(),
        phone: profilePhone.trim() || undefined,
        extension: profileExtension.trim() || undefined,
        avatarUrl: avatarKey || "",
        password: profilePassword.trim() || undefined,
      });
      await refreshUser();
      setProfilePassword("");
      toast.success("Profil bilgileriniz başarıyla güncellendi");
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Profil güncellenemedi");
    } finally {
      setIsSavingProfile(false);
    }
  };

  // --- Firma Logosu Yükleme ---
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
    <div className="w-full max-w-4xl space-y-8">
      {/* BAŞLIK */}
      <div>
        <h4 className="text-xl font-bold text-gray-900 dark:text-dark-50">
          Genel Ayarlar & Profil
        </h4>
        <p className="mt-1 text-sm text-gray-500 dark:text-dark-200">
          Kişisel profilinizi ve aktif firmanıza ait logo ve kurumsal bilgileri yönetin.
        </p>
      </div>

      {/* 1. BÖLÜM: KULLANICI PROFİLİ VE AVATAR */}
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-xs dark:border-dark-600 dark:bg-dark-750">
        <div className="flex items-center gap-3 pb-5 border-b border-gray-150 dark:border-dark-600">
          <div className="flex size-10 items-center justify-center rounded-xl bg-primary-50 text-primary-600 dark:bg-primary-950/40 dark:text-primary-400">
            <UserIcon className="size-5" />
          </div>
          <div>
            <h5 className="text-base font-semibold text-gray-800 dark:text-dark-100">
              Kullanıcı Profili & Avatar
            </h5>
            <p className="text-xs text-gray-500 dark:text-dark-300">
              Hesap bilgilerinizi ve avatar fotoğrafınızı güncelleyin.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveProfile} className="mt-6 space-y-6">
          {/* Avatar Alanı */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-5 p-4 rounded-xl bg-gray-50 dark:bg-dark-800/60 border border-gray-150 dark:border-dark-600">
            <div className="relative shrink-0">
              <Avatar
                size={20}
                src={resolvedAvatarUrl}
                initialColor="primary"
                alt={profileName || user?.name || "Profil"}
                className="ring-4 ring-white dark:ring-dark-700 shadow-md rounded-2xl"
              >
                {initialsOf(profileName || user?.name)}
              </Avatar>
            </div>

            <div className="flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <label className="cursor-pointer">
                  <span className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium rounded-lg bg-primary-600 text-white hover:bg-primary-700 transition shadow-xs">
                    <PhotoIcon className="size-4" />
                    {isUploadingAvatar
                      ? "Yükleniyor..."
                      : avatarKey
                        ? "Fotoğrafı Değiştir"
                        : "Avatar Fotoğrafı Yükle"}
                  </span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    className="hidden"
                    disabled={isUploadingAvatar}
                    onChange={handleAvatarUpload}
                  />
                </label>

                {avatarKey && (
                  <Button
                    type="button"
                    variant="flat"
                    className="text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1.5 px-3 py-2"
                    onClick={handleRemoveAvatar}
                  >
                    <TrashIcon className="size-4" />
                    Kaldır
                  </Button>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Önerilen boyut en az 256x256 piksel. Desteklenen biçimler: JPG, PNG, WebP.
              </p>
            </div>
          </div>

          {/* Form Alanları */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Ad Soyad"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="Ad ve soyadınız"
              prefix={<UserIcon className="size-4.5 text-gray-400" />}
              required
            />
            <Input
              label="E-posta Adresi"
              value={user?.email ?? ""}
              disabled
              prefix={<EnvelopeIcon className="size-4.5 text-gray-400" />}
              suffix={
                <span className="text-tiny font-medium text-gray-400 dark:text-dark-300">
                  Değiştirilemez
                </span>
              }
            />
            <Input
              label="Telefon Numarası"
              value={profilePhone}
              onChange={(e) => setProfilePhone(e.target.value)}
              placeholder="0 (5XX) XXX XX XX"
              prefix={<PhoneIcon className="size-4.5 text-gray-400" />}
            />
            <Input
              label="Dahili Numara"
              value={profileExtension}
              onChange={(e) => setProfileExtension(e.target.value)}
              placeholder="Dahili No (örn: 104)"
              prefix={<PhoneIcon className="size-4.5 text-gray-400" />}
            />
            <div className="sm:col-span-2">
              <Input
                label="Yeni Şifre (boş bırakılırsa değişmez)"
                type="password"
                value={profilePassword}
                onChange={(e) => setProfilePassword(e.target.value)}
                placeholder="En az 6 karakterli yeni şifre"
                prefix={<KeyIcon className="size-4.5 text-gray-400" />}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              color="primary"
              disabled={isSavingProfile || isUploadingAvatar}
              className="gap-2 px-5 py-2.5 font-medium shadow-xs"
            >
              <CheckIcon className="size-4.5" />
              {isSavingProfile ? "Kaydediliyor..." : "Profil Bilgilerini Kaydet"}
            </Button>
          </div>
        </form>
      </section>

      {/* 2. BÖLÜM: FİRMA BİLGİLERİ VE FİRMA LOGOSU */}
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
          <div className="py-8 text-center text-sm text-gray-500">
            Firma bilgileri yükleniyor...
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
                  color="primary"
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
    </div>
  );
}
