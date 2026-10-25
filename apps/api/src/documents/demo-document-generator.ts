/**
 * Demo Araç Evrakları Üreticisi (Ruhsat, Kasko, Muayene, Trafik Sigortası, Ekspertiz, Noter Senedi)
 * Sunumlarda ve demoda tam kurumsal ve gerçekçi evrak şablonları üretir.
 */

export interface DemoVehicleDocContext {
  plate: string;
  brandName: string;
  modelName: string;
  year: number;
  colorName?: string;
  fuelType?: string;
  transmission?: string;
  chassisNo?: string;
  engineNo?: string;
  km?: number;
  engineVolume?: number;
  horsePower?: number;
  companyName: string;
  purchaseDate?: Date | string;
  purchasePrice?: number;
  docType: "ruhsat" | "kasko" | "trafik_sigortasi" | "muayene" | "ekspertiz" | "noter_alis";
  documentNo?: string;
  expiryDate?: Date | string;
}

export function generateDocSvgThumbnail(ctx: DemoVehicleDocContext): string {
  const p = ctx.plate || "34 PLK 01";
  const bm = `${ctx.brandName || ""} ${ctx.modelName || ""}`.trim();
  const yr = ctx.year || 2023;

  let headerBg = "#1e3a8a";
  let title = "ARAÇ TESCİL BELGESİ";
  let subtitle = "T.C. İÇİŞLERİ BAKANLIĞI";
  let badgeText = "RESMİ RUHSAT";
  let badgeColor = "#2563eb";
  let iconEmoji = "📄";
  let statusBadge = "ONAYLI";
  let statusColor = "#16a34a";

  switch (ctx.docType) {
    case "ruhsat":
      headerBg = "#065f46";
      title = "MOTORLU ARAÇ TESCİL BELGESİ";
      subtitle = "T.C. EMNİYET GENEL MÜDÜRLÜĞÜ";
      badgeText = "RUHSAT (ASIL)";
      badgeColor = "#059669";
      iconEmoji = "🪪";
      statusBadge = "GEÇERLİ";
      statusColor = "#10b981";
      break;
    case "kasko":
      headerBg = "#1e1b4b";
      title = "GENİŞLETİLMİŞ KASKO POLİÇESİ";
      subtitle = "ANADOLU SİGORTA A.Ş.";
      badgeText = "TAM TEMİNAT";
      badgeColor = "#4f46e5";
      iconEmoji = "🛡️";
      statusBadge = "AKTİF POLİÇE";
      statusColor = "#22c55e";
      break;
    case "trafik_sigortasi":
      headerBg = "#7c2d12";
      title = "ZORUNLU TRAFİK SİGORTASI";
      subtitle = "TÜRKİYE SİGORTA A.Ş.";
      badgeText = "KARAYOLLARI ZMM";
      badgeColor = "#c2410c";
      iconEmoji = "🚦";
      statusBadge = "YÜRÜRLÜKTE";
      statusColor = "#16a34a";
      break;
    case "muayene":
      headerBg = "#1f2937";
      title = "ARAÇ PERİYODİK MUAYENE RAPORU";
      subtitle = "TÜVTÜRK ARAÇ MUAYENE İSTASYONLARI";
      badgeText = "TÜVTÜRK RAPORU";
      badgeColor = "#374151";
      iconEmoji = "🔍";
      statusBadge = "KUSURSUZ (GEÇTİ)";
      statusColor = "#15803d";
      break;
    case "ekspertiz":
      headerBg = "#0f172a";
      title = "TSE ONAYLI EKSPERTİZ RAPORU";
      subtitle = "PİLOT GARAGE KURUMSAL OTO EKSPERTİZ";
      badgeText = "%94 MOTOR PERFORMANS";
      badgeColor = "#0284c7";
      iconEmoji = "📊";
      statusBadge = "ORİJİNAL / HATASIZ";
      statusColor = "#059669";
      break;
    case "noter_alis":
      headerBg = "#831843";
      title = "NOTERLİK ARAÇ SATIŞ SÖZLEŞMESİ";
      subtitle = "TÜRKİYE NOTERLER BİRLİĞİ";
      badgeText = "RESMİ SENET";
      badgeColor = "#be185d";
      iconEmoji = "⚖️";
      statusBadge = "DEVİR TAMAMLANDI";
      statusColor = "#059669";
      break;
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
    <defs>
      <linearGradient id="headerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${headerBg}" />
        <stop offset="100%" stop-color="#111827" />
      </linearGradient>
      <filter id="shadow" x="-5%" y="-5%" width="110%" height="110%">
        <feDropShadow dx="0" dy="2" stdDeviation="3" flood-opacity="0.15" />
      </filter>
    </defs>

    <!-- Arka plan -->
    <rect width="400" height="300" fill="#f8fafc" rx="12" />
    <rect x="1" y="1" width="398" height="298" fill="none" stroke="#e2e8f0" stroke-width="2" rx="11" />

    <!-- Başlık Bandı -->
    <path d="M 0 12 Q 0 0 12 0 L 388 0 Q 400 0 400 12 L 400 68 L 0 68 Z" fill="url(#headerGrad)" />
    
    <text x="20" y="26" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="9" font-weight="700" fill="#93c5fd" letter-spacing="1">${subtitle}</text>
    <text x="20" y="48" font-family="-apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif" font-size="13" font-weight="800" fill="#ffffff">${title}</text>
    
    <!-- İkon & Etiket -->
    <rect x="300" y="18" width="82" height="22" rx="11" fill="rgba(255,255,255,0.2)" />
    <text x="341" y="33" font-family="-apple-system, BlinkMacSystemFont, sans-serif" font-size="10" font-weight="700" fill="#ffffff" text-anchor="middle">${badgeText}</text>

    <!-- Plaka Kartuşu -->
    <g transform="translate(20, 82)">
      <!-- TR Plaka formatı -->
      <rect width="170" height="42" rx="6" fill="#ffffff" stroke="#1e293b" stroke-width="2.5" />
      <rect width="28" height="42" rx="5" fill="#1d4ed8" />
      <text x="14" y="24" font-family="sans-serif" font-size="10" font-weight="900" fill="#ffffff" text-anchor="middle">TR</text>
      <text x="100" y="29" font-family="-apple-system, BlinkMacSystemFont, Roboto, sans-serif" font-size="19" font-weight="900" fill="#0f172a" text-anchor="middle" letter-spacing="1.5">${p}</text>
    </g>

    <!-- Durum Rozeti -->
    <g transform="translate(210, 88)">
      <rect width="170" height="30" rx="6" fill="${statusColor}15" stroke="${statusColor}" stroke-width="1.5" />
      <circle cx="225" cy="15" r="5" fill="${statusColor}" />
      <text x="240" y="20" font-family="sans-serif" font-size="11" font-weight="800" fill="${statusColor}">${statusBadge}</text>
    </g>

    <!-- Araç & Belge Bilgileri Tablosu -->
    <g transform="translate(20, 142)">
      <!-- Satır 1 -->
      <rect x="0" y="0" width="360" height="28" fill="#ffffff" rx="4" />
      <text x="12" y="18" font-family="sans-serif" font-size="11" fill="#64748b" font-weight="600">Araç Modeli:</text>
      <text x="100" y="18" font-family="sans-serif" font-size="12" fill="#0f172a" font-weight="800">${bm} (${yr})</text>

      <!-- Satır 2 -->
      <rect x="0" y="32" width="360" height="28" fill="#f1f5f9" rx="4" />
      <text x="12" y="50" font-family="sans-serif" font-size="11" fill="#64748b" font-weight="600">Şasi (VIN):</text>
      <text x="100" y="50" font-family="monospace" font-size="11" fill="#0f172a" font-weight="700">${ctx.chassisNo || "WF0EXXTTRE120984"}</text>

      <!-- Satır 3 -->
      <rect x="0" y="64" width="360" height="28" fill="#ffffff" rx="4" />
      <text x="12" y="82" font-family="sans-serif" font-size="11" fill="#64748b" font-weight="600">Ruhsat Sahibi:</text>
      <text x="100" y="82" font-family="sans-serif" font-size="11" fill="#0f172a" font-weight="700">${ctx.companyName || "Demo Otomotiv A.Ş."}</text>

      <!-- Satır 4 -->
      <rect x="0" y="96" width="360" height="28" fill="#f1f5f9" rx="4" />
      <text x="12" y="114" font-family="sans-serif" font-size="11" fill="#64748b" font-weight="600">Belge / Seri No:</text>
      <text x="100" y="114" font-family="monospace" font-size="11" fill="#0f172a" font-weight="700">${ctx.documentNo || "TR-2025-99824"}</text>
    </g>

    <!-- Mühür & Barkod Efekti -->
    <g transform="translate(325, 240)">
      <circle cx="20" cy="15" r="20" fill="none" stroke="#dc2626" stroke-width="1.8" stroke-dasharray="3 2" />
      <text x="20" y="14" font-family="sans-serif" font-size="6.5" font-weight="900" fill="#dc2626" text-anchor="middle">ONAYLANDI</text>
      <text x="20" y="21" font-family="sans-serif" font-size="5" font-weight="700" fill="#dc2626" text-anchor="middle">T.C. RESMİ</text>
    </g>

    <g transform="translate(20, 276)">
      <!-- Barkod çizgileri -->
      <rect x="0" y="0" width="2" height="12" fill="#334155" />
      <rect x="4" y="0" width="3" height="12" fill="#334155" />
      <rect x="9" y="0" width="1" height="12" fill="#334155" />
      <rect x="12" y="0" width="4" height="12" fill="#334155" />
      <rect x="18" y="0" width="2" height="12" fill="#334155" />
      <rect x="22" y="0" width="1" height="12" fill="#334155" />
      <rect x="25" y="0" width="3" height="12" fill="#334155" />
      <rect x="30" y="0" width="2" height="12" fill="#334155" />
      <rect x="34" y="0" width="4" height="12" fill="#334155" />
      <rect x="40" y="0" width="1" height="12" fill="#334155" />
      <rect x="43" y="0" width="3" height="12" fill="#334155" />
      <rect x="48" y="0" width="2" height="12" fill="#334155" />
      <rect x="52" y="0" width="4" height="12" fill="#334155" />
      <text x="62" y="10" font-family="monospace" font-size="9" fill="#64748b">E-DEVLET BARKODLU BELGE</text>
    </g>
  </svg>`;
}

export function generateDocHtmlView(ctx: DemoVehicleDocContext): string {
  const p = ctx.plate || "34 PLK 01";
  const bm = `${ctx.brandName || ""} ${ctx.modelName || ""}`.trim();
  const yr = ctx.year || 2023;
  const kmStr = ctx.km != null ? `${ctx.km.toLocaleString("tr-TR")} KM` : "42.500 KM";
  const priceStr = ctx.purchasePrice != null ? `${ctx.purchasePrice.toLocaleString("tr-TR")} TL` : "1.850.000 TL";

  let title = "MOTORLU ARAÇ TESCİL BELGESİ";
  let authority = "T.C. EMNİYET GENEL MÜDÜRLÜĞÜ & İÇİŞLERİ BAKANLIĞI";
  let docCode = ctx.documentNo || `RUH-2025-${Math.floor(100000 + Math.random() * 900000)}`;

  let specificSections = "";

  if (ctx.docType === "ruhsat") {
    title = "T.C. MOTORLU ARAÇ TESCİL BELGESİ (RUHSAT)";
    authority = "T.C. İÇİŞLERİ BAKANLIĞI — EMNİYET GENEL MÜDÜRLÜĞÜ";
    specificSections = `
      <div class="section-title">YASAL TESCİL VE TEKNİK BİLGİLER</div>
      <table class="doc-table">
        <tr>
          <th>(A) Plaka No</th><td><b>${p}</b></td>
          <th>(B) İlk Tescil Tarihi</th><td>15.01.${yr}</td>
        </tr>
        <tr>
          <th>(D.1) Markası</th><td>${ctx.brandName || "BMW"}</td>
          <th>(D.2) Tipi / Modeli</th><td>${ctx.modelName || "520i"}</td>
        </tr>
        <tr>
          <th>(E) Şasi Numarası</th><td class="mono font-bold">${ctx.chassisNo || "WBA5A51080G12894"}</td>
          <th>(P.5) Motor Numarası</th><td class="mono">${ctx.engineNo || "B48B20A918274"}</td>
        </tr>
        <tr>
          <th>(P.1) Silindir Hacmi</th><td>${ctx.engineVolume ? `${ctx.engineVolume} cm³` : "1597 cm³"}</td>
          <th>(P.2) Motor Gücü</th><td>${ctx.horsePower ? `${ctx.horsePower} HP` : "170 HP"}</td>
        </tr>
        <tr>
          <th>(P.3) Yakıt Cinsi</th><td>${ctx.fuelType || "BENZİN"}</td>
          <th>(R) Rengi</th><td>${ctx.colorName || "Siyah"}</td>
        </tr>
        <tr>
          <th>(S.1) Koltuk Sayısı</th><td>5</td>
          <th>(J) Araç Sınıfı</th><td>M1 (Otomobil)</td>
        </tr>
      </table>

      <div class="section-title">ARAÇ SAHİBİ VE TESCİL BİLGİLERİ</div>
      <table class="doc-table">
        <tr>
          <th>(C.1.1) Sahibi / Unvanı</th>
          <td colspan="3"><b>${ctx.companyName || "Demo Otomotiv A.Ş."}</b></td>
        </tr>
        <tr>
          <th>Vergi / T.C. Kimlik No</th>
          <td>1234567890</td>
          <th>Tescil Sıra No</th>
          <td class="mono">${docCode}</td>
        </tr>
        <tr>
          <th>Adres</th>
          <td colspan="3">Büyükdere Cad. No: 145 Levent / Beşiktaş / İSTANBUL</td>
        </tr>
      </table>
    `;
  } else if (ctx.docType === "kasko") {
    title = "GENİŞLETİLMİŞ KASKO SİGORTA POLİÇESİ";
    authority = "ANADOLU ANONİM TÜRK SİGORTA ŞİRKETİ";
    docCode = ctx.documentNo || `KSK-2025-${Math.floor(500000 + Math.random() * 400000)}`;
    specificSections = `
      <div class="section-title">POLİÇE VE SİGORTA BİLGİLERİ</div>
      <table class="doc-table">
        <tr>
          <th>Poliçe No</th><td class="mono font-bold">${docCode}</td>
          <th>Yenileme No</th><td>01 / Acente: 34-0819</td>
        </tr>
        <tr>
          <th>Başlangıç Tarihi</th><td>10.02.2025 12:00</td>
          <th>Bitiş Tarihi</th><td><b>10.02.2026 12:00</b></td>
        </tr>
        <tr>
          <th>Sigortalı</th><td colspan="3"><b>${ctx.companyName}</b> (Vergi No: 1234567890)</td>
        </tr>
      </table>

      <div class="section-title">SİGORTA BEDELLERİ VE TEMİNAT LİSTESİ</div>
      <table class="doc-table">
        <tr>
          <th>Kasko Araç Rayiç Değeri</th>
          <td class="mono font-bold" style="color:#059669; font-size:15px;">${priceStr}</td>
          <th>Muafiyet Oranı</th>
          <td>%0 (Muafiyetsiz Tam Kapsam)</td>
        </tr>
        <tr>
          <th>İkame Araç Teminatı</th><td>30 Gün / C Sınıfı Emsal Araç</td>
          <th>Hukuksal Koruma</th><td>100.000 TL</td>
        </tr>
        <tr>
          <th>Maddi / Manevi İhtiyari Mali Mesuliyet (İMM)</th>
          <td colspan="3"><b>SINIRSIZ (Kişi Başı ve Kaza Başı Limitsiz)</b></td>
        </tr>
        <tr>
          <th>Doğal Afet, Dolu, Sel, Deprem</th><td>%100 Eksiksiz Teminat</td>
          <th>Yetkili Servis Anlaşması</th><td>Tüm Yetkili Marka Servisleri Dahil</td>
        </tr>
      </table>
    `;
  } else if (ctx.docType === "trafik_sigortasi") {
    title = "ZORUNLU KARAYOLLARI MALİ SORUMLULUK SİGORTASI (TRAFİK)";
    authority = "TÜRKİYE SİGORTA ANONİM ŞİRKETİ";
    docCode = ctx.documentNo || `TRF-2025-${Math.floor(200000 + Math.random() * 700000)}`;
    specificSections = `
      <div class="section-title">POLİÇE TESCİL VERİLERİ</div>
      <table class="doc-table">
        <tr>
          <th>TRAMER Belge No</th><td class="mono font-bold">${docCode}</td>
          <th>Basamak (Hasarsızlık)</th><td><b>7. Basamak (%50 İndirimli)</b></td>
        </tr>
        <tr>
          <th>Geçerlilik Başlangıcı</th><td>01.01.2025 00:01</td>
          <th>Geçerlilik Bitişi</th><td><b>01.01.2026 23:59</b></td>
        </tr>
        <tr>
          <th>Kullanım Şekli</th><td>Hususi Otomobil / Filo</td>
          <th>Şasi Numarası</th><td class="mono">${ctx.chassisNo || "WBA5A51080G12894"}</td>
        </tr>
      </table>

      <div class="section-title">HAZİNE VE MALİYE BAKANLIĞI ZORUNLU ASGARİ TEMİNAT LİMİTLERİ</div>
      <table class="doc-table">
        <tr>
          <th>Maddi Hasar (Kaza Başına)</th><td class="mono font-bold">400.000 TL</td>
          <th>Sağlık Gideri (Kişi Başı)</th><td class="mono font-bold">2.000.000 TL</td>
        </tr>
        <tr>
          <th>Sakatlanma ve Ölüm (Kişi Başı)</th><td class="mono font-bold">2.000.000 TL</td>
          <th>Kaza Başı Toplam Limit</th><td class="mono font-bold">10.000.000 TL</td>
        </tr>
      </table>
    `;
  } else if (ctx.docType === "muayene") {
    title = "TÜVTÜRK ARAÇ PERİYODİK MUAYENE RAPORU";
    authority = "TÜVTÜRK KUZEY TAŞIT MUAYENE İSTASYONLARI İŞLETİM A.Ş.";
    docCode = ctx.documentNo || `TUV-2025-${Math.floor(700000 + Math.random() * 200000)}`;
    specificSections = `
      <div class="section-title">MUAYENE VE İSTASYON BİLGİLERİ</div>
      <table class="doc-table">
        <tr>
          <th>İstasyon Kodu / Adı</th><td>34-01 / İstanbul Hadımköy İstasyonu</td>
          <th>Rapor No</th><td class="mono font-bold">${docCode}</td>
        </tr>
        <tr>
          <th>Muayene Tarihi</th><td>14.03.2025 10:24</td>
          <th>Sonraki Muayene Tarihi</th><td style="color:#059669; font-weight:bold;">14.03.2027 (2 YIL GEÇERLİ)</td>
        </tr>
        <tr>
          <th>Muayene Sırasındaki Kilometre</th><td class="mono font-bold">${kmStr}</td>
          <th>Egzoz Gazı Emisyon Belgesi</th><td>Geçerli (No: EGZ-3401-9921)</td>
        </tr>
      </table>

      <div class="section-title">TEST SONUÇLARI VE TEKNİK PARAMETRELER</div>
      <table class="doc-table">
        <tr>
          <th>Fren Testi (Ön Aks Sapması)</th><td style="color:#059669;">%3 (Standart Altı / Kusursuz)</td>
          <th>El Freni Frenleme Kuvveti</th><td style="color:#059669;">2.4 kN (Uygun)</td>
        </tr>
        <tr>
          <th>Ön / Arka Aydınlatma Sistemi</th><td style="color:#059669;">Uygun / Kusursuz</td>
          <th>Lastik Diş Derinliği</th><td style="color:#059669;">6.8 mm (Güvenli)</td>
        </tr>
        <tr>
          <th>Direksiyon ve Ön Düzen</th><td style="color:#059669;">Boşluksuz / Kusursuz</td>
          <th>Şasi ve Alt Takım Korozyon</th><td style="color:#059669;">Temiz / Kusursuz</td>
        </tr>
      </table>

      <div style="background:#ecfdf5; border:2px solid #059669; border-radius:8px; padding:12px; margin-top:16px; text-align:center;">
        <span style="font-size:18px; font-weight:900; color:#047857; letter-spacing:1px;">SONUÇ: KUSURSUZ — MUAYENEDEN BAŞARIYLA GEÇMİŞTİR</span>
      </div>
    `;
  } else if (ctx.docType === "ekspertiz") {
    title = "TSE HYB ONAYLI 501 NOKTA DETAYLI OTO EKSPERTİZ RAPORU";
    authority = "PİLOT GARAGE KURUMSAL OTO EKSPERTİZ MERKEZİ";
    docCode = ctx.documentNo || `EXP-2025-${Math.floor(300000 + Math.random() * 600000)}`;
    specificSections = `
      <div class="section-title">DYNO TESTİ & MOTOR MEKANİK ANALİZİ</div>
      <table class="doc-table">
        <tr>
          <th>Test Edilen Motor Gücü</th><td class="mono font-bold" style="color:#0284c7;">164 HP / 170 HP Üretici Gücü</td>
          <th>Motor Kondisyon Verimi</th><td class="mono font-bold" style="color:#059669; font-size:15px;">%96.4 (Mükemmel)</td>
        </tr>
        <tr>
          <th>Maksimum Tork</th><td>248 Nm @ 1800 rpm</td>
          <th>Şanzıman / Vites Geçişleri</th><td style="color:#059669;">Vuruntu Yok / Kusursuz</td>
        </tr>
        <tr>
          <th>OBD Elektronik Arıza Taraması</th><td colspan="3" style="color:#059669; font-weight:bold;">0 DTC (Kayıtlı Arıza Kodu Bulunmuyor)</td>
        </tr>
      </table>

      <div class="section-title">KAPORTA, BOYA VE DEĞİŞEN PARÇA RAPORU</div>
      <table class="doc-table">
        <tr><th>Kaput</th><td style="color:#059669;">ORİJİNAL (110 µm)</td><th>Tavan</th><td style="color:#059669;">ORİJİNAL (105 µm)</td></tr>
        <tr><th>Sol Ön Çamurluk</th><td style="color:#059669;">ORİJİNAL (115 µm)</td><th>Sağ Ön Çamurluk</th><td style="color:#059669;">ORİJİNAL (110 µm)</td></tr>
        <tr><th>Sol Ön / Arka Kapı</th><td style="color:#059669;">ORİJİNAL (120 µm)</td><th>Sağ Ön / Arka Kapı</th><td style="color:#059669;">ORİJİNAL (115 µm)</td></tr>
        <tr><th>Bagaj Kapağı</th><td style="color:#059669;">ORİJİNAL (110 µm)</td><th>Şasi / Podye / Direkler</th><td style="color:#059669;"><b>HATASIZ / İŞLEMSİZ</b></td></tr>
      </table>
    `;
  } else {
    // Noter Alış Senedi
    title = "T.C. NOTERLİKLERİ ARAÇ SATIŞ VE MÜLKİYET DEVRİ SÖZLEŞMESİ";
    authority = "TÜRKİYE NOTERLER BİRLİĞİ — İSTANBUL 15. NOTERLİĞİ";
    docCode = ctx.documentNo || `NOT-2024-${Math.floor(10000 + Math.random() * 80000)}`;
    specificSections = `
      <div class="section-title">RESMİ NOTER VE SÖZLEŞME METNİ</div>
      <table class="doc-table">
        <tr>
          <th>Noterlik Adı</th><td>İstanbul 15. Noterliği</td>
          <th>Yevmiye Numarası</th><td class="mono font-bold">${docCode}</td>
        </tr>
        <tr>
          <th>Devir Tarihi</th><td>18.11.2024 14:15</td>
          <th>Satış Bedeli</th><td class="mono font-bold">${priceStr}</td>
        </tr>
        <tr>
          <th>Alıcı (Yeni Malik)</th><td colspan="3"><b>${ctx.companyName}</b></td>
        </tr>
      </table>
      <p style="font-size:12px; color:#475569; line-height:1.6; margin-top:12px; text-align:justify;">
        İşbu satış ve tescil işlemi 2918 sayılı Karayolları Trafik Kanunu ve Noterlik Kanunu hükümleri uyarınca gerçekleştirilmiş olup, aracın mülkiyeti, ruhsatı ve tüm yasal hakları alıcı kuruma devredilmiştir. Satış bedeli banka kanalı ile peşin ve nakden ödenmiştir.
      </p>
    `;
  }

  return `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <title>${title} — ${p}</title>
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      margin: 0;
      padding: 24px;
      background: #f1f5f9;
      color: #0f172a;
    }
    .page-container {
      max-width: 820px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #cbd5e1;
      border-radius: 12px;
      box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.1);
      padding: 36px 42px;
      position: relative;
    }
    .no-print-bar {
      max-width: 820px;
      margin: 0 auto 16px auto;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .btn-print {
      background: #2563eb;
      color: #ffffff;
      border: none;
      border-radius: 8px;
      padding: 10px 20px;
      font-size: 14px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 2px 5px rgba(37, 99, 235, 0.3);
    }
    .btn-print:hover { background: #1d4ed8; }
    .header-box {
      border-bottom: 3px solid #0f172a;
      padding-bottom: 18px;
      margin-bottom: 24px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .authority-title {
      font-size: 11px;
      font-weight: 800;
      color: #64748b;
      letter-spacing: 1.5px;
      text-transform: uppercase;
    }
    .doc-main-title {
      font-size: 18px;
      font-weight: 900;
      color: #0f172a;
      margin-top: 4px;
    }
    .plate-badge {
      display: inline-flex;
      border: 2px solid #0f172a;
      border-radius: 6px;
      overflow: hidden;
      font-weight: 900;
    }
    .plate-badge .tr {
      background: #1d4ed8;
      color: #ffffff;
      padding: 6px 8px;
      font-size: 12px;
    }
    .plate-badge .code {
      background: #ffffff;
      padding: 6px 16px;
      font-size: 20px;
      letter-spacing: 2px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      color: #1e293b;
      background: #f8fafc;
      border-left: 4px solid #2563eb;
      padding: 6px 10px;
      margin: 20px 0 10px 0;
      letter-spacing: 0.8px;
      text-transform: uppercase;
    }
    .doc-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    .doc-table th {
      width: 25%;
      background: #f8fafc;
      color: #475569;
      font-weight: 600;
      text-align: left;
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
    }
    .doc-table td {
      width: 25%;
      color: #0f172a;
      padding: 8px 10px;
      border: 1px solid #e2e8f0;
    }
    .mono { font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; }
    .font-bold { font-weight: 700; }
    .footer-box {
      margin-top: 36px;
      padding-top: 20px;
      border-top: 1px solid #e2e8f0;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .seal-box {
      text-align: center;
      border: 2px dashed #dc2626;
      border-radius: 50%;
      width: 90px;
      height: 90px;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      color: #dc2626;
      font-weight: 900;
      font-size: 10px;
      transform: rotate(-10deg);
      line-height: 1.2;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .page-container { border: none; box-shadow: none; padding: 0; }
      .no-print-bar { display: none; }
    }
  </style>
</head>
<body>
  <div class="no-print-bar">
    <div style="font-size:13px; color:#64748b; font-weight:600;">
      FilomOnline Araç Evrak Sistemi — Demo Önizleme
    </div>
    <button class="btn-print" onclick="window.print()">
      🖨️ Yazdır / PDF Olarak Kaydet
    </button>
  </div>

  <div class="page-container">
    <div class="header-box">
      <div>
        <div class="authority-title">${authority}</div>
        <div class="doc-main-title">${title}</div>
        <div style="font-size:12px; color:#64748b; margin-top:3px;">
          Belge Doğrulama Kodu: <span class="mono font-bold">${docCode}</span>
        </div>
      </div>
      <div class="plate-badge">
        <span class="tr">TR</span>
        <span class="code">${p}</span>
      </div>
    </div>

    ${specificSections}

    <div class="footer-box">
      <div style="font-size:11px; color:#64748b; line-height:1.5;">
        <b>T.C. Elektronik Belge Yönetim Sistemi (EBYS)</b><br>
        Bu belge 5070 sayılı Elektronik İmza Kanunu kapsamında güvenli mobil e-imza ile imzalanmıştır.<br>
        Doğrulama Adresi: <span class="mono">https://www.turkiye.gov.tr/belge-dogrulama</span>
      </div>
      <div class="seal-box">
        <div>T.C.</div>
        <div style="font-size:11px;">RESMİ ONAY</div>
        <div style="font-size:8px;">İŞLEM GEÇERLİ</div>
      </div>
    </div>
  </div>
</body>
</html>`;
}
