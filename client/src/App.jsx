import { useEffect } from "react";
import { Route, Routes } from "react-router-dom";
import { useAuth } from "./store/auth";
import { GuestOnly, RequireRole } from "./components/RouteGuards";
import PublicLayout from "./components/PublicLayout";
import CandidateLayout from "./components/CandidateLayout";
import RecruiterLayout from "./components/recruiter/RecruiterLayout";
import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import VerifyEmail from "./pages/VerifyEmail";
import ForgotPassword from "./pages/ForgotPassword";
import Jobs from "./pages/Jobs";
import JobDetail from "./pages/JobDetail";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound";
import CandidateHome from "./pages/candidate/CandidateHome";
import MyApplications from "./pages/candidate/MyApplications";
import ApplicationDetail from "./pages/candidate/ApplicationDetail";
import SavedJobs from "./pages/candidate/SavedJobs";
import Profile from "./pages/candidate/Profile";
import Alerts from "./pages/candidate/Alerts";
import Settings from "./pages/candidate/Settings";
import RecruiterHome from "./pages/recruiter/RecruiterHome";
import MyJobs from "./pages/recruiter/MyJobs";
import JobEditor from "./pages/recruiter/JobEditor";
import Applicants from "./pages/recruiter/Applicants";
import Interviews from "./pages/recruiter/Interviews";
import CompanyPage from "./pages/recruiter/CompanyPage";

export default function App() {
  // Ask the server who is logged in (the session lives in an httpOnly cookie)
  useEffect(() => {
    useAuth.getState().bootstrap();
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route element={<PublicLayout />}>
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/jobs/:id" element={<JobDetail />} />
      </Route>

      <Route element={<GuestOnly />}>
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
      </Route>

      <Route element={<RequireRole roles={["candidate"]} />}>
        <Route path="/candidate" element={<CandidateLayout />}>
          <Route index element={<CandidateHome />} />
          <Route path="applications" element={<MyApplications />} />
          <Route path="applications/:id" element={<ApplicationDetail />} />
          <Route path="saved" element={<SavedJobs />} />
          <Route path="profile" element={<Profile />} />
          <Route path="alerts" element={<Alerts />} />
          <Route path="settings" element={<Settings />} />
        </Route>
      </Route>

      <Route element={<RequireRole roles={["recruiter"]} />}>
        <Route path="/recruiter" element={<RecruiterLayout />}>
          <Route index element={<RecruiterHome />} />
          <Route path="jobs" element={<MyJobs />} />
          <Route path="jobs/new" element={<JobEditor />} />
          <Route path="jobs/:id/edit" element={<JobEditor />} />
          <Route path="jobs/:id/applicants" element={<Applicants />} />
          <Route path="interviews" element={<Interviews />} />
          <Route path="company" element={<CompanyPage />} />
        </Route>
      </Route>

      <Route element={<RequireRole roles={["admin"]} />}>
        <Route path="/admin" element={<Dashboard />} />
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}