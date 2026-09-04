import Link from "next/link";
import { signOut } from "./actions";

const NAV = [
  { href: "/app", label: "Přehled" },
  { href: "/app/tridy", label: "Třídy" },
  { href: "/app/sady", label: "Sady témat" },
];

export default function AppLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-dvh">
      <header className="border-b border-border">
        <nav className="mx-auto flex max-w-5xl flex-wrap items-center gap-4 p-4">
          <Link href="/app" className="font-semibold">
            Rozdělovník
          </Link>
          <div className="flex gap-4">
            {NAV.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                {item.label}
              </Link>
            ))}
          </div>
          <form action={signOut} className="ml-auto">
            <button className="text-sm text-muted-foreground hover:text-foreground">
              Odhlásit
            </button>
          </form>
        </nav>
      </header>
      <main className="mx-auto max-w-5xl p-4">{children}</main>
    </div>
  );
}
