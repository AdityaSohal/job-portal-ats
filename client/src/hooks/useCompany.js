import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";

// The recruiter's company, with its review status (an admin can change it at any time)
export function useCompany() {
  return useQuery({
    queryKey: ["r", "company"],
    queryFn: async () => (await api.get("/companies/me")).data.company,
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });
}