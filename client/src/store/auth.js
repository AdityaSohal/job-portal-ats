import { create } from "zustand";
import api, { setUnauthorizedHandler } from "../lib/api";

const guest = { user: null, company: null, status: "guest" };

export const useAuth = create((set) => ({
  user: null,
  company: null,
  status: "loading", // loading -> authed | guest

  setSession: ({ user, company }) => set({ user, company: company ?? null, status: "authed" }),
  clear: () => set(guest),

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
    set(guest);
  },
}));

setUnauthorizedHandler(() => useAuth.getState().clear());