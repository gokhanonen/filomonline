// Import Dependencies
import { Outlet } from "react-router";

// Local Imports
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useAuthContext } from "@/app/contexts/auth/context";

// ----------------------------------------------------------------------

export default function Sideblock() {
  const { activeCompanyId } = useAuthContext();
  return (
    <>
      <Header />
      <main
        key={activeCompanyId ?? "no-company"}
        className="main-content transition-content grid grid-cols-1"
      >
        <Outlet />
      </main>
      <Sidebar />
    </>
  );
}