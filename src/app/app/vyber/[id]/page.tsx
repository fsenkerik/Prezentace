import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { supabaseServer } from "@/lib/supabase/server";
import { assignManually, releaseSelection, setStatus, updateAssignment } from "../../actions";
import LiveRefresh from "./live-refresh";

function localInput(value: string | null) {
  if (!value) return "";
  const d = new Date(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default async function AssignmentDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await supabaseServer();

  const { data: assignment } = await supabase
    .from("assignments")
    .select(
      "id, status, slug, access_code, opens_at, closes_at, show_names, set_id, classes(name), topic_sets(title)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!assignment) notFound();

  const [{ data: topics }, { data: selections }] = await Promise.all([
    supabase
      .from("topics")
      .select("id, title")
      .eq("set_id", assignment.set_id)
      .order("position"),
    supabase
      .from("selections")
      .select("id, topic_id, student_name, created_at, by_teacher")
      .eq("assignment_id", id)
      .order("created_at"),
  ]);

  const byTopic = new Map(
    (selections ?? []).map((s) => [s.topic_id, s] as const),
  );
  const cls = assignment.classes as unknown as { name: string };
  const set = assignment.topic_sets as unknown as { title: string };

  const host = (await headers()).get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const link = `${proto}://${host}/v/${assignment.slug}`;

  const freeTopics = (topics ?? []).filter((t) => !byTopic.has(t.id));

  return (
    <div className="space-y-8">
      <LiveRefresh assignmentId={assignment.id} />

      <header className="space-y-1">
        <p className="text-sm text-muted-foreground">{cls?.name}</p>
        <h1 className="text-2xl font-semibold">{set?.title}</h1>
        <p className="text-sm text-muted-foreground">
          Vybráno {selections?.length ?? 0} z {topics?.length ?? 0} témat
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-3 rounded-xl border border-border p-4">
          <h2 className="font-medium">Odkaz pro žáky</h2>
          <p className="break-all rounded-lg bg-muted p-2 font-mono text-sm">
            {link}
          </p>
          <p>
            Kód:{" "}
            <strong className="font-mono text-xl tracking-widest">
              {assignment.access_code}
            </strong>
          </p>
          <Link
            href={`/app/vyber/${assignment.id}/projektor`}
            className="inline-flex min-h-11 items-center rounded-lg border border-border px-4"
          >
            Otevřít na projektor
          </Link>
        </div>

        <div className="space-y-3 rounded-xl border border-border p-4">
          <h2 className="font-medium">Stav výběru</h2>
          <div className="flex flex-wrap gap-2">
            {(["draft", "open", "closed"] as const).map((s) => (
              <form action={setStatus} key={s}>
                <input type="hidden" name="id" value={assignment.id} />
                <input type="hidden" name="status" value={s} />
                <button
                  className={`min-h-11 rounded-lg border border-border px-3 text-sm ${
                    assignment.status === s
                      ? "bg-accent text-accent-foreground"
                      : ""
                  }`}
                >
                  {{ draft: "Koncept", open: "Otevřít", closed: "Uzavřít" }[s]}
                </button>
              </form>
            ))}
          </div>

          <form action={updateAssignment} className="space-y-3 border-t border-border pt-3">
            <input type="hidden" name="id" value={assignment.id} />
            <label className="block space-y-1">
              <span className="text-sm">Otevřít v</span>
              <input
                type="datetime-local"
                name="opens_at"
                defaultValue={localInput(assignment.opens_at)}
                className="min-h-11 w-full rounded-lg border border-border bg-muted px-3"
              />
            </label>
            <label className="block space-y-1">
              <span className="text-sm">Uzavřít v</span>
              <input
                type="datetime-local"
                name="closes_at"
                defaultValue={localInput(assignment.closes_at)}
                className="min-h-11 w-full rounded-lg border border-border bg-muted px-3"
              />
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="show_names"
                defaultChecked={assignment.show_names}
                className="size-4"
              />
              <span className="text-sm">Žáci vidí jména u obsazených témat</span>
            </label>
            <button className="min-h-11 rounded-lg border border-border px-4">
              Uložit nastavení
            </button>
          </form>
        </div>
      </section>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-medium">Kdo si co vybral</h2>
          <a
            href={`/app/vyber/${assignment.id}/export`}
            className="text-sm underline"
          >
            Stáhnout CSV
          </a>
        </div>

        <table className="w-full text-left text-sm">
          <thead className="text-muted-foreground">
            <tr className="border-b border-border">
              <th className="p-2 font-medium">Téma</th>
              <th className="p-2 font-medium">Žák</th>
              <th className="p-2 font-medium">Čas</th>
              <th className="p-2" />
            </tr>
          </thead>
          <tbody>
            {(topics ?? []).map((t) => {
              const pick = byTopic.get(t.id);
              return (
                <tr key={t.id} className="border-b border-border">
                  <td className="p-2">{t.title}</td>
                  <td className="p-2">
                    {pick ? (
                      <>
                        {pick.student_name}
                        {pick.by_teacher && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (ručně)
                          </span>
                        )}
                      </>
                    ) : (
                      <span className="text-muted-foreground">volné</span>
                    )}
                  </td>
                  <td className="p-2 text-muted-foreground">
                    {pick
                      ? new Date(pick.created_at).toLocaleString("cs-CZ")
                      : "—"}
                  </td>
                  <td className="p-2 text-right">
                    {pick && (
                      <form action={releaseSelection}>
                        <input type="hidden" name="id" value={pick.id} />
                        <input
                          type="hidden"
                          name="assignment_id"
                          value={assignment.id}
                        />
                        <button className="text-danger">Uvolnit</button>
                      </form>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="space-y-3 rounded-xl border border-border p-4">
        <h2 className="font-medium">Ruční přiřazení</h2>
        <p className="text-sm text-muted-foreground">
          Pro žáka, který chyběl nebo mu nefungoval telefon. Seznam
          „kdo ještě nevybral" aplikace neumí — žáci se nepřihlašují, takže
          nezná jmenný seznam třídy.
        </p>
        <form action={assignManually} className="flex flex-wrap gap-3">
          <input type="hidden" name="assignment_id" value={assignment.id} />
          <input
            name="student_name"
            required
            placeholder="Jméno a příjmení"
            className="min-h-11 flex-1 rounded-lg border border-border bg-muted px-3"
          />
          <select
            name="topic_id"
            required
            className="min-h-11 rounded-lg border border-border bg-muted px-3"
          >
            <option value="">Volné téma…</option>
            {freeTopics.map((t) => (
              <option key={t.id} value={t.id}>
                {t.title}
              </option>
            ))}
          </select>
          <button className="min-h-11 rounded-lg bg-accent px-4 font-medium text-accent-foreground">
            Přiřadit
          </button>
        </form>
      </section>
    </div>
  );
}
