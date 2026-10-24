// Import Dependencies
import { Navigate, useOutlet } from "react-router";

// Local Imports
import { useAuthContext } from "@/app/contexts/auth/context";
import { HOME_PATH, REDIRECT_URL_KEY } from "@/constants/app";

// ----------------------------------------------------------------------


export default function GhostGuard() {
  const outlet = useOutlet();
  const { isAuthenticated } = useAuthContext();

  // redirect parametresi yoksa .get() null döner; "null" string'ine çevirmeyelim.
  const redirect = new URLSearchParams(window.location.search).get(
    REDIRECT_URL_KEY,
  );

  if (isAuthenticated) {
    const target = redirect && redirect !== "null" ? redirect : HOME_PATH;
    return <Navigate to={target} replace />;
  }

  return <>{outlet}</>;
}
