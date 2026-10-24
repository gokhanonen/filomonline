import {
  Popover,
  PopoverButton,
  PopoverPanel,
  Tab,
  TabGroup,
  TabList,
  Transition,
} from "@headlessui/react";
import {
  BanknotesIcon,
  CheckIcon,
  Cog6ToothIcon,
  DocumentTextIcon,
  TruckIcon,
  UserGroupIcon,
  BellIcon,
  ArrowRightIcon,
} from "@heroicons/react/24/outline";
import clsx from "clsx";
import React, { Fragment, useCallback, useEffect, useState, FocusEvent } from "react";
import { Link, useNavigate } from "react-router";
import { toast } from "sonner";

// Local Imports
import {
  Avatar,
  type AvatarProps,
  Badge,
  Button,
} from "@/components/ui";
import { useThemeContext } from "@/app/contexts/theme/context";
import { ACTIVITY_META, type ActivityLog } from "@/@types/activity";
import {
  listActivity,
  markActivityRead,
  markAllActivityRead,
  unreadActivityCount,
} from "@/services/activityService";
import { useRealtime } from "@/hooks/useRealtime";
import AlarmIcon from "@/assets/dualicons/alarm.svg?react";
import GirlEmptyBox from "@/assets/illustrations/girl-empty-box.svg?react";

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

