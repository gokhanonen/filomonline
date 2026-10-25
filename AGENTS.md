# Project Rules & Policies

## Proje Kuralları — `CLAUDE.md` geçerlidir
Kod yazmadan önce `CLAUDE.md` dosyasını oku; oradaki "Değişmez kurallar" bu proje için bağlayıcıdır. Özellikle:
- **Tek Giriş Noktası:** Sol menüye yeni öğe/ayrı liste sayfası ekleme; iş, ait olduğu kaydın içinden (araç kartı radial menü, potansiyel detay sekmeleri) yapılır.
- **Veri asla fiziksel silinmez:** "Sil" = `deletedAt` yazmak. Yasaklı modellerde `delete`/`deleteMany` çalışma anında hata verir (`apps/api/src/prisma/soft-delete.ts`).
- **Şema değişikliği yalnızca migration ile** (`prisma migrate`); `prisma db push` kullanma — uzak DB'nin migration geçmişi kopuyor.
- Tutar/KM alanlarında `NumericInput`, liste verisi seçimlerinde `SearchableSelect`.

## Browser Kullanımı
- **Kullanıcı Onayı Zorunluluğu:** Kullanıcıdan açık onay almadan kesinlikle browser (`browser_subagent`) açılmamalı veya çalıştırılmamalıdır. Kullanıcı onay vermezse browser açılamaz.
