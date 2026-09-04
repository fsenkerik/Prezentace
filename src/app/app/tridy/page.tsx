import { supabaseServer } from "@/lib/supabase/server";
import { createClass, deleteClass } from "../actions";

export default async function Classes() {
  const supabase = await supabaseServer();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, note")
    .order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Třídy</h1>

      <form action={createClass} className="flex flex-wrap gap-3">
        <input
          name="name"
          required
          placeholder="Např. 3.A"
          className="min-h-11 flex-1 rounded-lg border border-border bg-muted px-3"
        />
        <button className="min-h-11 rounded-lg bg-accent px-4 font-medium text-accent-foreground">
          Přidat třídu
        </button>
      </form>

      <ul className="divide-y divide-border rounded-xl border border-border">
        {(classes ?? []).map((c) => (
          <li key={c.id} className="flex items-center gap-3 p-3">
            <span className="flex-1">{c.name}</span>
            <form action={deleteClass}>
              <input type="hidden" name="id" value={c.id} />
              <button className="text-sm text-danger">Smazat</button>
            </form>
          </li>
        ))}
        {(classes ?? []).length === 0 && (
          <li className="p-4 text-muted-foreground">Zatím žádná třída.</li>
        )}
      </ul>
    </div>
  );
}
