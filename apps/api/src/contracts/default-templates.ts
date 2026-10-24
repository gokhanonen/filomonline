export const DEFAULT_RENTAL_CONTRACT_HTML = `
<div class="contract-document p-8 font-serif text-black max-w-[210mm] mx-auto bg-white text-sm leading-relaxed">
  <style type="text/css" media="print">
    @page { size: A4; margin: 15mm; }
    body { -webkit-print-color-adjust: exact; font-family: 'Times New Roman', serif; }
    .page-break { page-break-before: always; }
  </style>

  <!-- SAYFA 1 -->
  <div class="text-center font-bold text-xl mb-6 uppercase tracking-wider border-b-2 border-black pb-3">
    UZUN DÖNEM ARAÇ KİRALAMA SÖZLEŞMESİ
  </div>

  <div class="mb-5 text-center">
    <div class="font-bold underline text-base mb-1">KİRAYA VEREN</div>
    <div class="font-bold text-base text-gray-900">{{firma_unvan}}</div>
    <div class="text-sm font-semibold">VERGİ DAİRESİ: {{firma_vergi_dairesi}} | VERGİ NO: {{firma_vergi_no}}</div>
    <div class="text-xs text-gray-600">{{firma_adres}} | Tel: {{firma_telefon}}</div>
    <div class="text-xs italic text-gray-500 mt-1">İş bu sözleşmede kısaca "KİRAYA VEREN" olarak anılacaktır.</div>
  </div>

  <div class="text-center font-bold text-base my-3">İLE</div>

  <div class="mb-6 text-center">
    <div class="font-bold underline text-base mb-1">KİRALAYAN (KİRACI)</div>
    <div class="font-bold text-base text-red-700 uppercase">{{musteri_adi}}</div>
    <div class="text-sm font-semibold">T.C. / VERGİ NO: <span class="text-red-700">{{musteri_tc_vkn}}</span></div>
    <div class="text-xs text-gray-800 uppercase mt-1">{{musteri_adres}} | Tel: {{musteri_telefon}}</div>
    <div class="text-xs italic text-gray-500 mt-1">İş bu sözleşmede kısaca "KİRACI" olarak anılacaktır.</div>
  </div>

  <div class="text-justify mb-4 text-xs font-medium leading-normal bg-gray-50 p-3 border border-gray-200 rounded">
    Taraflar aşağıda özellikleri belirtilen aracın kiralanması konusunda mutabakata varmış olup, sözleşmede yer alan tüm şart ve hükümleri gayrikabili rücu kabul, beyan ve taahhüt ederler.
  </div>

  <div class="mb-5 border border-black p-4 rounded">
    <div class="font-bold text-base mb-2 border-b border-gray-300 pb-1">1. KİRALANAN ARAÇ BİLGİLERİ:</div>
    <div class="grid grid-cols-2 gap-2 text-sm">
      <div><span class="font-bold">PLAKA:</span> <span class="text-red-700 font-bold font-mono">{{plaka}}</span></div>
      <div><span class="font-bold">MARKA / MODEL:</span> <span class="text-gray-900 font-semibold">{{marka_model}}</span></div>
      <div><span class="font-bold">MODEL YILI:</span> <span class="text-gray-900 font-semibold">{{yil}}</span></div>
      <div><span class="font-bold">ŞASİ NO:</span> <span class="text-gray-900 font-mono">{{sasi_no}}</span></div>
      <div><span class="font-bold">MOTOR NO:</span> <span class="text-gray-900 font-mono">{{motor_no}}</span></div>
      <div><span class="font-bold">ARAÇ RENGİ:</span> <span class="text-gray-900">{{renk}}</span></div>
    </div>
    <div class="mt-3 pt-2 border-t border-gray-200">
      <div class="font-bold text-xs uppercase mb-1">YETKİLİ SÜRÜCÜLER:</div>
      <div class="text-xs text-gray-800">{{suruculer}}</div>
    </div>
  </div>

  <div class="mb-4 text-justify text-xs space-y-2">
    <div>
      <span class="font-bold">2. SÖZLEŞME SÜRESİ VE KİLOMETRE SINIRI:</span>
      Sözleşme başlangıç tarihi <b>{{sozlesme_tarihi}}</b> olup, kira süresi <b>{{kira_suresi_ay}} AY</b> olarak kararlaştırılmıştır.
      Bu süre zarfında aylık azami kullanım sınırı <b>{{km_limiti}} KM</b>'dir. Sınır aşımında km başına sözleşmede belirlenen aşım bedeli uygulanır.
    </div>
    <div>
      <span class="font-bold">3. KİRA BEDELİ VE ÖDEME ŞARTLARI:</span>
      Aylık net kira bedeli <b>{{tutar}}</b> + KDV'dir. Faturalar aylık olarak tanzim edilir ve tebliğ tarihinden itibaren en geç 3 (üç) iş günü içerisinde Kiraya Veren'in bildirdiği banka hesabına nakden ve defaten ödenir.
    </div>
  </div>

  <div class="page-break"></div>

  <!-- SAYFA 2 -->
  <div class="mt-4 mb-4 text-justify text-xs space-y-3">
    <div class="font-bold text-sm border-b pb-1">4. GENEL HÜKÜMLER VE TARAFLARIN YÜKÜMLÜLÜKLERİ:</div>
    <p><b>a)</b> Kiracı aracı Karayolları Trafik Kanunu ve ilgili mevzuata uygun şekilde, basiretli bir tacir gibi özenle kullanacaktır. Aracı alkollü, uyuşturucu madde etkisinde veya ehliyetsiz kişilere kullandırmayacağını taahhüt eder.</p>
    <p><b>b)</b> Araca ait her türlü periyodik bakım, kasko ve zorunlu trafik sigortası Kiraya Veren tarafından karşılanır. Kullanıcı hatasından kaynaklanan arızalar ve sigorta kapsamı dışındaki zararlar Kiracı'ya aittir.</p>
    <p><b>c)</b> Kaza, hasar veya çalınma durumunda Kiracı derhal kolluk kuvvetlerine başvurarak gerekli tutanak ve alkol raporunu temin etmek ve 24 saat içinde Kiraya Veren'e ulaştırmakla yükümlüdür.</p>
    <p><b>d)</b> Kira süresince oluşan her türlü trafik cezası, HGS/OGS geçiş ücretleri ve otopark bedelleri Kiracı'ya aittir.</p>
    <p><b>e)</b> İş bu sözleşmeden doğacak uyuşmazlıklarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.</p>
  </div>

  <div class="my-8 text-xs text-justify">
    İş bu sözleşme <b>{{sozlesme_no}}</b> referans numarası ile tanzim edilmiş olup, <b>{{sozlesme_tarihi}}</b> tarihinde taraflarca okunarak karşılıklı imza altına alınmıştır.
  </div>

  <!-- İMZA ALANI -->
  <div class="grid grid-cols-2 gap-8 mt-12 pt-6 border-t-2 border-black">
    <div class="text-center">
      <div class="font-bold text-sm mb-1 uppercase">KİRAYA VEREN</div>
      <div class="text-xs font-semibold">{{firma_unvan}}</div>
      <div class="text-[11px] text-gray-500">Kaşe / Yetkili İmza</div>
      <div class="h-20"></div>
    </div>
    <div class="text-center">
      <div class="font-bold text-sm mb-1 uppercase">KİRACI</div>
      <div class="text-xs font-semibold text-red-700">{{musteri_adi}}</div>
      <div class="text-[11px] text-gray-500">Kaşe / Yetkili İmza</div>
      <div class="h-20"></div>
    </div>
  </div>
</div>
`;

