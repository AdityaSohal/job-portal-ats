import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "../store/auth";
import { homeFor } from "../lib/roles";
import Splash from "./Splash";

// Only for logged-in users with one of the given roles
export function RequireRole({ roles }) {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const location = useLocation();

  if (status === "loading") return <Splash />;
  if (status === "guest") return <Navigate to="/login" replace state={{ from: location }} />;
  if (roles && !roles.includes(user.role)) return <Navigate to={homeFor(user.role)} replace />;
  return <Outlet />;
}

// Login, register and similar pages: logged-in users are sent onwards
export function GuestOnly() {
  const status = useAuth((s) => s.status);
  const user = useAuth((s) => s.user);
  const location = useLocation();

  if (status === "loading") return <Splash />;
  if (status === "authed") {
    const home = homeFor(user.role);
    // Return to the page they wanted: their own dashboard area, or the public job pages
    const from = location.state?.from;
    const path = from?.pathname || "";
    const allowed = path.startsWith(home) || path === "/jobs" || path.startsWith("/jobs/");
    return <Navigate to={allowed ? `${path}${from.search || ""}` : home} replace />;
  }
  return <Outlet />;
}