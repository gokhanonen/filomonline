import { ElementType } from "react";
import {
  TbApps,
  TbBell,
  TbBuilding,
  TbBuildingSkyscraper,
  TbCar,
  TbChartBar,
  TbCoins,
  TbDevices,
  TbFileInvoice,
  TbKey,
  TbLayoutDashboard,
  TbMapPin,
  TbPackage,
  TbPalette,
  TbReceipt,
  TbReportMoney,
  TbSettings,
  TbUser,
  TbUsers,
  TbUsersGroup,
  TbListDetails,
  TbActivity,
  TbMessages,
  TbContract,
  TbTransfer,
} from "react-icons/tb";

/**
 * Navigasyon ikon kayıt defteri. Menü, bulunmayan bir ikon anahtarında
 * hata fırlatır; bu yüzden navigasyonda kullanılan her `icon` burada olmalı.
 */
export const navigationIcons: Record<string, ElementType> = {
  // Modüller
  dashboard: TbLayoutDashboard,
  vehicles: TbCar,
  accounts: TbUsers,
  products: TbPackage,
  locations: TbMapPin,
  invoices: TbFileInvoice,
  expenses: TbReceipt,
  rentals: TbKey,
  reports: TbChartBar,
  users: TbUsersGroup,
  tenants: TbBuildingSkyscraper,
  company: TbBuilding,
  companies: TbBuilding,
  catalog: TbListDetails,
  activity: TbActivity,
  chat: TbMessages,
  contracts: TbContract,
  transfers: TbTransfer,

  // Ayarlar segmenti
  settings: TbSettings,
  "settings.general": TbUser,
  "settings.appearance": TbPalette,
  "settings.billing": TbCoins,
  "settings.notifications": TbBell,
  "settings.applications": TbApps,
  "settings.sessions": TbDevices,

  // Segment kök ikonları
  finance: TbReportMoney,
};
