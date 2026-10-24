// Import Dependencies
import clsx from "clsx";
import { Outlet } from "react-router";

// Local Imports
import { Header } from "./Header";
import { Sidebar } from "./Sidebar";
import { useAuthContext } from "@/app/contexts/auth/context";

// ----------------------------------------------------------------------

export default function MainLayout() {
  // Firma değişince (switchCompany) tüm sayfa ağacını yeniden kur ki
  // veriler aktif firmaya göre tekrar çekilsin.
  const { activeCompanyId } = useAuthContext();
  return (
    <>
      <Header />
      <main
        key={activeCompanyId ?? "no-company"}
        className={clsx("main-content transition-content grid grid-cols-1")}
      >
        <Outlet />
      </main>
      <Sidebar />
    </>
  );
}
