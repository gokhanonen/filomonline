// API ile web/mobil arasında paylaşılan tipler ve sabitler buraya gelecek.
// (DTO tipleri, izin anahtarları, enum eşlemeleri...)

/** İzin anahtarları — modul.eylem düzeni */
export const PERMISSIONS = {
  vehicles: ["vehicles.read", "vehicles.write", "vehicles.delete"],
  accounts: ["accounts.read", "accounts.write", "accounts.delete"],
  products: ["products.read", "products.write", "products.delete"],
  invoices: ["invoices.read", "invoices.write", "invoices.delete"],
  expenses: ["expenses.read", "expenses.write", "expenses.delete"],
  rentals: ["rentals.read", "rentals.write", "rentals.delete"],
  contracts: ["contracts.read", "contracts.write", "contracts.delete"],
  locations: ["locations.read", "locations.write"],
  documents: ["documents.read", "documents.write", "documents.delete"],
  reports: ["reports.read"],
  settings: ["settings.read", "settings.write"],
  users: ["users.read", "users.write"],
} as const;
