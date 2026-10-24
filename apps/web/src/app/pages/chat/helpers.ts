import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";
import "dayjs/locale/tr";
import type { ChatMessage } from "@/@types/chat";

dayjs.extend(relativeTime);
dayjs.locale("tr");

const WEEKDAYS = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"];

/**
 * Sohbet listesi zaman etiketi: bugün HH:mm, son 7 gün içinde gün adı, aksi halde DD.MM
 */
export function formatChatTime(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return d.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" });
  const diffDays = (now.getTime() - d.getTime()) / 86400000;
  if (diffDays < 7 && diffDays >= 0) return WEEKDAYS[d.getDay()];
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/** Mesaj balonu altındaki göreli zaman ("3 dakika önce") */
export function relativeTimeTr(iso: string): string {
  return dayjs(iso).fromNow();
}

export interface MessageGroup {
  senderId: string;
  mine: boolean;
  messages: ChatMessage[];
}

/** Ardışık aynı gönderici mesajlarını tek balon grubunda toplar (en fazla 5 dk aralık). */
export function groupMessages(messages: ChatMessage[], meId: string, gapMs = 5 * 60 * 1000): MessageGroup[] {
  const groups: MessageGroup[] = [];
  for (const m of messages) {
    const last = groups[groups.length - 1];
    const prev = last?.messages[last.messages.length - 1];
    if (
      last &&
      last.senderId === m.senderId &&
      prev &&
      new Date(m.createdAt).getTime() - new Date(prev.createdAt).getTime() <= gapMs
    ) {
      last.messages.push(m);
    } else {
      groups.push({ senderId: m.senderId, mine: m.senderId === meId, messages: [m] });
    }
  }
  return groups;
}

/** Metni URL'leri bağlantıya çevirerek parçalara ayırır (React'te map'lenir). */
export function linkify(text: string): Array<{ type: "text" | "link"; value: string }> {
  const re = /(https?:\/\/[^\s]+)/g;
  const out: Array<{ type: "text" | "link"; value: string }> = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const idx = m.index ?? 0;
    if (idx > last) out.push({ type: "text", value: text.slice(last, idx) });
    out.push({ type: "link", value: m[0] });
    last = idx + m[0].length;
  }
  if (last < text.length) out.push({ type: "text", value: text.slice(last) });
  return out;
}

/** Tarih ayracı etiketi (Bugün / Dün / 12 Mart 2026) */
export function dayLabel(iso: string, now: Date = new Date()): string {
  const d = new Date(iso);
  if (d.toDateString() === now.toDateString()) return "Bugün";
  const y = new Date(now);
  y.setDate(now.getDate() - 1);
  if (d.toDateString() === y.toDateString()) return "Dün";
  return d.toLocaleDateString("tr-TR", { day: "numeric", month: "long", year: "numeric" });
}
