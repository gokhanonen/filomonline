import { normalizeDomain } from "./catalog.service";

describe("normalizeDomain", () => {
  it("protokol, www ve yolu atar", () => {
    expect(normalizeDomain("https://www.sahibinden.com/ilan/123")).toBe("sahibinden.com");
  });
  it("sade alan adını olduğu gibi döner", () => {
    expect(normalizeDomain("arabam.com")).toBe("arabam.com");
  });
  it("boş/undefined için null döner", () => {
    expect(normalizeDomain("")).toBeNull();
    expect(normalizeDomain(undefined)).toBeNull();
    expect(normalizeDomain("   ")).toBeNull();
  });
  it("büyük harfleri küçültür", () => {
    expect(normalizeDomain("HTTP://DOD.COM.TR/x")).toBe("dod.com.tr");
  });
});
