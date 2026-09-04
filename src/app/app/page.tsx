import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { createAssignment } from "./actions";

const STATUS_LABEL: Record<string, string> = {
  draft: "Koncept",
  open: "Otevřeno",
  closed: "Uzavřeno",
};

export default async function Dashboard() {
  const supabase = await supabaseServer();

  const [{ data: assignments }, { data: classes }, { data: sets }] =
    await Promise.all([
      supabase
        .from("assignments")
        .select(
          "id, status, slug, access_code, classes(name), topic_sets(id, title)",
        )
        .order("created_at", { ascending: false }),
      supabase.from("classes").select("id, name").order("name"),
      supabase.from("topic_sets").select("id, title").order("title"),
    ]);

  // Postup dopočítáme z veřejného zrcadla obsazenosti — je to jen počet,
  // nemusíme tahat celé výběry.
  const ids = (assignments ?? []).map((a) => a.id);
  const { data: locks } = ids.length
    ? await supabase.from("topic_locks").select("assignment_id").in("assignment_id", ids)
    : { data: [] };
  const taken = new Map<string, number>();
  (locks ?? []).forEach((l) =>
    taken.set(l.assignment_id, (taken.get(l.assignment_id) ?? 0) + 1),
  );

  const setSizes = new Map<string, number>();
  for (const set of sets ?? []) {
    const { count } = await supabase
      .from("topics")
      .select("id", { count: "exact", head: true })
      .eq("set_id", set.id);
    setSizes.set(set.id, count ?? 0);
  }

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h1 className="text-2xl font-semibold">Přehled výběrů</h1>

        {(assignments ?? []).length === 0 && (
          <p className="text-muted-foreground">
            Zatím žádný výběr. Založ třídu, sadu témat a pak je spoj níže.
          </p>
        )}

        <ul className="grid gap-3 sm:grid-cols-2">
          {(assignments ?? []).map((a) => {
            const set = a.topic_sets as unknown as { id: string; title: string };
            const cls = a.classes as unknown as { name: string };
            const total = setSizes.get(set?.id) ?? 0;
            const done = taken.get(a.id) ?? 0;
            return (
              <li key={a.id} className="rounded-xl border border-border p-4">
                <Link href={`/app/vyber/${a.id}`} className="space-y-1">
                  <p className="text-xs text-muted-foreground">{cls?.name}</p>
                  <h2 className="font-medium">{set?.title}</h2>
                  <p className="text-sm text-muted-foreground">
                    {STATUS_LABEL[a.status]} · vybralo {done} z {total}
                  </p>
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="space-y-3 rounded-xl border border-border p-4">
        <h2 className="font-medium">Nový výběr</h2>
        <p className="text-sm text-muted-foreground">
          Jednu sadu můžeš přiřadit několika třídám. Každá třída pak má vlastní
          obsazenost.
        </p>
        <form action={createAssignment} className="flex flex-wrap gap-3">
          <select
            name="set_id"
            required
            className="min-h-11 rounded-lg border border-border bg-muted px-3"
          >
            <option value="">Sada témat…</option>
            {(sets ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <select
            name="class_id"
            required
            className="min-h-11 rounded-lg border border-border bg-muted px-3"
          >
            <option value="">Třída…</option>
            {(classes ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button className="min-h-11 rounded-lg bg-accent px-4 font-medium text-accent-foreground">
            Vytvořit
          </button>
        </form>
      </section>
    </div>
  );
}
