import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  CheckIcon,
  EnvelopeIcon,
  KeyIcon,
  PhoneIcon,
  PhotoIcon,
  TrashIcon,
  UserIcon,
} from "@heroicons/react/24/outline";

import { useAuthContext } from "@/app/contexts/auth/context";
import { Avatar, Button, Input } from "@/components/ui";
import { uploadBlob, useFileUrl } from "@/services/storageService";
import { updateProfile } from "@/services/userService";

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
  const { user, refreshUser } = useAuthContext();

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



  return (
    <div className="w-full max-w-4xl space-y-6">
      {/* BAŞLIK */}
      <div>
        <h4 className="text-xl font-bold text-gray-900 dark:text-dark-50">
          Genel Ayarlar & Profil
        </h4>
        <p className="mt-1 text-sm text-gray-500 dark:text-dark-200">
          Kişisel profilinizi ve hesap bilgilerinizi bu ekrandan yönetebilirsiniz.
        </p>
      </div>

      {/* KULLANICI PROFİLİ VE AVATAR */}
      <section className="space-y-6">
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
    </div>
  );
}
