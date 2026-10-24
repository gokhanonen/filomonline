/**
 * AddressSelect — İl → İlçe → Mahalle → Posta Kodu ilişkisel seçim bileşeni
 *
 * Kullanım:
 *   <AddressSelect
 *     city={watch("city")}
 *     district={watch("district")}
 *     neighborhood={watch("neighborhood")}
 *     postalCode={watch("postalCode")}
 *     onChange={(field, value) => setValue(field, value)}
 *   />
 */
import { useEffect, useState, useRef, useCallback } from "react";
import clsx from "clsx";
import { TbSearch, TbMapPin, TbX, TbChevronDown } from "react-icons/tb";
import { getCities, getDistricts, getNeighborhoods } from "@/services/addressService";
import type { City, District, Neighborhood } from "@/services/addressService";
import { InputErrorMsg } from "@/components/ui/Form/InputErrorMsg";

// ─────────────────────────────────────────────────────────
// Tipleri dışarıya aç
// ─────────────────────────────────────────────────────────
export type AddressField = "city" | "district" | "neighborhood" | "postalCode";

export interface AddressSelectProps {
  /** Mevcut değerler (react-hook-form watch ile bağla) */
  city?: string;
  district?: string;
  neighborhood?: string;
  postalCode?: string;
  /** Değer değişince hangi alan ve yeni değer */
  onChange: (field: AddressField, value: string) => void;
  errors?: Partial<Record<AddressField, string>>;
  disabled?: boolean;
}

// ─────────────────────────────────────────────────────────
// Yardımcı: tek combobox bileşeni
// ─────────────────────────────────────────────────────────
interface ComboboxProps {
  label: string;
  value: string;
  options: { label: string; value: string | number }[];
  onSelect: (value: string) => void;
  onClear: () => void;
  placeholder?: string;
  disabled?: boolean;
  loading?: boolean;
  error?: string;
  searchable?: boolean;
}

function trNormalize(text: string): string {
  return String(text || "")
    .toLocaleLowerCase("tr-TR")
    .replace(/ı/g, "i")
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c");
}

