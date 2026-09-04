import { redirect } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";

async function signIn(formData: FormData) {
  "use server";
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  if (error) redirect("/prihlaseni?chyba=1");
  redirect(String(formData.get("dal") || "/app"));
}

async function signUp(formData: FormData) {
  "use server";
  const supabase = await supabaseServer();
  const { error } = await supabase.auth.signUp({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  redirect(error ? "/prihlaseni?chyba=1" : "/prihlaseni?zalozeno=1");
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ chyba?: string; zalozeno?: string; dal?: string }>;
}) {
  const params = await searchParams;

  return (
    <main className="mx-auto flex min-h-dvh max-w-[400px] flex-col justify-center gap-5 px-6 py-10">
      <div>
        <div className="kicker mb-1.5">Rozdělovník</div>
        <h2 className="text-[30px]">Přihlášení vyučujícího</h2>
      </div>

      <form className="flex flex-col gap-3.5">
        <input type="hidden" name="dal" value={params.dal ?? "/app"} />

        <div className="field">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="input"
            style={{ minHeight: 44 }}
          />
        </div>

        <div className="field">
          <label htmlFor="password">Heslo</label>
          <input
            id="password"
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            className="input"
            style={{ minHeight: 44 }}
          />
        </div>

        {params.chyba && (
          <p role="alert" className="text-[13px]" style={{ color: "var(--color-danger)" }}>
            Přihlášení se nepovedlo. Zkontroluj e-mail a heslo.
          </p>
        )}
        {params.zalozeno && (
          <p className="muted text-[13px]">
            Účet založen. Pokud Supabase vyžaduje potvrzení e-mailu, klikni
            nejdřív na odkaz ve schránce.
          </p>
        )}

        <button
          formAction={signIn}
          className="btn btn-primary btn-block"
          style={{ minHeight: 44 }}
        >
          Přihlásit se
        </button>
        <button
          formAction={signUp}
          className="btn btn-secondary btn-block"
          style={{ minHeight: 44 }}
        >
          Založit účet
        </button>
      </form>

      <p className="muted text-[12px]">
        Až si založíš svůj účet, vypni v Supabase registraci nových uživatelů
        (Authentication → Sign In / Providers → Allow new users to sign up).
      </p>
    </main>
  );
}
