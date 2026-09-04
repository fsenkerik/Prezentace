import Link from "next/link";
import { Corners } from "@/components/ui";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-[520px] flex-col justify-center gap-6 px-6 py-10">
      <div>
        <div className="kicker mb-1.5">Výběr témat v reálném čase</div>
        <h1 className="text-[46px]">Rozdělovník prezentací</h1>
        <p className="muted m-0 text-[15px]">
          Žáci si rozeberou témata systémem kdo dřív přijde. Jakmile si někdo
          téma vezme, ostatním se okamžitě uzamkne.
        </p>
      </div>

      <div className="card blueprint px-5 py-4.5">
        <Corners />
        <div className="card-kicker">Jsi žák?</div>
        <p className="card-body">
          Otevři odkaz nebo naskenuj QR kód, který ukazuje vyučující. Budeš
          potřebovat šestimístný přístupový kód z tabule.
        </p>
      </div>

      <Link
        href="/app"
        className="btn btn-primary btn-block"
        style={{ minHeight: 44 }}
      >
        Vstup pro vyučující
      </Link>
    </main>
  );
}
