import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { createSet, deleteSet } from "../actions";

export default async function Sets() {
  const supabase = await supabaseServer();
  const { data: sets } = await supabase
    .from("topic_sets")
    .select("id, title, topics(count)")
    .order("title");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Sady témat</h1>

      <form action={createSet} className="flex flex-wrap gap-3">
        <input
          name="title"
          required
          placeholder="Např. Dějepis 20. století"
          className="min-h-11 flex-1 rounded-lg border border-border bg-muted px-3"
        />
        <button className="min-h-11 rounded-lg bg-accent px-4 font-medium text-accent-foreground">
          Nová sada
        </button>
      </form>

      <ul className="divide-y divide-border rounded-xl border border-border">
        {(sets ?? []).map((s) => {
          const count =
            (s.topics as unknown as { count: number }[])?.[0]?.count ?? 0;
          return (
            <li key={s.id} className="flex items-center gap-3 p-3">
              <Link href={`/app/sady/${s.id}`} className="flex-1">
                <span className="font-medium">{s.title}</span>
                <span className="ml-2 text-sm text-muted-foreground">
                  {count} témat
                </span>
              </Link>
              <form action={deleteSet}>
                <input type="hidden" name="id" value={s.id} />
                <button className="text-sm text-danger">Smazat</button>
              </form>
            </li>
          );
        })}
        {(sets ?? []).length === 0 && (
          <li className="p-4 text-muted-foreground">Zatím žádná sada.</li>
        )}
      </ul>
    </div>
  );
}
