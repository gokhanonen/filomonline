import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  PrinterIcon,
  XMarkIcon,
  DocumentDuplicateIcon,
} from "@heroicons/react/24/outline";

import { Button, Select, Spinner } from "@/components/ui";
import {
  listContractTemplates,
  renderContract,
} from "@/services/contractService";
import type { ContractKind, ContractTemplate } from "@/@types/contract";

interface Props {
  open: boolean;
  onClose: () => void;
  contractType: ContractKind;
  contractId: string;
  documentNo?: string;
}

export function ContractPrintModal({
  open,
  onClose,
  contractType,
  contractId,
  documentNo,
}: Props) {
  const [templates, setTemplates] = useState<ContractTemplate[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [docTitle, setDocTitle] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [zoom, setZoom] = useState<number>(100);

  // 1. Şablonları yükle
  useEffect(() => {
    if (!open) return;
    listContractTemplates(contractType)
      .then((data) => {
        setTemplates(data);
        const def = data.find((t) => t.isDefault) || data[0];
        if (def) setSelectedTemplateId(def.id);
      })
      .catch(() => {
        // template listesi alınamasa da varsayılan render çalışacaktır
      });
  }, [open, contractType]);

  // 2. Sözleşmeyi render et
  useEffect(() => {
    if (!open || !contractId) return;
    setLoading(true);
    renderContract({
      contractType,
      contractId,
      templateId: selectedTemplateId || undefined,
    })
      .then((res) => {
        setHtmlContent(res.html);
        setDocTitle(res.title);
      })
      .catch((err) => {
        toast.error("Sözleşme şablonu oluşturulamadı: " + (err.message || ""));
      })
      .finally(() => setLoading(false));
  }, [open, contractType, contractId, selectedTemplateId]);

  if (!open) return null;

  // Yazdır / PDF İndir
  const handlePrint = () => {
    if (!htmlContent) return;

    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      toast.error("Yazdırma penceresi açılamadı. Lütfen tarayıcı açılır pencerelerine izin verin.");
      return;
    }

    printWindow.document.open();
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>${docTitle || "Sozlesme"}</title>
          <script src="https://cdn.tailwindcss.com"></script>
          <style>
            @page {
              size: A4;
              margin: 12mm 15mm;
            }
            body {
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
              background-color: #ffffff !important;
              color: #000000 !important;
              margin: 0;
              padding: 0;
            }
            .page-break {
              page-break-before: always;
            }
            @media print {
              .no-print {
                display: none !important;
              }
            }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          ${htmlContent}
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  const handleCopyHtml = async () => {
    try {
      await navigator.clipboard.writeText(htmlContent);
      toast.success("Sözleşme HTML kodu panoya kopyalandı");
    } catch {
      toast.error("Kopyalama başarısız");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative flex flex-col w-full max-w-5xl h-[92vh] rounded-2xl bg-white shadow-2xl dark:bg-dark-800 border border-gray-200 dark:border-dark-700 overflow-hidden">
        {/* Üst Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-200 px-6 py-4 dark:border-dark-700 bg-gray-50/70 dark:bg-dark-850">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-primary-100 text-primary-700 dark:bg-primary-950/50 dark:text-primary-300">
              <PrinterIcon className="size-6" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-800 dark:text-dark-50">
                Sözleşme Baskı ve PDF Önizleme
              </h2>
              <p className="text-xs text-gray-500 dark:text-dark-300">
                {documentNo ? `Evrak No: ${documentNo}` : docTitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {templates.length > 0 && (
              <div className="w-56">
                <Select
                  value={selectedTemplateId}
                  onChange={(e) => setSelectedTemplateId(e.target.value)}
                  className="text-xs"
                >
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name} {t.isDefault ? "(Varsayılan)" : ""}
                    </option>
                  ))}
                </Select>
              </div>
            )}

            {/* Yakınlaştırma */}
            <div className="hidden sm:flex items-center bg-gray-200 dark:bg-dark-700 rounded-lg p-0.5 text-xs font-semibold">
              <button
                type="button"
                onClick={() => setZoom(75)}
                className={`px-2 py-1 rounded ${zoom === 75 ? "bg-white dark:bg-dark-600 shadow-xs" : ""}`}
              >
                %75
              </button>
              <button
                type="button"
                onClick={() => setZoom(100)}
                className={`px-2 py-1 rounded ${zoom === 100 ? "bg-white dark:bg-dark-600 shadow-xs" : ""}`}
              >
                %100
              </button>
              <button
                type="button"
                onClick={() => setZoom(120)}
                className={`px-2 py-1 rounded ${zoom === 120 ? "bg-white dark:bg-dark-600 shadow-xs" : ""}`}
              >
                %120
              </button>
            </div>

            <Button
              variant="flat"
              isIcon
              onClick={onClose}
              className="size-9 rounded-xl hover:bg-gray-200 dark:hover:bg-dark-700"
            >
              <XMarkIcon className="size-5" />
            </Button>
          </div>
        </div>

        {/* Gövde / A4 Kağıt Önizlemesi */}
        <div className="flex-1 overflow-y-auto bg-gray-150 dark:bg-dark-900 p-4 sm:p-8 flex justify-center">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-24">
              <Spinner className="size-10 text-primary-600" />
              <p className="text-sm text-gray-500">Sözleşme verileri derleniyor...</p>
            </div>
          ) : (
            <div
              style={{
                transform: `scale(${zoom / 100})`,
                transformOrigin: "top center",
                transition: "transform 0.15s ease",
              }}
              className="w-full max-w-[210mm] min-h-[297mm] bg-white text-black shadow-xl rounded-sm p-8 sm:p-12"
              dangerouslySetInnerHTML={{ __html: htmlContent }}
            />
          )}
        </div>

        {/* Alt Bar */}
        <div className="flex items-center justify-between border-t border-gray-200 px-6 py-3.5 dark:border-dark-700 bg-white dark:bg-dark-800">
          <Button
            variant="flat"
            onClick={handleCopyHtml}
            className="gap-1.5 text-xs text-gray-600 dark:text-dark-300"
          >
            <DocumentDuplicateIcon className="size-4" /> HTML Kopyala
          </Button>

          <div className="flex items-center gap-2">
            <Button variant="outlined" onClick={onClose}>
              Kapat
            </Button>
            <Button
              color="primary"
              className="gap-2 bg-primary-600 hover:bg-primary-700 text-white shadow-sm"
              onClick={handlePrint}
            >
              <PrinterIcon className="size-5" /> Yazdır / PDF Olarak Kaydet
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
