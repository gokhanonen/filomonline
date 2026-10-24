import { useEffect, useRef } from "react";
import { Spinner } from "@/components/ui";

interface Props {
  onReach: () => void;
  hasMore: boolean;
  loading: boolean;
}

/** Görünür alana girince onReach'i tetikler (infinite scroll). */
export function InfiniteSentinel({ onReach, hasMore, loading }: Props) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!hasMore) return;
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) onReach();
      },
      { rootMargin: "400px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [onReach, hasMore]);

  if (!hasMore && !loading) return null;

  return (
    <div ref={ref} className="col-span-full flex justify-center py-6">
      {loading && <Spinner className="size-6" />}
    </div>
  );
}
