import { supabaseServer } from "@/lib/supabase/server";

/** Udržuje projekt v Supabase při životě.
 *
 *  Bezplatný tarif uspí projekt po 7 dnech bez provozu a uspaný projekt
 *  po čase smaže. Tenhle endpoint si jednou denně sáhne do databáze, což
 *  se počítá jako aktivita. Volá ho Vercel Cron podle vercel.json.
 *
 *  Dotaz schválně nic nemění — jen spočítá řádky, aby vznikl skutečný
 *  provoz proti Postgresu, ne jen request na Vercel.
 */

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  // Když je nastavená proměnná CRON_SECRET, Vercel ji posílá v hlavičce
  // a cizí volání se odmítnou. Bez ní je endpoint veřejný — nevadí,
  // nic nevypisuje ani nemění, ale se secretem je to čistší.
  const secret = process.env.CRON_SECRET;
  if (secret && request.headers.get("authorization") !== `Bearer ${secret}`) {
    return Response.json({ ok: false, error: "UNAUTHORIZED" }, { status: 401 });
  }

  const startedAt = Date.now();

  try {
    const supabase = await supabaseServer();
    const { count, error } = await supabase
      .from("topic_locks")
      .select("topic_id", { count: "exact", head: true });

    if (error) {
      return Response.json(
        { ok: false, error: error.message, ms: Date.now() - startedAt },
        { status: 500 },
      );
    }

    return Response.json({
      ok: true,
      rows: count ?? 0,
      ms: Date.now() - startedAt,
      at: new Date().toISOString(),
    });
  } catch (e) {
    return Response.json(
      { ok: false, error: e instanceof Error ? e.message : "UNKNOWN" },
      { status: 500 },
    );
  }
}
