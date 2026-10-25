import { useState, useRef, useEffect, useCallback } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import {
  SparklesIcon,
  CameraIcon,
  PhotoIcon,
  MicrophoneIcon,
  XMarkIcon,
  PaperAirplaneIcon,
  UserPlusIcon,
  UserGroupIcon,
  TruckIcon,
  AdjustmentsHorizontalIcon,
} from "@heroicons/react/24/outline";

import { Modal } from "@/components/shared/Modal";
import { Button, Spinner, Badge } from "@/components/ui";
import {
  sendAiAssist,
  type AiAssistResult,
} from "@/services/aiService";

interface Props {
  open: boolean;
  onClose: () => void;
}

export function AiAssistantModal({ open, onClose }: Props) {
  const navigate = useNavigate();

  // Prompt ve Görsel durumu
  const [prompt, setPrompt] = useState("");
  const [selectedImage, setSelectedImage] = useState<{
    file: File;
    previewUrl: string;
    base64Data: string;
    mediaType: "image/jpeg" | "image/png" | "image/webp" | "image/gif";
  } | null>(null);

  // Sesle tanıma (Speech-to-Text) durumu
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Kamera ve dosya input referansları
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  // Yükleme ve Sonuç durumu
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiAssistResult | null>(null);

  // Modal sıfırlama
  useEffect(() => {
    if (open) {
      setPrompt("");
      setSelectedImage(null);
      setResult(null);
      setLoading(false);
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    }
  }, [open]);

  // Dosyayı istemcide optimize edip Base64'e dönüştürme (413 Payload Too Large engelleme)
  const handleFileProcess = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Lütfen geçerli bir görsel dosyası (JPG, PNG, WEBP) seçin.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const rawDataUrl = reader.result as string;
      const img = new Image();
      img.onload = () => {
        // En yüksek çözünürlüklü telefon fotoğraflarını max 1600px boyutuna çek
        const maxDim = 1600;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const optimizedDataUrl = canvas.toDataURL("image/jpeg", 0.85);
          const base64Data = optimizedDataUrl.split(",")[1];

          setSelectedImage({
            file,
            previewUrl: optimizedDataUrl,
            base64Data,
            mediaType: "image/jpeg",
          });
        } else {
          const base64Data = rawDataUrl.split(",")[1];
          setSelectedImage({
            file,
            previewUrl: rawDataUrl,
            base64Data,
            mediaType: file.type as any,
          });
        }

        // Eğer prompt boşsa akıllı öneri metni koy
        if (!prompt) {
          const lowerName = file.name.toLowerCase();
          if (lowerName.includes("ehliyet") || lowerName.includes("surucu")) {
            setPrompt("Bu ehliyet belgesindeki kişi ve kimlik bilgilerini çözümle.");
          } else if (lowerName.includes("ruhsat") || lowerName.includes("tescil")) {
            setPrompt("Bu araç ruhsatındaki plaka, marka, model ve şasi no bilgilerini oku.");
          } else {
            setPrompt("Lütfen bu görseldeki araç veya müşteri belgesini analiz et.");
          }
        }
      };
      img.onerror = () => {
        const base64Data = rawDataUrl.split(",")[1];
        setSelectedImage({
          file,
          previewUrl: rawDataUrl,
          base64Data,
          mediaType: file.type as any,
        });
      };
      img.src = rawDataUrl;
    };
    reader.readAsDataURL(file);
  };

  // Speech-to-Text Başlat / Durdur
  const toggleSpeechRecognition = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast.error("Tarayıcınız ses tanımayı desteklemiyor.");
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "tr-TR";
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        toast.info("Mikrofon dinleniyor, lütfen konuşun...");
      };

      recognition.onresult = (event: any) => {
        const text = event.results[0]?.[0]?.transcript || "";
        if (text) {
          setPrompt((prev) => (prev ? `${prev.trim()} ${text}` : text));
        }
      };

      recognition.onerror = (err: any) => {
        console.warn("Ses tanıma hatası:", err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch {
      setIsListening(false);
      toast.error("Mikrofon başlatılamadı.");
    }
  };

  // AI Gönderim
  const handleSubmit = useCallback(async () => {
    if (!prompt.trim() && !selectedImage) {
      toast.error("Lütfen bir soru yazın, konuşun veya bir görsel ekleyin.");
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const payload: any = {
        prompt: prompt.trim(),
      };

      if (selectedImage) {
        payload.image = {
          mediaType: selectedImage.mediaType,
          base64Data: selectedImage.base64Data,
        };
      }

      const res = await sendAiAssist(payload);
      setResult(res);
    } catch (err: any) {
      toast.error(err?.message || "Yapay zeka analizinde hata oluştu.");
    } finally {
      setLoading(false);
    }
  }, [prompt, selectedImage]);

  // Aksiyon 1: Ehliyet ile CRM Aday Müşteri Aç
  const handleOpenLead = () => {
    if (!result?.data?.license) return;
    const l = result.data.license;

    sessionStorage.setItem(
      "filomonline_ai_lead_prefill",
      JSON.stringify({
        fullName: l.fullName || `${l.firstName || ""} ${l.lastName || ""}`.trim(),
        phone: l.phone || "",
        notes: `AI Ehliyet Analizi: TC: ${l.tcNo || "-"} | Ehliyet Sınıfı: ${l.licenseClass || "-"} | Belge No: ${l.documentNo || "-"} | Doğum Tarihi: ${l.birthDate || "-"}`,
      }),
    );

    onClose();
    navigate("/crm/leads?openNew=1");
    toast.success("Ehliyet bilgileri CRM Aday formuna aktarıldı.");
  };

  // Aksiyon 2: Ehliyet ile Cari Hesap Aç
  const handleOpenAccount = () => {
    if (!result?.data?.license) return;
    const l = result.data.license;

    sessionStorage.setItem(
      "filomonline_ai_account_prefill",
      JSON.stringify({
        name: l.fullName || `${l.firstName || ""} ${l.lastName || ""}`.trim(),
        nationalId: l.tcNo || "",
        phone: l.phone || "",
        accountType: "CUSTOMER",
      }),
    );

    onClose();
    navigate("/accounts?openNew=1");
    toast.success("Ehliyet bilgileri Cari Hesap formuna aktarıldı.");
  };

  // Aksiyon 3: Ruhsat ile Araç Kartı Aç
  const handleOpenVehicle = () => {
    if (!result?.data?.registration) return;
    const r = result.data.registration;

    sessionStorage.setItem(
      "filomonline_ai_vehicle_prefill",
      JSON.stringify({
        plate: r.plate || "",
        year: r.year || new Date().getFullYear(),
        vin: r.vin || "",
        engineNo: r.engineNo || "",
        fuelType: r.fuelType || "DIZEL",
        transmission: r.transmission || "OTOMATIK",
        status: "STOKTA",
        brandName: r.brand || "",
        modelName: r.model || "",
      }),
    );

    onClose();
    navigate("/vehicles?openNew=1");
    toast.success("Ruhsat bilgileri Araç Kartı formuna aktarıldı.");
  };

  // Aksiyon 4: Filtrelenmiş Araçları Listele
  const handleNavigateFilter = () => {
    if (!result?.action?.url) return;
    onClose();
    navigate(result.action.url);
    toast.success("Araç filtreleri uygulandı.");
  };

  return (
    <Modal open={open} onClose={onClose} noPadding className="max-w-2xl">
      <div className="flex flex-col overflow-hidden rounded-2xl bg-white dark:bg-dark-750 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-150 px-5 py-4 dark:border-dark-600 bg-gradient-to-r from-primary-600/10 via-purple-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 to-purple-600 text-white shadow-md">
              <SparklesIcon className="size-5.5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-dark-50">
                Filomonline AI Asistan
              </h3>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                Ehliyet & Ruhsat okuma, sesli komut ve akıllı araç filtreleme
              </p>
            </div>
          </div>
          <Button
            onClick={onClose}
            variant="flat"
            isIcon
            className="size-8 rounded-full text-gray-400 hover:text-gray-700 dark:hover:text-dark-100"
          >
            <XMarkIcon className="size-5" />
          </Button>
        </div>

        {/* Content Body */}
        <div className="space-y-4 p-5 max-h-[75vh] overflow-y-auto custom-scrollbar">
          {/* Görsel Önizleme (Varsa) */}
          {selectedImage && (
            <div className="relative flex items-center gap-3 rounded-xl border border-primary-200 bg-primary-50/50 p-2.5 dark:border-primary-900/50 dark:bg-primary-950/20">
              <img
                src={selectedImage.previewUrl}
                alt="Yüklenen Belge"
                className="size-16 rounded-lg object-cover border border-primary-200 dark:border-primary-800 shadow-2xs"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <Badge color="primary" variant="soft" className="text-[10px]">
                    Belge Eklendi
                  </Badge>
                  <span className="truncate text-xs font-semibold text-gray-800 dark:text-dark-100">
                    {selectedImage.file.name}
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 dark:text-dark-300 mt-0.5">
                  {(selectedImage.file.size / 1024).toFixed(0)} KB • OCR ve veri çıkarımı için hazır
                </p>
              </div>
              <Button
                isIcon
                variant="flat"
                onClick={() => setSelectedImage(null)}
                className="size-7 rounded-full text-gray-400 hover:text-error"
                title="Görseli Kaldır"
              >
                <XMarkIcon className="size-4" />
              </Button>
            </div>
          )}

          {/* Prompt Girdi Alanı */}
          <div className="relative rounded-xl border border-gray-200 bg-gray-50/70 p-3 transition-colors focus-within:border-primary-500 focus-within:bg-white dark:border-dark-600 dark:bg-dark-800 dark:focus-within:bg-dark-700">
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
              placeholder="Örn: Bana 2020 üstü, 200k - 300k arası otomatik araba lazım... veya ehliyet/ruhsat görseli yükleyin"
              className="w-full resize-none bg-transparent text-xs sm:text-sm text-gray-800 placeholder:text-gray-400 focus:outline-hidden dark:text-dark-100 dark:placeholder:text-dark-400"
            />

            {/* Alt İşlem Butonları */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-gray-200/60 pt-2.5 dark:border-dark-600/60">
              {/* Sol Araçlar: Kamera, Galeri, Ses */}
              <div className="flex items-center gap-1.5">
                {/* 1. Kamera Butonu */}
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  ref={cameraInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileProcess(file);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="flat"
                  onClick={() => cameraInputRef.current?.click()}
                  className="h-8 gap-1.5 rounded-lg px-2.5 text-xs text-gray-700 hover:bg-gray-200/60 dark:text-dark-200 dark:hover:bg-dark-600"
                  title="Kamera ile çek"
                >
                  <CameraIcon className="size-4 text-primary-600 dark:text-primary-400" />
                  <span className="hidden sm:inline">Kamera</span>
                </Button>

                {/* 2. Galeri / Dosya Butonu */}
                <input
                  type="file"
                  accept="image/*"
                  ref={galleryInputRef}
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileProcess(file);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="flat"
                  onClick={() => galleryInputRef.current?.click()}
                  className="h-8 gap-1.5 rounded-lg px-2.5 text-xs text-gray-700 hover:bg-gray-200/60 dark:text-dark-200 dark:hover:bg-dark-600"
                  title="Galeriden / Dosyadan seç"
                >
                  <PhotoIcon className="size-4 text-secondary-600 dark:text-secondary-400" />
                  <span className="hidden sm:inline">Galeri / Belge</span>
                </Button>

                {/* 3. Ses Tanıma (Speech to Text) Butonu */}
                <Button
                  type="button"
                  variant="flat"
                  onClick={toggleSpeechRecognition}
                  className={`h-8 gap-1.5 rounded-lg px-2.5 text-xs transition-colors ${
                    isListening
                      ? "bg-error/15 text-error font-semibold animate-pulse"
                      : "text-gray-700 hover:bg-gray-200/60 dark:text-dark-200 dark:hover:bg-dark-600"
                  }`}
                  title={isListening ? "Dinlemeyi Durdur" : "Sesle Yazdır (Speech to Text)"}
                >
                  <MicrophoneIcon
                    className={`size-4 ${isListening ? "text-error" : "text-amber-500"}`}
                  />
                  <span>{isListening ? "Dinleniyor..." : "Sesle Söyle"}</span>
                </Button>
              </div>

              {/* Sağ: Gönder Butonu */}
              <Button
                type="button"
                color="primary"
                onClick={handleSubmit}
                disabled={loading || (!prompt.trim() && !selectedImage)}
                className="h-8 gap-1.5 rounded-lg px-4 text-xs shadow-xs"
              >
                {loading ? (
                  <>
                    <Spinner color="neutral" className="size-3.5 border-2" />
                    <span>İnceleniyor...</span>
                  </>
                ) : (
                  <>
                    <span>Analiz Et</span>
                    <PaperAirplaneIcon className="size-3.5" />
                  </>
                )}
              </Button>
            </div>
          </div>

          {/* Hızlı Örnek Çipleri */}
          {!result && !loading && (
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-gray-500 dark:text-dark-300">
                Hızlı Deneme Örnekleri:
              </p>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setPrompt("Bana 2020 üstü, 200k 300k arası otomatik vites araba lazım");
                  }}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 transition-colors hover:border-primary-500 hover:bg-primary-50 hover:text-primary-600 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-200 dark:hover:border-primary-400 dark:hover:text-primary-300"
                >
                  🚗 2020+ Otomatik 200k-300k Arası Araç
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrompt("Ehliyet belgesi fotoğrafından müşteri ve potansiyel aday kartı aç");
                  }}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 transition-colors hover:border-primary-500 hover:bg-primary-50 hover:text-primary-600 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-200 dark:hover:border-primary-400 dark:hover:text-primary-300"
                >
                  🪪 Ehliyetten Aday / Müşteri Kartı Aç
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPrompt("Araç ruhsatı fotoğrafından yeni araç kartı oluştur");
                  }}
                  className="rounded-lg border border-gray-200 bg-gray-50 px-2.5 py-1 text-xs text-gray-700 transition-colors hover:border-primary-500 hover:bg-primary-50 hover:text-primary-600 dark:border-dark-600 dark:bg-dark-700 dark:text-dark-200 dark:hover:border-primary-400 dark:hover:text-primary-300"
                >
                  📄 Ruhsattan Araç Kartı Aç
                </button>
              </div>
            </div>
          )}

          {/* Yükleniyor Göstergesi */}
          {loading && (
            <div className="flex flex-col items-center justify-center py-8 text-center space-y-3">
              <div className="relative flex size-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary-500 to-purple-600 text-white shadow-lg animate-bounce">
                <SparklesIcon className="size-7" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800 dark:text-dark-100">
                  Yapay Zeka Analiz Ediyor...
                </p>
                <p className="text-xs text-gray-400 dark:text-dark-300 mt-0.5">
                  Görsel veya metindeki veriler ayrıştırılıyor ve aksiyon hazırlanıyor
                </p>
              </div>
            </div>
          )}

          {/* AI Çözümleme Sonucu */}
          {result && !loading && (
            <div className="rounded-xl border border-primary-200 bg-gradient-to-br from-primary-50/60 via-purple-50/30 to-white p-4 shadow-sm dark:border-primary-900/60 dark:from-primary-950/30 dark:via-dark-700 dark:to-dark-750 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge color="primary" variant="soft" className="text-xs font-semibold px-2">
                    {result.intent === "EHLIYET" && "Ehliyet / Müşteri"}
                    {result.intent === "RUHSAT" && "Araç Ruhsatı"}
                    {result.intent === "VEHICLE_SEARCH" && "Araç Filtresi"}
                    {result.intent === "GENERAL" && "Genel Yanıt"}
                  </Badge>
                  <span className="text-xs font-bold text-gray-800 dark:text-dark-50">
                    {result.title}
                  </span>
                </div>
                {result.modelUsed && (
                  <span className="text-[10px] text-gray-400 dark:text-dark-400">
                    {result.modelUsed} ({result.latencyMs}ms)
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-gray-700 dark:text-dark-200 leading-relaxed">
                {result.summary}
              </p>

              {/* 1. Senaryo: Ehliyet Sonuç Detayları */}
              {result.intent === "EHLIYET" && result.data?.license && (
                <div className="rounded-lg bg-white/80 p-3 dark:bg-dark-800/80 border border-gray-150 dark:border-dark-600 space-y-2">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Ayrıştırılan Bilgiler:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Ad Soyad: </span>
                      <strong className="text-gray-800 dark:text-dark-100">
                        {result.data.license.fullName || "-"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400">TC Kimlik: </span>
                      <strong className="text-gray-800 dark:text-dark-100">
                        {result.data.license.tcNo || "-"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400">Ehliyet Sınıfı: </span>
                      <strong className="text-gray-800 dark:text-dark-100">
                        {result.data.license.licenseClass || "B"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400">Doğum Tarihi: </span>
                      <strong className="text-gray-800 dark:text-dark-100">
                        {result.data.license.birthDate || "-"}
                      </strong>
                    </div>
                  </div>

                  {/* Ehliyet Aksiyon Butonları */}
                  <div className="mt-3 flex flex-wrap gap-2 pt-2 border-t border-gray-150 dark:border-dark-600">
                    <Button
                      type="button"
                      color="success"
                      onClick={handleOpenLead}
                      className="h-8 gap-1.5 rounded-lg px-3 text-xs"
                    >
                      <UserPlusIcon className="size-4" />
                      <span>CRM Aday Müşteri Aç</span>
                    </Button>
                    <Button
                      type="button"
                      color="primary"
                      onClick={handleOpenAccount}
                      className="h-8 gap-1.5 rounded-lg px-3 text-xs"
                    >
                      <UserGroupIcon className="size-4" />
                      <span>Cari Hesap (Müşteri) Aç</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* 2. Senaryo: Ruhsat Sonuç Detayları */}
              {result.intent === "RUHSAT" && result.data?.registration && (
                <div className="rounded-lg bg-white/80 p-3 dark:bg-dark-800/80 border border-gray-150 dark:border-dark-600 space-y-2">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Ayrıştırılan Araç Verileri:
                  </p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-400">Plaka: </span>
                      <strong className="text-gray-800 dark:text-dark-100">
                        {result.data.registration.plate || "-"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400">Marka / Model: </span>
                      <strong className="text-gray-800 dark:text-dark-100">
                        {result.data.registration.brand} {result.data.registration.model}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400">Model Yılı: </span>
                      <strong className="text-gray-800 dark:text-dark-100">
                        {result.data.registration.year || "-"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400">Şasi No (VIN): </span>
                      <strong className="text-gray-800 dark:text-dark-100 truncate block">
                        {result.data.registration.vin || "-"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400">Vites: </span>
                      <strong className="text-gray-800 dark:text-dark-100">
                        {result.data.registration.transmission || "OTOMATIK"}
                      </strong>
                    </div>
                    <div>
                      <span className="text-gray-400">Yakıt: </span>
                      <strong className="text-gray-800 dark:text-dark-100">
                        {result.data.registration.fuelType || "DIZEL"}
                      </strong>
                    </div>
                  </div>

                  {/* Ruhsat Aksiyon Butonu */}
                  <div className="mt-3 flex gap-2 pt-2 border-t border-gray-150 dark:border-dark-600">
                    <Button
                      type="button"
                      color="primary"
                      onClick={handleOpenVehicle}
                      className="h-8 gap-1.5 rounded-lg px-4 text-xs shadow-xs"
                    >
                      <TruckIcon className="size-4" />
                      <span>Yeni Araç Kartı Aç</span>
                    </Button>
                  </div>
                </div>
              )}

              {/* 3. Senaryo: Araç Filtreleme Detayları */}
              {result.intent === "VEHICLE_SEARCH" && result.data?.filter && (
                <div className="rounded-lg bg-white/80 p-3 dark:bg-dark-800/80 border border-gray-150 dark:border-dark-600 space-y-2">
                  <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    Uygulanacak Filtreler:
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {result.data.filter.minYear && (
                      <Badge color="secondary" variant="soft" className="text-xs">
                        {result.data.filter.minYear}+ Model
                      </Badge>
                    )}
                    {result.data.filter.transmission && (
                      <Badge color="info" variant="soft" className="text-xs">
                        {result.data.filter.transmission === "OTOMATIK" ? "Otomatik Vites" : "Manuel"}
                      </Badge>
                    )}
                    {result.data.filter.minPrice && result.data.filter.maxPrice && (
                      <Badge color="warning" variant="soft" className="text-xs">
                        {result.data.filter.minPrice.toLocaleString("tr-TR")} ₺ - {result.data.filter.maxPrice.toLocaleString("tr-TR")} ₺
                      </Badge>
                    )}
                    <Badge color="success" variant="soft" className="text-xs">
                      Stoktaki Araçlar
                    </Badge>
                  </div>

                  {/* Filtre Aksiyon Butonu */}
                  <div className="mt-3 flex gap-2 pt-2 border-t border-gray-150 dark:border-dark-600">
                    <Button
                      type="button"
                      color="primary"
                      onClick={handleNavigateFilter}
                      className="h-8 gap-1.5 rounded-lg px-4 text-xs shadow-xs"
                    >
                      <AdjustmentsHorizontalIcon className="size-4" />
                      <span>Filtrelenmiş Araçları Listele →</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}
