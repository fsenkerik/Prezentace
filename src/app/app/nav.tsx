"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/app", label: "Přehled" },
  { href: "/app/tridy", label: "Třídy" },
  { href: "/app/sady", label: "Sady témat" },
];

export default function Nav() {
  const pathname = usePathname();

  return (
    <>
      {LINKS.map((link) => {
        const active =
          link.href === "/app" ? pathname === "/app" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            className="sidebar-link"
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </>
  );
}