function Combobox({
  label,
  value,
  options,
  onSelect,
  onClear,
  placeholder = "Seçiniz...",
  disabled = false,
  loading = false,
  error,
  searchable = true,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // Dışarı tıklayınca kapat
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery("");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const normQuery = trNormalize(query);
  const filtered = searchable
    ? options.filter((o) => trNormalize(String(o.label)).includes(normQuery))
    : options;

  const selectedLabel =
    options.find((o) => String(o.value) === value)?.label ?? "";

  return (
    <div ref={ref} className="input-root relative">
      <label className="input-label">
        <span className="input-label">{label}</span>
      </label>
      <div className="relative mt-1.5">
        {/* Trigger */}
        <button
          type="button"
          disabled={disabled || loading}
          onClick={() => {
            setOpen((prev) => !prev);
            setQuery("");
          }}
          className={clsx(
            "form-input-base form-input flex w-full items-center justify-between text-left",
            "border-gray-300 hover:border-gray-400 dark:border-dark-450 dark:hover:border-dark-400",
            "focus:border-primary-600 dark:focus:border-primary-500",
            error && "border-error dark:border-error-lighter",
            (disabled || loading) &&
              "cursor-not-allowed bg-gray-150 opacity-60 dark:border-dark-500 dark:bg-dark-600",
          )}
        >
          <span
            className={clsx(
              "flex items-center gap-1.5 truncate",
              !selectedLabel && "text-gray-400 dark:text-dark-300",
            )}
          >
            {selectedLabel ? (
              <>
                <TbMapPin className="size-3.5 shrink-0 text-primary-500" />
                {selectedLabel}
              </>
            ) : loading ? (
              <span className="animate-pulse">Yükleniyor...</span>
            ) : (
              placeholder
            )}
          </span>
          <span className="flex shrink-0 items-center gap-1">
            {value && !disabled && (
              <TbX
                className="size-3.5 text-gray-400 hover:text-red-500 dark:text-dark-300"
                onClick={(e) => {
                  e.stopPropagation();
                  onClear();
                  setOpen(false);
                }}
              />
            )}
            <TbChevronDown
              className={clsx(
                "size-4 text-gray-400 transition-transform dark:text-dark-300",
                open && "rotate-180",
              )}
            />
          </span>
        </button>

        {/* Dropdown */}
        {open && !disabled && (
          <div className="absolute z-50 mt-1 w-full overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg dark:border-dark-450 dark:bg-dark-700">
            {/* Arama kutusu */}
            {searchable && options.length > 8 && (
              <div className="border-b border-gray-100 p-2 dark:border-dark-500">
                <div className="flex items-center gap-2 rounded-md border border-gray-200 bg-gray-50 px-2 dark:border-dark-450 dark:bg-dark-600">
                  <TbSearch className="size-3.5 shrink-0 text-gray-400 dark:text-dark-300" />
                  <input
                    autoFocus
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Ara..."
                    className="w-full bg-transparent py-1.5 text-sm text-gray-700 outline-none placeholder:text-gray-400 dark:text-dark-100 dark:placeholder:text-dark-400"
                  />
                </div>
              </div>
            )}

            {/* Liste */}
            <ul className="max-h-52 overflow-y-auto py-1 text-sm">
              {filtered.length === 0 ? (
                <li className="px-3 py-2 text-gray-400 dark:text-dark-400">
                  Sonuç bulunamadı
                </li>
              ) : (
                filtered.map((opt) => (
                  <li
                    key={opt.value}
                    onClick={() => {
                      onSelect(String(opt.value));
                      setOpen(false);
                      setQuery("");
                    }}
                    className={clsx(
                      "flex cursor-pointer items-center gap-2 px-3 py-2 transition-colors",
                      String(opt.value) === value
                        ? "bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400"
                        : "text-gray-700 hover:bg-gray-50 dark:text-dark-100 dark:hover:bg-dark-600",
                    )}
                  >
                    {String(opt.value) === value && (
                      <TbMapPin className="size-3.5 shrink-0 text-primary-500" />
                    )}
                    <span className="truncate">{String(opt.label)}</span>
                  </li>
                ))
              )}
            </ul>
          </div>
        )}
      </div>
      <InputErrorMsg when={!!error}>{error}</InputErrorMsg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Ana bileşen
// ─────────────────────────────────────────────────────────
export function AddressSelect({
  city = "",
  district = "",
  neighborhood = "",
  postalCode = "",
  onChange,
  errors = {},
  disabled = false,
}: AddressSelectProps) {
  const [cities, setCities] = useState<City[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [neighborhoods, setNeighborhoods] = useState<Neighborhood[]>([]);

  const [loadingCities, setLoadingCities] = useState(false);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingNeighborhoods, setLoadingNeighborhoods] = useState(false);

  // Seçili id'leri state olarak tut (ilişkilendirme için)
  const [selectedCityId, setSelectedCityId] = useState<number | null>(null);
  const [selectedDistrictId, setSelectedDistrictId] = useState<number | null>(null);

  // İlleri yükle (tek seferlik)
  useEffect(() => {
    setLoadingCities(true);
    getCities()
      .then(setCities)
      .finally(() => setLoadingCities(false));
  }, []);

  // Düzenleme modunda: city adından id bul ve ilçeleri yükle
  useEffect(() => {
    if (!city || cities.length === 0) return;
    const found = cities.find((c) => c.name === city);
    if (found) {
      setSelectedCityId(found.id);
    }
  }, [city, cities]);

  // İlçeleri yükle (cityId değişince)
  useEffect(() => {
    if (!selectedCityId) {
      setDistricts([]);
      setSelectedDistrictId(null);
      return;
    }
    setLoadingDistricts(true);
    getDistricts(selectedCityId)
      .then(setDistricts)
      .finally(() => setLoadingDistricts(false));
  }, [selectedCityId]);

  // Düzenleme modunda: district adından id bul
  useEffect(() => {
    if (!district || districts.length === 0) return;
    const found = districts.find((d) => d.name === district);
    if (found) setSelectedDistrictId(found.id);
  }, [district, districts]);

  // Mahalleleri yükle (districtId değişince)
  useEffect(() => {
    if (!selectedDistrictId) {
      setNeighborhoods([]);
      return;
    }
    setLoadingNeighborhoods(true);
    getNeighborhoods(selectedDistrictId)
      .then(setNeighborhoods)
      .finally(() => setLoadingNeighborhoods(false));
  }, [selectedDistrictId]);

  // Mahalle seçilince posta kodunu otomatik doldur
  const handleNeighborhoodSelect = useCallback(
    (name: string) => {
      onChange("neighborhood", name);
      const nb = neighborhoods.find((n) => n.name === name);
      if (nb) onChange("postalCode", nb.postalCode);
    },
    [neighborhoods, onChange],
  );

  // İl seçilince alt alanları sıfırla
  const handleCitySelect = useCallback(
    (cityName: string) => {
      const found = cities.find((c) => c.name === cityName);
      onChange("city", cityName);
      onChange("district", "");
      onChange("neighborhood", "");
      onChange("postalCode", "");
      setSelectedCityId(found?.id ?? null);
      setSelectedDistrictId(null);
    },
    [cities, onChange],
  );

  // İlçe seçilince mahalle ve posta sıfırla
  const handleDistrictSelect = useCallback(
    (districtName: string) => {
      const found = districts.find((d) => d.name === districtName);
      onChange("district", districtName);
      onChange("neighborhood", "");
      onChange("postalCode", "");
      setSelectedDistrictId(found?.id ?? null);
    },
    [districts, onChange],
  );

  const cityOptions = cities.map((c) => ({ value: c.name, label: c.name }));
  const districtOptions = districts.map((d) => ({
    value: d.name,
    label: d.name,
  }));
  const neighborhoodOptions = neighborhoods.map((n) => ({
    value: n.name,
    label: `${n.name} (${n.postalCode})`,
  }));

  return (
    <div className="space-y-3">
      {/* Satır 1: İl + İlçe */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Combobox
          label="İl"
          value={city}
          options={cityOptions}
          onSelect={handleCitySelect}
          onClear={() => handleCitySelect("")}
          placeholder="İl seçiniz..."
          disabled={disabled}
          loading={loadingCities}
          error={errors.city}
        />
        <Combobox
          label="İlçe"
          value={district}
          options={districtOptions}
          onSelect={handleDistrictSelect}
          onClear={() => handleDistrictSelect("")}
          placeholder={selectedCityId ? "İlçe seçiniz..." : "Önce il seçin"}
          disabled={disabled || !selectedCityId}
          loading={loadingDistricts}
          error={errors.district}
        />
      </div>

      {/* Satır 2: Mahalle + Posta Kodu */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Combobox
          label="Mahalle"
          value={neighborhood}
          options={neighborhoodOptions}
          onSelect={handleNeighborhoodSelect}
          onClear={() => {
            onChange("neighborhood", "");
            onChange("postalCode", "");
          }}
          placeholder={
            selectedDistrictId ? "Mahalle seçiniz..." : "Önce ilçe seçin"
          }
          disabled={disabled || !selectedDistrictId}
          loading={loadingNeighborhoods}
          error={errors.neighborhood}
        />

        {/* Posta Kodu: mahalle seçince otomatik dolar, istendiğinde elle de düzenlenebilir */}
        <div className="input-root">
          <label className="input-label">
            <span className="input-label">Posta Kodu</span>
          </label>
          <div className="relative mt-1.5">
            <input
              value={postalCode}
              onChange={(e) => onChange("postalCode", e.target.value)}
              disabled={disabled}
              placeholder="Mahalle seçince otomatik dolar"
              className={clsx(
                "form-input-base form-input w-full",
                "border-gray-300 hover:border-gray-400 dark:border-dark-450 dark:hover:border-dark-400",
                "focus:border-primary-600 dark:focus:border-primary-500",
                disabled &&
                  "cursor-not-allowed bg-gray-150 opacity-60 dark:border-dark-500 dark:bg-dark-600",
              )}
            />
          </div>
          <InputErrorMsg when={!!errors.postalCode}>
            {errors.postalCode}
          </InputErrorMsg>
        </div>
      </div>
    </div>
  );
}
