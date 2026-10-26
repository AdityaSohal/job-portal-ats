import { Outlet } from "react-router-dom";
import SiteHeader from "./SiteHeader";

export default function PublicLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-paper">
      <SiteHeader />
      <main className="flex-1">
        <Outlet />
      </main>
      <footer className="border-t-2 border-ink bg-white py-5 text-center text-sm text-ink/60">JobPortal · built as a portfolio project</footer>
    </div>
  );
}