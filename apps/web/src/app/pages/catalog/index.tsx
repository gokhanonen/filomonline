import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router";
import {
  PlusIcon,
  TrashIcon,
  LinkIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  PencilSquareIcon,
  FolderIcon,
  TagIcon,
  CubeIcon,
  XMarkIcon,
  SparklesIcon,
  MapPinIcon,
} from "@heroicons/react/24/outline";
import { toast } from "sonner";

import { Page } from "@/components/shared/Page";
import { Modal } from "@/components/shared/Modal";
import { Button, Card, Input, Spinner } from "@/components/ui";
import {
  listingSourceIcon,
  type CatalogBrand,
  type ListingSource,
  type SimpleCatalog,
} from "@/@types/catalog";
import {
  createBrand,
  updateBrand,
  createListingSource,
  createModel,
  createSimple,
  listBrands,
  listListingSources,
  listSimple,
  removeBrand,
  removeListingSource,
  removeModel,
  removeSimple,
  updateSimple,
  type SimpleEntitySlug,
} from "@/services/catalogService";

import { DocumentCatalogPanel } from "./DocumentCatalogPanel";

const SIMPLE_TABS: { slug: SimpleEntitySlug; label: string }[] = [
  { slug: "colors", label: "Renkler" },
  { slug: "body-types", label: "Kasa Tipleri" },
  { slug: "vehicle-types", label: "Araç Tipleri" },
];

type Tab = "catalog" | "listing-sources" | "documents" | SimpleEntitySlug;

export default function CatalogPage() {
  const [tab, setTab] = useState<Tab>("catalog");

  return (
    <Page title="Tanımlar">
      <div className="w-full px-(--margin-x) py-6">
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold text-gray-800 dark:text-dark-50">
              Tanımlar (Katalog)
            </h2>
            <p className="text-sm text-gray-500 dark:text-dark-300">
              Kategori › Marka › Model hiyerarşisi, renkler, kasa, araç tipleri ve evrak tanımları
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <TabBtn
            active={tab === "catalog"}
            onClick={() => setTab("catalog")}
          >
            Kategori / Marka / Model
          </TabBtn>
          {SIMPLE_TABS.map((t) => (
            <TabBtn
              key={t.slug}
              active={tab === t.slug}
              onClick={() => setTab(t.slug)}
            >
              {t.label}
            </TabBtn>
          ))}
          <TabBtn
            active={tab === "listing-sources"}
            onClick={() => setTab("listing-sources")}
          >
            İlan Kaynakları
          </TabBtn>
          <TabBtn
            active={tab === "documents"}
            onClick={() => setTab("documents")}
          >
            Evrak Tanımları
          </TabBtn>
          <Link
            to="/products"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-xs font-semibold text-gray-700 dark:text-dark-200 hover:bg-gray-50 dark:hover:bg-dark-700 hover:border-primary-500/50 transition shadow-xs"
          >
            <CubeIcon className="size-4 text-primary-500" />
            Malzeme & Hizmetler
          </Link>
          <Link
            to="/locations"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-gray-200 dark:border-dark-700 bg-white dark:bg-dark-800 text-xs font-semibold text-gray-700 dark:text-dark-200 hover:bg-gray-50 dark:hover:bg-dark-700 hover:border-emerald-500/50 transition shadow-xs"
          >
            <MapPinIcon className="size-4 text-emerald-500" />
            Lokasyonlar
          </Link>
        </div>

        <div className="mt-5">
          {tab === "catalog" ? (
            <RelationalCatalogExplorer />
          ) : tab === "listing-sources" ? (
            <ListingSourcesPanel />
          ) : tab === "documents" ? (
            <DocumentCatalogPanel />
          ) : (
            <SimplePanel slug={tab} />
          )}
        </div>
      </div>
    </Page>
  );
}

