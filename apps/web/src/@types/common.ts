// Tema bildirim tipleri (Notifications bileşeni kullanır)
export type NotificationType = "message" | "task" | "log" | "security";

// API sayfalı liste yanıtı (tüm liste servisleri bunu döner)
export interface Paginated<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}
