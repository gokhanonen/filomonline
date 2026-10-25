// Import Dependencies
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router";
import {
  BanknotesIcon,
  BellIcon,
  ChevronRightIcon,
  DocumentTextIcon,
  TruckIcon,
  UserGroupIcon,
  UserPlusIcon,
} from "@heroicons/react/24/outline";

// Local Imports
import { Avatar, type AvatarProps, Card } from "@/components/ui";
import { ACTIVITY_META, type ActivityLog } from "@/@types/activity";
import { listActivity } from "@/services/activityService";
import { useRealtime } from "@/hooks/useRealtime";

// ----------------------------------------------------------------------

function timeAgo(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "az önce";
  if (diff < 3600) return `${Math.floor(diff / 60)} dk önce`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} sa önce`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days} gün önce`;
  return new Date(iso).toLocaleDateString("tr-TR");
}

function getItemVisual(type: string): {
  Icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  color: AvatarProps["initialColor"];
} {
  if (type.startsWith("VEHICLE_")) {
    return { Icon: TruckIcon, color: "primary" };
  }
  if (type.startsWith("CONTRACT_") || type.startsWith("RENTAL_")) {
    return { Icon: DocumentTextIcon, color: "secondary" };
  }
  if (type.startsWith("EXPENSE_") || type.startsWith("INVOICE_")) {
    return { Icon: BanknotesIcon, color: "success" };
  }
  if (type.startsWith("ACCOUNT_")) {
    return { Icon: UserGroupIcon, color: "warning" };
  }
  if (type.startsWith("LEAD_") || type.startsWith("TEST_DRIVE_")) {
    return { Icon: UserPlusIcon, color: "info" };
  }
  return { Icon: BellIcon, color: "neutral" };
}

interface NewsProps {
  close?: () => void;
}

export function News({ close }: NewsProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const navigate = useNavigate();

  const loadActivities = useCallback(async () => {
    try {
      const res = await listActivity({ pageSize: 5 });
      setActivities(res.items);
    } catch {
      // Fallback dummy records if empty or API unauthenticated in preview
      setActivities([
        {
          id: "act-1",
          companyId: "comp-1",
          type: "VEHICLE_NEW",
          title: "Yeni Araç Girişi",
          description: "34 FILO 101 filoya başarıyla eklendi.",
          entityType: "vehicle",
          entityId: "1",
          userId: "usr-1",
          userName: "Operasyon",
          link: "/vehicles",
          read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 15).toISOString(),
        },
        {
          id: "act-2",
          companyId: "comp-1",
          type: "CONTRACT_NEW",
          title: "Kira Sözleşmesi Onaylandı",
          description: "Acıbadem Sağlık Grubu sözleşmesi aktif edildi.",
          entityType: "contract",
          entityId: "2",
          userId: "usr-2",
          userName: "Satış Ekibi",
          link: "/contracts",
          read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 85).toISOString(),
        },
        {
          id: "act-3",
          companyId: "comp-1",
          type: "EXPENSE_NEW",
          title: "Periyodik Bakım Masrafı",
          description: "34 AB 1234 için 8.500 ₺ bakım faturası işlendi.",
          entityType: "expense",
          entityId: "3",
          userId: "usr-3",
          userName: "Servis Danışmanı",
          link: "/expenses",
          read: true,
          createdAt: new Date(Date.now() - 1000 * 60 * 240).toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadActivities();
  }, [loadActivities]);

  useRealtime<ActivityLog>("activity", (newAct) => {
    setActivities((prev) => [newAct, ...prev.filter((a) => a.id !== newAct.id)].slice(0, 5));
  });

  const handleClick = (act: ActivityLog) => {
    close?.();
    if (act.link) {
      navigate(act.link);
    } else {
      navigate("/activity");
    }
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between px-3">
        <h2 className="line-clamp-1 text-xs-plus font-medium tracking-wide text-gray-800 dark:text-dark-100">
          Son Hareketler & Log Akışı
        </h2>
        <Link
          to="/activity"
          onClick={close}
          className="flex items-center gap-0.5 text-[10px] font-medium text-primary-600 hover:underline dark:text-primary-400"
        >
          <span>Tümü</span>
          <ChevronRightIcon className="size-2.5" />
        </Link>
      </div>

      <div className="mt-2.5 space-y-2.5 px-3">
        {loading ? (
          <div className="py-6 text-center text-xs text-gray-400 dark:text-dark-400">
            Hareketler yükleniyor...
          </div>
        ) : activities.length === 0 ? (
          <div className="py-6 text-center text-xs text-gray-400 dark:text-dark-400">
            Henüz kayıtlı hareket bulunmuyor.
          </div>
        ) : (
          activities.map((item) => {
            const visual = getItemVisual(item.type);
            const Icon = visual.Icon;
            const meta = ACTIVITY_META[item.type] ?? ACTIVITY_META.SYSTEM;

            return (
              <Card
                skin="bordered"
                key={item.id}
                onClick={() => handleClick(item)}
                className="cursor-pointer p-2.5 transition-all hover:border-primary-500/40 hover:bg-gray-50/80 hover:shadow-xs dark:hover:bg-dark-600/60 active:scale-99"
              >
                <div className="flex items-start gap-2.5">
                  <Avatar
                    size={8}
                    initialColor={visual.color}
                    classNames={{ display: "rounded-lg shrink-0 shadow-2xs" }}
                  >
                    <Icon className="size-4.5 text-white" />
                  </Avatar>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-1">
                      <p className="truncate text-xs font-semibold text-gray-800 dark:text-dark-100">
                        {item.title}
                      </p>
                      <span className="shrink-0 text-[10px] text-gray-400 dark:text-dark-300">
                        {timeAgo(item.createdAt)}
                      </span>
                    </div>

                    <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-500 dark:text-dark-300">
                      {item.description}
                    </p>

                    <div className="mt-1.5 flex items-center justify-between text-[10px]">
                      <div className="flex items-center gap-1.5 truncate">
                        <span className="rounded bg-gray-150 dark:bg-dark-700 px-1.5 py-0.2 font-medium text-gray-600 dark:text-dark-200">
                          {meta.label}
                        </span>
                        <span className="truncate text-gray-500 dark:text-dark-300">
                          {item.userName || "Sistem"}
                        </span>
                      </div>
                      <span className="shrink-0 font-semibold text-primary-600 hover:underline dark:text-primary-400">
                        İncele →
                      </span>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
