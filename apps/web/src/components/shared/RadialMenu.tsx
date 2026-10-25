import { useEffect, useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import { TbZoomIn } from "react-icons/tb";

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
  imageUrl?: string | null;
  onCenterClick?: () => void;
}

const RADIUS = 125;
const BTN = 56; // buton çapı
const GAP = 8; // butonlar arası boşluk
/** Buton sayısı arttıkça halka büyür (butonlar üst üste binmez) */
const radiusFor = (n: number) => Math.max(RADIUS, (n * (BTN + GAP)) / (2 * Math.PI));

/**
 * Oyun envanteri tarzı radial (dairesel) aksiyon menüsü.
 * Anchor'un (kartın) merkezine konumlanır; ikonlar merkezden dışa yayılır,
 * hover'da büyür, tıklayınca aksiyonu çalıştırıp kapanır.
 */
export function RadialMenu({
  open,
  anchorRef,
  actions,
  onClose,
  title,
  imageUrl,
  onCenterClick,
}: Props) {
  const [center, setCenter] = useState<{ x: number; y: number } | null>(null);
  const [spread, setSpread] = useState(false);
  const [hoveredAction, setHoveredAction] = useState<RadialAction | null>(null);

  useLayoutEffect(() => {
    if (open && anchorRef.current) {
      const r = anchorRef.current.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const margin = radiusFor(actions.length) + BTN;
      setCenter({
        x: Math.min(Math.max(r.left + r.width / 2, margin), vw - margin),
        y: Math.min(Math.max(r.top + r.height / 2, margin), vh - margin),
      });
    }
  }, [open, anchorRef, actions.length]);

  useEffect(() => {
    if (open) {
      const id = requestAnimationFrame(() => setSpread(true));
      const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
      window.addEventListener("keydown", onKey);
      return () => {
        cancelAnimationFrame(id);
        window.removeEventListener("keydown", onKey);
        setSpread(false);
        setHoveredAction(null);
      };
    }
    setSpread(false);
    setHoveredAction(null);
  }, [open, onClose]);

  if (!open || !center) return null;
  const n = actions.length;
  const radius = radiusFor(n);

  return createPortal(
    // Şeffaf katman: sayfa görünür kalır, sadece dışarı tıklamayı yakalar.
    <div className="fixed inset-0 z-[200]" onClick={onClose}>
      {/* Merkez rozet — büyütülmüş yuvarlak alan; araç fotosu / plaka ve üzerine gelinen aksiyon adı burada gösterilir */}
      <div
        onClick={(e) => {
          if (!hoveredAction && onCenterClick) {
            e.stopPropagation();
            onCenterClick();
          }
        }}
        className={`absolute flex size-24 items-center justify-center rounded-full text-center text-white shadow-2xl ring-4 ring-white/80 transition-all duration-200 ease-out backdrop-blur-md overflow-hidden dark:ring-white/20 ${
          !hoveredAction && onCenterClick
            ? "pointer-events-auto cursor-pointer group hover:scale-105 hover:ring-primary-400"
            : "pointer-events-none"
        } ${imageUrl && !hoveredAction ? "bg-black" : "bg-gray-900/95 dark:bg-dark-900/95"}`}
        style={{
          left: center.x,
          top: center.y,
          transform: `translate(-50%, -50%) scale(${spread ? 1 : 0.4})`,
          opacity: spread ? 1 : 0,
        }}
        title={!hoveredAction && onCenterClick ? "Fotoğraf galerisini aç" : undefined}
      >
        {hoveredAction ? (
          <div className="flex flex-col items-center justify-center text-center px-2 select-none animate-in fade-in zoom-in-95 duration-150">
            {(() => {
              const HoverIcon = hoveredAction.icon;
              return (
                <HoverIcon
                  className={`size-6 mb-1 ${hoveredAction.color ?? "text-white"}`}
                />
              );
            })()}
            <span className="text-[11px] font-bold leading-tight text-white line-clamp-2">
              {hoveredAction.label}
            </span>
          </div>
        ) : imageUrl ? (
          <div className="relative size-full select-none">
            <img
              src={imageUrl}
              alt={title || "Araç"}
              className="size-full object-cover transition-transform duration-300 group-hover:scale-110"
            />
            {/* Alt gradyan ve plaka */}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-gradient-to-t from-black/90 via-black/50 to-transparent pb-1 pt-3">
              <span className="font-mono text-[10px] font-black tracking-wider text-white uppercase drop-shadow-sm px-1 truncate">
                {title}
              </span>
            </div>
            {/* Hover overlay — Büyüteç ikonu */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/35 opacity-0 transition-opacity duration-150 group-hover:opacity-100">
              <TbZoomIn className="size-6 text-white drop-shadow-lg" />
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center text-center px-2 select-none">
            <span className="font-mono text-xs sm:text-sm font-black tracking-wider text-white uppercase leading-snug">
              {title}
            </span>
          </div>
        )}
      </div>

      {actions.map((a, i) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2; // tepeden başla
        const dx = spread ? Math.cos(angle) * radius : 0;
        const dy = spread ? Math.sin(angle) * radius : 0;
        const Icon = a.icon;
        const isHovered = hoveredAction === a;
        return (
          <div
            key={i}
            className="absolute z-10 hover:z-30"
            style={{
              left: center.x,
              top: center.y,
              width: BTN,
              height: BTN,
              marginLeft: -BTN / 2,
              marginTop: -BTN / 2,
              transform: `translate(${dx}px, ${dy}px) scale(${spread ? 1 : 0.2})`,
              opacity: spread ? 1 : 0,
              transition: "transform 260ms cubic-bezier(0.16, 1, 0.3, 1), opacity 200ms ease-out",
              transitionDelay: spread ? `${i * 25}ms` : "0ms",
              pointerEvents: spread ? "auto" : "none",
            }}
          >
            <button
              type="button"
              onMouseEnter={() => setHoveredAction(a)}
              onMouseLeave={() => setHoveredAction(null)}
              onClick={(e) => {
                e.stopPropagation();
                a.onClick();
                onClose();
              }}
              className={`group relative flex size-full items-center justify-center rounded-full bg-white shadow-xl ring-1 ring-black/10 transition-transform duration-150 ease-out hover:scale-120 hover:shadow-2xl hover:ring-2 hover:ring-primary-500/40 dark:bg-dark-600 dark:ring-white/10 ${
                isHovered ? "ring-2 ring-primary-500/50 shadow-2xl" : ""
              }`}
              style={{
                transformOrigin: "center center",
              }}
            >
              <Icon className={`size-6 ${a.color ?? "text-gray-600 dark:text-dark-100"} transition-transform duration-150 group-hover:scale-110`} />
            </button>
          </div>
        );
      })}
    </div>,
    document.body,
  );
}
