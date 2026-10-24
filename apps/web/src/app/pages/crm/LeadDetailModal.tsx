import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  SparklesIcon,
  PhoneIcon,
  EnvelopeIcon,
  CalendarDaysIcon,
  PlusIcon,
  CheckBadgeIcon,
  TrashIcon,
  ArrowTopRightOnSquareIcon,
  StarIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/20/solid";
import clsx from "clsx";

import { Button, Card, Input, Select, Spinner, Tag, Badge, Textarea } from "@/components/ui";
import { Modal } from "@/components/shared/Modal";
import {
  getLead,
  updateLead,
  deleteLead,
  addInterestedVehicle,
  removeInterestedVehicle,
  createTestDrive,
  updateTestDrive,
  createQuote,
  updateQuote,
  addLeadActivity,
  convertLeadToCustomer,
  generateAiQuoteMessage,
  type Lead,
  type LeadStatus,
  type QuoteStatus,
} from "@/services/crmService";
import { listVehicles } from "@/services/vehicleService";
import {
  LEAD_STATUS_CONFIG,
  LEAD_SOURCE_CONFIG,
  TEST_DRIVE_STATUS_CONFIG,
  QUOTE_STATUS_CONFIG,
} from "./constants";
import type { Vehicle } from "@/@types/vehicle";

interface Props {
  leadId: string | null;
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}

