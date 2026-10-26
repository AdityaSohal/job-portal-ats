import SiteHeader from "./SiteHeader";

export default function AppShell({ children }) {
  return (
    <div className="grid-paper min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-5 py-10">{children}</main>
    </div>
  );
}