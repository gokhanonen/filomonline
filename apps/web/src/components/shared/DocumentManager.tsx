import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowUpTrayIcon, TrashIcon, DocumentTextIcon } from "@heroicons/react/24/outline";
import { toast } from "sonner";

import { Button, Select, Spinner } from "@/components/ui";
import type {
  DocCategory,
  DocReferenceType,
  DocumentItem,
} from "@/@types/document";
import {
  createDocument,
  deleteDocument,
  getDocumentMeta,
  listDocuments,
} from "@/services/documentService";
import { uploadBlob } from "@/services/storageService";
import {
  resizeWithThumbnail,
  DOCUMENT_PHOTO_MAX_BYTES,
} from "@/utils/imageResize";

interface Props {
  referenceType: DocReferenceType;
  referenceId: string;
}

function fmtSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} KB` : `${(bytes / 1048576).toFixed(1)} MB`;
}

export function DocumentManager({ referenceType, referenceId }: Props) {
  const [meta, setMeta] = useState<DocCategory[]>([]);
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [categoryId, setCategoryId] = useState("");
  const [typeId, setTypeId] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setDocs(await listDocuments(referenceType, referenceId));
    } catch {
      toast.error("Dokümanlar yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, [referenceType, referenceId]);

  useEffect(() => {
    getDocumentMeta(referenceType)
      .then((m) => {
        setMeta(m);
        if (m[0]) {
          setCategoryId(m[0].id);
          setTypeId(m[0].types[0]?.id ?? "");
        }
      })
      .catch(() => void 0);
    load();
  }, [referenceType, load]);

  const types = useMemo(
    () => meta.find((c) => c.id === categoryId)?.types ?? [],
    [meta, categoryId],
  );
  const typeLabel = (id: string) =>
    meta.flatMap((c) => c.types).find((t) => t.id === id)?.label ?? "";

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length || !categoryId || !typeId) {
      toast.error("Önce kategori ve tip seçin");
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const base = file.name.replace(/\.[^.]+$/, "");
        let fileKey: string;
        let thumbKey: string | undefined;
        let fileType = file.type;
        let fileSize = file.size;

        if (file.type.startsWith("image/")) {
          // Görsel: 200KB'a küçült + thumbnail
          const { full, thumb } = await resizeWithThumbnail(file, DOCUMENT_PHOTO_MAX_BYTES);
          [fileKey, thumbKey] = await Promise.all([
            uploadBlob(full, `${base}.jpg`, "documents"),
            uploadBlob(thumb, `${base}-thumb.jpg`, "documents"),
          ]);
          fileType = "image/jpeg";
          fileSize = full.size;
        } else {
          // PDF vb.: ham yükle
          fileKey = await uploadBlob(file, file.name, "documents");
        }

        await createDocument({
          categoryId, typeId, referenceType, referenceId,
          fileName: file.name, fileKey, thumbKey, fileType, fileSize,
        });
      }
      toast.success("Doküman yüklendi");
      await load();
    } catch (err) {
      toast.error((err as { message?: string })?.message ?? "Yükleme başarısız");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Doküman silinsin mi?")) return;
    try {
      await deleteDocument(id);
      setDocs((p) => p.filter((d) => d.id !== id));
    } catch {
      toast.error("Silinemedi");
    }
  };

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-end gap-2">
        <div className="min-w-32 flex-1">
          <Select
            label="Kategori"
            data={meta.map((c) => ({ value: c.id, label: c.label }))}
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              const first = meta.find((c) => c.id === e.target.value)?.types[0];
              setTypeId(first?.id ?? "");
            }}
          />
        </div>
        <div className="min-w-32 flex-1">
          <Select
            label="Tip"
            data={types.map((t) => ({ value: t.id, label: t.label }))}
            value={typeId}
            onChange={(e) => setTypeId(e.target.value)}
          />
        </div>
        <Button type="button" variant="outlined" className="gap-1" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? <Spinner className="size-4" /> : <ArrowUpTrayIcon className="size-4" />}
          Yükle
        </Button>
        <input ref={fileRef} type="file" accept="image/*,application/pdf" multiple className="hidden" onChange={(e) => handleFiles(e.target.files)} />
      </div>
      <p className="mb-3 text-xs text-gray-400">Görseller otomatik max 300KB'a küçültülür. PDF desteklenir.</p>

      {loading ? (
        <div className="flex justify-center py-6"><Spinner className="size-6" /></div>
      ) : docs.length === 0 ? (
        <p className="py-4 text-center text-sm text-gray-400">Henüz doküman yok.</p>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {docs.map((d) => (
            <div key={d.id} className="group relative overflow-hidden rounded-lg border border-gray-150 dark:border-dark-500">
              <a href={d.url} target="_blank" rel="noreferrer" className="block aspect-[4/3] bg-gray-100 dark:bg-dark-800">
                {d.thumbUrl ? (
                  <img src={d.thumbUrl} alt={d.fileName} className="size-full object-cover" />
                ) : (
                  <div className="flex size-full flex-col items-center justify-center gap-1 text-gray-400">
                    <DocumentTextIcon className="size-8" />
                    <span className="text-tiny">{d.fileType.includes("pdf") ? "PDF" : "Dosya"}</span>
                  </div>
                )}
              </a>
              <div className="p-2">
                <p className="truncate text-xs font-medium text-gray-700 dark:text-dark-100">{typeLabel(d.typeId)}</p>
                <p className="truncate text-tiny text-gray-400">{fmtSize(d.fileSize)}</p>
              </div>
              <button type="button" onClick={() => handleDelete(d.id)} className="absolute right-1 top-1 rounded bg-black/60 p-1 text-white opacity-0 transition group-hover:opacity-100" title="Sil">
                <TrashIcon className="size-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
