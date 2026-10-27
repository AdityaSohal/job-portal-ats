import { useQuery } from "@tanstack/react-query";
import api from "../lib/api";

const pending = async (path) => (await api.get(path, { params: { status: "pending", limit: 1 } })).data.total;

// How many companies and jobs are waiting for review (for the badges on the tabs)
export function useQueues() {
  return useQuery({
    queryKey: ["a", "queues"],
    queryFn: async () => {
      const [companies, jobs] = await Promise.all([pending("/admin/companies"), pending("/admin/jobs")]);
      return { companies, jobs };
    },
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });
}