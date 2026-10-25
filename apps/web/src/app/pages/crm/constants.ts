import {
  LeadSource,
  LeadStatus,
  QuoteStatus,
  TestDriveStatus,
} from "@/services/crmService";

export const LEAD_STATUS_CONFIG: Record<
  LeadStatus,
  {
    label: string;
    color: "primary" | "secondary" | "success" | "warning" | "error" | "info" | "neutral";
    description: string;
  }
> = {
  NEW: {
    label: "Yeni Potansiyel",
    color: "primary",
    description: "Sisteme yeni girmiş potansiyel alıcı",
  },
  CONTACTED: {
    label: "İletişime Geçildi",
    color: "info",
    description: "İlk görüşme / telefon görüşmesi yapıldı",
  },
  TEST_DRIVE: {
    label: "Deneme Sürüşü",
    color: "warning",
    description: "Test sürüşü planlandı veya yapıldı",
  },
  QUOTE_SENT: {
    label: "Teklif Verildi",
    color: "secondary",
    description: "Araç fiyat teklifi paylaşıldı",
  },
  NEGOTIATION: {
    label: "Pazarlık / Karar",
    color: "warning",
    description: "Fiyat veya takas müzakeresi sürüyor",
  },
  CONVERTED: {
    label: "Kazanıldı (Cari Müşteri)",
    color: "success",
    description: "Resmi müşteriye dönüştü ve cari açıldı",
  },
  LOST: {
    label: "Kaybedildi",
    color: "error",
    description: "Alımdan vazgeçti veya başka araç aldı",
  },
};

export const LEAD_SOURCE_CONFIG: Record<
  LeadSource,
  { label: string; badgeColor: string }
> = {
  SAHIBINDEN: { label: "Sahibinden.com", badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" },
  ARABAM: { label: "Arabam.com", badgeColor: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" },
  WALK_IN: { label: "Galeri Ziyareti", badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300" },
  WEBSITE: { label: "Web Sitesi", badgeColor: "bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300" },
  REFERRAL: { label: "Referans / Tavsiye", badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300" },
  SOCIAL_MEDIA: { label: "Sosyal Medya", badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300" },
  PHONE: { label: "Telefonla Arama", badgeColor: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-300" },
  OTHER: { label: "Diğer", badgeColor: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300" },
};

export const TEST_DRIVE_STATUS_CONFIG: Record<
  TestDriveStatus,
  { label: string; color: "primary" | "success" | "error" | "neutral" }
> = {
  SCHEDULED: { label: "Planlandı", color: "primary" },
  COMPLETED: { label: "Tamamlandı", color: "success" },
  CANCELLED: { label: "İptal Edildi", color: "error" },
  NO_SHOW: { label: "Randevuya Gelmedi", color: "neutral" },
};

export const QUOTE_STATUS_CONFIG: Record<
  QuoteStatus,
  { label: string; color: "primary" | "success" | "error" | "neutral" | "warning" }
> = {
  DRAFT: { label: "Taslak", color: "neutral" },
  SENT: { label: "Gönderildi", color: "primary" },
  ACCEPTED: { label: "Kabul Edildi", color: "success" },
  REJECTED: { label: "Reddedildi", color: "error" },
  EXPIRED: { label: "Süresi Doldu", color: "warning" },
};

export const KANBAN_STAGES: LeadStatus[] = [
  "NEW",
  "CONTACTED",
  "TEST_DRIVE",
  "QUOTE_SENT",
  "NEGOTIATION",
  "CONVERTED",
];
