import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Corners } from "@/components/ui";
import { createSet, deleteSet } from "../actions";

export default async function Sets() {
  const supabase = await supabaseServer();
  const { data: sets } = await supabase
    .from("topic_sets")
    .select("id, title, topics(count)")
    .order("title");

  return (
    <div className="max-w-[720px]">
      <h2 className="mb-1 text-[34px]">Sady témat</h2>
      <p className="muted mb-6 text-[14px]">
        Sadu napíšeš jednou a přiřadíš ji kolika třídám chceš. Každá třída si
        vybírá nezávisle.
      </p>

      <div className="card blueprint mb-6 p-5">
        <Corners />
        <form action={createSet} className="flex flex-wrap items-end gap-3">
          <div className="field flex-1" style={{ minWidth: 220 }}>
            <label htmlFor="title">Název sady</label>
            <input
              id="title"
              name="title"
              required
              placeholder="Informatika — jak to funguje"
              className="input"
              style={{ minHeight: 40 }}
            />
          </div>
          <button className="btn btn-primary" style={{ minHeight: 40 }}>
            Nová sada
          </button>
        </form>
      </div>

      <table className="table">
        <thead>
          <tr>
            <th>Sada</th>
            <th style={{ width: 100 }}>Témat</th>
            <th style={{ width: 100 }} />
          </tr>
        </thead>
        <tbody>
          {(sets ?? []).map((s) => {
            const count =
              (s.topics as unknown as { count: number }[])?.[0]?.count ?? 0;
            return (
              <tr key={s.id}>
                <td>
                  <Link
                    href={`/app/sady/${s.id}`}
                    style={{
                      fontFamily: "var(--font-heading)",
                      fontSize: 17,
                      color: "inherit",
                    }}
                  >
                    {s.title}
                  </Link>
                </td>
                <td className="muted tabular-nums">{count}</td>
                <td className="text-right">
                  <form action={deleteSet}>
                    <input type="hidden" name="id" value={s.id} />
                    <button
                      className="btn btn-ghost"
                      style={{ minHeight: 36, color: "var(--color-danger)" }}
                    >
                      Smazat
                    </button>
                  </form>
                </td>
              </tr>
            );
          })}
          {(sets ?? []).length === 0 && (
            <tr>
              <td colSpan={3} className="muted">
                Zatím žádná sada.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
