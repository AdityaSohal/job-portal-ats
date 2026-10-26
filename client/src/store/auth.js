import { create } from "zustand";
import api, { setUnauthorizedHandler } from "../lib/api";
import { queryClient } from "../lib/queryClient";

const guest = { user: null, company: null, status: "guest" };

export const useAuth = create((set) => ({
  user: null,
  company: null,
  status: "loading", // loading -> authed | guest

  setSession: ({ user, company }) => {
    queryClient.clear(); // never show the previous account's cached data
    set({ user, company: company ?? null, status: "authed" });
  },

  clear: () => {
    queryClient.clear();
    set(guest);
  },

  bootstrap: async () => {
    try {
      const { data } = await api.get("/auth/me");
      set({ user: data.user, company: data.company ?? null, status: "authed" });
    } catch {
      set(guest);
    }
  },

  logout: async () => {
    try {
      await api.post("/auth/logout");
    } catch {
      // the cookie may already be gone; the local session ends either way
    }
    queryClient.clear();
    set(guest);
  },
}));

setUnauthorizedHandler(() => useAuth.getState().clear());