import { useCallback, useEffect, useRef, useState } from "react";

interface PageResponse<T> {
  items: T[];
  total: number;
}

/**
 * Infinite scroll liste yönetimi. `fetchPage`'i çağıranın filtre bağımlılıklarıyla
 * useCallback ile memoize etmesi gerekir; fetchPage kimliği değişince liste sıfırlanır.
 */
export function useInfiniteList<T>(
  fetchPage: (page: number) => Promise<PageResponse<T>>,
) {
  const [items, setItems] = useState<T[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [initialized, setInitialized] = useState(false);
  const loadingRef = useRef(false);

  // Filtre değişince (fetchPage kimliği) sıfırla + ilk sayfayı yükle
  useEffect(() => {
    let cancelled = false;
    setItems([]);
    setTotal(0);
    setPage(1);
    setInitialized(false);
    loadingRef.current = true;
    setLoading(true);
    fetchPage(1)
      .then((res) => {
        if (cancelled) return;
        setItems(res.items);
        setTotal(res.total);
        setPage(2);
        setInitialized(true);
      })
      .catch(() => void 0)
      .finally(() => {
        if (!cancelled) {
          loadingRef.current = false;
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [fetchPage]);

  const hasMore = initialized && items.length < total;

  const loadMore = useCallback(async () => {
    if (loadingRef.current || !initialized || items.length >= total) return;
    loadingRef.current = true;
    setLoading(true);
    try {
      const res = await fetchPage(page);
      setItems((prev) => [...prev, ...res.items]);
      setTotal(res.total);
      setPage((p) => p + 1);
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [fetchPage, page, initialized, items.length, total]);

  // Bir öğeyi listeden düşür (ör. pasifleştirme sonrası)
  const removeItem = useCallback((predicate: (item: T) => boolean) => {
    setItems((prev) => prev.filter((x) => !predicate(x)));
    setTotal((t) => Math.max(0, t - 1));
  }, []);

  // Bir öğeyi yerinde güncelle (ör. ilan linki / opsiyon değişince kartı tazele)
  const updateItem = useCallback(
    (predicate: (item: T) => boolean, patch: (item: T) => T) => {
      setItems((prev) => prev.map((x) => (predicate(x) ? patch(x) : x)));
    },
    [],
  );

  return { items, total, loading, hasMore, loadMore, removeItem, updateItem };
}
