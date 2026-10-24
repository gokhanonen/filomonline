const TR_MAP: Record<string, string> = {
  ğ: "g", ü: "u", ş: "s", ı: "i", ö: "o", ç: "c",
  Ğ: "g", Ü: "u", Ş: "s", İ: "i", Ö: "o", Ç: "c",
};

export function slugify(input: string): string {
  return input
    .split("")
    .map((ch) => TR_MAP[ch] ?? ch)
    .join("")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
