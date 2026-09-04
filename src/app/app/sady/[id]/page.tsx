import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { addTopics, deleteTopic } from "../../actions";

export default async function SetEditor({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const { data: set } = await supabase
    .from("topic_sets")
    .select("id, title, description")
    .eq("id", id)
    .maybeSingle();
  if (!set) notFound();

  const [{ data: topics }, { data: assignments }] = await Promise.all([
    supabase
      .from("topics")
      .select("id, title, description")
      .eq("set_id", id)
      .order("position"),
    supabase.from("assignments").select("id, classes(name)").eq("set_id", id),
  ]);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">{set.title}</h1>
        <p className="text-sm text-muted-foreground">
          {(topics ?? []).length} témat
          {(assignments ?? []).length > 0 &&
            ` · přiřazeno: ${(assignments ?? [])
              .map((a) => (a.classes as unknown as { name: string })?.name)
              .join(", ")}`}
        </p>
      </header>

      <form action={addTopics} className="space-y-3 rounded-xl border border-border p-4">
        <input type="hidden" name="set_id" value={set.id} />
        <label className="block space-y-1">
          <span className="font-medium">Hromadné vložení témat</span>
          <span className="block text-sm text-muted-foreground">
            Jeden řádek = jedno téma. Popis odděl pomlčkou: „Název — popis".
          </span>
          <textarea
            name="bulk"
            rows={6}
            required
            className="w-full rounded-lg border border-border bg-muted p-3 font-mono text-sm"
          />
        </label>
        <button className="min-h-11 rounded-lg bg-accent px-4 font-medium text-accent-foreground">
          Přidat témata
        </button>
      </form>

      <ol className="divide-y divide-border rounded-xl border border-border">
        {(topics ?? []).map((t, i) => (
          <li key={t.id} className="flex items-start gap-3 p-3">
            <span className="w-6 shrink-0 text-sm text-muted-foreground">
              {i + 1}.
            </span>
            <div className="flex-1">
              <p className="font-medium">{t.title}</p>
              {t.description && (
                <p className="text-sm text-muted-foreground">{t.description}</p>
              )}
            </div>
            <form action={deleteTopic}>
              <input type="hidden" name="id" value={t.id} />
              <input type="hidden" name="set_id" value={set.id} />
              <button className="text-sm text-danger">Smazat</button>
            </form>
          </li>
        ))}
        {(topics ?? []).length === 0 && (
          <li className="p-4 text-muted-foreground">Sada je zatím prázdná.</li>
        )}
      </ol>
    </div>
  );
}
