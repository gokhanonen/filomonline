import { useEffect, useState, useMemo } from "react";
import {
  PlusIcon,
  TrashIcon,
  PencilSquareIcon,
  MagnifyingGlassIcon,
  ArrowPathIcon,
  DocumentDuplicateIcon,
  CheckIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

import { Button, Card, Input, Spinner } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import type { DocCategory, DocType } from "@/@types/document";
import {
  getDocumentMeta,
  loadDefaultCategories,
  createDocumentCategory,
  updateDocumentCategory,
  deleteDocumentCategory,
  createDocumentType,
  updateDocumentType,
  deleteDocumentType,
} from "@/services/documentService";

const MODULE_OPTIONS: { key: string; label: string; badgeColor: string }[] = [
  { key: "VEHICLE", label: "Araç Kartı", badgeColor: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800" },
  { key: "CUSTOMER", label: "Cari / Müşteri", badgeColor: "bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800" },
  { key: "CONTRACT", label: "Sözleşmeler", badgeColor: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800" },
  { key: "INVOICE", label: "Fatura & Finans", badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800" },
  { key: "ALL", label: "Tüm Modüller", badgeColor: "bg-gray-100 text-gray-700 border-gray-200 dark:bg-dark-600 dark:text-dark-200 dark:border-dark-500" },
];

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/ğ/g, "g")
    .replace(/ü/g, "u")
    .replace(/ş/g, "s")
    .replace(/ı/g, "i")
    .replace(/ö/g, "o")
    .replace(/ç/g, "c")
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_|_$/g, "");
}

export function DocumentCatalogPanel() {
  const [categories, setCategories] = useState<DocCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedModule, setSelectedModule] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  // Category Modal State
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<DocCategory | null>(null);
  const [categoryLabel, setCategoryLabel] = useState("");
  const [categoryValue, setCategoryValue] = useState("");
  const [selectedModules, setSelectedModules] = useState<string[]>(["ALL"]);
  const [categorySortOrder, setCategorySortOrder] = useState<number>(0);
  const [savingCategory, setSavingCategory] = useState(false);

  // Type Modal State
  const [typeModalOpen, setTypeModalOpen] = useState(false);
  const [targetCategory, setTargetCategory] = useState<DocCategory | null>(null);
  const [editingType, setEditingType] = useState<DocType | null>(null);
  const [typeLabel, setTypeLabel] = useState("");
  const [typeValue, setTypeValue] = useState("");
  const [typeSortOrder, setTypeSortOrder] = useState<number>(0);
  const [savingType, setSavingType] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await getDocumentMeta();
      setCategories(data);
    } catch {
      toast.error("Evrak tanımları yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Modül ve arama filtreleme
  const filteredCategories = useMemo(() => {
    return categories
      .filter((cat) => {
        if (selectedModule === "ALL") return true;
        const mod = cat.module || "ALL";
        return mod === "ALL" || mod.split(",").includes(selectedModule);
      })
      .filter((cat) => {
        if (!search.trim()) return true;
        const q = search.toLowerCase();
        const matchCat =
          cat.label.toLowerCase().includes(q) ||
          cat.value.toLowerCase().includes(q);
        const matchTypes = cat.types?.some(
          (t) =>
            t.label.toLowerCase().includes(q) ||
            t.value.toLowerCase().includes(q),
        );
        return matchCat || matchTypes;
      });
  }, [categories, selectedModule, search]);

  // Varsayılanları Yükle
  const handleLoadDefaults = async () => {
    if (
      !window.confirm(
        "Sistem varsayılan evrak kategorileri ve tipleri yüklenecek. Onaylıyor musunuz?",
      )
    )
      return;
    try {
      const res = await loadDefaultCategories();
      toast.success(
        res.created > 0
          ? `${res.created} yeni tanım yüklendi`
          : "Tüm varsayılanlar zaten mevcut",
      );
      await loadData();
    } catch {
      toast.error("Varsayılanlar yüklenemedi");
    }
  };

  // Kategori Modal Aç
  const openCategoryModal = (cat?: DocCategory) => {
    if (cat) {
      setEditingCategory(cat);
      setCategoryLabel(cat.label);
      setCategoryValue(cat.value);
      const mods = cat.module ? cat.module.split(",") : ["ALL"];
      setSelectedModules(mods);
      setCategorySortOrder(cat.sortOrder ?? 0);
    } else {
      setEditingCategory(null);
      setCategoryLabel("");
      setCategoryValue("");
      setSelectedModules(["VEHICLE"]);
      setCategorySortOrder(categories.length + 1);
    }
    setCategoryModalOpen(true);
  };

  // Kategori Kaydet
  const handleSaveCategory = async () => {
    if (!categoryLabel.trim()) {
      toast.error("Kategori adı zorunludur");
      return;
    }
    const val = categoryValue.trim() || toSlug(categoryLabel);
    if (!val) {
      toast.error("Kategori kodu zorunludur");
      return;
    }

    const moduleStr =
      selectedModules.length === 0 || selectedModules.includes("ALL")
        ? "ALL"
        : selectedModules.join(",");

    setSavingCategory(true);
    try {
      if (editingCategory) {
        await updateDocumentCategory(editingCategory.id, {
          label: categoryLabel.trim(),
          module: moduleStr,
          sortOrder: Number(categorySortOrder) || 0,
        });
        toast.success("Kategori güncellendi");
      } else {
        await createDocumentCategory({
          label: categoryLabel.trim(),
          value: val,
          module: moduleStr,
          sortOrder: Number(categorySortOrder) || 0,
        });
        toast.success("Kategori oluşturuldu");
      }
      setCategoryModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Kayıt başarısız");
    } finally {
      setSavingCategory(false);
    }
  };

  // Kategori Sil
  const handleDeleteCategory = async (cat: DocCategory) => {
    if (
      !window.confirm(
        `"${cat.label}" kategorisini ve altındaki tanımları silmek istediğinize emin misiniz?`,
      )
    )
      return;
    try {
      await deleteDocumentCategory(cat.id);
      toast.success("Kategori silindi");
      await loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Kategori silinemedi");
    }
  };

  // Tip Modal Aç
  const openTypeModal = (cat: DocCategory, type?: DocType) => {
    setTargetCategory(cat);
    if (type) {
      setEditingType(type);
      setTypeLabel(type.label);
      setTypeValue(type.value);
      setTypeSortOrder(type.sortOrder ?? 0);
    } else {
      setEditingType(null);
      setTypeLabel("");
      setTypeValue("");
      setTypeSortOrder((cat.types?.length ?? 0) + 1);
    }
    setTypeModalOpen(true);
  };

  // Tip Kaydet
  const handleSaveType = async () => {
    if (!typeLabel.trim()) {
      toast.error("Tip adı zorunludur");
      return;
    }
    const val = typeValue.trim() || toSlug(typeLabel);
    if (!val) {
      toast.error("Tip kodu zorunludur");
      return;
    }
    if (!targetCategory) return;

    setSavingType(true);
    try {
      if (editingType) {
        await updateDocumentType(editingType.id, {
          label: typeLabel.trim(),
          sortOrder: Number(typeSortOrder) || 0,
        });
        toast.success("Evrak tipi güncellendi");
      } else {
        await createDocumentType({
          categoryId: targetCategory.id,
          label: typeLabel.trim(),
          value: val,
          sortOrder: Number(typeSortOrder) || 0,
        });
        toast.success("Evrak tipi eklendi");
      }
      setTypeModalOpen(false);
      await loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Kayıt başarısız");
    } finally {
      setSavingType(false);
    }
  };

  // Tip Sil
  const handleDeleteType = async (type: DocType) => {
    if (!window.confirm(`"${type.label}" evrak tipini silmek istediğinize emin misiniz?`))
      return;
    try {
      await deleteDocumentType(type.id);
      toast.success("Evrak tipi silindi");
      await loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Evrak tipi silinemedi");
    }
  };

  const toggleModule = (key: string) => {
    if (key === "ALL") {
      setSelectedModules(["ALL"]);
      return;
    }
    let current = selectedModules.filter((m) => m !== "ALL");
    if (current.includes(key)) {
      current = current.filter((m) => m !== key);
      if (current.length === 0) current = ["ALL"];
    } else {
      current.push(key);
    }
    setSelectedModules(current);
  };

  return (
    <div className="space-y-4">
      {/* Üst Bar: Modül Filtreleri, Arama ve Aksiyonlar */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Modül Filtre Butonları */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 text-xs font-medium text-gray-500 dark:text-dark-300">
            Modül:
          </span>
          <button
            type="button"
            onClick={() => setSelectedModule("ALL")}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              selectedModule === "ALL"
                ? "bg-primary-600 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-600 dark:text-dark-200"
            }`}
          >
            Tümü
          </button>
          {MODULE_OPTIONS.filter((m) => m.key !== "ALL").map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setSelectedModule(m.key)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
                selectedModule === m.key
                  ? "bg-primary-600 text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-600 dark:text-dark-200"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>

        {/* Sağ Taraf: Arama + Varsayılanlar + Yeni Kategori */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative w-48 sm:w-60">
            <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Evrak / tip ara..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-gray-200 bg-white py-1.5 pl-8 pr-3 text-xs text-gray-900 focus:border-primary-500 focus:outline-hidden dark:border-dark-500 dark:bg-dark-700 dark:text-dark-50"
            />
          </div>

          <Button
            type="button"
            variant="outlined"
            onClick={handleLoadDefaults}
            className="gap-1 text-xs py-1.5"
            title="Sistem varsayılan evrak tiplerini yükler"
          >
            <ArrowPathIcon className="size-3.5" /> Varsayılanları Yükle
          </Button>

          <Button
            type="button"
            color="primary"
            onClick={() => openCategoryModal()}
            className="gap-1 text-xs py-1.5"
          >
            <PlusIcon className="size-3.5" /> Yeni Kategori
          </Button>
        </div>
      </div>

      {/* Kategori ve Tip Kartları Listesi */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <Spinner className="size-8 text-primary-600" />
        </div>
      ) : filteredCategories.length === 0 ? (
        <Card className="p-8 text-center">
          <DocumentDuplicateIcon className="mx-auto size-12 text-gray-300 dark:text-dark-400" />
          <h4 className="mt-2 text-sm font-semibold text-gray-800 dark:text-dark-100">
            Tanımlı evrak kategorisi bulunamadı
          </h4>
          <p className="mt-1 text-xs text-gray-500 dark:text-dark-300">
            Varsayılan evrak tiplerini yükleyebilir veya yeni bir kategori oluşturabilirsiniz.
          </p>
          <div className="mt-4 flex justify-center gap-2">
            <Button
              type="button"
              variant="outlined"
              onClick={handleLoadDefaults}
              className="gap-1 text-xs"
            >
              <ArrowPathIcon className="size-3.5" /> Varsayılanları Yükle
            </Button>
            <Button
              type="button"
              color="primary"
              onClick={() => openCategoryModal()}
              className="gap-1 text-xs"
            >
              <PlusIcon className="size-3.5" /> Yeni Kategori Ekle
            </Button>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {filteredCategories.map((cat) => {
            const catMods = (cat.module || "ALL").split(",");
            return (
              <Card
                key={cat.id}
                className="flex flex-col justify-between overflow-hidden border border-gray-200/80 p-4 transition-all hover:shadow-xs dark:border-dark-600"
              >
                <div>
                  {/* Kategori Başlığı ve Aksiyonlar */}
                  <div className="flex items-start justify-between gap-2 border-b border-gray-150 pb-3 dark:border-dark-600">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900 dark:text-dark-50">
                          {cat.label}
                        </span>
                        <code className="rounded bg-gray-100 px-1.5 py-0.5 text-[11px] font-mono text-gray-500 dark:bg-dark-600 dark:text-dark-300">
                          {cat.value}
                        </code>
                      </div>

                      {/* Modül Rozetleri */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-1">
                        {catMods.map((mKey) => {
                          const mOpt = MODULE_OPTIONS.find((o) => o.key === mKey);
                          return (
                            <span
                              key={mKey}
                              className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 text-[10px] font-medium ${
                                mOpt?.badgeColor ??
                                "bg-gray-100 text-gray-600 border-gray-200 dark:bg-dark-600 dark:text-dark-300"
                              }`}
                            >
                              {mOpt?.label ?? mKey}
                            </span>
                          );
                        })}
                      </div>
                    </div>

                    {/* Kategori Aksiyon Butonları */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openTypeModal(cat)}
                        className="flex items-center gap-1 rounded bg-primary-50 px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-100 dark:bg-primary-900/30 dark:text-primary-300 dark:hover:bg-primary-900/50"
                        title="Bu kategoriye yeni evrak tipi ekle"
                      >
                        <PlusIcon className="size-3.5" /> Tip Ekle
                      </button>
                      <button
                        type="button"
                        onClick={() => openCategoryModal(cat)}
                        className="rounded p-1 text-gray-400 hover:text-primary-600 dark:text-dark-400 dark:hover:text-primary-400"
                        title="Kategoriyi düzenle"
                      >
                        <PencilSquareIcon className="size-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteCategory(cat)}
                        className="rounded p-1 text-gray-400 hover:text-error dark:text-dark-400 dark:hover:text-red-400"
                        title="Kategoriyi sil"
                      >
                        <TrashIcon className="size-4" />
                      </button>
                    </div>
                  </div>

                  {/* Altındaki Tipler Listesi */}
                  <div className="mt-3">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-dark-300">
                      Evrak Tipleri ({cat.types?.length ?? 0})
                    </p>
                    {!cat.types || cat.types.length === 0 ? (
                      <div className="rounded-lg border border-dashed border-gray-200 p-3 text-center text-xs text-gray-400 dark:border-dark-600">
                        Bu kategoriye henüz evrak tipi eklenmemiş.
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                        {cat.types.map((type) => (
                          <div
                            key={type.id}
                            className="group flex items-center justify-between rounded-lg border border-gray-150 bg-gray-50/60 px-2.5 py-1.5 transition-colors hover:border-primary-200 hover:bg-primary-50/30 dark:border-dark-600 dark:bg-dark-700/50 dark:hover:border-primary-800"
                          >
                            <div className="min-w-0 pr-1">
                              <p className="truncate text-xs font-medium text-gray-800 dark:text-dark-100">
                                {type.label}
                              </p>
                              <p className="truncate text-[10px] font-mono text-gray-400 dark:text-dark-400">
                                {type.value}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-0.5 opacity-80 group-hover:opacity-100">
                              <button
                                type="button"
                                onClick={() => openTypeModal(cat, type)}
                                className="rounded p-1 text-gray-400 hover:text-primary-600 dark:text-dark-400 dark:hover:text-primary-400"
                                title="Tipi düzenle"
                              >
                                <PencilSquareIcon className="size-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteType(type)}
                                className="rounded p-1 text-gray-400 hover:text-error dark:text-dark-400 dark:hover:text-red-400"
                                title="Tipi sil"
                              >
                                <TrashIcon className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* ====================================================================== */}
      {/* KATEGORİ EKLE / DÜZENLE MODALI */}
      {/* ====================================================================== */}
      <Modal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
        title={editingCategory ? "Evrak Kategorisini Düzenle" : "Yeni Evrak Kategorisi Ekle"}
        className="max-w-lg"
      >
        <div className="space-y-4">
          <Input
            label="Kategori Adı *"
            placeholder="Örn: Araç Evrakları, Müşteri Evrakları..."
            value={categoryLabel}
            onChange={(e) => {
              setCategoryLabel(e.target.value);
              if (!editingCategory && !categoryValue) {
                setCategoryValue(toSlug(e.target.value));
              }
            }}
          />

          <Input
            label="Kategori Kodu (Slug) *"
            placeholder="Örn: arac, musteri, sozlesme..."
            value={categoryValue}
            disabled={!!editingCategory}
            onChange={(e) => setCategoryValue(toSlug(e.target.value))}
          />

          {/* Geçerli Modüller */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-gray-700 dark:text-dark-200">
              Bu Kategori Hangi Modüllerde Görünsün? *
            </label>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {MODULE_OPTIONS.map((m) => {
                const isChecked = selectedModules.includes(m.key);
                return (
                  <label
                    key={m.key}
                    onClick={() => toggleModule(m.key)}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 text-xs font-medium transition ${
                      isChecked
                        ? "border-primary-500 bg-primary-50/50 text-primary-900 dark:border-primary-600 dark:bg-primary-950/30 dark:text-primary-200"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50 dark:border-dark-600 dark:text-dark-300 dark:hover:bg-dark-700"
                    }`}
                  >
                    <div
                      className={`flex size-4 items-center justify-center rounded border ${
                        isChecked
                          ? "border-primary-600 bg-primary-600 text-white"
                          : "border-gray-300 dark:border-dark-500"
                      }`}
                    >
                      {isChecked && <CheckIcon className="size-3" />}
                    </div>
                    <span>{m.label}</span>
                  </label>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              Seçilen modüllerin evrak yükleme ekranlarında bu kategori görünür hale gelir.
            </p>
          </div>

          <Input
            label="Sıralama No"
            type="number"
            value={categorySortOrder}
            onChange={(e) => setCategorySortOrder(Number(e.target.value) || 0)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outlined"
              onClick={() => setCategoryModalOpen(false)}
            >
              İptal
            </Button>
            <Button
              type="button"
              color="primary"
              disabled={savingCategory}
              onClick={handleSaveCategory}
            >
              {savingCategory ? "Kaydediliyor..." : editingCategory ? "Güncelle" : "Oluştur"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ====================================================================== */}
      {/* TİP EKLE / DÜZENLE MODALI */}
      {/* ====================================================================== */}
      <Modal
        open={typeModalOpen}
        onClose={() => setTypeModalOpen(false)}
        title={
          editingType
            ? `Evrak Tipini Düzenle (${targetCategory?.label})`
            : `Yeni Evrak Tipi Ekle (${targetCategory?.label})`
        }
        className="max-w-lg"
      >
        <div className="space-y-4">
          <Input
            label="Evrak Tipi Adı *"
            placeholder="Örn: Ruhsat, Muayene Belgesi, Ekspertiz Raporu..."
            value={typeLabel}
            onChange={(e) => {
              setTypeLabel(e.target.value);
              if (!editingType && !typeValue) {
                setTypeValue(toSlug(e.target.value));
              }
            }}
          />

          <Input
            label="Tip Kodu (Slug) *"
            placeholder="Örn: ruhsat, muayene, ekspertiz..."
            value={typeValue}
            disabled={!!editingType}
            onChange={(e) => setTypeValue(toSlug(e.target.value))}
          />

          <Input
            label="Sıralama No"
            type="number"
            value={typeSortOrder}
            onChange={(e) => setTypeSortOrder(Number(e.target.value) || 0)}
          />

          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outlined"
              onClick={() => setTypeModalOpen(false)}
            >
              İptal
            </Button>
            <Button
              type="button"
              color="primary"
              disabled={savingType}
              onClick={handleSaveType}
            >
              {savingType ? "Kaydediliyor..." : editingType ? "Güncelle" : "Ekle"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
