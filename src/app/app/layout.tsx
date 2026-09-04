import { supabaseServer } from "@/lib/supabase/server";
import { signOut } from "./actions";
import Nav from "./nav";

export default async function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const supabase = await supabaseServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-dvh flex-col md:flex-row">
      <aside
        className="flex flex-none flex-col gap-1 px-4.5 py-5 md:w-[236px]"
        style={{ borderRight: "1px solid var(--color-divider)" }}
      >
        <div className="nav-brand mb-6 ml-1.5 text-[17px]">Rozdělovník</div>
        <Nav />
        <form action={signOut} className="mt-auto pt-6">
          <div className="muted mb-2 px-3 text-[12px]">{user?.email}</div>
          <button className="btn btn-ghost" style={{ minHeight: 36 }}>
            Odhlásit
          </button>
        </form>
      </aside>

      <main className="min-w-0 flex-1 px-6 py-8 md:px-10">{children}</main>
    </div>
  );
}