function TabBtn({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-primary-600 text-white shadow-xs"
          : "bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-dark-600 dark:text-dark-200 dark:hover:bg-dark-500"
      }`}
    >
      {children}
    </button>
  );
}

// ======================================================================
// 3-SÜTUNLU İLİŞKİSEL KATALOG PANELİ (Kategori › Marka › Model)
// ======================================================================
function RelationalCatalogExplorer() {
  const [categories, setCategories] = useState<SimpleCatalog[]>([]);
  const [brands, setBrands] = useState<CatalogBrand[]>([]);
  const [loading, setLoading] = useState(true);

  // Seçili elemanlar: "ALL" ya da category id
  const [selectedCatId, setSelectedCatId] = useState<string>("ALL");
  const [selectedBrandId, setSelectedBrandId] = useState<string | null>(null);

  // Arama filtreleri
  const [searchCat, setSearchCat] = useState("");
  const [searchBrand, setSearchBrand] = useState("");
  const [searchModel, setSearchModel] = useState("");

  // Hızlı ekleme inputları
  const [newCatName, setNewCatName] = useState("");
  const [newBrandName, setNewBrandName] = useState("");
  const [newModelName, setNewModelName] = useState("");

  // Düzenleme modalları state
  const [editingCategory, setEditingCategory] = useState<SimpleCatalog | null>(null);
  const [editCatName, setEditCatName] = useState("");

  const [editingBrand, setEditingBrand] = useState<CatalogBrand | null>(null);
  const [editBrandName, setEditBrandName] = useState("");
  const [editBrandCatId, setEditBrandCatId] = useState<string>("");

  // Veri yükleme
  const loadData = async (preserveSelection = true) => {
    try {
      const [cats, brs] = await Promise.all([
        listSimple("vehicle-categories"),
        listBrands(),
      ]);
      setCategories(cats);
      setBrands(brs);

      // Seçimleri koru veya akıllıca ayarla
      if (!preserveSelection) {
        if (cats.length > 0) {
          setSelectedCatId(cats[0].id);
          const firstCatBrands = brs.filter((b) => b.categoryId === cats[0].id);
          setSelectedBrandId(firstCatBrands[0]?.id ?? null);
        }
      }
    } catch {
      toast.error("Katalog verileri yüklenemedi");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(false);
  }, []);

  // Kategori seçilince marka seçimini o kategoriye uygun güncelle
  const handleSelectCategory = (catId: string) => {
    setSelectedCatId(catId);
    setSearchBrand("");
    setSearchModel("");

    // O kategoriye ait markalardan ilkini seç
    const availableBrands =
      catId === "ALL" ? brands : brands.filter((b) => b.categoryId === catId);
    if (availableBrands.length > 0) {
      if (!availableBrands.some((b) => b.id === selectedBrandId)) {
        setSelectedBrandId(availableBrands[0].id);
      }
    } else {
      setSelectedBrandId(null);
    }
  };

  // Marka seçimi
  const handleSelectBrand = (brandId: string) => {
    setSelectedBrandId(brandId);
    setSearchModel("");
  };

  // Aktif Kategori ve Marka nesneleri
  const activeCategory = useMemo(() => {
    if (selectedCatId === "ALL") return null;
    return categories.find((c) => c.id === selectedCatId) ?? null;
  }, [categories, selectedCatId]);

  const activeBrand = useMemo(() => {
    if (!selectedBrandId) return null;
    return brands.find((b) => b.id === selectedBrandId) ?? null;
  }, [brands, selectedBrandId]);

  // Filtrelenmiş kategoriler
  const filteredCategories = useMemo(() => {
    if (!searchCat.trim()) return categories;
    const q = searchCat.toLowerCase();
    return categories.filter((c) => c.name.toLowerCase().includes(q));
  }, [categories, searchCat]);

  // Filtrelenmiş markalar
  const filteredBrands = useMemo(() => {
    let list = brands;
    if (selectedCatId !== "ALL") {
      list = list.filter((b) => b.categoryId === selectedCatId);
    }
    if (searchBrand.trim()) {
      const q = searchBrand.toLowerCase();
      list = list.filter((b) => b.name.toLowerCase().includes(q));
    }
    return list;
  }, [brands, selectedCatId, searchBrand]);

  // Filtrelenmiş modeller
  const filteredModels = useMemo(() => {
    if (!activeBrand) return [];
    let list = activeBrand.models;
    if (searchModel.trim()) {
      const q = searchModel.toLowerCase();
      list = list.filter((m) => m.name.toLowerCase().includes(q));
    }
    return list;
  }, [activeBrand, searchModel]);

  // İstatistikler
  const totalModelsCount = useMemo(() => {
    return brands.reduce((acc, b) => acc + (b.models?.length || 0), 0);
  }, [brands]);

  // -------------------------------------------------------------
  // KATEGORİ İŞLEMLERİ
  // -------------------------------------------------------------
  const handleAddCategory = async () => {
    const val = newCatName.trim();
    if (!val) return;
    try {
      const res = await createSimple("vehicle-categories", val);
      setNewCatName("");
      toast.success(`"${val}" kategorisi eklendi`);
      await loadData(true);
      if (res?.id) {
        setSelectedCatId(res.id);
      }
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Kategori eklenemedi");
    }
  };

  const handleOpenEditCategory = (cat: SimpleCatalog, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingCategory(cat);
    setEditCatName(cat.name);
  };

  const handleSaveEditCategory = async () => {
    if (!editingCategory || !editCatName.trim()) return;
    try {
      await updateSimple("vehicle-categories", editingCategory.id, editCatName.trim());
      toast.success("Kategori güncellendi");
      setEditingCategory(null);
      await loadData(true);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Güncellenemedi");
    }
  };

  const handleDeleteCategory = async (catId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const count = brands.filter((b) => b.categoryId === catId).length;
    const msg =
      count > 0
        ? `"${name}" kategorisinde ${count} marka bulunuyor. Silmek istediğinize emin misiniz?`
        : `"${name}" kategorisini silmek istiyor musunuz?`;
    if (!window.confirm(msg)) return;

    try {
      await removeSimple("vehicle-categories", catId);
      toast.success(`"${name}" kategorisi silindi`);
      if (selectedCatId === catId) {
        setSelectedCatId("ALL");
      }
      await loadData(true);
    } catch {
      toast.error("Kategori silinemedi");
    }
  };

  // -------------------------------------------------------------
  // MARKA İŞLEMLERİ
  // -------------------------------------------------------------
  const handleAddBrand = async () => {
    const val = newBrandName.trim();
    if (!val) return;
    const catId = selectedCatId === "ALL" ? undefined : selectedCatId;
    try {
      const res = await createBrand(val, catId);
      setNewBrandName("");
      toast.success(`"${val}" markası eklendi`);
      await loadData(true);
      if (res?.id) {
        setSelectedBrandId(res.id);
      }
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Marka eklenemedi");
    }
  };

  const handleOpenEditBrand = (brand: CatalogBrand, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingBrand(brand);
    setEditBrandName(brand.name);
    setEditBrandCatId(brand.categoryId || "");
  };

  const handleSaveEditBrand = async () => {
    if (!editingBrand || !editBrandName.trim()) return;
    try {
      await updateBrand(editingBrand.id, {
        name: editBrandName.trim(),
        categoryId: editBrandCatId || null,
      });
      toast.success("Marka güncellendi");
      setEditingBrand(null);
      await loadData(true);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Güncellenemedi");
    }
  };

  const handleDeleteBrand = async (brandId: string, name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!window.confirm(`"${name}" markasını ve tüm modellerini silmek istediğinize emin misiniz?`)) return;

    try {
      await removeBrand(brandId);
      toast.success(`"${name}" markası silindi`);
      if (selectedBrandId === brandId) {
        setSelectedBrandId(null);
      }
      await loadData(true);
    } catch {
      toast.error("Marka silinemedi");
    }
  };

  // -------------------------------------------------------------
  // MODEL İŞLEMLERİ
  // -------------------------------------------------------------
  const handleAddModel = async () => {
    if (!activeBrand) return;
    const val = newModelName.trim();
    if (!val) return;
    try {
      await createModel(activeBrand.id, val);
      setNewModelName("");
      toast.success(`"${val}" modeli eklendi`);
      await loadData(true);
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Model eklenemedi");
    }
  };

  const handleDeleteModel = async (modelId: string, name: string) => {
    if (!window.confirm(`"${name}" modelini silmek istiyor musunuz?`)) return;
    try {
      await removeModel(modelId);
      toast.success(`"${name}" modeli silindi`);
      await loadData(true);
    } catch {
      toast.error("Model silinemedi");
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-400">
        <Spinner className="size-8" />
        <p className="mt-3 text-sm">Katalog yükleniyor...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* 1. ÜST BİLGİ VE BREADCRUMB ÇUBUĞU */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-150 bg-white px-4 py-3 shadow-xs dark:border-dark-600 dark:bg-dark-700">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="flex items-center gap-1.5 font-semibold text-gray-500 dark:text-dark-300">
            <SparklesIcon className="size-4 text-primary-500" />
            Hiyerarşi:
          </span>

          {/* Kategori Etiketi */}
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
              selectedCatId === "ALL"
                ? "bg-gray-100 text-gray-700 dark:bg-dark-600 dark:text-dark-200"
                : "bg-primary-500/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400"
            }`}
          >
            <FolderIcon className="size-3.5" />
            {activeCategory ? activeCategory.name : "Tüm Kategoriler"}
          </span>

          <ChevronRightIcon className="size-3.5 text-gray-400" />

          {/* Marka Etiketi */}
          <span
            className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-medium ${
              activeBrand
                ? "bg-primary-500/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400"
                : "bg-gray-100 text-gray-500 dark:bg-dark-600 dark:text-dark-400"
            }`}
          >
            <TagIcon className="size-3.5" />
            {activeBrand ? activeBrand.name : "Marka seçilmedi"}
          </span>

          {activeBrand && (
            <>
              <ChevronRightIcon className="size-3.5 text-gray-400" />
              <span className="inline-flex items-center gap-1 rounded-md bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700 dark:bg-dark-600 dark:text-dark-200">
                <CubeIcon className="size-3.5" />
                {activeBrand.models.length} Model
              </span>
            </>
          )}
        </div>

        {/* Global Sayaçlar */}
        <div className="flex items-center gap-2 text-xs font-medium text-gray-500 dark:text-dark-300">
          <span className="rounded bg-gray-100 px-2 py-0.5 dark:bg-dark-600">
            {categories.length} Kategori
          </span>
          <span>•</span>
          <span className="rounded bg-gray-100 px-2 py-0.5 dark:bg-dark-600">
            {brands.length} Marka
          </span>
          <span>•</span>
          <span className="rounded bg-gray-100 px-2 py-0.5 dark:bg-dark-600">
            {totalModelsCount} Model
          </span>
        </div>
      </div>

      {/* 2. ÜÇ SÜTUNLU MİLLER COLUMNS GÖRÜNÜMÜ */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* ============================================================== */}
        {/* SÜTUN 1: KATEGORİLER                                          */}
        {/* ============================================================== */}
        <Card className="flex h-[620px] flex-col p-4 shadow-sm">
          {/* Başlık */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">
                <FolderIcon className="size-4" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-dark-50">
                  1. Kategoriler
                </h3>
              </div>
            </div>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-dark-600 dark:text-dark-200">
              {categories.length}
            </span>
          </div>

          {/* Yeni Kategori Ekleme */}
          <div className="flex gap-2">
            <Input
              placeholder="Yeni kategori adı..."
              value={newCatName}
              onChange={(e) => setNewCatName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
            />
            <Button
              color="primary"
              isIcon
              onClick={handleAddCategory}
              title="Kategori Ekle"
            >
              <PlusIcon className="size-5" />
            </Button>
          </div>

          {/* Kategori Ara */}
          <div className="relative mt-2.5">
            <Input
              placeholder="Kategori ara..."
              value={searchCat}
              onChange={(e) => setSearchCat(e.target.value)}
              className="pl-8 text-xs"
            />
            <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            {searchCat && (
              <button
                type="button"
                onClick={() => setSearchCat("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="size-3.5" />
              </button>
            )}
          </div>

          {/* Kategori Listesi */}
          <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto pr-1">
            {/* Özel Seçenek: Tüm Markalar */}
            <div
              onClick={() => handleSelectCategory("ALL")}
              className={`group flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all ${
                selectedCatId === "ALL"
                  ? "border-primary-500 bg-primary-500/10 font-semibold text-primary-600 ring-1 ring-primary-500/40 dark:bg-primary-500/15 dark:text-primary-400"
                  : "border-gray-150 hover:border-gray-300 hover:bg-gray-50 dark:border-dark-600 dark:hover:border-dark-500 dark:hover:bg-dark-600/60"
              }`}
            >
              <div className="flex items-center gap-2 text-gray-800 dark:text-dark-100">
                <span className="text-base">🌐</span>
                <span className="font-medium">Tüm Kategoriler</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-dark-600 dark:text-dark-300">
                  {brands.length} marka
                </span>
                {selectedCatId === "ALL" && (
                  <ChevronRightIcon className="size-4 text-primary-600 dark:text-primary-400" />
                )}
              </div>
            </div>

            {/* Kategoriler */}
            {filteredCategories.map((c) => {
              const count = brands.filter((b) => b.categoryId === c.id).length;
              const isSelected = selectedCatId === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => handleSelectCategory(c.id)}
                  className={`group flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all ${
                    isSelected
                      ? "border-primary-500 bg-primary-500/10 font-semibold text-primary-600 ring-1 ring-primary-500/40 dark:bg-primary-500/15 dark:text-primary-400"
                      : "border-gray-150 hover:border-gray-300 hover:bg-gray-50 dark:border-dark-600 dark:hover:border-dark-500 dark:hover:bg-dark-600/60"
                  }`}
                >
                  <span className="truncate text-gray-800 dark:text-dark-100">
                    {c.name}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-dark-600 dark:text-dark-300">
                      {count} marka
                    </span>

                    {/* Aksiyon butonları */}
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditCategory(c, e)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-dark-500 dark:hover:text-dark-100"
                        title="Düzenle"
                      >
                        <PencilSquareIcon className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteCategory(c.id, c.name, e)}
                        className="rounded p-1 text-gray-400 hover:bg-error/10 hover:text-error"
                        title="Sil"
                      >
                        <TrashIcon className="size-3.5" />
                      </button>
                    </div>

                    {isSelected && (
                      <ChevronRightIcon className="size-4 text-primary-600 dark:text-primary-400" />
                    )}
                  </div>
                </div>
              );
            })}

            {filteredCategories.length === 0 && (
              <p className="py-6 text-center text-xs text-gray-400">
                Kategori bulunamadı.
              </p>
            )}
          </div>
        </Card>

        {/* ============================================================== */}
        {/* SÜTUN 2: MARKALAR                                             */}
        {/* ============================================================== */}
        <Card className="flex h-[620px] flex-col p-4 shadow-sm">
          {/* Başlık */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">
                <TagIcon className="size-4" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-dark-50">
                  2. Markalar
                </h3>
              </div>
            </div>
            <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-dark-600 dark:text-dark-200">
              {filteredBrands.length}
            </span>
          </div>

          {/* Yeni Marka Ekleme */}
          <div className="flex gap-2">
            <Input
              placeholder={
                activeCategory
                  ? `${activeCategory.name} için yeni marka...`
                  : "Yeni marka adı..."
              }
              value={newBrandName}
              onChange={(e) => setNewBrandName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddBrand()}
            />
            <Button
              color="primary"
              isIcon
              onClick={handleAddBrand}
              title="Marka Ekle"
            >
              <PlusIcon className="size-5" />
            </Button>
          </div>

          {/* Marka Ara */}
          <div className="relative mt-2.5">
            <Input
              placeholder="Marka ara..."
              value={searchBrand}
              onChange={(e) => setSearchBrand(e.target.value)}
              className="pl-8 text-xs"
            />
            <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
            {searchBrand && (
              <button
                type="button"
                onClick={() => setSearchBrand("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="size-3.5" />
              </button>
            )}
          </div>

          {/* Marka Listesi */}
          <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto pr-1">
            {filteredBrands.map((b) => {
              const isSelected = selectedBrandId === b.id;

              return (
                <div
                  key={b.id}
                  onClick={() => handleSelectBrand(b.id)}
                  className={`group flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-sm transition-all ${
                    isSelected
                      ? "border-primary-500 bg-primary-500/10 font-semibold text-primary-600 ring-1 ring-primary-500/40 dark:bg-primary-500/15 dark:text-primary-400"
                      : "border-gray-150 hover:border-gray-300 hover:bg-gray-50 dark:border-dark-600 dark:hover:border-dark-500 dark:hover:bg-dark-600/60"
                  }`}
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <p className="truncate text-gray-800 dark:text-dark-100">
                      {b.name}
                    </p>
                    {selectedCatId === "ALL" && b.category && (
                      <span className="mt-0.5 inline-block rounded bg-gray-100 px-1.5 py-0.2 text-[10px] text-gray-500 dark:bg-dark-600 dark:text-dark-300">
                        {b.category.name}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span className="rounded-md bg-gray-100 px-2 py-0.5 text-xs text-gray-600 dark:bg-dark-600 dark:text-dark-300">
                      {b.models.length} model
                    </span>

                    {/* Aksiyon butonları */}
                    <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => handleOpenEditBrand(b, e)}
                        className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-700 dark:hover:bg-dark-500 dark:hover:text-dark-100"
                        title="Düzenle / Kategori Değiştir"
                      >
                        <PencilSquareIcon className="size-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteBrand(b.id, b.name, e)}
                        className="rounded p-1 text-gray-400 hover:bg-error/10 hover:text-error"
                        title="Sil"
                      >
                        <TrashIcon className="size-3.5" />
                      </button>
                    </div>

                    {isSelected && (
                      <ChevronRightIcon className="size-4 text-primary-600 dark:text-primary-400" />
                    )}
                  </div>
                </div>
              );
            })}

            {filteredBrands.length === 0 && (
              <div className="py-12 text-center text-xs text-gray-400">
                <p>Bu kategoride marka bulunamadı.</p>
                <p className="mt-1">Yukarıdaki alandan hemen marka ekleyebilirsiniz.</p>
              </div>
            )}
          </div>
        </Card>

        {/* ============================================================== */}
        {/* SÜTUN 3: MODELLER                                             */}
        {/* ============================================================== */}
        <Card className="flex h-[620px] flex-col p-4 shadow-sm">
          {/* Başlık */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="flex size-7 items-center justify-center rounded-lg bg-primary-500/10 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400">
                <CubeIcon className="size-4" />
              </div>
              <div>
                <h3 className="font-semibold text-gray-800 dark:text-dark-50">
                  {activeBrand ? `3. ${activeBrand.name} — Modeller` : "3. Modeller"}
                </h3>
              </div>
            </div>
            {activeBrand && (
              <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold text-gray-600 dark:bg-dark-600 dark:text-dark-200">
                {filteredModels.length}
              </span>
            )}
          </div>

          {activeBrand ? (
            <>
              {/* Yeni Model Ekleme */}
              <div className="flex gap-2">
                <Input
                  placeholder={`${activeBrand.name} için yeni model...`}
                  value={newModelName}
                  onChange={(e) => setNewModelName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddModel()}
                />
                <Button
                  color="primary"
                  isIcon
                  onClick={handleAddModel}
                  title="Model Ekle"
                >
                  <PlusIcon className="size-5" />
                </Button>
              </div>

              {/* Model Ara */}
              <div className="relative mt-2.5">
                <Input
                  placeholder="Model ara..."
                  value={searchModel}
                  onChange={(e) => setSearchModel(e.target.value)}
                  className="pl-8 text-xs"
                />
                <MagnifyingGlassIcon className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-gray-400" />
                {searchModel && (
                  <button
                    type="button"
                    onClick={() => setSearchModel("")}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    <XMarkIcon className="size-3.5" />
                  </button>
                )}
              </div>

              {/* Model Listesi */}
              <div className="mt-3 flex-1 space-y-1.5 overflow-y-auto pr-1">
                {filteredModels.map((m) => (
                  <div
                    key={m.id}
                    className="group flex items-center justify-between rounded-lg border border-gray-150 px-3 py-2 text-sm transition-colors hover:border-gray-300 hover:bg-gray-50 dark:border-dark-600 dark:hover:border-dark-500 dark:hover:bg-dark-600/60"
                  >
                    <span className="font-medium text-gray-800 dark:text-dark-100">
                      {m.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteModel(m.id, m.name)}
                      className="text-gray-400 hover:text-error transition-colors p-1"
                      title="Sil"
                    >
                      <TrashIcon className="size-4" />
                    </button>
                  </div>
                ))}

                {filteredModels.length === 0 && (
                  <div className="py-12 text-center text-xs text-gray-400">
                    <p>Bu markaya ait henüz model eklenmemiş.</p>
                    <p className="mt-1">Yukarıdaki alandan ilk modeli ekleyebilirsiniz.</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Seçim Yapılmamışsa Boş Durum (Empty State) */
            <div className="flex flex-1 flex-col items-center justify-center p-6 text-center text-gray-400 dark:text-dark-300">
              <div className="flex size-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-400 dark:bg-dark-600 dark:text-dark-300 mb-3">
                <CubeIcon className="size-8" />
              </div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-dark-100">
                Önce bir marka seçin
              </h4>
              <p className="mt-1 text-xs max-w-xs text-gray-400 dark:text-dark-400">
                Modelleri görüntülemek, düzenlemek veya yeni model eklemek için soldaki sütundan bir marka belirleyin.
              </p>
            </div>
          )}
        </Card>
      </div>

      {/* 3. KATEGORİ DÜZENLEME MODALI */}
      {editingCategory && (
        <Modal
          open={!!editingCategory}
          onClose={() => setEditingCategory(null)}
          title="Kategori Düzenle"
          className="max-w-md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-dark-200 mb-1">
                Kategori Adı
              </label>
              <Input
                value={editCatName}
                onChange={(e) => setEditCatName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveEditCategory()}
                placeholder="Örn: Otomobil"
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="flat" onClick={() => setEditingCategory(null)}>
                İptal
              </Button>
              <Button color="primary" onClick={handleSaveEditCategory}>
                Kaydet
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* 4. MARKA DÜZENLEME & KATEGORİ DEĞİŞTİRME MODALI */}
      {editingBrand && (
        <Modal
          open={!!editingBrand}
          onClose={() => setEditingBrand(null)}
          title="Marka Düzenle"
          className="max-w-md"
        >
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-dark-200 mb-1">
                Marka Adı
              </label>
              <Input
                value={editBrandName}
                onChange={(e) => setEditBrandName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSaveEditBrand()}
                placeholder="Örn: BMW"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 dark:text-dark-200 mb-1">
                Bağlı Olduğu Kategori
              </label>
              <select
                value={editBrandCatId}
                onChange={(e) => setEditBrandCatId(e.target.value)}
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-primary-500 focus:outline-none dark:border-dark-500 dark:bg-dark-600 dark:text-white"
              >
                <option value="">(Kategorisiz / Bağımsız)</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="flat" onClick={() => setEditingBrand(null)}>
                İptal
              </Button>
              <Button color="primary" onClick={handleSaveEditBrand}>
                Kaydet
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ======================================================================
// BASİT TANIMLAR PANELİ (Renkler, Kasa Tipleri, Araç Tipleri)
// ======================================================================
function SimplePanel({ slug }: { slug: SimpleEntitySlug }) {
  const [items, setItems] = useState<SimpleCatalog[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [hex, setHex] = useState("#1976D2");

  const load = () => {
    setLoading(true);
    listSimple(slug)
      .then(setItems)
      .catch(() => toast.error("Yüklenemedi"))
      .finally(() => setLoading(false));
  };
  useEffect(load, [slug]);

  const add = async () => {
    if (name.trim().length < 1) return;
    try {
      await createSimple(slug, name.trim(), slug === "colors" ? hex : undefined);
      setName("");
      load();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Eklenemedi");
    }
  };
  const del = async (id: string) => {
    try {
      await removeSimple(slug, id);
      setItems((p) => p.filter((x) => x.id !== id));
    } catch {
      toast.error("Silinemedi");
    }
  };

  return (
    <Card className="max-w-lg p-4 shadow-sm">
      <div className="flex items-center gap-2">
        {slug === "colors" && (
          <input
            type="color"
            value={hex}
            onChange={(e) => setHex(e.target.value)}
            className="size-9 cursor-pointer rounded-lg border border-gray-200 bg-transparent p-0.5 dark:border-dark-500"
            title="Renk seçici"
          />
        )}
        <Input
          placeholder={slug === "colors" ? "Renk adı (örn: Füme)" : "Yeni kayıt adı"}
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
          className="flex-1"
        />
        <Button color="primary" isIcon onClick={add}>
          <PlusIcon className="size-5" />
        </Button>
      </div>
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner className="size-6" />
        </div>
      ) : (
        <div className="mt-3 space-y-1">
          {items.map((x) => (
            <div
              key={x.id}
              className="flex items-center justify-between rounded-lg border border-gray-150 px-3 py-1.5 text-sm dark:border-dark-600"
            >
              <div className="flex items-center gap-2.5">
                {slug === "colors" && (
                  <span
                    className="size-4 shrink-0 rounded-full border border-gray-300 shadow-2xs dark:border-dark-400"
                    style={{ backgroundColor: x.hex || "#808080" }}
                  />
                )}
                <span className="text-gray-800 dark:text-dark-100">{x.name}</span>
                {slug === "colors" && x.hex && (
                  <span className="font-mono text-xs text-gray-400">{x.hex}</span>
                )}
              </div>
              <button
                type="button"
                onClick={() => del(x.id)}
                className="text-gray-400 hover:text-error"
                title="Sil"
              >
                <TrashIcon className="size-4" />
              </button>
            </div>
          ))}
          {items.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-400">Kayıt yok.</p>
          )}
        </div>
      )}
    </Card>
  );
}

// ======================================================================
// İLAN KAYNAKLARI PANELİ (Sahibinden, Arabam vb.)
// ======================================================================
function ListingSourcesPanel() {
  const [items, setItems] = useState<ListingSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [label, setLabel] = useState("");
  const [domain, setDomain] = useState("");
  const [iconUrl, setIconUrl] = useState("");

  const load = () => {
    setLoading(true);
    listListingSources()
      .then(setItems)
      .catch(() => toast.error("Yüklenemedi"))
      .finally(() => setLoading(false));
  };
  useEffect(load, []);

  const add = async () => {
    if (label.trim().length < 1) return;
    try {
      await createListingSource({
        label: label.trim(),
        domainLink: domain.trim() || undefined,
        iconUrl: iconUrl.trim() || undefined,
      });
      setLabel("");
      setDomain("");
      setIconUrl("");
      load();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Eklenemedi");
    }
  };
  const del = async (id: string) => {
    if (!window.confirm("İlan kaynağı silinsin mi?")) return;
    try {
      await removeListingSource(id);
      setItems((p) => p.filter((x) => x.id !== id));
    } catch {
      toast.error("Silinemedi");
    }
  };

  return (
    <Card className="max-w-2xl p-4 shadow-sm">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
        <Input
          placeholder="Etiket (örn. Sahibinden)"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Input
          placeholder="Alan adı (sahibinden.com)"
          value={domain}
          onChange={(e) => setDomain(e.target.value)}
        />
        <Input
          placeholder="İkon URL (opsiyonel)"
          value={iconUrl}
          onChange={(e) => setIconUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && add()}
        />
        <Button color="primary" isIcon onClick={add}>
          <PlusIcon className="size-5" />
        </Button>
      </div>
      <p className="mt-2 text-xs text-gray-400">
        İkon verilmezse alan adının favicon'u kullanılır.
      </p>
      {loading ? (
        <div className="flex justify-center py-6">
          <Spinner className="size-6" />
        </div>
      ) : (
        <div className="mt-3 space-y-1.5">
          {items.map((s) => {
            const icon = listingSourceIcon(s);
            return (
              <div
                key={s.id}
                className="flex items-center gap-3 rounded-lg border border-gray-150 px-3 py-2 text-sm dark:border-dark-600"
              >
                <div className="flex size-8 items-center justify-center overflow-hidden rounded-lg bg-gray-50 dark:bg-dark-600">
                  {icon ? (
                    <img src={icon} alt="" className="size-6 object-contain" />
                  ) : (
                    <LinkIcon className="size-5 text-gray-400" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-gray-800 dark:text-dark-100">{s.label}</p>
                  <p className="truncate text-xs text-gray-400">
                    {s.domainLink || "alan adı yok — otomatik eşleşmez"}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => del(s.id)}
                  className="text-gray-400 hover:text-error"
                  title="Sil"
                >
                  <TrashIcon className="size-4" />
                </button>
              </div>
            );
          })}
          {items.length === 0 && (
            <p className="py-4 text-center text-sm text-gray-400">Kayıt yok.</p>
          )}
        </div>
      )}
    </Card>
  );
}