const TABS = [
  { key: "all", label: "Tümü" },
  { key: "unread", label: "Okunmamış" },
  { key: "vehicles", label: "Araçlar" },
  { key: "contracts", label: "Sözleşmeler" },
  { key: "finance", label: "Finans" },
  { key: "accounts", label: "Cariler" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

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
  return { Icon: BellIcon, color: "info" };
}

export function Notifications() {
  const [notifications, setNotifications] = useState<ActivityLog[]>([]);
  const [unread, setUnread] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<number>(0);
  const navigate = useNavigate();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, count] = await Promise.all([
        listActivity({ pageSize: 30 }),
        unreadActivityCount(),
      ]);
      setNotifications(list.items);
      setUnread(count);
    } catch {
      /* sessiz */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useRealtime<ActivityLog>("activity", (row) => {
    setNotifications((prev) => [row, ...prev.filter((x) => x.id !== row.id)].slice(0, 30));
    setUnread((n) => n + 1);
    toast(row.title, {
      description: row.description,
      action: row.link
        ? {
            label: "Görüntüle",
            onClick: () => navigate(row.link!),
          }
        : undefined,
    });
  });

  const currentTabKey: TabKey = TABS[activeTab]?.key ?? "all";

  const filteredNotifications = notifications.filter((item) => {
    if (currentTabKey === "all") return true;
    if (currentTabKey === "unread") return !item.read;
    if (currentTabKey === "vehicles") return item.type.startsWith("VEHICLE_");
    if (currentTabKey === "contracts")
      return item.type.startsWith("CONTRACT_") || item.type.startsWith("RENTAL_");
    if (currentTabKey === "finance")
      return item.type.startsWith("EXPENSE_") || item.type.startsWith("INVOICE_");
    if (currentTabKey === "accounts") return item.type.startsWith("ACCOUNT_");
    return true;
  });

  const handleReadOne = async (item: ActivityLog) => {
    if (item.read) return;
    setNotifications((prev) =>
      prev.map((x) => (x.id === item.id ? { ...x, read: true } : x)),
    );
    setUnread((count) => Math.max(0, count - 1));
    markActivityRead(item.id).catch(() => void 0);
  };

  const handleClearAll = async () => {
    setNotifications((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnread(0);
    await markAllActivityRead().catch(() => void 0);
    toast.success("Tüm bildirimler okundu sayıldı.");
  };

  const handleItemClick = (item: ActivityLog, close: () => void) => {
    handleReadOne(item);
    close();
    if (item.link) {
      navigate(item.link);
    } else {
      navigate("/activity");
    }
  };

  return (
    <Popover className="relative flex">
      <PopoverButton
        as={Button}
        variant="flat"
        isIcon
        className="relative size-9 rounded-full"
        title="Bildirimler"
      >
        <AlarmIcon className="size-6 text-gray-900 dark:text-dark-100" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex min-w-4.5 h-4.5 items-center justify-center rounded-full bg-error px-1 text-[10px] font-bold text-white shadow-xs">
            {unread > 99 ? "99+" : unread}
          </span>
        )}
      </PopoverButton>
      <Transition
        enter="transition ease-out"
        enterFrom="opacity-0 translate-y-2"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 translate-y-2"
      >
        <PopoverPanel
          anchor={{ to: "bottom end", gap: 8 }}
          className="z-70 mx-4 flex h-[min(34rem,calc(100vh-6rem))] w-[calc(100vw-2rem)] flex-col rounded-xl border border-gray-150 bg-white shadow-soft dark:border-dark-700 dark:bg-dark-700 dark:shadow-soft-dark sm:m-0 sm:w-96"
        >
          {({ close }: { close: () => void }) => (
            <div className="flex grow flex-col overflow-hidden">
              {/* Header */}
              <div className="border-b border-gray-150 bg-gray-50/80 px-4 py-3 dark:border-dark-600 dark:bg-dark-800">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-gray-800 dark:text-dark-100">
                      Bildirimler
                    </h3>
                    {unread > 0 && (
                      <Badge
                        color="error"
                        className="h-5 rounded-full px-2 text-xs font-semibold"
                        variant="soft"
                      >
                        {unread} okunmamış
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {unread > 0 && (
                      <button
                        type="button"
                        onClick={handleClearAll}
                        className="flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-primary-600 hover:bg-primary-50 dark:text-primary-400 dark:hover:bg-primary-500/10"
                        title="Tümünü okundu olarak işaretle"
                      >
                        <CheckIcon className="size-3.5" />
                        <span>Tümünü Oku</span>
                      </button>
                    )}
                    <Button
                      component={Link}
                      to="/settings"
                      className="size-7 rounded-full text-gray-500 hover:text-gray-700 dark:text-dark-300 dark:hover:text-dark-100"
                      isIcon
                      variant="flat"
                      onClick={close}
                      title="Ayarlar"
                    >
                      <Cog6ToothIcon className="size-4" />
                    </Button>
                  </div>
                </div>
              </div>

              {/* Tabs */}
              <TabGroup
                as={Fragment}
                selectedIndex={activeTab}
                onChange={setActiveTab}
              >
                <TabList className="hide-scrollbar flex shrink-0 overflow-x-auto border-b border-gray-150 bg-white px-2 scroll-smooth dark:border-dark-600 dark:bg-dark-800">
                  {TABS.map((tab) => (
                    <Tab
                      key={tab.key}
                      onFocus={(e: FocusEvent<HTMLButtonElement>) => {
                        const target = e.target;
                        const parent = target.parentNode as HTMLElement;
                        if (parent) {
                          parent.scrollLeft =
                            target.offsetLeft - parent.offsetWidth / 2;
                        }
                      }}
                      className={({ selected }: { selected: boolean }) =>
                        clsx(
                          "shrink-0 scroll-mx-8 whitespace-nowrap border-b-2 px-3 py-2 text-xs font-medium transition-colors",
                          selected
                            ? "border-primary-600 text-primary-600 dark:border-primary-500 dark:text-primary-400 font-semibold"
                            : "border-transparent text-gray-500 hover:text-gray-800 dark:text-dark-300 dark:hover:text-dark-100",
                        )
                      }
                      as={Button}
                      unstyled
                    >
                      {tab.label}
                      {tab.key === "unread" && unread > 0 && (
                        <span className="ml-1.5 rounded-full bg-error/15 px-1.5 py-0.2 text-[10px] font-bold text-error">
                          {unread}
                        </span>
                      )}
                    </Tab>
                  ))}
                </TabList>

                {/* List Content */}
                <div className="custom-scrollbar grow divide-y divide-gray-100 overflow-y-auto dark:divide-dark-600">
                  {loading && notifications.length === 0 ? (
                    <div className="py-12 text-center text-xs text-gray-400 dark:text-dark-300">
                      Bildirimler yükleniyor...
                    </div>
                  ) : filteredNotifications.length > 0 ? (
                    filteredNotifications.map((item) => (
                      <NotificationItem
                        key={item.id}
                        data={item}
                        onClick={() => handleItemClick(item, close)}
                      />
                    ))
                  ) : (
                    <Empty />
                  )}
                </div>
              </TabGroup>

              {/* Footer */}
              <div className="flex shrink-0 items-center justify-between border-t border-gray-150 bg-gray-50 px-4 py-2.5 dark:border-dark-600 dark:bg-dark-800">
                <Link
                  to="/activity"
                  onClick={close}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary-600 hover:underline dark:text-primary-400"
                >
                  <span>Tüm aktivite geçmişi</span>
                  <ArrowRightIcon className="size-3" />
                </Link>
                {unread > 0 && (
                  <button
                    type="button"
                    onClick={handleClearAll}
                    className="text-xs text-gray-500 hover:text-gray-800 dark:text-dark-300 dark:hover:text-dark-100"
                  >
                    Tümünü okundu say
                  </button>
                )}
              </div>
            </div>
          )}
        </PopoverPanel>
      </Transition>
    </Popover>
  );
}

function Empty() {
  const { primaryColorScheme: primary, darkColorScheme: dark } =
    useThemeContext();
  return (
    <div className="grid grow place-items-center py-10 text-center">
      <div>
        <GirlEmptyBox
          className="mx-auto w-32 opacity-90"
          style={
            {
              "--primary": primary[500],
              "--dark": dark[500],
            } as React.CSSProperties
          }
        />
        <div className="mt-4">
          <p className="text-sm font-medium text-gray-700 dark:text-dark-200">
            Henüz bildirim yok
          </p>
          <p className="mt-1 text-xs text-gray-400 dark:text-dark-400">
            Sistemdeki tüm işlemler burada anlık olarak listelenir.
          </p>
        </div>
      </div>
    </div>
  );
}

interface NotificationItemProps {
  data: ActivityLog;
  onClick: () => void;
}

function NotificationItem({ data, onClick }: NotificationItemProps) {
  const visual = getItemVisual(data.type);
  const meta = ACTIVITY_META[data.type] ?? ACTIVITY_META.SYSTEM;
  const Icon = visual.Icon;

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className={clsx(
        "group flex cursor-pointer items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-100/70 dark:hover:bg-dark-600/60",
        !data.read
          ? "bg-primary-50/40 dark:bg-primary-500/5 font-medium"
          : "bg-transparent",
      )}
    >
      <div className="relative mt-0.5 shrink-0">
        <Avatar
          size={9}
          initialColor={visual.color}
          classNames={{ display: "rounded-lg" }}
        >
          <Icon className="size-4.5" />
        </Avatar>
        {!data.read && (
          <span className="absolute -top-1 -right-1 size-2.5 rounded-full border-2 border-white bg-error dark:border-dark-700" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p
            className={clsx(
              "truncate text-xs font-semibold",
              data.read
                ? "text-gray-700 dark:text-dark-100"
                : "text-gray-900 dark:text-dark-50",
            )}
          >
            {data.title}
          </p>
          <span className="shrink-0 text-[10px] text-gray-400 dark:text-dark-300">
            {timeAgo(data.createdAt)}
          </span>
        </div>

        <p className="mt-0.5 line-clamp-2 text-xs text-gray-500 dark:text-dark-300">
          {data.description}
        </p>

        <div className="mt-1.5 flex items-center gap-2 text-[11px] text-gray-400 dark:text-dark-400">
          <span
            className={clsx(
              "inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-medium text-white",
              meta.color,
            )}
          >
            {meta.label}
          </span>
          {data.userName && (
            <span className="truncate text-gray-500 dark:text-dark-300">
              • {data.userName}
            </span>
          )}
          {data.link && (
            <span className="ml-auto text-[10px] text-primary-600 group-hover:underline dark:text-primary-400">
              Git →
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
