import { quoteEmail } from "./quote-email";

const base = {
  customerName: "Ayşe Yılmaz",
  quoteNumber: "TKL-2026-0013",
  vehicleTitle: "BYD Atto 3 2024",
  plate: "34 BYD 03",
  offeredPrice: 1680000,
  options: [{ label: "Peşin", price: 1680000, downPayment: null, installmentCount: null, monthlyPayment: null }],
  validUntil: new Date("2026-11-02"),
  link: "https://app.example.com/q/abc",
  company: { name: "Demo Otomotiv", phone: "0212 000 00 00", email: null, address: null },
  senderName: "Gökhan",
};

describe("quoteEmail", () => {
  it("konu, link, tutar ve geçerlilik tarihini içerir", () => {
    const m = quoteEmail(base);
    expect(m.subject).toBe("BYD Atto 3 2024 için size özel teklif (TKL-2026-0013)");
    expect(m.html).toContain('href="https://app.example.com/q/abc"');
    expect(m.text).toContain("Merhaba Ayşe,");
    expect(m.text).toContain("1.680.000 ₺");
    expect(m.text).toContain("02.11.2026");
  });

  it("kullanıcı girdisini HTML'de kaçışlar", () => {
    const m = quoteEmail({ ...base, customerName: "<script>x</script>", company: { ...base.company, name: 'A&B "Oto"' } });
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain("A&amp;B &quot;Oto&quot;");
  });
});
