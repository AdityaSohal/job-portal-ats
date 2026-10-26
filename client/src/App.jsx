import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { useAuth } from "./store/auth";
import { GuestOnly, RequireRole } from "./components/RouteGuards";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";

export default function App() {
  // Ask the server who is logged in (the session lives in an httpOnly cookie)
  useEffect(() => {
    useAuth.getState().bootstrap();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route element={<GuestOnly />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      <Route element={<RequireRole roles={["candidate"]} />}>
        <Route path="/candidate" element={<Dashboard />} />
      </Route>
      <Route element={<RequireRole roles={["recruiter"]} />}>
        <Route path="/recruiter" element={<Dashboard />} />
      </Route>
      <Route element={<RequireRole roles={["admin"]} />}>
        <Route path="/admin" element={<Dashboard />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}