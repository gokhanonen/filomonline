import { useEffect, useState } from "react";
import {
  CalendarDaysIcon,
  PhoneIcon,
  CheckCircleIcon,
  XCircleIcon,
  StarIcon,
} from "@heroicons/react/24/outline";
import { StarIcon as StarSolid } from "@heroicons/react/20/solid";
import { toast } from "sonner";
import { Page } from "@/components/shared/Page";
import { Button, Card, Select, Spinner, Tag } from "@/components/ui";
import {
  listTestDrives,
  updateTestDrive,
  type LeadTestDrive,
  type TestDriveStatus,
} from "@/services/crmService";
import { TEST_DRIVE_STATUS_CONFIG } from "./constants";

export default function TestDrivesPage() {
  const [testDrives, setTestDrives] = useState<LeadTestDrive[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await listTestDrives();
      setTestDrives(data);
    } catch {
      toast.error("Deneme sürüşleri yüklenemedi.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStatusChange = async (id: string, status: TestDriveStatus) => {
    try {
      await updateTestDrive(id, { status });
      toast.success("Randevu durumu güncellendi.");
      loadData();
    } catch {
      toast.error("İşlem başarısız.");
    }
  };

  const filtered = testDrives.filter((td) => {
    if (statusFilter !== "ALL" && td.status !== statusFilter) return false;
    return true;
  });

  return (
    <Page title="Deneme Sürüşleri & Randevular">
      <div className="w-full px-(--margin-x) py-6 space-y-6">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-dark-50">
              Deneme Sürüşleri & Randevular
            </h2>
            <p className="text-sm text-gray-500 dark:text-dark-300">
              Müşteri adayları ile planlanan araç deneme sürüşü randevuları ve sürüş değerlendirmeleri
            </p>
          </div>

          <Select
            className="w-44 text-xs"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            data={[
              { value: "ALL", label: "Tüm Durumlar" },
              ...Object.entries(TEST_DRIVE_STATUS_CONFIG).map(([k, v]) => ({
                value: k,
                label: v.label,
              })),
            ]}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Spinner className="size-8" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center text-xs text-gray-400 dark:border-dark-700">
            Planlanmış deneme sürüşü randevusu bulunamadı.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((td) => {
              const cfg = TEST_DRIVE_STATUS_CONFIG[td.status];
              const dateObj = new Date(td.scheduledAt);

              return (
                <Card key={td.id} className="flex flex-col justify-between p-5">
                  <div>
                    {/* Üst Kısım: Tarih & Durum */}
                    <div className="flex items-center justify-between border-b border-gray-100 pb-3 dark:border-dark-700">
                      <div className="flex items-center gap-2 text-xs font-semibold text-gray-900 dark:text-dark-50">
                        <CalendarDaysIcon className="size-4 text-primary-500" />
                        <span>{dateObj.toLocaleDateString("tr-TR")}</span>
                        <span className="text-gray-400">
                          {dateObj.toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      {cfg && (
                        <Tag color={cfg.color} className="text-tiny">
                          {cfg.label}
                        </Tag>
                      )}
                    </div>

                    {/* Araç & Müşteri */}
                    <div className="mt-3.5 space-y-2">
                      <div>
                        <div className="text-tiny font-medium text-gray-400">Araç</div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-gray-900 dark:text-dark-50">
                            {td.vehicle?.plate}
                          </span>
                          <span className="text-xs text-gray-700 dark:text-dark-200">
                            {td.vehicle?.brandName} {td.vehicle?.modelName} ({td.vehicle?.year})
                          </span>
                        </div>
                      </div>

                      <div>
                        <div className="text-tiny font-medium text-gray-400">Müşteri Adayı</div>
                        <div className="text-xs font-semibold text-gray-900 dark:text-dark-50">
                          {td.lead?.fullName}
                        </div>
                        {td.lead?.phone && (
                          <div className="flex items-center gap-1.5 text-tiny font-mono text-gray-500">
                            <PhoneIcon className="size-3 text-gray-400" />
                            <span>{td.lead.phone}</span>
                          </div>
                        )}
                      </div>

                      {td.driverLicenseNo && (
                        <div className="text-tiny text-gray-500">
                          Ehliyet No: <span className="font-mono">{td.driverLicenseNo}</span>
                        </div>
                      )}

                      {/* Değerlendirme & Puan */}
                      {td.feedbackRating && (
                        <div className="mt-2 rounded-lg bg-amber-50/60 p-2.5 dark:bg-amber-950/20">
                          <div className="flex items-center gap-1 text-amber-500">
                            {[1, 2, 3, 4, 5].map((s) =>
                              s <= (td.feedbackRating || 0) ? (
                                <StarSolid key={s} className="size-3.5" />
                              ) : (
                                <StarIcon key={s} className="size-3.5" />
                              ),
                            )}
                          </div>
                          {td.feedbackNotes && (
                            <p className="mt-1 text-tiny text-gray-700 dark:text-dark-200">
                              {td.feedbackNotes}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Alt Durum Değiştirici Butonlar */}
                  {td.status === "SCHEDULED" && (
                    <div className="mt-4 flex gap-2 border-t border-gray-100 pt-3 dark:border-dark-700">
                      <Button
                        color="success"
                        className="flex-1 gap-1 px-2.5 py-1 text-xs"
                        onClick={() => handleStatusChange(td.id, "COMPLETED")}
                      >
                        <CheckCircleIcon className="size-3.5" />
                        <span>Tamamlandı</span>
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        className="px-2.5 py-1 text-xs"
                        onClick={() => handleStatusChange(td.id, "CANCELLED")}
                      >
                        <XCircleIcon className="size-3.5" />
                        <span>İptal</span>
                      </Button>
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Page>
  );
}
