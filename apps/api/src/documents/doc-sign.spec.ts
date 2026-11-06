import { signDocId, verifyDocSig } from "./doc-sign";

describe("doc-sign (public evrak imzası)", () => {
  it("ürettiği imza kendi id'si için doğrulanır", () => {
    const sig = signDocId("abc123");
    expect(verifyDocSig("abc123", sig)).toBe(true);
  });
  it("imzasız / yanlış imza reddedilir (enumerasyon engeli)", () => {
    expect(verifyDocSig("abc123", undefined)).toBe(false);
    expect(verifyDocSig("abc123", "yanlis")).toBe(false);
    // Başka id'nin imzası bu id için geçersiz
    expect(verifyDocSig("abc123", signDocId("baska"))).toBe(false);
  });
});
