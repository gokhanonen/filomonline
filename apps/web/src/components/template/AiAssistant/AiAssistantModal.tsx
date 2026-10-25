import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import clsx from "clsx";
import { toast } from "sonner";
import {
  TbAlertTriangle,
  TbArrowRight,
  TbCamera,
  TbCar,
  TbCircleCheck,
  TbMicrophone,
  TbPhoto,
  TbSearch,
  TbSparkles,
  TbUser,
  TbUserPlus,
  TbX,
} from "react-icons/tb";

import { Modal } from "@/components/shared/Modal";
import { Button, Input, NumericInput } from "@/components/ui";
import { useAuthContext } from "@/app/contexts/auth/context";
import { DOCUMENT_PHOTO_MAX_BYTES, resizeImage, resizeWithThumbnail } from "@/utils/imageResize";
import { INFERRED_FIELD_LABEL, matchBodyType, matchBrandModel, matchColor } from "@/utils/vehicleCatalogMatch";
import type { VehicleFormValues } from "@/@types/vehicle";
import type { CatalogAll } from "@/@types/catalog";
import { getCatalog } from "@/services/catalogService";
import { createDocument, getDocumentMeta } from "@/services/documentService";
import { uploadBlob } from "@/services/storageService";
import {
  sendAiAssist,
  type AiAssistOption,
  type AiAssistResult,
  type AiDocumentType,
} from "@/services/aiService";
import { createAccount, listAccounts } from "@/services/accountService";
import { createLead, listLeads } from "@/services/crmService";
import { createVehicle, listVehicles } from "@/services/vehicleService";

interface Props {
  open: boolean;
  onClose: () => void;
}

const MAX_PHOTOS = 3;
/** AI'a giden görsel (saklanmaz): küçük yazılar okunabilsin diye daha yüksek çözünürlük */
const AI_PHOTO_MAX_BYTES = 500 * 1024;
const AI_PHOTO_MAX_DIM = 2000;

interface Photo {
  id: string;
  /** Evraklara eklemek için asıl dosya */
  file: File;
  previewUrl: string;
  base64Data: string;
}

const DOC_LABEL: Record<AiDocumentType, string> = { EHLIYET: "Ehliyet", KIMLIK: "Kimlik", RUHSAT: "Ruhsat", DIGER: "Diğer belge" };

const OPTION_META: Record<AiAssistOption, { label: string; Icon: React.ElementType }> = {
  LEAD: { label: "Potansiyel", Icon: TbUserPlus },
  CUSTOMER: { label: "Müşteri", Icon: TbUser },
  VEHICLE: { label: "Araç", Icon: TbCar },
  VEHICLE_SEARCH: { label: "Araçları Göster", Icon: TbSearch },
};

type PersonForm = { fullName: string; phone: string; email: string; tckn: string; city: string; district: string; address: string };
type VehicleForm = {
  plate: string; brand: string; model: string; registrationModel: string; year: string; vin: string; engineNo: string;
  color: string; fuelType: string; transmission: string; bodyType: string; driveType: string;
  engineVolume: string; horsePower: string; enginePower: string;
};
const EMPTY_VEHICLE: VehicleForm = {
  plate: "", brand: "", model: "", registrationModel: "", year: "", vin: "", engineNo: "", color: "", fuelType: "",
  transmission: "", bodyType: "", driveType: "", engineVolume: "", horsePower: "", enginePower: "",
};

const FUEL_OPTS = [["BENZIN", "Benzin"], ["DIZEL", "Dizel"], ["LPG", "LPG"], ["ELEKTRIK", "Elektrik"], ["HIBRIT", "Hibrit"]];
const GEAR_OPTS = [["OTOMATIK", "Otomatik"], ["MANUEL", "Manuel"], ["YARI_OTOMATIK", "Yarı Otomatik"]];
const BODY_OPTS = [["SEDAN", "Sedan"], ["HATCHBACK", "Hatchback"], ["STATION_WAGON", "Station Wagon"], ["SUV", "SUV"], ["COUPE", "Coupe"], ["CABRIO", "Cabrio"], ["MINIVAN", "Minivan"], ["TICARI", "Ticari"]];
const DRIVE_OPTS = [["ONDEN_CEKIS", "Önden Çekiş"], ["ARKADAN_ITIS", "Arkadan İtiş"], ["FOUR_WD", "4x4"], ["AWD", "AWD"]];

