import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import api, { getError } from "../lib/api";
import { useAuth } from "../store/auth";

const KEY = ["saved-ids"];

export function useSavedJobs() {
  const qc = useQueryClient();
  const enabled = useAuth((s) => s.user?.role) === "candidate";

  const { data } = useQuery({
    queryKey: KEY,
    queryFn: async () => (await api.get("/saved-jobs/ids")).data.ids,
    enabled,
  });
  const ids = useMemo(() => new Set(data || []), [data]);

  const mutation = useMutation({
    mutationFn: ({ id, save }) => (save ? api.post("/saved-jobs", { jobId: id }) : api.delete(`/saved-jobs/${id}`)),
    // Update the heart straight away, and undo it if the server says no
    onMutate: async ({ id, save }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const previous = qc.getQueryData(KEY);
      qc.setQueryData(KEY, (old = []) => (save ? [...new Set([...old, id])] : old.filter((x) => x !== id)));
      return { previous };
    },
    onError: (err, vars, context) => {
      qc.setQueryData(KEY, context?.previous);
      const info = getError(err);
      if (!(info.status === 404 && !vars.save)) toast.error(info.message); // removing something already gone is fine
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  return {
    isSaved: (id) => ids.has(id),
    toggle: (id) => mutation.mutate({ id, save: !ids.has(id) }),
  };
}