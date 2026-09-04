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
    <main className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-6 p-6">
      <h1 className="text-2xl font-semibold">Přihlášení vyučujícího</h1>

      <form className="space-y-4">
        <input type="hidden" name="dal" value={params.dal ?? "/app"} />
        <label className="block space-y-1">
          <span className="text-sm font-medium">E-mail</span>
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            className="min-h-11 w-full rounded-lg border border-border bg-muted px-3"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Heslo</span>
          <input
            name="password"
            type="password"
            required
            minLength={8}
            autoComplete="current-password"
            className="min-h-11 w-full rounded-lg border border-border bg-muted px-3"
          />
        </label>

        {params.chyba && (
          <p role="alert" className="text-sm text-danger">
            Přihlášení se nepovedlo. Zkontroluj e-mail a heslo.
          </p>
        )}
        {params.zalozeno && (
          <p className="text-sm text-muted-foreground">
            Účet založen. Pokud Supabase vyžaduje potvrzení e-mailu, klikni
            nejdřív na odkaz ve schránce.
          </p>
        )}

        <button
          formAction={signIn}
          className="min-h-11 w-full rounded-lg bg-accent font-medium text-accent-foreground"
        >
          Přihlásit se
        </button>
        <button
          formAction={signUp}
          className="min-h-11 w-full rounded-lg border border-border"
        >
          Založit účet
        </button>
      </form>

      <p className="text-sm text-muted-foreground">
        Až si založíš svůj účet, vypni v Supabase registraci nových uživatelů
        (Authentication → Sign In / Providers → Allow new users to sign up).
      </p>
    </main>
  );
}
