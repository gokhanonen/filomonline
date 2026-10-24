import { isMasked, maskSecrets, maskValue, mergeSecrets } from "./secrets";

describe("settings secret masking", () => {
  it("maskValue son 4 karakteri bırakır", () => {
    expect(maskValue("AIzaSyABCDEF1234")).toBe("••••1234");
    expect(maskValue("")).toBe("");
  });

  it("maskSecrets iç içe gizli anahtarları maskeler, diğerlerine dokunmaz", () => {
    const out = maskSecrets({
      apiKey: "AIzaSyABCDEF1234",
      model: "gemini-2.0-flash",
      smtp: { password: "p@ssw0rd!", host: "smtp.x.com", port: 587 },
      list: [{ token: "abcdefgh" }],
    });
    expect(out).toEqual({
      apiKey: "••••1234",
      model: "gemini-2.0-flash",
      smtp: { password: "••••0rd!", host: "smtp.x.com", port: 587 },
      list: [{ token: "••••efgh" }],
    });
    expect(isMasked(out.apiKey)).toBe(true);
  });

  it("mergeSecrets maskeli değer geldiğinde DB'deki gerçek değeri korur", () => {
    const existing = { apiKey: "AIzaSyABCDEF1234", smtp: { password: "real", host: "a" } };
    const incoming = { apiKey: "••••1234", model: "x", smtp: { password: "••••real", host: "b" } };
    expect(mergeSecrets(incoming, existing)).toEqual({
      apiKey: "AIzaSyABCDEF1234",
      model: "x",
      smtp: { password: "real", host: "b" },
    });
  });

  it("mergeSecrets yeni gerçek değer geldiğinde üzerine yazar; mevcut yoksa boş bırakır", () => {
    expect(mergeSecrets({ apiKey: "NEWKEY" }, { apiKey: "OLD" })).toEqual({ apiKey: "NEWKEY" });
    expect(mergeSecrets({ apiKey: "••••1234" }, null)).toEqual({ apiKey: "" });
  });
});
