import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Klient pro server komponenty a server akce. Přenáší přihlášení učitele
 *  přes cookies; u veřejných stránek žáka běží jako anonymní role. */
export async function supabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          try {
            list.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // Volání ze server komponenty, kde zapisovat nelze —
            // obnovu session zařídí middleware.
          }
        },
      },
    },
  );
}