/** Fotoğrafın belge sınıfı → evrak tipi değeri (Evrak Tanımları) */
const DOC_TYPE_VALUE: Partial<Record<AiDocumentType, string>> = { RUHSAT: "ruhsat", EHLIYET: "ehliyet", KIMLIK: "kimlik" };

const blobToBase64 = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(",")[1] ?? "");
    r.onerror = reject;
    r.readAsDataURL(blob);
  });

const errMsg = (err: unknown) =>
  [(err as { message?: string | string[] })?.message ?? "İşlem başarısız"].flat().join(", ");

/**
 * Sade AI asistan: metin yaz ya da en fazla 3 fotoğraf (ehliyet / kimlik / ruhsat) ekle.
 * AI belgeyi tanır, hangi kartın açılacağını önerir; kullanıcı seçip telefon/e-posta ekleyerek kaydı oluşturur.
 */
export function AiAssistantModal({ open, onClose }: Props) {
  const navigate = useNavigate();
  const { can } = useAuthContext();
  const [prompt, setPrompt] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<AiAssistResult | null>(null);
  const [choice, setChoice] = useState<AiAssistOption | null>(null);
  const [person, setPerson] = useState<PersonForm>({ fullName: "", phone: "", email: "", tckn: "", city: "", district: "", address: "" });
  const [vehicle, setVehicle] = useState<VehicleForm>(EMPTY_VEHICLE);
  const [attachDocs, setAttachDocs] = useState(true);
  // Araç tipi (Sıfır / 2.El / Filo / Konsinye — katalogdan) ve KM: sıfırda 0 kilitli, diğerlerinde zorunlu
  const [catalog, setCatalog] = useState<CatalogAll | null>(null);
  const [vehicleTypeId, setVehicleTypeId] = useState("");
  const [km, setKm] = useState<number | undefined>();
  const [existing, setExisting] = useState<{ label: string; to: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [created, setCreated] = useState<{ title: string; to: string } | null>(null);
  const [listening, setListening] = useState(false);
  const recognitionRef = useRef<{ stop: () => void; abort: () => void } | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setPrompt("");
    setPhotos([]);
    setResult(null);
    setError(null);
    setChoice(null);
    setExisting(null);
    setCreated(null);
  };

  useEffect(() => {
    if (open) reset();
    else recognitionRef.current?.abort();
  }, [open]);

  // ---- Girdi ----

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return toast.error(`En fazla ${MAX_PHOTOS} fotoğraf eklenebilir`);
    const picked = Array.from(files).filter((f) => f.type.startsWith("image/")).slice(0, room);
    if (files.length > room) toast.info(`İlk ${room} fotoğraf alındı (en fazla ${MAX_PHOTOS})`);
    try {
      const next = await Promise.all(
        picked.map(async (file) => {
          const blob = await resizeImage(file, { maxBytes: AI_PHOTO_MAX_BYTES, maxDimension: AI_PHOTO_MAX_DIM });
          return { id: crypto.randomUUID(), file, previewUrl: URL.createObjectURL(blob), base64Data: await blobToBase64(blob) };
        }),
      );
      setPhotos((p) => [...p, ...next]);
      setResult(null);
      setCreated(null);
    } catch {
      toast.error("Fotoğraf okunamadı");
    }
  };

  const toggleMic = () => {
    const w = window as unknown as { SpeechRecognition?: new () => any; webkitSpeechRecognition?: new () => any };
    const SR = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SR) return toast.error("Tarayıcınız sesle yazmayı desteklemiyor");
    if (listening) {
      recognitionRef.current?.stop();
      return;
    }
    const rec = new SR();
    rec.lang = "tr-TR";
    rec.interimResults = false;
    rec.onresult = (e: { results: { 0: { transcript: string } }[] }) => {
      const text = e.results[0]?.[0]?.transcript ?? "";
      if (text) setPrompt((p) => (p ? `${p.trim()} ${text}` : text));
    };
    rec.onstart = () => setListening(true);
    rec.onend = () => setListening(false);
    rec.onerror = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
  };

  const submit = async () => {
    if (!prompt.trim() && !photos.length) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setCreated(null);
    try {
      const res = await sendAiAssist({
        prompt: prompt.trim() || undefined,
        images: photos.length ? photos.map((p) => ({ mediaType: "image/jpeg" as const, base64Data: p.base64Data })) : undefined,
      });
      setResult(res);
      const p = res.person;
      setPerson({
        fullName: [p?.firstName, p?.lastName].filter(Boolean).join(" "),
        phone: p?.phone ?? "",
        email: p?.email ?? "",
        tckn: p?.tckn ?? "",
        city: p?.city ?? "",
        district: p?.district ?? "",
        address: p?.address ?? "",
      });
      const v = res.vehicle;
      const num = (n?: number | null) => (n ? String(n) : "");
      setVehicle({
        plate: v?.plate ?? "",
        brand: v?.brand ?? "",
        model: v?.model ?? "",
        registrationModel: v?.registrationModel ?? "",
        year: num(v?.modelYear),
        vin: v?.vin ?? "",
        engineNo: v?.engineNo ?? "",
        color: v?.color ?? "",
        fuelType: v?.fuelType ?? "",
        transmission: v?.transmission ?? "",
        bodyType: v?.bodyType ?? "",
        driveType: v?.driveType ?? "",
        engineVolume: num(v?.engineVolume),
        horsePower: num(v?.horsePower),
        enginePower: num(v?.enginePower),
      });
      setVehicleTypeId("");
      setKm(undefined);
      setChoice(res.options.find(allowed) ?? null);
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setLoading(false);
    }
  };

  // ---- Seçim ----

  const allowed = (o: AiAssistOption) =>
    o === "CUSTOMER" ? can("accounts.write") : o === "VEHICLE" ? can("vehicles.write") : true;

  useEffect(() => {
    if (choice === "VEHICLE" && !catalog) getCatalog().then(setCatalog).catch(() => void 0);
  }, [choice, catalog]);

  const vehicleTypes = catalog?.vehicleTypes ?? [];
  const isZeroKm = (id: string) => {
    const name = vehicleTypes.find((t) => t.id === id)?.name.toLocaleLowerCase("tr-TR") ?? "";
    return name.includes("sıfır") || name.includes("sifir");
  };
  const zeroKm = isZeroKm(vehicleTypeId);

  // Aynı kayıt zaten var mı?
  useEffect(() => {
    setExisting(null);
    if (!result || !choice) return;
    let cancelled = false;
    const check = async () => {
      if (choice === "VEHICLE" && vehicle.plate.trim()) {
        const plate = vehicle.plate.replace(/\s/g, "").toLocaleUpperCase("tr-TR");
        const r = await listVehicles({ search: vehicle.plate.trim(), pageSize: 5 });
        const hit = r.items.find((x) => x.plate.replace(/\s/g, "").toLocaleUpperCase("tr-TR") === plate);
        if (hit && !cancelled) setExisting({ label: `${hit.plate} zaten kayıtlı`, to: `/vehicles/${hit.id}` });
      } else if (choice === "CUSTOMER" && (person.tckn || person.phone)) {
        const r = await listAccounts({ search: person.tckn || person.phone, pageSize: 5 });
        const hit = r.items.find((a) => (person.tckn && a.tckn === person.tckn) || (person.phone && a.phone === person.phone));
        if (hit && !cancelled) setExisting({ label: `${hit.name} zaten cari olarak kayıtlı`, to: `/accounts?search=${encodeURIComponent(hit.name)}` });
      } else if (choice === "LEAD" && person.phone) {
        const r = await listLeads({ search: person.phone });
        const hit = r.find((l) => l.phone === person.phone);
        if (hit && !cancelled) setExisting({ label: `${hit.fullName} zaten potansiyel listesinde`, to: "/crm/leads" });
      }
    };
    check().catch(() => void 0);
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result, choice]);

  const searchUrl = useMemo(() => {
    const f = result?.filter;
    if (!f) return "/vehicles";
    const q = new URLSearchParams();
    if (f.query) q.set("search", f.query);
    if (f.minPrice) q.set("minPrice", String(f.minPrice));
    if (f.maxPrice) q.set("maxPrice", String(f.maxPrice));
    if (f.minYear) q.set("minYear", String(f.minYear));
    if (f.transmission) q.set("transmission", f.transmission);
    q.set("status", "STOKTA");
    return `/vehicles?${q.toString()}`;
  }, [result]);

  const go = (to: string) => {
    onClose();
    navigate(to);
  };

  /**
   * Fotoğrafları kartın evraklarına ekler (Evrak Tanımları'ndaki tiple). AI'ın sınıflandırdığı
   * belge tipi eşleşmezse fotoğraf atlanır. Hata kaydı engellemez, uyarı olarak gösterilir.
   */
  const attachPhotos = async (module: "VEHICLE" | "CUSTOMER", referenceId: string, docTypes: AiDocumentType[]) => {
    if (!attachDocs || !photos.length || !result) return 0;
    try {
      const meta = await getDocumentMeta(module);
      let count = 0;
      for (const [i, photo] of photos.entries()) {
        const docType = result.documents.find((d) => d.photo === i + 1)?.type;
        if (!docType || !docTypes.includes(docType)) continue;
        const value = DOC_TYPE_VALUE[docType];
        const cat = meta.find((c) => c.types.some((t) => t.value === value));
        const type = cat?.types.find((t) => t.value === value);
        if (!cat || !type) continue;
        const { full, thumb } = await resizeWithThumbnail(photo.file, DOCUMENT_PHOTO_MAX_BYTES);
        const base = `${type.value}-${i + 1}`;
        const [fileKey, thumbKey] = await Promise.all([
          uploadBlob(full, `${base}.jpg`, "documents"),
          uploadBlob(thumb, `${base}-thumb.jpg`, "documents"),
        ]);
        await createDocument({
          categoryId: cat.id, typeId: type.id, referenceType: module, referenceId,
          fileName: `${type.label} ${i + 1}.jpg`, fileKey, thumbKey, fileType: "image/jpeg", fileSize: full.size,
        });
        count++;
      }
      return count;
    } catch (err) {
      toast.warning(`Kayıt oluşturuldu ama evrak eklenemedi: ${errMsg(err)}`);
      return 0;
    }
  };

  const create = async () => {
    if (!choice || !result) return;
    if (choice === "VEHICLE_SEARCH") return go(searchUrl);
    setSaving(true);
    try {
      const p = result.person;
      if (choice === "LEAD") {
        if (!person.fullName.trim()) throw { message: "Ad soyad giriniz" };
        const notes = [
          p?.tckn && `TCKN: ${p.tckn}`,
          p?.birthDate && `Doğum: ${p.birthDate}`,
          p?.licenseClasses && `Ehliyet: ${p.licenseClasses}`,
          p?.validUntil && `Geçerlilik: ${p.validUntil}`,
        ].filter(Boolean).join(" · ");
        await createLead({
          fullName: person.fullName.trim(),
          phone: person.phone || undefined,
          email: person.email || undefined,
          source: "WALK_IN",
          notes: notes ? `AI ile okundu — ${notes}` : undefined,
        });
        setCreated({ title: `${person.fullName} potansiyel olarak eklendi`, to: "/crm/leads" });
      } else if (choice === "CUSTOMER") {
        if (!person.fullName.trim()) throw { message: "Ad soyad giriniz" };
        const acc = await createAccount({
          type: "CUSTOMER",
          entityType: "INDIVIDUAL",
          ledgerCode: "L120",
          name: person.fullName.trim(),
          phone: person.phone || undefined,
          email: person.email || undefined,
          tckn: person.tckn || undefined,
          city: person.city || undefined,
          district: person.district || undefined,
          address: person.address || undefined,
        });
        const docs = await attachPhotos("CUSTOMER", acc.id, ["EHLIYET", "KIMLIK"]);
        setCreated({
          title: `${person.fullName} müşteri olarak eklendi${docs ? ` · ${docs} evrak eklendi` : ""}`,
          to: `/accounts?search=${encodeURIComponent(person.fullName.trim())}`,
        });
      } else {
        if (!vehicle.plate.trim()) throw { message: "Plaka giriniz" };
        if (vehicleTypes.length && !vehicleTypeId) throw { message: "Araç tipini seçiniz (Sıfır / 2. El …)" };
        if (!zeroKm && km === undefined) throw { message: "Kilometre giriniz (0 da girilebilir)" };
        const { brandId, modelId } = matchBrandModel(catalog, vehicle.brand, vehicle.model);
        const n = (x: string) => (x ? Number(x) : undefined);
        const v = await createVehicle({
          plate: vehicle.plate.trim().toLocaleUpperCase("tr-TR"),
          status: "STOKTA",
          brandId,
          modelId,
          brandName: vehicle.brand || undefined,
          modelName: vehicle.model || undefined,
          registrationModel: vehicle.registrationModel || undefined,
          year: n(vehicle.year),
          vehicleTypeId: vehicleTypeId || undefined,
          km: zeroKm ? 0 : km,
          chassisNo: vehicle.vin || undefined,
          engineNo: vehicle.engineNo || undefined,
          colorId: matchColor(catalog?.colors, vehicle.color),
          colorName: vehicle.color || undefined,
          bodyTypeId: matchBodyType(catalog?.bodyTypes, vehicle.bodyType),
          fuelType: (vehicle.fuelType || undefined) as VehicleFormValues["fuelType"],
          transmission: (vehicle.transmission || undefined) as VehicleFormValues["transmission"],
          driveType: (vehicle.driveType || undefined) as VehicleFormValues["driveType"],
          engineVolume: n(vehicle.engineVolume),
          horsePower: n(vehicle.horsePower),
          enginePower: n(vehicle.enginePower),
        });
        const docs = await attachPhotos("VEHICLE", v.id, ["RUHSAT"]);
        setCreated({ title: `${v.plate} araç kartı oluşturuldu${docs ? ` · ${docs} evrak eklendi` : ""}`, to: `/vehicles/${v.id}` });
      }
    } catch (err) {
      toast.error(errMsg(err));
    } finally {
      setSaving(false);
    }
  };

  const options = result?.options.filter(allowed) ?? [];
  const inferred = result?.vehicle?.inferred ?? [];
  const setV = (k: keyof VehicleForm, val: string) => setVehicle((v) => ({ ...v, [k]: val }));
  const Lbl = ({ t, f }: { t: string; f: string }) => (
    <span className="inline-flex items-center gap-1">
      {t}
      {inferred.includes(f) && <span className="rounded bg-info/15 px-1 text-[10px] font-bold text-info" title="Ruhsatta yazmıyor, AI tahmini">AI</span>}
    </span>
  );
  const canSend = Boolean(prompt.trim() || photos.length) && !loading;

  return (
    <Modal open={open} onClose={onClose} noPadding hideHeader className="max-w-2xl">
      <div className="relative px-5 pb-6 pt-8 sm:px-8">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-full p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-dark-600" aria-label="Kapat">
          <TbX className="size-5" />
        </button>

        {/* Başlık */}
        <div className="mb-5 flex items-center justify-center gap-2">
          <TbSparkles className="size-7 text-primary-500" />
          <span className="bg-linear-to-r from-primary-600 to-purple-600 bg-clip-text text-2xl font-bold tracking-tight text-transparent">Filomonline AI</span>
        </div>

        {/* Arama kutusu */}
        <div className="rounded-3xl border border-gray-200 bg-white shadow-sm transition focus-within:shadow-md dark:border-dark-500 dark:bg-dark-700">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void submit();
              }
            }}
            rows={photos.length ? 1 : 2}
            placeholder="Yazın ya da ehliyet, kimlik, ruhsat fotoğrafı ekleyin…"
            className="block w-full resize-none rounded-t-3xl bg-transparent px-5 pt-4 text-base text-gray-800 placeholder:text-gray-400 focus:outline-hidden dark:text-dark-50"
          />
          {photos.length > 0 && (
            <div className="flex gap-2 px-5 pt-2">
              {photos.map((p, i) => (
                <div key={p.id} className="group relative">
                  <img src={p.previewUrl} alt={`Fotoğraf ${i + 1}`} className="size-16 rounded-xl object-cover ring-1 ring-gray-200 dark:ring-dark-500" />
                  <button
                    type="button"
                    onClick={() => setPhotos((ps) => ps.filter((x) => x.id !== p.id))}
                    className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-gray-800 text-white"
                    aria-label="Fotoğrafı kaldır"
                  >
                    <TbX className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-center justify-between px-3 pb-2.5 pt-1">
            <div className="flex items-center gap-1">
              <IconBtn title="Kamera" onClick={() => cameraRef.current?.click()} disabled={photos.length >= MAX_PHOTOS}>
                <TbCamera className="size-5" />
              </IconBtn>
              <IconBtn title="Galeri" onClick={() => galleryRef.current?.click()} disabled={photos.length >= MAX_PHOTOS}>
                <TbPhoto className="size-5" />
              </IconBtn>
              <IconBtn title={listening ? "Dinlemeyi durdur" : "Sesle yaz"} onClick={toggleMic} active={listening}>
                <TbMicrophone className="size-5" />
              </IconBtn>
              {photos.length > 0 && <span className="ml-1 text-xs text-gray-400">{photos.length}/{MAX_PHOTOS}</span>}
            </div>
            <button
              type="button"
              onClick={submit}
              disabled={!canSend}
              className="flex size-9 items-center justify-center rounded-full bg-primary-600 text-white transition hover:bg-primary-700 disabled:bg-gray-200 disabled:text-gray-400 dark:disabled:bg-dark-600"
              aria-label="Gönder"
            >
              {loading ? <span className="size-4 animate-spin rounded-full border-2 border-white/40 border-t-white" /> : <TbArrowRight className="size-5" />}
            </button>
          </div>
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
          <input ref={galleryRef} type="file" accept="image/*" multiple hidden onChange={(e) => { void addFiles(e.target.files); e.target.value = ""; }} />
        </div>

        {/* Yükleniyor */}
        {loading && (
          <div className="mt-6 space-y-2.5">
            <p className="text-center text-sm text-gray-500 dark:text-dark-300">{photos.length ? "Belgeler okunuyor…" : "Düşünüyor…"}</p>
            <div className="h-3 animate-pulse rounded-full bg-gray-100 dark:bg-dark-600" />
            <div className="h-3 w-4/5 animate-pulse rounded-full bg-gray-100 dark:bg-dark-600" />
          </div>
        )}

        {/* Hata */}
        {error && (
          <div className="mt-5 flex items-start gap-2 rounded-2xl bg-error/10 px-4 py-3 text-sm text-error">
            <TbAlertTriangle className="mt-0.5 size-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Sonuç */}
        {result && !loading && (
          <div className="mt-6 space-y-4">
            <div>
              <p className="text-base text-gray-800 dark:text-dark-50">{result.summary}</p>
              {result.documents.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {result.documents.map((d) => (
                    <span key={d.photo} className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-600 dark:bg-dark-600 dark:text-dark-200">
                      {d.photo}. {DOC_LABEL[d.type]}
                      {d.side !== "BELIRSIZ" ? ` (${d.side === "ON" ? "ön" : "arka"})` : ""}
                    </span>
                  ))}
                </div>
              )}
              {result.warnings.length > 0 && (
                <ul className="mt-2 space-y-0.5 text-xs text-warning">
                  {result.warnings.map((w) => (
                    <li key={w} className="flex gap-1.5"><TbAlertTriangle className="mt-0.5 size-3.5 shrink-0" />{w}</li>
                  ))}
                </ul>
              )}
            </div>

            {result.answer && <p className="whitespace-pre-line rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:bg-dark-800 dark:text-dark-100">{result.answer}</p>}

            {created ? (
              <div className="flex flex-col items-center gap-3 rounded-2xl bg-success/10 px-4 py-6 text-center">
                <TbCircleCheck className="size-10 text-success" />
                <p className="font-semibold text-gray-800 dark:text-dark-50">{created.title}</p>
                <div className="flex gap-2">
                  <Button color="primary" onClick={() => go(created.to)}>Kartı Aç</Button>
                  <Button variant="flat" onClick={reset}>Yeni</Button>
                </div>
              </div>
            ) : options.length > 0 && choice ? (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  {options.map((o) => {
                    const { label, Icon } = OPTION_META[o];
                    const active = choice === o;
                    return (
                      <button
                        key={o}
                        type="button"
                        onClick={() => setChoice(o)}
                        className={clsx(
                          "flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold transition",
                          active ? "border-primary-500 bg-primary-500 text-white shadow-sm" : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-dark-500 dark:text-dark-200",
                        )}
                      >
                        <Icon className="size-4.5" />
                        {label}
                        {o === result.recommended && <span className={clsx("rounded-full px-1.5 text-tiny", active ? "bg-white/25" : "bg-primary-500/10 text-primary-600")}>önerilen</span>}
                      </button>
                    );
                  })}
                </div>
                {choice === result.recommended && result.reason && <p className="-mt-2 text-xs text-gray-400">{result.reason}</p>}

                {(choice === "LEAD" || choice === "CUSTOMER") && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <Input label="Ad Soyad" value={person.fullName} onChange={(e) => setPerson({ ...person, fullName: e.target.value })} />
                    </div>
                    <Input label="Telefon" type="tel" placeholder="05xx xxx xx xx" value={person.phone} onChange={(e) => setPerson({ ...person, phone: e.target.value })} />
                    <Input label="E-posta" type="email" placeholder="ornek@mail.com" value={person.email} onChange={(e) => setPerson({ ...person, email: e.target.value })} />
                    {choice === "CUSTOMER" && (
                      <>
                        <Input label="T.C. Kimlik No" value={person.tckn} onChange={(e) => setPerson({ ...person, tckn: e.target.value.replace(/\D/g, "").slice(0, 11) })} />
                        <Input label="İl / İlçe" value={[person.city, person.district].filter(Boolean).join(" / ")} readOnly placeholder="—" />
                      </>
                    )}
                  </div>
                )}

                {choice === "VEHICLE" && (
                  <div className="space-y-3">
                    <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
                      <div>
                        <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-100">Araç Tipi *</span>
                        <div className="flex flex-wrap gap-1.5">
                          {vehicleTypes.map((t) => (
                            <button
                              key={t.id}
                              type="button"
                              onClick={() => {
                                setVehicleTypeId(t.id);
                                if (isZeroKm(t.id)) setKm(0);
                              }}
                              className={clsx(
                                "rounded-full border px-3.5 py-1.5 text-sm font-semibold transition",
                                vehicleTypeId === t.id
                                  ? "border-primary-500 bg-primary-500 text-white"
                                  : "border-gray-200 text-gray-600 hover:border-gray-300 dark:border-dark-500 dark:text-dark-200",
                              )}
                            >
                              {t.name}
                            </button>
                          ))}
                          {!catalog && <span className="text-xs text-gray-400">Yükleniyor…</span>}
                        </div>
                      </div>
                      <NumericInput
                        label={zeroKm ? "Kilometre" : "Kilometre *"}
                        value={zeroKm ? 0 : (km ?? null)}
                        onValueChange={setKm}
                        numeralDecimalScale={0}
                        suffix="km"
                        disabled={zeroKm || !vehicleTypeId}
                        placeholder={vehicleTypeId ? "0" : "Önce tip seçin"}
                      />
                    </div>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Input label="Plaka" value={vehicle.plate} onChange={(e) => setV("plate", e.target.value)} />
                      <Input label="Marka" value={vehicle.brand} onChange={(e) => setV("brand", e.target.value)} />
                      <Input label="Model" value={vehicle.model} onChange={(e) => setV("model", e.target.value)} />
                      <div className="sm:col-span-2">
                        <Input label="Ruhsat Model Adı" value={vehicle.registrationModel} onChange={(e) => setV("registrationModel", e.target.value)} />
                      </div>
                      <Input label={<Lbl t="Model Yılı" f="modelYear" />} inputMode="numeric" value={vehicle.year} onChange={(e) => setV("year", e.target.value.replace(/\D/g, "").slice(0, 4))} />
                      <div className="sm:col-span-2">
                        <Input label="Şasi No" value={vehicle.vin} onChange={(e) => setV("vin", e.target.value.toUpperCase())} />
                      </div>
                      <Input label="Motor No" value={vehicle.engineNo} onChange={(e) => setV("engineNo", e.target.value)} />
                    </div>
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                      <Pick label={<Lbl t="Yakıt" f="fuelType" />} value={vehicle.fuelType} opts={FUEL_OPTS} onChange={(x) => setV("fuelType", x)} />
                      <Pick label={<Lbl t="Vites" f="transmission" />} value={vehicle.transmission} opts={GEAR_OPTS} onChange={(x) => setV("transmission", x)} />
                      <Pick label={<Lbl t="Kasa" f="bodyType" />} value={vehicle.bodyType} opts={BODY_OPTS} onChange={(x) => setV("bodyType", x)} />
                      <Pick label={<Lbl t="Çekiş" f="driveType" />} value={vehicle.driveType} opts={DRIVE_OPTS} onChange={(x) => setV("driveType", x)} />
                      <Input label={<Lbl t="Renk" f="color" />} value={vehicle.color} onChange={(e) => setV("color", e.target.value)} />
                      <Input label={<Lbl t="Hacim (cc)" f="engineVolume" />} inputMode="numeric" value={vehicle.engineVolume} onChange={(e) => setV("engineVolume", e.target.value.replace(/\D/g, ""))} />
                      <Input label={<Lbl t="Güç (HP)" f="horsePower" />} inputMode="numeric" value={vehicle.horsePower} onChange={(e) => setV("horsePower", e.target.value.replace(/\D/g, ""))} />
                      <Input label={<Lbl t="Güç (kW)" f="enginePower" />} inputMode="numeric" value={vehicle.enginePower} onChange={(e) => setV("enginePower", e.target.value.replace(/\D/g, ""))} />
                    </div>
                    {inferred.length > 0 && (
                      <p className="flex items-start gap-1.5 text-xs text-info">
                        <TbSparkles className="mt-0.5 size-3.5 shrink-0" />
                        <span>
                          <b>AI</b> işaretli alanlar ruhsatta yazmıyor; {inferred.map((k) => INFERRED_FIELD_LABEL[k]).filter(Boolean).join(", ")} marka, model ve yıldan tahmin edildi. Kontrol edin.
                        </span>
                      </p>
                    )}
                  </div>
                )}

                {choice === "VEHICLE_SEARCH" && result.filter && (
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      result.filter.query,
                      result.filter.minPrice && `≥ ${result.filter.minPrice.toLocaleString("tr-TR")} ₺`,
                      result.filter.maxPrice && `≤ ${result.filter.maxPrice.toLocaleString("tr-TR")} ₺`,
                      result.filter.minYear && `${result.filter.minYear}+`,
                      result.filter.transmission && (result.filter.transmission === "OTOMATIK" ? "Otomatik" : "Manuel"),
                      result.filter.fuelType,
                    ]
                      .filter(Boolean)
                      .map((t) => (
                        <span key={String(t)} className="rounded-full bg-primary-500/10 px-3 py-1 text-sm font-medium text-primary-700 dark:text-primary-300">{t}</span>
                      ))}
                  </div>
                )}

                {photos.length > 0 && (choice === "VEHICLE" || choice === "CUSTOMER") && (
                  <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-dark-200">
                    <input type="checkbox" checked={attachDocs} onChange={(e) => setAttachDocs(e.target.checked)} className="size-4 accent-primary-600" />
                    Fotoğrafları {choice === "VEHICLE" ? "aracın" : "müşterinin"} evraklarına ekle ({choice === "VEHICLE" ? "ruhsat" : "ehliyet / kimlik"})
                  </label>
                )}

                {existing && (
                  <div className="flex items-center justify-between gap-2 rounded-xl bg-warning/10 px-3 py-2 text-sm text-warning">
                    <span className="flex items-center gap-1.5"><TbAlertTriangle className="size-4" />{existing.label}</span>
                    <button type="button" className="font-semibold hover:underline" onClick={() => go(existing.to)}>Kartı aç</button>
                  </div>
                )}

                <div className="flex justify-end">
                  <Button
                    color="primary"
                    className="gap-1.5 rounded-full px-6"
                    onClick={create}
                    disabled={saving || (choice === "VEHICLE" && ((vehicleTypes.length > 0 && !vehicleTypeId) || (!zeroKm && km === undefined)))}
                  >
                    {saving ? "Kaydediliyor…" : choice === "VEHICLE_SEARCH" ? "Araçları Göster" : `${OPTION_META[choice].label} Oluştur`}
                    {!saving && <TbArrowRight className="size-4" />}
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        )}

        {!result && !loading && !error && (
          <p className="mt-4 text-center text-xs text-gray-400">
            En fazla {MAX_PHOTOS} fotoğraf · ön ve arka yüz birlikte okunur · ne açılacağına AI karar verir, siz onaylarsınız
          </p>
        )}
      </div>
    </Modal>
  );
}

function IconBtn({ title, onClick, disabled, active, children }: { title: string; onClick: () => void; disabled?: boolean; active?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={clsx(
        "flex size-9 items-center justify-center rounded-full transition disabled:opacity-40",
        active ? "animate-pulse bg-error/15 text-error" : "text-gray-500 hover:bg-gray-100 hover:text-primary-600 dark:text-dark-300 dark:hover:bg-dark-600",
      )}
    >
      {children}
    </button>
  );
}

function Pick({ label, value, opts, onChange }: { label: React.ReactNode; value: string; opts: string[][]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700 dark:text-dark-100">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-9 w-full rounded-lg border border-gray-300 bg-transparent px-2.5 text-sm text-gray-800 outline-hidden focus:border-primary-600 dark:border-dark-450 dark:text-dark-100"
      >
        <option value="">—</option>
        {opts.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}
