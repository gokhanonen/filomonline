# UI & Form Standartları (Kalıcı Kurallar)

1. **Her Yerde Autocomplete (Aranabilir Seçim Kutusu):**
   - Cari / Müşteri / Tedarikçi, Araç, Hizmet / Ürün / Parça Kartı, Kasa ve Lokasyon gibi liste verisi içeren TÜM form alanlarında standart HTML `<select>` YERİNE mutlaka aranabilir Autocomplete / Combobox (`SearchableSelect`) bileşeni kullanılmalıdır.
   - Gerçek hayatta 100+ kart, 100+ araç veya yüzlerce cari olacağı için kullanıcıların yazarak hızlıca filtreleyebilmesi zorunludur.

2. **Masraf / Gider Formu Kuralları:**
   - Masraf formunda "Belge Tipi" kullanıcıya seçtirilmez; masraf zaten doğası gereği "Alınan Masraf"tır (`invoiceType: "RECEIVED"`).
   - Masraf kalemlerinde (satırlarda) gereksiz "Tip" seçimi yapılmaz; kullanıcı doğrudan Hizmet veya Malzeme kartını autocomplete üzerinden arayıp seçer.
    - Kart seçildiğinde Kalem Adı, Birim Fiyat ve KDV (%) otomatik olarak doldurulmalı, kullanıcı isterse ek açıklama veya fiyat revizyonu yapabilmelidir.

3. **Araç Fiyat Alanları & 4 Alım Rejimi:**
   - Araç kartında ve veri tabanında `salePrice` (Satış Fiyatı) alanı BULUNMAZ (kaldırılmıştır).
   - Araç fiyat alanları: **Liste Fiyatı** (`listPrice`), **TENSF** (`tensf` - UI etiketi sadece "TENSF" olarak yazılır), **Alış Fiyatı** (`purchasePrice`), **Alış Noter Fiyatı** (`purchaseNotaryPrice`).
   - 4 Alım Rejimi:
     1. `sahis`: Şahıstan (Özel Matrah Yok) -> Alış KDV %0, Satış KDV: Kâr marjı (Noter Satış - Noter Alış) üzerinden %20 KDV.
     2. `sirket_1`: Şirketten (%1 KDV) -> Alış KDV %1 kilitli, alış fatura bilgileri zorunlu. Satış KDV: %1 dahil tam fatura.
     3. `sirket_20`: Şirketten (%20 KDV) -> Alış KDV %20 kilitli, fatura bilgileri zorunlu. Satış KDV: %20 dahil tam fatura.
     4. `galeri_ozel`: Galeriden (Özel Matrahlı) -> Alış Özel Matrah Tutarı (₺) aktifleşir. Satış KDV: %1 dahil tam fatura.
4. **Tutar & Fiyat Alanlarında Binlik Ayracı (`NumericInput`) Standardı:**
   - Projedeki TÜM tutar, fiyat, ücret, kapora/opsiyon ve KM/büyüklük alanlarında Türkçe binlik ayracı (`.` binlik ayracı, `,` ondalık ayracı, örn: `1.600.000` veya `1.450.000,50`) kullanılmalıdır.
   - Sayılar yazılırken de yazıldıktan sonra da binlik ayracı aktif kalmalıdır.
   - Asla ham `<input type="number">` kullanılmamalıdır (HTML `type="number"` binlik ayracına izin vermez ve rakamları okumayı imkansızlaştırır).
   - Yeni eklenen veya güncellenen tüm formlarda `@/components/ui` altındaki `NumericInput` bileşeni kullanılmalıdır. `react-hook-form` formlarında `Controller` üzerinden `value={field.value}` ve `onValueChange={field.onChange}` ile bağlanmalıdır.
   - Sayısal tam sayılar (örn: KM) için `numeralDecimalScale={0}` ve ilgili `suffix` (örn: `"km"`) verilebilir; para alanları için varsayılan `₺` simgesi ve 2 basamak ondalık hassasiyeti geçerlidir.

5. **Evrak / Fotoğraf Yükleme ve Tanımlama Standardı (Kalıcı Kural):**
   - **Görsel Boyutu (Maks 300KB):** Programın neresinde olursa olsun evrak ve fotoğraf yüklemelerinde görseller istemci tarafında (`imageResize.ts`) otomatik olarak **en fazla 300KB** (`DOCUMENT_PHOTO_MAX_BYTES = 300 * 1024`) olacak şekilde yeniden boyutlandırılır ve sıkıştırılır. PDF gibi belgeler ham olarak yüklenir.
   - **Evrak Tanımları (Katalog):** Evrak kategorileri ve tipleri `http://localhost:5173/catalog` adresindeki **Evrak Tanımları** sekmesinden dinamik olarak yönetilir.
   - **Modül Bağlantısı:** Her evrak kategorisi geçerli olduğu modüllerle (`VEHICLE`: Araç Kartı, `CUSTOMER`: Cari / Müşteri, `CONTRACT`: Sözleşmeler, `INVOICE`: Fatura & Finans, `ALL`: Tüm Modüller) etiketlenir.
   - **Modüllerde Kullanım:** Yeni bir modüle evrak yükleme özelliği ekleneceğinde `@/components/shared/DocumentManager` bileşeni `referenceType` parametresi ile (örn: `<DocumentManager referenceType="CUSTOMER" referenceId={id} />`) çağrılır. Bileşen, seçili modüle ait kategorileri otomatik olarak filtreler.
