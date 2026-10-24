import { describe, expect, it } from "vitest";
import { dayLabel, formatChatTime, groupMessages, linkify } from "./helpers";
import type { ChatMessage } from "@/@types/chat";

const now = new Date("2026-10-23T15:30:00");

describe("formatChatTime", () => {
  it("bugün için saat döner", () => {
    expect(formatChatTime("2026-10-23T09:05:00", now)).toBe("09:05");
  });
  it("son 7 gün içinde gün adı döner", () => {
    expect(formatChatTime("2026-10-21T09:05:00", now)).toBe("Çarşamba");
  });
  it("daha eski için GG.AA döner", () => {
    expect(formatChatTime("2026-09-02T09:05:00", now)).toBe("02.09");
  });
});

describe("dayLabel", () => {
  it("Bugün / Dün / tarih", () => {
    expect(dayLabel("2026-10-23T01:00:00", now)).toBe("Bugün");
    expect(dayLabel("2026-10-22T23:00:00", now)).toBe("Dün");
    expect(dayLabel("2026-03-12T10:00:00", now)).toBe("12 Mart 2026");
  });
});

describe("groupMessages", () => {
  const msg = (id: string, senderId: string, t: string): ChatMessage => ({
    id, senderId, conversationId: "c", content: id, createdAt: t,
  });
  it("ardışık aynı göndericiyi gruplar, 5 dk üstünü böler", () => {
    const g = groupMessages(
      [
        msg("1", "a", "2026-10-23T10:00:00"),
        msg("2", "a", "2026-10-23T10:02:00"),
        msg("3", "b", "2026-10-23T10:03:00"),
        msg("4", "a", "2026-10-23T10:04:00"),
        msg("5", "a", "2026-10-23T10:20:00"),
      ],
      "a",
    );
    expect(g.map((x) => x.messages.length)).toEqual([2, 1, 1, 1]);
    expect(g[0].mine).toBe(true);
    expect(g[1].mine).toBe(false);
  });
});

describe("linkify", () => {
  it("URL'leri link parçası olarak ayırır", () => {
    const parts = linkify("bak: https://filom.online/vehicles/1 ve devam");
    expect(parts).toEqual([
      { type: "text", value: "bak: " },
      { type: "link", value: "https://filom.online/vehicles/1" },
      { type: "text", value: " ve devam" },
    ]);
  });
  it("link yoksa tek metin parçası", () => {
    expect(linkify("merhaba")).toEqual([{ type: "text", value: "merhaba" }]);
  });
});
