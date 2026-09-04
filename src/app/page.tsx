import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold">Rozdělovník prezentací</h1>
        <p className="text-muted-foreground">
          Žáci si rozeberou témata v reálném čase. Kdo dřív přijde, ten dřív
          mele.
        </p>
      </div>

      <div className="space-y-3 rounded-xl border border-border p-4">
        <h2 className="font-medium">Jsi žák?</h2>
        <p className="text-sm text-muted-foreground">
          Otevři odkaz nebo naskenuj QR kód, který ukazuje vyučující. Budeš
          potřebovat přístupový kód z tabule.
        </p>
      </div>

      <Link
        href="/app"
        className="flex min-h-11 items-center justify-center rounded-lg bg-accent font-medium text-accent-foreground"
      >
        Vstup pro vyučující
      </Link>
    </main>
  );
}
