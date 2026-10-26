import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";
import { useAuth } from "../store/auth";

// These only run for candidates: other roles would get a 403
export function useProfile() {
  const enabled = useAuth((s) => s.user?.role) === "candidate";
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => (await api.get("/profile/me")).data,
    enabled,
  });
}

// The 50 most recent applications: enough to show "Applied" on a job page
export function useMyApplications() {
  const enabled = useAuth((s) => s.user?.role) === "candidate";
  return useQuery({
    queryKey: ["my-applications", "recent"],
    queryFn: async () => (await api.get("/applications/me", { params: { limit: 50 } })).data.items,
    enabled,
  });
}