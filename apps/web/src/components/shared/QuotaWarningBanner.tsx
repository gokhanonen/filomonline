import { useEffect, useState } from "react";
import { Link } from "react-router";
import { TbAlertTriangle, TbArrowUpRight } from "react-icons/tb";

import { getUsage, type QuotaStatus } from "@/services/subscriptionService";

/**
 * Kota aşımında sürekli görünen uyarı şeridi. BLOCK varsa kırmızı (sert sınır),
 * yalnız WARN varsa sarı (tolerans bölgesi). Plan yükseltmeye yönlendirir.
 * Hata olursa sessizce gizlenir.
 */
export function QuotaWarningBanner() {
  const [status, setStatus] = useState<QuotaStatus | null>(null);

  useEffect(() => {
    let alive = true;
    getUsage()
      .then((s) => alive && setStatus(s))
      .catch(() => void 0);
    return () => {
      alive = false;
    };
  }, []);

  if (!status || (!status.anyWarning && !status.anyBlock)) return null;

  const block = status.anyBlock;
  const msg = status.warnings[0];

  return (
    <div
      className={
        block
          ? "flex items-center gap-2 border-b border-error/30 bg-error/10 px-4 py-2 text-sm text-error dark:bg-error/15"
          : "flex items-center gap-2 border-b border-warning/30 bg-warning/10 px-4 py-2 text-sm text-amber-700 dark:text-amber-300"
      }
    >
      <TbAlertTriangle className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{msg}</span>
      <Link
        to="/subscription"
        className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-white/70 px-2.5 py-1 text-xs font-semibold text-gray-800 hover:bg-white dark:bg-dark-700 dark:text-dark-50"
      >
        Planı Yükselt <TbArrowUpRight className="size-3.5" />
      </Link>
    </div>
  );
}
