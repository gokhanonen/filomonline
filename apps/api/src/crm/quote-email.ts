/** Teklif linki e-postası: e-posta istemcileri için tablo tabanlı, satır içi stilli HTML + düz metin */

export interface QuoteEmailInput {
  customerName: string;
  quoteNumber: string;
  vehicleTitle: string;
  plate: string | null;
  offeredPrice: number;
  options: { label: string; price: number; downPayment: number | null; installmentCount: number | null; monthlyPayment: number | null }[];
  validUntil: Date | null;
  link: string;
  company: { name: string; phone: string | null; email: string | null; address: string | null };
  senderName: string | null;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const tl = (n: number) => `${n.toLocaleString("tr-TR", { maximumFractionDigits: 0 })} ₺`;
const day = (d: Date) => d.toLocaleDateString("tr-TR", { day: "2-digit", month: "2-digit", year: "numeric" });

function optionLine(o: QuoteEmailInput["options"][number]) {
  const parts = [tl(o.price)];
  if (o.downPayment) parts.push(`${tl(o.downPayment)} peşinat`);
  if (o.installmentCount && o.monthlyPayment) parts.push(`${o.installmentCount} × ${tl(o.monthlyPayment)}`);
  return parts.join(" · ");
}

export function quoteEmail(i: QuoteEmailInput) {
  const firstName = i.customerName.trim().split(/\s+/)[0] ?? "";
  const until = i.validUntil ? day(i.validUntil) : null;
  const subject = `${i.vehicleTitle} için size özel teklif (${i.quoteNumber})`;
  const contact = [i.company.phone, i.company.email].filter(Boolean).join(" · ");

  const text = [
    `Merhaba ${firstName},`,
    "",
    `${i.vehicleTitle} için size özel hazırladığımız teklifi aşağıdaki bağlantıdan inceleyebilirsiniz:`,
    i.link,
    "",
    `Teklif tutarı: ${tl(i.offeredPrice)}`,
    ...i.options.map((o) => `- ${o.label}: ${optionLine(o)}`),
    ...(until ? ["", `Teklif ${until} tarihine kadar geçerlidir.`] : []),
    "",
    i.senderName ? `${i.senderName} — ${i.company.name}` : i.company.name,
    contact,
  ].join("\n");

  const optionRows = i.options
    .map(
      (o) => `<tr>
        <td style="padding:8px 0;border-top:1px solid #eef0f3;color:#4b5563;font-size:14px">${esc(o.label)}</td>
        <td style="padding:8px 0;border-top:1px solid #eef0f3;color:#111827;font-size:14px;text-align:right;font-weight:600">${esc(optionLine(o))}</td>
      </tr>`,
    )
    .join("");

  const html = `<!doctype html><html lang="tr"><body style="margin:0;padding:0;background:#f3f4f6">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:24px 12px;font-family:Arial,Helvetica,sans-serif">
  <tr><td align="center">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:12px;overflow:hidden">
      <tr><td style="background:#111827;color:#ffffff;padding:18px 24px;font-size:18px;font-weight:700">${esc(i.company.name)}</td></tr>
      <tr><td style="padding:24px">
        <p style="margin:0 0 12px;font-size:15px;color:#111827">Merhaba ${esc(firstName)},</p>
        <p style="margin:0 0 20px;font-size:15px;color:#374151;line-height:1.5">
          <b>${esc(i.vehicleTitle)}</b>${i.plate ? ` (${esc(i.plate)})` : ""} için size özel hazırladığımız teklif hazır.
        </p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border-radius:10px;padding:14px 16px">
          <tr>
            <td style="font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:.04em">Teklif ${esc(i.quoteNumber)}</td>
            <td style="font-size:20px;color:#111827;font-weight:700;text-align:right">${esc(tl(i.offeredPrice))}</td>
          </tr>
          ${optionRows}
        </table>
        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:24px auto 8px">
          <tr><td style="background:#2563eb;border-radius:8px">
            <a href="${esc(i.link)}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none">Teklifi İncele</a>
          </td></tr>
        </table>
        ${until ? `<p style="margin:12px 0 0;text-align:center;font-size:13px;color:#6b7280">Teklif ${esc(until)} tarihine kadar geçerlidir.</p>` : ""}
        <p style="margin:20px 0 0;font-size:12px;color:#9ca3af;line-height:1.5;word-break:break-all">Buton çalışmazsa bu bağlantıyı tarayıcınıza yapıştırın:<br>${esc(i.link)}</p>
      </td></tr>
      <tr><td style="padding:16px 24px;border-top:1px solid #eef0f3;font-size:13px;color:#6b7280;line-height:1.5">
        ${i.senderName ? `${esc(i.senderName)}<br>` : ""}<b style="color:#374151">${esc(i.company.name)}</b>
        ${contact ? `<br>${esc(contact)}` : ""}${i.company.address ? `<br>${esc(i.company.address)}` : ""}
      </td></tr>
    </table>
  </td></tr>
</table></body></html>`;

  return { subject, html, text };
}
