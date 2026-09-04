import { supabaseServer } from "@/lib/supabase/server";
import { Corners } from "@/components/ui";
import { createClass, deleteClass } from "../actions";

export default async function Classes() {
  const supabase = await supabaseServer();
  const { data: classes } = await supabase
    .from("classes")
    .select("id, name, student_count")
    .order("name");

  return (
    <div className="max-w-[720px]">
      <h2 className="mb-1 text-[34px]">Třídy</h2>
      <p className="muted mb-6 text-[14px]">
        Počet žáků je nepovinný. Když ho vyplníš, přehled ukáže postup
        „8 z 12 vybralo" — jinak počítá proti počtu témat.
      </p>

      <div className="card blueprint mb-6 p-5">
        <Corners />
        <form action={createClass} className="flex flex-wrap items-end gap-3">
          <div className="field flex-1" style={{ minWidth: 180 }}>
            <label htmlFor="name">Označení třídy</label>
            <input
              id="name"
              name="name"
              required
              placeholder="3.A"
              className="input"
              style={{ minHeight: 40 }}
            />
          </div>
          <div className="field" style={{ width: 130 }}>
            <label htmlFor="student_count">Počet žáků</label>
            <input
              id="student_count"
              name="student_count"
              type="number"
              min={1}
              max={200}
              placeholder="—"
              className="input"
              style={{ minHeight: 40 }}
            />
          </div>
          <button className="btn btn-primary" style={{ minHeight: 40 }}>
            Přidat třídu
          </button>
        </form>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Třída</th>
            <th style={{ width: 120 }}>Žáků</th>
            <th style={{ width: 100 }} />
          </tr>
        </thead>
        <tbody>
          {(classes ?? []).map((c) => (
            <tr key={c.id}>
              <td style={{ fontFamily: "var(--font-heading)", fontSize: 17 }}>
                {c.name}
              </td>
              <td className="muted tabular-nums">{c.student_count ?? "—"}</td>
              <td className="text-right">
                <form action={deleteClass}>
                  <input type="hidden" name="id" value={c.id} />
                  <button
                    className="btn btn-ghost"
                    style={{ minHeight: 36, color: "var(--color-danger)" }}
                  >
                    Smazat
                  </button>
                </form>
              </td>
            </tr>
          ))}
          {(classes ?? []).length === 0 && (
            <tr>
              <td colSpan={3} className="muted">
                Zatím žádná třída.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
