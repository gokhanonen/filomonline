import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";

export interface RadialAction {
  icon: React.ElementType;
  label: string;
  onClick: () => void;
  color?: string; // ikon rengi sınıfı (örn. text-info)
}

interface Props {
  open: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  actions: RadialAction[];
  onClose: () => void;
  title?: string; // merkezde gösterilecek (örn. plaka)
}

const RADIUS = 120;
const BTN = 56; // buton çapı

/**
 * Oyun envanteri tarzı radial (dairesel) aksiyon menüsü.
 * Anchor'un (kartın) merkezine konumlanır; ikonlar merkezden dışa yayılır,
 * hover'da büyür, tıklayınca aksiyonu çalıştırıp kapanır.
 */
export function RadialMenu({ open, anchorRef, actions, onClose, title }: Props) {
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null);
  const [spread, setSpread] = useState(false);

  useLayoutEffect(() => {
    if (open && anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = RADIUS + BTN;
      setCenter({
        x: Math.min(Math.max(r.left + r.width / 2, margin), vw - margin),
        y: Math.min(Math.max(r.top + r.height / 2, margin), vh - margin),
      });
    }
  }, [open, anchorRef]);

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setSpread(true));
      const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
      window.addEventListener("keydown", onKey);
      return () => {
        cancelAnimationFrame(id);
        window.removeEventListener("keydown", onKey);
        setSpread(false);
      };
    }
    setSpread(false);
  }, [open, onClose]);

  if (!open || !center) return null;
  const n = actions.length;

  return createPortal(
    // Şeffaf katman: sayfa görünür kalır, sadece dışarı tıklamayı yakalar.
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      {/* Merkez plaka rozeti — siyah zemin, beyaz yazı, iki satır eşit font */}
      <div
        className="pointer-events-none absolute flex size-16 items-center justify-center rounded-full bg-gray-900 text-center text-xs font-bold leading-tight text-white shadow-lg ring-4 ring-white/70 dark:ring-black/50"
        style={{
          left: center.x,
          top: center.y,
          transform: `translate(-50%, -50%) scale(${spread ? 1 : 0.4})`,
          opacity: spread ? 1 : 0,
          transition: "transform 200ms ease-out, opacity 200ms ease-out",
        }}
      >
        {title}
      </div>

      {actions.map((a, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2; // tepeden başla
        const dx = spread ? Math.cos(angle) * RADIUS : 0;
        const dy = spread ? Math.sin(angle) * RADIUS : 0;
        const Icon = a.icon;
        return (
          <button
            key={i}
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              a.onClick();
              onClose();
            }}
            className="group absolute flex items-center justify-center rounded-full bg-white shadow-xl ring-1 ring-black/10 transition-all duration-300 ease-out hover:z-10 hover:scale-125 dark:bg-dark-600 dark:ring-white/10"
            style={{
              left: center.x,
              top: center.y,
              width: BTN,
              height: BTN,
              marginLeft: -BTN / 2,
              marginTop: -BTN / 2,
              transform: `translate(${dx}px, ${dy}px) scale(${spread ? 1 : 0.2})`,
              opacity: spread ? 1 : 0,
              transitionDelay: `${i * 35}ms`,
            }}
          >
            <Icon className={`size-6 ${a.color ?? "text-gray-600 dark:text-dark-100"}`} />
            <span className="pointer-events-none absolute -bottom-7 whitespace-nowrap rounded bg-black/70 px-2 py-0.5 text-tiny text-white opacity-0 transition group-hover:opacity-100">
              {a.label}
            </span>
          </button>
        );
      })}
    </div>,
    document.body,
  );
}
