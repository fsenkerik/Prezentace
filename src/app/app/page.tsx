import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import { Corners, timeOnly } from "@/components/ui";
import { createAssignment } from "./actions";

const STATUS = {
  draft: { label: "Koncept", tag: "tag-neutral" },
  open: { label: "Otevřeno", tag: "tag-accent" },
  closed: { label: "Uzavřeno", tag: "tag-outline" },
} as const;

function czDate(value: string | null) {
  if (!value) return null;
  return new Date(value).toLocaleString("cs-CZ", {
    day: "numeric",
    month: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function Dashboard() {
  const supabase = await supabaseServer();

  const [{ data: assignments }, { data: classes }, { data: sets }] =
    await Promise.all([
      supabase
        .from("assignments")
        .select(
          "id, status, slug, access_code, opens_at, closes_at, set_id, classes(name, student_count), topic_sets(id, title)",
        )
        .order("created_at", { ascending: false }),
      supabase.from("classes").select("id, name").order("name"),
      supabase.from("topic_sets").select("id, title").order("title"),
    ]);

  const ids = (assignments ?? []).map((a) => a.id);
  const setIds = [...new Set((assignments ?? []).map((a) => a.set_id))];

  const [{ data: locks }, { data: allTopics }, { data: activity }] =
    await Promise.all([
      ids.length
        ? supabase.from("topic_locks").select("assignment_id").in("assignment_id", ids)
        : Promise.resolve({ data: [] as { assignment_id: string }[] }),
      setIds.length
        ? supabase.from("topics").select("id, set_id").in("set_id", setIds)
        : Promise.resolve({ data: [] as { id: string; set_id: string }[] }),
      supabase
        .from("selections")
        .select("created_at, student_name, topics(title), assignments(classes(name))")
        .order("created_at", { ascending: false })
        .limit(6),
    ]);

  const takenCount = new Map<string, number>();
  (locks ?? []).forEach((l) =>
    takenCount.set(l.assignment_id, (takenCount.get(l.assignment_id) ?? 0) + 1),
  );

  const topicCount = new Map<string, number>();
  (allTopics ?? []).forEach((t) =>
    topicCount.set(t.set_id, (topicCount.get(t.set_id) ?? 0) + 1),
  );

  const running = (assignments ?? []).filter((a) => a.status === "open").length;
  const today = new Date().toLocaleDateString("cs-CZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div>
      <div className="mb-7 flex flex-wrap items-end gap-5">
        <div className="flex-1">
          <h2 className="mb-1 text-[34px]">Přehled</h2>
          <p className="muted m-0 text-[14px]">
            {today} · {running} {running === 1 ? "výběr" : "výběry"} v běhu
          </p>
        </div>
        <Link href="/app/sady" className="btn btn-secondary" style={{ minHeight: 40 }}>
          Nová sada témat
        </Link>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {(assignments ?? []).map((a) => {
          const set = a.topic_sets as unknown as { id: string; title: string };
          const cls = a.classes as unknown as {
            name: string;
            student_count: number | null;
          };
          const total = topicCount.get(a.set_id) ?? 0;
          const done = takenCount.get(a.id) ?? 0;
          const target = cls?.student_count ?? total;
          const pct = target ? Math.round((done / target) * 100) : 0;
          const status = STATUS[a.status as keyof typeof STATUS];

          return (
            <div key={a.id} className="card blueprint p-5">
              <Corners />
              <div className="flex items-center gap-2">
                {a.status === "open" && <span className="livedot" />}
                <span className={`tag ${status.tag}`}>{status.label}</span>
                <span className="muted ml-auto text-[12px]">
                  {a.status === "draft" && a.opens_at
                    ? `otevře se ${czDate(a.opens_at)}`
                    : a.closes_at
                      ? `uzávěrka ${timeOnly(a.closes_at)}`
                      : null}
                </span>
              </div>

              <div className="card-title mt-2.5 text-[20px]">
                {cls?.name} · {set?.title}
              </div>
              <div className="muted text-[13px]">
                {total} témat · kód{" "}
                <span className="mono tracking-[.1em]">{a.access_code}</span>
              </div>

              <div
                className="mt-3.5 mb-1.5 text-[26px]"
                style={{ fontFamily: "var(--font-heading)" }}
              >
                {done} z {target} vybralo
              </div>
              <div className="progress">
                <div style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <Link
                  href={`/app/vyber/${a.id}`}
                  className="btn btn-primary"
                  style={{ minHeight: 40 }}
                >
                  Živý přehled
                </Link>
                <Link
                  href={`/app/vyber/${a.id}/projektor`}
                  className="btn btn-secondary"
                  style={{ minHeight: 40 }}
                >
                  Projektor
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {(assignments ?? []).length === 0 && (
        <p className="muted">
          Zatím žádný výběr. Založ třídu, sadu témat a pak je spoj níže.
        </p>
      )}

      <div className="card blueprint mt-8 max-w-[720px] p-5">
        <Corners />
        <div className="card-kicker">Nový výběr</div>
        <p className="card-body">
          Jednu sadu můžeš přiřadit několika třídám. Každá třída pak má vlastní
          obsazenost i vlastní kód.
        </p>
        <form action={createAssignment} className="flex flex-wrap gap-3">
          <select name="set_id" required className="input" style={{ minHeight: 40, width: "auto" }}>
            <option value="">Sada témat…</option>
            {(sets ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.title}
              </option>
            ))}
          </select>
          <select name="class_id" required className="input" style={{ minHeight: 40, width: "auto" }}>
            <option value="">Třída…</option>
            {(classes ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button className="btn btn-primary" style={{ minHeight: 40 }}>
            Vytvořit
          </button>
        </form>
      </div>

      {(activity ?? []).length > 0 && (
        <>
          <h4 className="mt-9 mb-3.5 text-[18px]">Poslední aktivita</h4>
          <table className="table max-w-[720px]">
            <thead>
              <tr>
                <th style={{ width: 70 }}>Čas</th>
                <th style={{ width: 70 }}>Třída</th>
                <th style={{ width: 190 }}>Žák</th>
                <th>Téma</th>
              </tr>
            </thead>
            <tbody>
              {(activity ?? []).map((row, i) => {
                const topic = row.topics as unknown as { title: string };
                const assignment = row.assignments as unknown as {
                  classes: { name: string };
                };
                return (
                  <tr key={i}>
                    <td className="tabular-nums">{timeOnly(row.created_at)}</td>
                    <td>{assignment?.classes?.name}</td>
                    <td>{row.student_name}</td>
                    <td>{topic?.title}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