export const DEFAULT_SALES_CONTRACT_HTML = `
<div class="contract-document p-8 font-serif text-black max-w-[210mm] mx-auto bg-white text-sm leading-relaxed">
  <style type="text/css" media="print">
    @page { size: A4; margin: 15mm; }
    body { -webkit-print-color-adjust: exact; font-family: 'Times New Roman', serif; }
    .page-break { page-break-before: always; }
  </style>

  <!-- BAŞLIK -->
  <div class="text-center font-bold text-xl mb-4 uppercase tracking-wider border-b-2 border-black pb-3">
    ARAÇ SATIŞ VE REZERVASYON SÖZLEŞMESİ
  </div>

  <div class="flex justify-between items-center text-xs mb-4 text-gray-600">
    <span>Sözleşme No: <b>{{sozlesme_no}}</b></span>
    <span>Düzenleme Tarihi: <b>{{sozlesme_tarihi}}</b></span>
  </div>

  <!-- SATICI & ALICI TABLOSU -->
  <div class="grid grid-cols-2 gap-4 mb-5">
    <div class="border border-black p-3 rounded">
      <div class="font-bold text-xs bg-gray-200 px-2 py-1 mb-2 uppercase">SATICI (FİRMA)</div>
      <div class="font-bold text-sm">{{firma_unvan}}</div>
      <div class="text-xs text-gray-700 mt-1">{{firma_adres}}</div>
      <div class="text-xs text-gray-700">Vergi Dairesi: {{firma_vergi_dairesi}} | VKN: {{firma_vergi_no}}</div>
      <div class="text-xs text-gray-700">Tel: {{firma_telefon}}</div>
    </div>

    <div class="border border-black p-3 rounded">
      <div class="font-bold text-xs bg-gray-200 px-2 py-1 mb-2 uppercase">ALICI (MÜŞTERİ)</div>
      <div class="font-bold text-sm text-red-700 uppercase">{{musteri_adi}}</div>
      <div class="text-xs text-gray-700 mt-1">{{musteri_adres}}</div>
      <div class="text-xs text-gray-700">T.C. / VKN: <span class="font-mono font-bold">{{musteri_tc_vkn}}</span></div>
      <div class="text-xs text-gray-700">Tel: {{musteri_telefon}}</div>
    </div>
  </div>

  <!-- ARAÇ BİLGİLERİ -->
  <div class="border border-black p-3 rounded mb-5">
    <div class="font-bold text-xs bg-gray-200 px-2 py-1 mb-2 uppercase">SATIŞA KONU ARAÇ RUHSAT BİLGİLERİ</div>
    <table class="w-full text-xs">
      <tbody>
        <tr class="border-b border-gray-200">
          <td class="py-1 font-bold w-1/4">PLAKA:</td>
          <td class="py-1 text-red-700 font-bold font-mono text-sm">{{plaka}}</td>
          <td class="py-1 font-bold w-1/4">MOTOR NO:</td>
          <td class="py-1 font-mono">{{motor_no}}</td>
        </tr>
        <tr class="border-b border-gray-200">
          <td class="py-1 font-bold">MARKA / MODEL:</td>
          <td class="py-1">{{marka_model}}</td>
          <td class="py-1 font-bold">ŞASİ NO:</td>
          <td class="py-1 font-mono">{{sasi_no}}</td>
        </tr>
        <tr>
          <td class="py-1 font-bold">MODEL YILI:</td>
          <td class="py-1">{{yil}}</td>
          <td class="py-1 font-bold">RENK / KULLANIM:</td>
          <td class="py-1">{{renk}} / Hususi</td>
        </tr>
      </tbody>
    </table>
  </div>

  <!-- SATIŞ ŞARTLARI VE ÖDEME PLANI -->
  <div class="border border-black p-3 rounded mb-5">
    <div class="font-bold text-xs bg-gray-200 px-2 py-1 mb-2 uppercase">SATIŞ BEDELİ VE ÖDEME ŞARTLARI</div>
    <div class="grid grid-cols-3 gap-2 text-center py-2 bg-gray-50 border-b border-gray-200">
      <div>
        <div class="text-[11px] text-gray-500 uppercase font-bold">TOPLAM SATIŞ BEDELİ</div>
        <div class="text-base font-bold text-gray-900">{{toplam_tutar}}</div>
      </div>
      <div>
        <div class="text-[11px] text-gray-500 uppercase font-bold">ALINAN KAPORA / PEŞİNAT</div>
        <div class="text-base font-bold text-emerald-700">{{alinan_pesinat}}</div>
      </div>
      <div>
        <div class="text-[11px] text-gray-500 uppercase font-bold">NOTERDE / KALAN BAKİYE</div>
        <div class="text-base font-bold text-red-700">{{kalan_bakiye}}</div>
      </div>
    </div>

    <!-- TAKSİT / SENET TABLOSU -->
    <div class="mt-3">
      <div class="font-bold text-xs uppercase mb-1">ÖDEME & TAKSİT PLANI:</div>
      {{odeme_tablosu}}
    </div>
  </div>

  <!-- ŞARTLAR -->
  <div class="text-xs text-justify space-y-2 mb-6">
    <p><b>1.</b> Alıcı, yukarıda nitelikleri belirtilen aracı görerek, beğenerek, tüm kontrollerini ve ekspertizini yaptırmış olarak mevcut haliyle satın almayı kabul ve taahhüt etmiştir.</p>
    <p><b>2.</b> Noter satışı en geç <b>{{gecerlilik_tarihi}}</b> tarihine kadar gerçekleştirilecektir. Alıcı bu tarihe kadar bakiye tutarı ödemez veya araç alımından vazgeçerse, yatırılan kapora bedeli cezai şart olarak Satıcı'da kalır.</p>
    <p><b>3.</b> Satıcı, satış gününe kadar araca ait tüm vergi, trafik cezası, HGS ve rehin/haciz ilişiğini keserek aracı temiz mülkiyetle devretmeyi taahhüt eder. Noter masrafları Alıcı'ya aittir.</p>
    <p><b>4.</b> İş bu sözleşmeden doğacak ihtilaflarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.</p>
  </div>

  <!-- İMZALAR -->
  <div class="grid grid-cols-2 gap-8 mt-10 pt-4 border-t-2 border-black">
    <div class="text-center">
      <div class="font-bold text-xs uppercase mb-1">SATICI FİRMA</div>
      <div class="text-xs font-semibold">{{firma_unvan}}</div>
      <div class="text-[11px] text-gray-500">Yetkili İmza / Kaşe</div>
      <div class="h-16"></div>
    </div>
    <div class="text-center">
      <div class="font-bold text-xs uppercase mb-1">ALICI MÜŞTERİ</div>
      <div class="text-xs font-semibold text-red-700 uppercase">{{musteri_adi}}</div>
      <div class="text-[11px] text-gray-500">İmza</div>
      <div class="h-16"></div>
    </div>
  </div>
</div>
`;