export function LeadDetailModal({ leadId, open, onClose, onRefresh }: Props) {
  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"vehicles" | "test_drives" | "quotes" | "timeline">(
    "vehicles",
  );

  // Stoktaki araçlar (seçim için)
  const [stockVehicles, setStockVehicles] = useState<Vehicle[]>([]);

  // Yeni Araç Ekleme
  const [selectedAddVehicleId, setSelectedAddVehicleId] = useState("");
  const [isAddingVehicle, setIsAddingVehicle] = useState(false);

  // Yeni Test Sürüşü Formu
  const [showNewTestDrive, setShowNewTestDrive] = useState(false);
  const [tdVehicleId, setTdVehicleId] = useState("");
  const [tdScheduledAt, setTdScheduledAt] = useState("");
  const [tdLicense, setTdLicense] = useState("");
  const [tdDuration, setTdDuration] = useState("30");
  const [isSavingTd, setIsSavingTd] = useState(false);

  // Test Sürüşü Tamamlama / Puanlama
  const [editingTdId, setEditingTdId] = useState<string | null>(null);
  const [tdRating, setTdRating] = useState<number>(5);
  const [tdFeedback, setTdFeedback] = useState("");

  // Yeni Teklif Formu
  const [showNewQuote, setShowNewQuote] = useState(false);
  const [quoteVehicleId, setQuoteVehicleId] = useState("");
  const [quoteVehiclePrice, setQuoteVehiclePrice] = useState("");
  const [quoteOfferedPrice, setQuoteOfferedPrice] = useState("");
  const [quotePaymentType, setQuotePaymentType] = useState("Nakit");
  const [quoteValidUntil, setQuoteValidUntil] = useState("");
  const [quoteTerms, setQuoteTerms] = useState("");
  const [isSavingQuote, setIsSavingQuote] = useState(false);

  // Claude AI Teklif Mesajı
  const [aiLoading, setAiLoading] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  // Zaman Tüneli Not Ekleme
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");
  const [newNoteType, setNewNoteType] = useState("NOTE");
  const [isSavingNote, setIsSavingNote] = useState(false);

  // Dönüştürme (Conversion)
  const [showConvertModal, setShowConvertModal] = useState(false);
  const [convEntityType, setConvEntityType] = useState<"INDIVIDUAL" | "CORPORATE">("INDIVIDUAL");
  const [convTaxOffice, setConvTaxOffice] = useState("");
  const [convTaxNumber, setConvTaxNumber] = useState("");
  const [convTckn, setConvTckn] = useState("");
  const [convCity, setConvCity] = useState("");
  const [convAddress, setConvAddress] = useState("");
  const [isConverting, setIsConverting] = useState(false);

  const loadData = async () => {
    if (!leadId) return;
    setLoading(true);
    try {
      const data = await getLead(leadId);
      setLead(data);
    } catch {
      toast.error("Aday bilgileri yüklenemedi.");
      onClose();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && leadId) {
      loadData();
      listVehicles({ status: "STOKTA", pageSize: 100 })
        .then((res) => setStockVehicles(res.items || []))
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, leadId]);

  if (!open || !leadId) return null;

  // Aşama Değiştir
  const handleStatusChange = async (newStatus: LeadStatus) => {
    try {
      await updateLead(leadId, { status: newStatus });
      toast.success(`Aşama "${LEAD_STATUS_CONFIG[newStatus].label}" olarak güncellendi.`);
      loadData();
      onRefresh();
    } catch {
      toast.error("Aşama güncellenemedi.");
    }
  };

  // Araç İlgisine Ekle
  const handleAddVehicleInterest = async () => {
    if (!selectedAddVehicleId) return;
    setIsAddingVehicle(true);
    try {
      await addInterestedVehicle(leadId, selectedAddVehicleId);
      toast.success("Araç adayın listesine eklendi.");
      setSelectedAddVehicleId("");
      loadData();
      onRefresh();
    } catch {
      toast.error("Araç eklenemedi.");
    } finally {
      setIsAddingVehicle(false);
    }
  };

  // Araç İlgisinden Çıkar
  const handleRemoveVehicleInterest = async (vehicleId: string) => {
    try {
      await removeInterestedVehicle(leadId, vehicleId);
      toast.success("Araç listeden çıkarıldı.");
      loadData();
      onRefresh();
    } catch {
      toast.error("İşlem başarısız.");
    }
  };

  // Yeni Deneme Sürüşü Kaydet
  const handleCreateTestDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tdVehicleId || !tdScheduledAt) {
      toast.error("Lütfen araç ve randevu tarihi seçin.");
      return;
    }
    setIsSavingTd(true);
    try {
      await createTestDrive({
        leadId,
        vehicleId: tdVehicleId,
        scheduledAt: new Date(tdScheduledAt).toISOString(),
        durationMinutes: Number(tdDuration) || 30,
        driverLicenseNo: tdLicense.trim() || undefined,
      });
      toast.success("Deneme sürüşü randevusu planlandı.");
      setShowNewTestDrive(false);
      setTdScheduledAt("");
      setTdLicense("");
      loadData();
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Randevu kaydedilemedi.");
    } finally {
      setIsSavingTd(false);
    }
  };

  // Test Sürüşü Tamamla / Puanla
  const handleSaveTdFeedback = async (tdId: string) => {
    try {
      await updateTestDrive(tdId, {
        status: "COMPLETED",
        feedbackRating: tdRating,
        feedbackNotes: tdFeedback.trim() || undefined,
      });
      toast.success("Test sürüşü değerlendirmesi kaydedildi.");
      setEditingTdId(null);
      setTdFeedback("");
      loadData();
      onRefresh();
    } catch {
      toast.error("Kayıt başarısız.");
    }
  };

  // Yeni Teklif Kaydet
  const handleCreateQuote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quoteVehicleId || !quoteOfferedPrice) {
      toast.error("Lütfen araç ve teklif fiyatı girin.");
      return;
    }
    setIsSavingQuote(true);
    try {
      await createQuote({
        leadId,
        vehicleId: quoteVehicleId,
        vehiclePrice: Number(quoteVehiclePrice) || Number(quoteOfferedPrice),
        offeredPrice: Number(quoteOfferedPrice),
        paymentType: quotePaymentType,
        validUntil: quoteValidUntil ? new Date(quoteValidUntil).toISOString() : undefined,
        terms: quoteTerms.trim() || undefined,
      });
      toast.success("Teklif başarıyla hazırlandı.");
      setShowNewQuote(false);
      setQuoteOfferedPrice("");
      setQuoteTerms("");
      loadData();
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Teklif kaydedilemedi.");
    } finally {
      setIsSavingQuote(false);
    }
  };

  // Claude AI ile Teklif Mesajı Üret
  const handleGenerateAiMessage = async (vehicleId: string, quoteId?: string) => {
    setAiLoading(true);
    setAiMessage(null);
    try {
      const res = await generateAiQuoteMessage({
        leadId,
        vehicleId,
        quoteId,
        type: "quote_share",
      });
      setAiMessage(res.message);
      toast.success(`Claude (${res.model}) teklif mesajını hazırladı!`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "AI mesajı üretilemedi.");
    } finally {
      setAiLoading(false);
    }
  };

  // Yeni Not Ekle
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteTitle.trim()) return;
    setIsSavingNote(true);
    try {
      await addLeadActivity(leadId, {
        type: newNoteType,
        title: newNoteTitle.trim(),
        content: newNoteContent.trim() || undefined,
      });
      toast.success("Not kaydedildi.");
      setNewNoteTitle("");
      setNewNoteContent("");
      loadData();
    } catch {
      toast.error("Not kaydedilemedi.");
    } finally {
      setIsSavingNote(false);
    }
  };

  // Müşteriye (Cari) Dönüştür
  const handleConvert = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConverting(true);
    try {
      await convertLeadToCustomer(leadId, {
        entityType: convEntityType,
        taxOffice: convTaxOffice.trim() || undefined,
        taxNumber: convTaxNumber.trim() || undefined,
        tckn: convTckn.trim() || undefined,
        city: convCity.trim() || undefined,
        address: convAddress.trim() || undefined,
      });
      toast.success("Aday başarıyla Cari Müşteri olarak sisteme aktarıldı!");
      setShowConvertModal(false);
      loadData();
      onRefresh();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Dönüştürme işlemi başarısız.");
    } finally {
      setIsConverting(false);
    }
  };

  // Adayı Sil
  const handleDeleteLead = async () => {
    if (!confirm("Bu potansiyel alıcıyı ve tüm geçmişini silmek istediğinize emin misiniz?"))
      return;
    try {
      await deleteLead(leadId);
      toast.success("Aday silindi.");
      onClose();
      onRefresh();
    } catch {
      toast.error("Silinemedi.");
    }
  };

  const statusCfg = lead ? LEAD_STATUS_CONFIG[lead.status] : null;
  const sourceCfg = lead ? LEAD_SOURCE_CONFIG[lead.source] : null;

  return (
    <Modal open={open} onClose={onClose} title="" className="max-w-4xl p-0">
      {loading || !lead ? (
        <div className="flex justify-center py-20">
          <Spinner className="size-8" />
        </div>
      ) : (
        <div className="flex flex-col">
          {/* Üst Başlık & Hızlı Bilgiler */}
          <div className="border-b border-gray-150 p-6 dark:border-dark-600">
            <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-dark-50">
                    {lead.fullName}
                  </h2>
                  {statusCfg && (
                    <Badge color={statusCfg.color} variant="soft" className="px-2.5 py-1 text-xs">
                      {statusCfg.label}
                    </Badge>
                  )}
                  {sourceCfg && (
                    <span
                      className={`inline-flex items-center rounded-md px-2 py-0.5 text-tiny font-medium ${sourceCfg.badgeColor}`}
                    >
                      {sourceCfg.label}
                    </span>
                  )}
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-gray-600 dark:text-dark-200">
                  {lead.phone && (
                    <a
                      href={`tel:${lead.phone}`}
                      className="flex items-center gap-1.5 hover:text-primary-600"
                    >
                      <PhoneIcon className="size-3.5 text-gray-400" />
                      <span>{lead.phone}</span>
                    </a>
                  )}
                  {lead.email && (
                    <a
                      href={`mailto:${lead.email}`}
                      className="flex items-center gap-1.5 hover:text-primary-600"
                    >
                      <EnvelopeIcon className="size-3.5 text-gray-400" />
                      <span>{lead.email}</span>
                    </a>
                  )}
                  {lead.budget && (
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                      Bütçe: {Number(lead.budget).toLocaleString("tr-TR")} TL
                    </span>
                  )}
                </div>
              </div>

              {/* Hızlı Aksiyonlar: Aşama Değiştirici & Müşteriye Dönüştür */}
              <div className="flex items-center gap-2">
                <Select
                  value={lead.status}
                  onChange={(e) => handleStatusChange(e.target.value as LeadStatus)}
                  className="w-44 text-xs font-semibold"
                  data={Object.entries(LEAD_STATUS_CONFIG).map(([k, v]) => ({
                    value: k,
                    label: v.label,
                  }))}
                />

                {lead.status !== "CONVERTED" && !lead.convertedAccountId ? (
                  <Button
                    color="success"
                    className="gap-1.5 whitespace-nowrap"
                    onClick={() => setShowConvertModal(true)}
                  >
                    <CheckBadgeIcon className="size-4" />
                    <span>Cariye Dönüştür</span>
                  </Button>
                ) : (
                  <Tag color="success" className="text-xs">
                    Müşteri Carisi Açıldı
                  </Tag>
                )}

                <Button
                  variant="outlined"
                  color="neutral"
                  isIcon
                  onClick={handleDeleteLead}
                  title="Adayı Sil"
                >
                  <TrashIcon className="size-4 text-error" />
                </Button>
              </div>
            </div>

            {lead.notes && (
              <div className="mt-3 rounded-xl bg-gray-50 p-3 text-xs text-gray-700 dark:bg-dark-750 dark:text-dark-200">
                <span className="font-semibold text-gray-900 dark:text-dark-50">Notlar: </span>
                {lead.notes}
              </div>
            )}
          </div>

          {/* Sekme Başlıkları */}
          <div className="flex border-b border-gray-150 px-6 dark:border-dark-600">
            <button
              type="button"
              onClick={() => setActiveTab("vehicles")}
              className={clsx(
                "border-b-2 px-4 py-3 text-xs font-semibold transition-colors",
                activeTab === "vehicles"
                  ? "border-primary-500 text-primary-600 dark:text-primary-400"
                  : "border-transparent text-gray-500 hover:text-gray-900 dark:text-dark-300 dark:hover:text-white",
              )}
            >
              İlgilendiği Araçlar ({lead.interestedVehicles?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("test_drives")}
              className={clsx(
                "border-b-2 px-4 py-3 text-xs font-semibold transition-colors",
                activeTab === "test_drives"
                  ? "border-primary-500 text-primary-600 dark:text-primary-400"
                  : "border-transparent text-gray-500 hover:text-gray-900 dark:text-dark-300 dark:hover:text-white",
              )}
            >
              Deneme Sürüşleri ({lead.testDrives?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("quotes")}
              className={clsx(
                "border-b-2 px-4 py-3 text-xs font-semibold transition-colors",
                activeTab === "quotes"
                  ? "border-primary-500 text-primary-600 dark:text-primary-400"
                  : "border-transparent text-gray-500 hover:text-gray-900 dark:text-dark-300 dark:hover:text-white",
              )}
            >
              Teklifler & AI ({lead.quotes?.length || 0})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("timeline")}
              className={clsx(
                "border-b-2 px-4 py-3 text-xs font-semibold transition-colors",
                activeTab === "timeline"
                  ? "border-primary-500 text-primary-600 dark:text-primary-400"
                  : "border-transparent text-gray-500 hover:text-gray-900 dark:text-dark-300 dark:hover:text-white",
              )}
            >
              Görüşme Geçmişi ({lead.activities?.length || 0})
            </button>
          </div>

          {/* Sekme İçerikleri */}
          <div className="max-h-[60vh] overflow-y-auto p-6">
            {/* 1. İLGİLENİLEN ARAÇLAR */}
            {activeTab === "vehicles" && (
              <div className="space-y-4">
                {/* Araç Ekle Barı */}
                <div className="flex gap-2">
                  <Select
                    className="flex-1"
                    value={selectedAddVehicleId}
                    onChange={(e) => setSelectedAddVehicleId(e.target.value)}
                    data={[
                      { value: "", label: "Stoktan araç seçip ekleyin..." },
                      ...stockVehicles.map((v) => ({
                        value: v.id,
                        label: `${v.plate} - ${v.brandName} ${v.modelName} (${v.year}) ${v.saleAmount ? `- ${Number(v.saleAmount).toLocaleString("tr-TR")} TL` : ""}`,
                      })),
                    ]}
                  />
                  <Button
                    color="primary"
                    onClick={handleAddVehicleInterest}
                    disabled={!selectedAddVehicleId || isAddingVehicle}
                  >
                    {isAddingVehicle ? <Spinner className="size-4" /> : "İlgiye Ekle"}
                  </Button>
                </div>

                {/* Araç Kartları Listesi */}
                {(!lead.interestedVehicles || lead.interestedVehicles.length === 0) ? (
                  <p className="py-10 text-center text-xs text-gray-400">
                    Adayın ilgilendiği herhangi bir araç eklenmemiş. Yukarıdan stoktaki araçlardan seçebilirsiniz.
                  </p>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {lead.interestedVehicles.map((iv) => {
                      const v = iv.vehicle;
                      const photoUrl = v?.photos?.[0]?.thumbUrl || v?.photos?.[0]?.url;

                      return (
                        <Card
                          key={iv.id}
                          className="flex flex-col justify-between overflow-hidden p-4"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                {photoUrl ? (
                                  <img
                                    src={photoUrl}
                                    alt={v.plate}
                                    className="size-14 rounded-lg object-cover"
                                  />
                                ) : (
                                  <div className="flex size-14 items-center justify-center rounded-lg bg-gray-100 font-mono text-xs font-bold text-gray-500 dark:bg-dark-700">
                                    OTO
                                  </div>
                                )}
                                <div>
                                  <span className="font-mono text-xs font-bold text-gray-900 dark:text-dark-50">
                                    {v.plate}
                                  </span>
                                  <h4 className="text-sm font-semibold text-gray-800 dark:text-dark-100">
                                    {v.brandName} {v.modelName}
                                  </h4>
                                  <p className="text-tiny text-gray-500 dark:text-dark-300">
                                    {v.year} model • {v.km ? `${v.km.toLocaleString()} km` : ""} •{" "}
                                    {v.transmission || ""}
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => handleRemoveVehicleInterest(v.id)}
                                className="text-gray-400 hover:text-error"
                                title="İlgiden Kaldır"
                              >
                                <TrashIcon className="size-4" />
                              </button>
                            </div>

                            {v.saleAmount && (
                              <div className="mt-3 text-right">
                                <span className="text-tiny text-gray-500">Satış Liste Fiyatı: </span>
                                <span className="font-bold text-primary-600 dark:text-primary-400">
                                  {Number(v.saleAmount).toLocaleString("tr-TR")} TL
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Alt Hızlı Aksiyonlar */}
                          <div className="mt-4 flex gap-2 border-t border-gray-100 pt-3 dark:border-dark-600">
                            {lead.phone && (
                              <a
                                href={`https://wa.me/${lead.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
                                  `Merhaba ${lead.fullName}, ilgilendiğiniz ${v.plate} plakalı ${v.brandName} ${v.modelName} aracımızla ilgili detayları paylaşmak isterim.`,
                                )}`}
                                target="_blank"
                                rel="noreferrer"
                                className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300"
                              >
                                <span>WhatsApp&apos;tan Yaz</span>
                                <ArrowTopRightOnSquareIcon className="size-3.5" />
                              </a>
                            )}
                            <button
                              type="button"
                              onClick={() => {
                                setTdVehicleId(v.id);
                                setShowNewTestDrive(true);
                                setActiveTab("test_drives");
                              }}
                              className="rounded-lg bg-primary-50 px-2.5 py-1.5 text-xs font-semibold text-primary-700 hover:bg-primary-100 dark:bg-primary-950/40 dark:text-primary-300"
                            >
                              Test Sürüşü Planla
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setQuoteVehicleId(v.id);
                                setQuoteVehiclePrice(v.saleAmount ? String(v.saleAmount) : "");
                                setQuoteOfferedPrice(v.saleAmount ? String(v.saleAmount) : "");
                                setShowNewQuote(true);
                                setActiveTab("quotes");
                              }}
                              className="rounded-lg bg-purple-50 px-2.5 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-100 dark:bg-purple-950/40 dark:text-purple-300"
                            >
                              Teklif Ver
                            </button>
                          </div>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 2. DENEME SÜRÜŞLERİ */}
            {activeTab === "test_drives" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                    Planlanan ve Yapılan Deneme Sürüşleri
                  </h3>
                  <Button
                    color="primary"
                    className="gap-1"
                    onClick={() => setShowNewTestDrive(true)}
                  >
                    <PlusIcon className="size-4" />
                    <span>Yeni Randevu Planla</span>
                  </Button>
                </div>

                {/* Yeni Randevu Formu */}
                {showNewTestDrive && (
                  <Card className="border border-primary-200 bg-primary-50/20 p-4 dark:border-primary-800">
                    <h4 className="mb-3 text-xs font-bold text-primary-700 dark:text-primary-300">
                      Yeni Deneme Sürüşü Randevusu
                    </h4>
                    <form onSubmit={handleCreateTestDrive} className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Select
                          label="Araç *"
                          value={tdVehicleId}
                          onChange={(e) => setTdVehicleId(e.target.value)}
                          required
                          data={stockVehicles.map((v) => ({
                            value: v.id,
                            label: `${v.plate} - ${v.brandName} ${v.modelName}`,
                          }))}
                        />
                        <Input
                          label="Randevu Tarihi & Saati *"
                          type="datetime-local"
                          value={tdScheduledAt}
                          onChange={(e) => setTdScheduledAt(e.target.value)}
                          required
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Input
                          label="Sürücü Belgesi / Ehliyet No"
                          placeholder="Örn: 12345678"
                          value={tdLicense}
                          onChange={(e) => setTdLicense(e.target.value)}
                        />
                        <Input
                          label="Tahmini Süre (Dakika)"
                          type="number"
                          value={tdDuration}
                          onChange={(e) => setTdDuration(e.target.value)}
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          type="button"
                          variant="outlined"
                          onClick={() => setShowNewTestDrive(false)}
                        >
                          İptal
                        </Button>
                        <Button type="submit" color="primary" disabled={isSavingTd}>
                          {isSavingTd ? <Spinner className="size-4" /> : "Randevuyu Oluştur"}
                        </Button>
                      </div>
                    </form>
                  </Card>
                )}

                {/* Sürüş Kayıtları */}
                {(!lead.testDrives || lead.testDrives.length === 0) ? (
                  <p className="py-10 text-center text-xs text-gray-400">
                    Henüz planlanmış deneme sürüşü bulunmuyor.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {lead.testDrives.map((td) => {
                      const cfg = TEST_DRIVE_STATUS_CONFIG[td.status];
                      const isEditing = editingTdId === td.id;

                      return (
                        <div
                          key={td.id}
                          className="rounded-xl border border-gray-150 bg-white p-4 dark:border-dark-600 dark:bg-dark-800"
                        >
                          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
                            <div className="flex items-center gap-3">
                              <div className="flex size-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400">
                                <CalendarDaysIcon className="size-5" />
                              </div>
                              <div>
                                <span className="font-mono text-xs font-bold text-gray-900 dark:text-dark-50">
                                  {td.vehicle?.plate}
                                </span>{" "}
                                <span className="text-xs text-gray-700 dark:text-dark-200">
                                  ({td.vehicle?.brandName} {td.vehicle?.modelName})
                                </span>
                                <p className="text-tiny text-gray-500 dark:text-dark-300">
                                  Tarih: {new Date(td.scheduledAt).toLocaleString("tr-TR")} • Süre:{" "}
                                  {td.durationMinutes} dk
                                  {td.driverLicenseNo ? ` • Ehliyet No: ${td.driverLicenseNo}` : ""}
                                </p>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              {cfg && (
                                <Tag color={cfg.color} className="text-tiny">
                                  {cfg.label}
                                </Tag>
                              )}
                              {td.status === "SCHEDULED" && !isEditing && (
                                <Button
                                  color="success"
                                  variant="outlined"
                                  onClick={() => {
                                    setEditingTdId(td.id);
                                    setTdFeedback(td.feedbackNotes || "");
                                    setTdRating(td.feedbackRating || 5);
                                  }}
                                >
                                  Tamamla & Değerlendir
                                </Button>
                              )}
                            </div>
                          </div>

                          {/* Puan & Değerlendirme Önizlemesi */}
                          {td.feedbackRating && (
                            <div className="mt-3 flex items-center gap-2 border-t border-gray-100 pt-2 text-xs dark:border-dark-700">
                              <div className="flex text-amber-500">
                                {[1, 2, 3, 4, 5].map((s) =>
                                  s <= (td.feedbackRating || 0) ? (
                                    <StarSolid key={s} className="size-4" />
                                  ) : (
                                    <StarIcon key={s} className="size-4" />
                                  ),
                                )}
                              </div>
                              <span className="font-semibold text-gray-800 dark:text-dark-100">
                                {td.feedbackNotes}
                              </span>
                            </div>
                          )}

                          {/* Sürüş Tamamlama / Puanlama Formu */}
                          {isEditing && (
                            <div className="mt-4 border-t border-gray-150 pt-3 dark:border-dark-600">
                              <label className="mb-1 block text-xs font-semibold text-gray-700 dark:text-dark-200">
                                Sürüş Değerlendirmesi & Müşteri İzlenimi
                              </label>
                              <div className="mb-2 flex items-center gap-2">
                                <span className="text-xs text-gray-500">Puan:</span>
                                <div className="flex gap-1">
                                  {[1, 2, 3, 4, 5].map((s) => (
                                    <button
                                      key={s}
                                      type="button"
                                      onClick={() => setTdRating(s)}
                                      className="text-amber-500 hover:scale-110"
                                    >
                                      {s <= tdRating ? (
                                        <StarSolid className="size-5" />
                                      ) : (
                                        <StarIcon className="size-5" />
                                      )}
                                    </button>
                                  ))}
                                </div>
                              </div>
                              <Textarea
                                rows={2}
                                placeholder="Müşteri aracın hangi özelliklerini beğendi, takas için araç getirecek mi..."
                                value={tdFeedback}
                                onChange={(e) => setTdFeedback(e.target.value)}
                              />
                              <div className="mt-2 flex justify-end gap-2">
                                <Button
                                  variant="outlined"
                                  onClick={() => setEditingTdId(null)}
                                >
                                  İptal
                                </Button>
                                <Button
                                  color="success"
                                  onClick={() => handleSaveTdFeedback(td.id)}
                                >
                                  Kaydet & Tamamla
                                </Button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 3. TEKLİFLER & CLAUDE AI */}
            {activeTab === "quotes" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-semibold text-gray-700 dark:text-dark-200">
                    Hazırlanan Araç Teklifleri
                  </h3>
                  <Button
                    color="primary"
                    className="gap-1"
                    onClick={() => setShowNewQuote(true)}
                  >
                    <PlusIcon className="size-4" />
                    <span>Yeni Teklif Hazırla</span>
                  </Button>
                </div>

                {/* Yeni Teklif Formu */}
                {showNewQuote && (
                  <Card className="border border-purple-200 bg-purple-50/20 p-4 dark:border-purple-800">
                    <h4 className="mb-3 text-xs font-bold text-purple-700 dark:text-purple-300">
                      Yeni Araç Fiyat Teklifi
                    </h4>
                    <form onSubmit={handleCreateQuote} className="space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <Select
                          label="Araç *"
                          value={quoteVehicleId}
                          onChange={(e) => {
                            setQuoteVehicleId(e.target.value);
                            const found = stockVehicles.find((v) => v.id === e.target.value);
                            if (found?.saleAmount) {
                              setQuoteVehiclePrice(String(found.saleAmount));
                              setQuoteOfferedPrice(String(found.saleAmount));
                            }
                          }}
                          required
                          data={stockVehicles.map((v) => ({
                            value: v.id,
                            label: `${v.plate} - ${v.brandName} ${v.modelName}`,
                          }))}
                        />
                        <Input
                          label="Liste Fiyatı (TL)"
                          type="number"
                          value={quoteVehiclePrice}
                          onChange={(e) => setQuoteVehiclePrice(e.target.value)}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <Input
                          label="Teklif Edilen Fiyat (TL) *"
                          type="number"
                          value={quoteOfferedPrice}
                          onChange={(e) => setQuoteOfferedPrice(e.target.value)}
                          required
                        />
                        <Select
                          label="Ödeme Türü"
                          value={quotePaymentType}
                          onChange={(e) => setQuotePaymentType(e.target.value)}
                          data={[
                            { value: "Nakit", label: "Nakit" },
                            { value: "Banka Kredisi", label: "Banka Kredisi" },
                            { value: "Takas + Nakit", label: "Takas + Nakit" },
                            { value: "Kısmi Senet / Vadeli", label: "Kısmi Senet / Vadeli" },
                          ]}
                        />
                        <Input
                          label="Geçerlilik Tarihi"
                          type="date"
                          value={quoteValidUntil}
                          onChange={(e) => setQuoteValidUntil(e.target.value)}
                        />
                      </div>

                      <Textarea
                        label="Özel Şartlar & Takas Notu"
                        placeholder="Örn: 3 gün geçerlidir, 2018 Megane takası görüşülecek..."
                        rows={2}
                        value={quoteTerms}
                        onChange={(e) => setQuoteTerms(e.target.value)}
                      />

                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          type="button"
                          variant="outlined"
                          onClick={() => setShowNewQuote(false)}
                        >
                          İptal
                        </Button>
                        <Button type="submit" color="primary" disabled={isSavingQuote}>
                          {isSavingQuote ? <Spinner className="size-4" /> : "Teklifi Kaydet"}
                        </Button>
                      </div>
                    </form>
                  </Card>
                )}

                {/* Claude AI Teklif Mesajı Çıktısı */}
                {aiMessage && (
                  <Card className="border border-emerald-300 bg-emerald-50/30 p-4 dark:border-emerald-800 dark:bg-emerald-950/20">
                    <div className="flex items-center justify-between border-b border-emerald-200 pb-2 dark:border-emerald-800">
                      <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 dark:text-emerald-200">
                        <SparklesIcon className="size-4 text-emerald-600" />
                        <span>Claude Haiku ile Hazırlanan WhatsApp Teklif Mesajı</span>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outlined"
                          onClick={() => {
                            navigator.clipboard.writeText(aiMessage);
                            toast.success("Mesaj panoya kopyalandı!");
                          }}
                          className="gap-1"
                        >
                          <ClipboardDocumentCheckIcon className="size-3.5" />
                          <span>Kopyala</span>
                        </Button>
                        {lead.phone && (
                          <a
                            href={`https://wa.me/${lead.phone.replace(/\D/g, "")}?text=${encodeURIComponent(aiMessage)}`}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                          >
                            <span>WhatsApp ile Gönder</span>
                            <ArrowTopRightOnSquareIcon className="size-3.5" />
                          </a>
                        )}
                      </div>
                    </div>
                    <pre className="mt-3 whitespace-pre-wrap font-sans text-xs text-gray-800 dark:text-dark-100">
                      {aiMessage}
                    </pre>
                  </Card>
                )}

                {/* Teklif Listesi */}
                {(!lead.quotes || lead.quotes.length === 0) ? (
                  <p className="py-10 text-center text-xs text-gray-400">
                    Aday için henüz teklif hazırlanmamış.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {lead.quotes.map((q) => {
                      const cfg = QUOTE_STATUS_CONFIG[q.status];

                      return (
                        <div
                          key={q.id}
                          className="rounded-xl border border-gray-150 bg-white p-4 dark:border-dark-600 dark:bg-dark-800"
                        >
                          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-purple-700 dark:text-purple-400">
                                  {q.quoteNumber}
                                </span>
                                <span className="font-mono text-xs font-bold text-gray-900 dark:text-dark-50">
                                  {q.vehicle?.plate}
                                </span>
                                <span className="text-xs text-gray-600 dark:text-dark-300">
                                  ({q.vehicle?.brandName} {q.vehicle?.modelName})
                                </span>
                                {cfg && (
                                  <Tag color={cfg.color} className="text-tiny">
                                    {cfg.label}
                                  </Tag>
                                )}
                              </div>
                              <p className="mt-1 text-tiny text-gray-500 dark:text-dark-400">
                                Hazırlanma: {new Date(q.createdAt).toLocaleDateString("tr-TR")} •
                                Ödeme: {q.paymentType || "Nakit"}
                                {q.validUntil
                                  ? ` • Geçerlilik: ${new Date(q.validUntil).toLocaleDateString("tr-TR")}`
                                  : ""}
                              </p>
                            </div>

                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <div className="text-sm font-bold text-gray-900 dark:text-dark-50">
                                  {Number(q.offeredPrice).toLocaleString("tr-TR")} TL
                                </div>
                                {Number(q.vehiclePrice) > Number(q.offeredPrice) && (
                                  <div className="text-tiny text-gray-400 line-through">
                                    {Number(q.vehiclePrice).toLocaleString("tr-TR")} TL
                                  </div>
                                )}
                              </div>

                              {/* Claude AI Teklif Mesajı Butonu */}
                              <Button
                                color="secondary"
                                variant="outlined"
                                className="gap-1.5 whitespace-nowrap"
                                disabled={aiLoading}
                                onClick={() => handleGenerateAiMessage(q.vehicleId, q.id)}
                              >
                                {aiLoading ? (
                                  <Spinner className="size-3.5" />
                                ) : (
                                  <SparklesIcon className="size-3.5 text-secondary-500" />
                                )}
                                <span>Claude Mesajı</span>
                              </Button>

                              <Select
                                value={q.status}
                                onChange={async (e) => {
                                  try {
                                    await updateQuote(q.id, {
                                      status: e.target.value as QuoteStatus,
                                    });
                                    toast.success("Teklif durumu güncellendi.");
                                    loadData();
                                  } catch {
                                    toast.error("Hata oluştu.");
                                  }
                                }}
                                className="w-28 text-tiny"
                                data={Object.entries(QUOTE_STATUS_CONFIG).map(([k, v]) => ({
                                  value: k,
                                  label: v.label,
                                }))}
                              />
                            </div>
                          </div>

                          {q.terms && (
                            <p className="mt-2 text-tiny italic text-gray-600 dark:text-dark-300">
                              Şartlar: {q.terms}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* 4. ZAMAN TÜNELİ & GÖRÜŞME NOTLARI */}
            {activeTab === "timeline" && (
              <div className="space-y-4">
                {/* Yeni Not Ekle */}
                <form
                  onSubmit={handleAddNote}
                  className="rounded-xl border border-gray-150 bg-gray-50/50 p-4 dark:border-dark-600 dark:bg-dark-750"
                >
                  <div className="flex gap-2">
                    <Select
                      className="w-36 text-xs"
                      value={newNoteType}
                      onChange={(e) => setNewNoteType(e.target.value)}
                      data={[
                        { value: "NOTE", label: "Not" },
                        { value: "CALL", label: "Telefon Görüşmesi" },
                        { value: "MEETING", label: "Yüz Yüze Görüşme" },
                      ]}
                    />
                    <Input
                      className="flex-1"
                      placeholder="Görüşme konusu / başlık..."
                      value={newNoteTitle}
                      onChange={(e) => setNewNoteTitle(e.target.value)}
                      required
                    />
                  </div>
                  <Textarea
                    className="mt-2"
                    rows={2}
                    placeholder="Görüşme detayları ve alınan aksiyonlar..."
                    value={newNoteContent}
                    onChange={(e) => setNewNoteContent(e.target.value)}
                  />
                  <div className="mt-2 flex justify-end">
                    <Button type="submit" color="primary" disabled={isSavingNote}>
                      {isSavingNote ? <Spinner className="size-4" /> : "Kayıt Ekle"}
                    </Button>
                  </div>
                </form>

                {/* Timeline Akışı */}
                {(!lead.activities || lead.activities.length === 0) ? (
                  <p className="py-10 text-center text-xs text-gray-400">Kayıtlı işlem bulunmuyor.</p>
                ) : (
                  <div className="relative space-y-4 pl-6 before:absolute before:bottom-0 before:left-2.5 before:top-2 before:w-0.5 before:bg-gray-200 dark:before:bg-dark-600">
                    {lead.activities.map((act) => (
                      <div key={act.id} className="relative">
                        <div className="absolute -left-6 top-1.5 size-3 rounded-full border-2 border-white bg-primary-500 shadow-xs dark:border-dark-800" />
                        <div className="rounded-xl border border-gray-100 bg-white p-3 shadow-xs dark:border-dark-700 dark:bg-dark-800">
                          <div className="flex items-center justify-between text-xs">
                            <span className="font-semibold text-gray-900 dark:text-dark-50">
                              {act.title}
                            </span>
                            <span className="text-tiny text-gray-400">
                              {new Date(act.createdAt).toLocaleString("tr-TR")}
                            </span>
                          </div>
                          {act.content && (
                            <p className="mt-1 text-xs text-gray-600 dark:text-dark-300">
                              {act.content}
                            </p>
                          )}
                          {act.userName && (
                            <p className="mt-1 text-tiny text-gray-400">İşlem: {act.userName}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* MÜŞTERİYE (CARİ) DÖNÜŞTÜR MODALI */}
      {showConvertModal && (
        <Modal
          open={showConvertModal}
          onClose={() => setShowConvertModal(false)}
          title="Potansiyel Alıcıyı Cari Müşteriye Dönüştür"
          className="max-w-lg"
        >
          <form onSubmit={handleConvert} className="space-y-4 pt-2">
            <p className="text-xs text-gray-600 dark:text-dark-300">
              Bu işlem <strong>{lead?.fullName}</strong> için Cariler listesinde yeni bir resmi müşteri kaydı oluşturacak ve adayı &quot;Kazanıldı&quot; olarak işaretleyecektir.
            </p>

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Cari Türü"
                value={convEntityType}
                onChange={(e) => setConvEntityType(e.target.value as any)}
                data={[
                  { value: "INDIVIDUAL", label: "Şahıs (Bireysel)" },
                  { value: "CORPORATE", label: "Tüzel (Kurumsal Firma)" },
                ]}
              />
              <Input
                label="Şehir"
                placeholder="Örn: İstanbul"
                value={convCity}
                onChange={(e) => setConvCity(e.target.value)}
              />
            </div>

            {convEntityType === "CORPORATE" ? (
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Vergi Dairesi"
                  placeholder="Kadıköy VD"
                  value={convTaxOffice}
                  onChange={(e) => setConvTaxOffice(e.target.value)}
                />
                <Input
                  label="Vergi Kimlik No (VKN)"
                  placeholder="10 Haneli VKN"
                  value={convTaxNumber}
                  onChange={(e) => setConvTaxNumber(e.target.value)}
                />
              </div>
            ) : (
              <Input
                label="T.C. Kimlik No (Opsiyonel)"
                placeholder="11 Haneli TCKN"
                value={convTckn}
                onChange={(e) => setConvTckn(e.target.value)}
              />
            )}

            <Textarea
              label="Fatura & İletişim Adresi"
              placeholder="Açık adres..."
              rows={2}
              value={convAddress}
              onChange={(e) => setConvAddress(e.target.value)}
            />

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outlined"
                onClick={() => setShowConvertModal(false)}
                disabled={isConverting}
              >
                Vazgeç
              </Button>
              <Button type="submit" color="success" disabled={isConverting}>
                {isConverting ? <Spinner className="size-4" /> : "Müşteri Olarak Kaydet"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Modal>
  );
}
