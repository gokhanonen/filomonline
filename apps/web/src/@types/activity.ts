export interface ActivityLog {
  id: string;
  companyId: string;
  type: string;
  title: string;
  description: string;
  entityType: string;
  entityId: string;
  userId: string;
  userName?: string | null;
  link?: string | null;
  read: boolean;
  createdAt: string;
}

/** Aktivite tipi -> ikon rengi / etiket */
export const ACTIVITY_META: Record<string, { label: string; color: string }> = {
  VEHICLE_NEW: { label: "Yeni Araç", color: "bg-primary-500" },
  VEHICLE_UPDATE: { label: "Araç Güncellendi", color: "bg-gray-500" },
  VEHICLE_PURCHASE: { label: "Araç Alışı", color: "bg-info" },
  VEHICLE_SALE: { label: "Araç Satışı", color: "bg-success" },
  VEHICLE_SALE_CANCEL: { label: "Satış İptali", color: "bg-error" },
  VEHICLE_OPTION: { label: "Opsiyon", color: "bg-amber-500" },
  VEHICLE_OPTION_CANCEL: { label: "Opsiyon İptali", color: "bg-amber-700" },
  RENTAL_NEW: { label: "Yeni Kiralama", color: "bg-warning" },
  RENTAL_UPDATE: { label: "Kiralama Güncellendi", color: "bg-warning" },
  EXPENSE_NEW: { label: "Masraf", color: "bg-orange-500" },
  TRANSFER_REQUEST: { label: "Transfer Talebi", color: "bg-secondary" },
  TRANSFER_CONFIRM: { label: "Transfer Onayı", color: "bg-success" },
  TRANSFER_CANCEL: { label: "Transfer İptali", color: "bg-error" },
  CONTRACT_NEW: { label: "Sözleşme", color: "bg-indigo-500" },
  DOCUMENT_NEW: { label: "Evrak", color: "bg-sky-500" },
  INVOICE_STATUS: { label: "Fatura Durumu", color: "bg-teal-500" },
  ACCOUNT_NEW: { label: "Yeni Cari", color: "bg-pink-500" },
  USER_NEW: { label: "Yeni Kullanıcı", color: "bg-violet-500" },
  CHAT_MESSAGE: { label: "Mesaj", color: "bg-green-500" },
  SYSTEM: { label: "Sistem", color: "bg-gray-400" },
};
