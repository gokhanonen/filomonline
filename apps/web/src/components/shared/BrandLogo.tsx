// FilomOnline marka logosu. Kaynak görsel koyu zeminli ("FO" yarış pisti markası),
// bu yüzden markayı yuvarlatılmış bir rozet (object-cover + rounded) olarak gösteriyoruz;
// böylece hem açık hem koyu temada tutarlı durur. Geniş kullanım için `variant="full"`.
import clsx from "clsx";

interface BrandLogoProps {
  className?: string;
  /** "mark": kare FO rozeti (menü/ikon). "full": tam yatay logo (giriş/başlık). */
  variant?: "mark" | "full";
  alt?: string;
}

const MARK_SRC = "/images/logo/filom-mark-256.png";
const FULL_SRC = "/images/logo/filom-logo-640.png";

export function BrandLogo({
  className,
  variant = "mark",
  alt = "FilomOnline",
}: BrandLogoProps) {
  const isFull = variant === "full";
  return (
    <img
      src={isFull ? FULL_SRC : MARK_SRC}
      alt={alt}
      draggable={false}
      loading="eager"
      decoding="async"
      className={clsx(
        "select-none",
        isFull
          ? "rounded-xl object-contain"
          : "rounded-lg object-cover bg-dark-900",
        className,
      )}
    />
  );
}

export default BrandLogo;
