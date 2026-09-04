"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { errorText, type Board, type BoardInfo, type BoardTopic } from "@/lib/types";
import {
  CheckIcon,
  ClockIcon,
  Corners,
  LockIcon,
  SearchIcon,
  UserIcon,
  WarningIcon,
  WifiIcon,
  timeOnly,
  topicNumber,
} from "@/components/ui";
import Countdown from "./countdown";

/** Identifikátor prohlížeče. Slouží jen k tomu, aby z jednoho zařízení
 *  neproběhlo víc výběrů, a k rozpoznání „tohle je moje volba". */
function clientId(): string {
  const KEY = "rp:client";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(KEY, id);
  }
  return id;
}

export default function StudentBoard({
  slug,
  info,
}: {
  slug: string;
  info: BoardInfo;
}) {
  const supabase = supabaseBrowser();

  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [board, setBoard] = useState<Board | null>(null);
  const [gateError, setGateError] = useState<string | null>(null);
  const [problem, setProblem] = useState<{ code: string; topic?: string } | null>(
    null,
  );
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const [syncedAt, setSyncedAt] = useState<Date | null>(null);
  const [confirming, setConfirming] = useState<BoardTopic | null>(null);
  const [query, setQuery] = useState("");
  const [onlyFree, setOnlyFree] = useState(false);
  const [openedAt, setOpenedAt] = useState(() => Date.now());

  const codeRef = useRef("");

  const load = useCallback(
    async (accessCode: string): Promise<string | null> => {
      const { data, error } = await supabase.rpc("get_board", {
        p_slug: slug,
        p_code: accessCode,
        p_client_id: clientId(),
      });
      if (error) return "CONFLICT";

      const result = data as Board | { ok: false; error: string };
      if (!result?.ok) return (result as { error: string })?.error ?? "CONFLICT";

      codeRef.current = accessCode;
      sessionStorage.setItem(`rp:code:${slug}`, accessCode);
      setBoard(result);
      setSyncedAt(new Date());
      return null;
    },
    [slug, supabase],
  );

  useEffect(() => {
    setName(localStorage.getItem("rp:name") ?? "");
    const saved = sessionStorage.getItem(`rp:code:${slug}`);
    if (saved) {
      setCode(saved);
      void load(saved);
    }
  }, [slug, load]);

  const refresh = useCallback(() => {
    if (codeRef.current) void load(codeRef.current);
  }, [load]);

  // Realtime: posloucháme jen zámky témat, ne výběry se jmény.
  // Událost bereme jako signál „něco se změnilo" a data si dotáhneme
  // znovu — tím se jméno nikdy nedostane ven přes WebSocket.
  useEffect(() => {
    if (!board?.assignment_id) return;

    const channel = supabase
      .channel(`locks:${board.assignment_id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "topic_locks",
          filter: `assignment_id=eq.${board.assignment_id}`,
        },
        refresh,
      )
      .subscribe((status: string) => setLive(status === "SUBSCRIBED"));

    // Pojistky pro školní wi-fi: pravidelný dotaz i obnova po probuzení
    // karty, kdyby WebSocket tiše umřel.
    const timer = setInterval(refresh, 15_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [board?.assignment_id, supabase, refresh]);

  async function submitGate(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setGateError(null);
    localStorage.setItem("rp:name", name.trim());
    const err = await load(code.trim().toUpperCase());
    if (err) setGateError(errorText(err));
    setBusy(false);
  }

  async function claim(topic: BoardTopic) {
    setBusy(true);
    setProblem(null);
    const { data, error } = await supabase.rpc("claim_topic", {
      p_slug: slug,
      p_code: codeRef.current,
      p_topic_id: topic.id,
      p_name: name.trim(),
      p_client_id: clientId(),
    });
    setConfirming(null);

    const result = (data ?? { ok: false, error: "CONFLICT" }) as
      | { ok: true; topic_title: string }
      | { ok: false; error: string };

    if (error) setProblem({ code: "CONFLICT" });
    else if (!result.ok) setProblem({ code: result.error, topic: topic.title });

    refresh();
    setBusy(false);
  }

  function backToGate() {
    sessionStorage.removeItem(`rp:code:${slug}`);
    codeRef.current = "";
    setBoard(null);
    setProblem(null);
  }

  const notOpenYet = info.opens_at
    ? new Date(info.opens_at).getTime() > openedAt
    : false;

  // ── 05 · Ještě neotevřeno ────────────────────────────────────────────
  if (notOpenYet && !board?.my_selection) {
    return (
      <main
        className="mx-auto flex min-h-dvh max-w-[440px] flex-col items-center justify-center px-7 text-center"
        style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
      >
        <div className="kicker mb-2.5">
          {info.title} · {info.class_name}
        </div>
        <h3 className="mb-8 text-[28px]">{info.title}</h3>

        <div className="blueprint mb-6 px-7 py-5">
          <Corners />
          <div className="kicker kicker-muted mb-2">Zbývá</div>
          <Countdown to={info.opens_at!} onDone={() => setOpenedAt(Date.now())} />
        </div>

        <p className="m-0 mb-1.5 text-[19px]" style={{ fontFamily: "var(--font-heading)" }}>
          Výběr se otevře v{" "}
          {new Date(info.opens_at!).toLocaleTimeString("cs-CZ", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
        <p className="muted max-w-[32ch] text-[13px]">
          Nech si stránku otevřenou. Seznam témat se objeví sám, není potřeba
          nic obnovovat.
        </p>
      </main>
    );
  }

  // ── 01 · Vstup do výběru ─────────────────────────────────────────────
  if (!board) {
    const free = info.topic_count - info.taken_count;
    return (
      <main
        className="mx-auto flex min-h-dvh max-w-[440px] flex-col justify-center px-6 py-8"
        style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
      >
        <div className="kicker">{info.class_name}</div>
        <h3 className="mt-1.5 mb-3.5 text-[30px]">{info.title}</h3>

        <div className="mb-5 flex gap-2">
          <span className="tag tag-accent">{free} volných témat</span>
          <span className="tag tag-outline">{info.topic_count} témat celkem</span>
        </div>

        <form onSubmit={submitGate} className="flex flex-col gap-3.5">
          <div className="field">
            <label htmlFor="name">Tvoje jméno a příjmení</label>
            <input
              id="name"
              className="input"
              style={{ minHeight: 44 }}
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={3}
              autoComplete="name"
              placeholder="Jan Novák"
            />
          </div>

          <div className="field">
            <label htmlFor="code">Přístupový kód</label>
            <input
              id="code"
              className="input mono"
              style={{
                minHeight: 44,
                letterSpacing: ".32em",
                textTransform: "uppercase",
                fontSize: 18,
              }}
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              autoCapitalize="characters"
              placeholder="A7K2M9"
            />
            <span className="muted mt-1.5 block text-[11px]">
              Šest znaků, velká písmena a číslice. Kód diktuje vyučující.
            </span>
          </div>

          <div
            className="blueprint my-2 flex gap-2.5 px-3.5 py-3"
            style={{
              background: "color-mix(in srgb, var(--color-accent) 8%, transparent)",
            }}
          >
            <Corners />
            <WarningIcon
              size={18}
              className="mt-0.5 flex-none"
            />
            <p className="m-0 text-[13px] leading-[1.45]">
              Volba je konečná. Jakmile téma potvrdíš, nejde vyměnit — změnu už
              může udělat jen vyučující.
            </p>
          </div>

          {gateError && (
            <p role="alert" className="text-[13px]" style={{ color: "var(--color-danger)" }}>
              {gateError}
            </p>
          )}

          <button
            type="submit"
            className="btn btn-primary btn-block"
            style={{ minHeight: 44 }}
            disabled={busy}
          >
            Pokračovat
          </button>
        </form>
      </main>
    );
  }

  // ── 02 / 04 · Seznam témat ───────────────────────────────────────────
  const mine = board.my_selection
    ? board.topics.find((t) => t.id === board.my_selection!.topic_id)
    : null;
  const closed = board.status === "closed";
  const free = board.topics.filter((t) => !t.taken).length;
  const numbers = new Map(board.topics.map((t, i) => [t.id, topicNumber(i)]));

  const visible = board.topics.filter((t) => {
    if (mine && t.id === mine.id) return false;
    if (onlyFree && t.taken) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.description ?? "").toLowerCase().includes(q)
    );
  });

  function label(topic: BoardTopic) {
    const at = topic.taken_at ? timeOnly(topic.taken_at) : "";
    if (topic.taken_by) return `Obsazeno · ${topic.taken_by} · ${at}`;
    return `Obsazeno · ${at}`;
  }

  return (
    <main
      className="mx-auto min-h-dvh max-w-[440px] pb-10"
      style={{ background: "var(--color-bg)", color: "var(--color-text)" }}
    >
      <div
        className="sticky top-0 z-10 px-5 pt-4.5 pb-3.5"
        style={{
          background: "var(--color-bg)",
          borderBottom: "1px solid var(--color-divider)",
        }}
      >
        <div className="mb-2.5 flex items-center gap-2">
          <span className={`livedot ${live ? "" : "is-off"}`} />
          <span className="muted text-[11px] uppercase tracking-[.06em]">
            {live ? "Živé spojení" : "Obnovuji spojení…"}
          </span>
          <span className="muted ml-auto text-[12px]">{name}</span>
        </div>

        <h4 className="m-0 mb-0.5 text-[22px]">{board.title}</h4>
        <div
          className="text-[26px]"
          style={{ fontFamily: "var(--font-heading)", color: "var(--color-accent)" }}
          aria-live="polite"
        >
          zbývá {free} z {board.topics.length}
        </div>

        {!mine && !closed && (
          <div className="mt-3.5 flex gap-2.5">
            <div className="relative flex-1">
              <SearchIcon
                className="pointer-events-none absolute left-2.5 top-3.5 opacity-50"
              />
              <input
                className="input"
                style={{ minHeight: 44, paddingLeft: 32 }}
                placeholder="Hledat téma"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-secondary whitespace-nowrap"
              style={{ minHeight: 44 }}
              aria-pressed={onlyFree}
              onClick={() => setOnlyFree((v) => !v)}
            >
              {onlyFree ? "✓ jen volná" : "jen volná"}
            </button>
          </div>
        )}
      </div>

      {/* 06 · ztráta spojení — nenápadný pruh, žádné modální okno */}
      {!live && (
        <div
          className="flex items-center gap-2 px-3 py-2.5 text-[12px]"
          style={{
            background: "color-mix(in srgb, var(--color-text) 7%, transparent)",
            borderBottom: "1px solid var(--color-divider)",
          }}
        >
          <WifiIcon size={14} style={{ animation: "om-pulse 1.6s ease-in-out infinite" }} />
          Obnovuji spojení…
          <span className="muted ml-auto">
            {syncedAt ? `poslední aktualizace ${timeOnly(syncedAt.toISOString())}` : ""}
          </span>
        </div>
      )}

      {/* 04 · Tvoje téma */}
      {mine && (
        <div className="px-5 pt-5">
          <div
            className="blueprint px-4.5 py-4"
            style={{
              background: "color-mix(in srgb, var(--color-accent) 12%, transparent)",
            }}
          >
            <Corners />
            <div
              className="flex items-center gap-1.5 text-[11px] uppercase tracking-[.12em]"
              style={{
                fontFamily: "var(--font-heading)",
                color: "var(--color-accent-700)",
              }}
            >
              <CheckIcon size={15} />
              Tvoje téma
            </div>
            <div
              className="my-1.5 text-[24px] leading-[1.15] font-semibold"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              {mine.title}
            </div>
            <div className="muted text-[12px]">
              Vybráno {timeOnly(board.my_selection!.created_at)} · zapsáno na{" "}
              {board.my_selection!.student_name}
            </div>
          </div>
        </div>
      )}

      {/* 06 · chybové stavy */}
      {problem && (
        <div className="px-5 pt-4">
          <div className="blueprint px-5 py-4.5" role="alert">
            <Corners />
            <div
              className="mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[.1em]"
              style={{
                fontFamily: "var(--font-heading)",
                color: "var(--color-danger)",
              }}
            >
              {problem.code === "ALREADY_PICKED" ? (
                <UserIcon size={15} />
              ) : problem.code === "CLOSED" ? (
                <ClockIcon size={15} />
              ) : (
                <LockIcon size={15} />
              )}
              {problem.code === "TOPIC_TAKEN"
                ? "Téma je pryč"
                : problem.code === "ALREADY_PICKED"
                  ? "Jméno se opakuje"
                  : problem.code === "CLOSED"
                    ? "Uzavřeno"
                    : "Nepovedlo se"}
            </div>
            <h5 className="m-0 mb-1.5 text-[18px]">{errorText(problem.code)}</h5>
            {problem.topic && problem.code === "TOPIC_TAKEN" && (
              <p className="muted m-0 mb-3 text-[13px]">
                Téma <span className="strike">{problem.topic}</span> si o zlomek
                sekundy dřív vzal někdo jiný. Volných zůstává {free}.
              </p>
            )}
            {problem.code === "ALREADY_PICKED" && (
              <p className="muted m-0 mb-3 text-[13px]">
                Pokud jsi to nebyl ty, přidej si ke jménu druhé křestní jméno
                nebo se ozvi vyučujícímu.
              </p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                className="btn btn-primary"
                style={{ minHeight: 44 }}
                onClick={() => setProblem(null)}
              >
                Zpět na seznam
              </button>
              {problem.code === "ALREADY_PICKED" && (
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ minHeight: 44 }}
                  onClick={backToGate}
                >
                  Upravit jméno
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {closed && !mine && (
        <div className="px-5 pt-4">
          <div className="blueprint px-5 py-4">
            <Corners />
            <div
              className="muted mb-2 flex items-center gap-1.5 text-[11px] uppercase tracking-[.1em]"
              style={{ fontFamily: "var(--font-heading)" }}
            >
              <ClockIcon size={15} />
              Uzavřeno
            </div>
            <h5 className="m-0 mb-1.5 text-[18px]">Výběr je uzavřený</h5>
            <p className="muted m-0 text-[13px]">
              Rozdělení témat je konečné, změny už řeší vyučující osobně.
            </p>
          </div>
        </div>
      )}

      {mine && (
        <div className="flex items-center gap-2 px-5 pt-3.5 pb-1.5">
          <span className={`livedot ${live ? "" : "is-off"}`} />
          <span className="muted text-[12px]">
            Ostatní témata · zbývá {free} z {board.topics.length}
          </span>
        </div>
      )}

      <div className="flex flex-col gap-4 px-5 py-4.5">
        {visible.map((topic) => (
          <div key={topic.id} className="card blueprint relative gap-0 px-4.5 py-4">
            <Corners />

            {topic.taken ? (
              <div className="relative">
                <div className="hatch" />
                <div style={{ opacity: 0.45 }}>
                  <div
                    className="mb-1 flex items-center gap-[7px] text-[12px] tracking-[.1em]"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    <LockIcon size={14} />
                    <span>TÉMA {numbers.get(topic.id)} · OBSAZENO</span>
                  </div>
                  <div
                    className="strike text-[21px] leading-[1.15] font-semibold"
                    style={{ fontFamily: "var(--font-heading)" }}
                  >
                    {topic.title}
                  </div>
                  <p className="m-0 mt-1.5 text-[13px]">{label(topic)}</p>
                </div>
              </div>
            ) : (
              <div>
                <div className="topic-num mb-1">TÉMA {numbers.get(topic.id)}</div>
                <div
                  className="text-[21px] leading-[1.15] font-semibold"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {topic.title}
                </div>
                {topic.description && (
                  <p className="muted mt-1.5 mb-3.5 text-[13px]">
                    {topic.description}
                  </p>
                )}

                {mine || closed ? (
                  <button
                    className="btn btn-secondary btn-block"
                    style={{ minHeight: 44 }}
                    disabled
                  >
                    {closed ? "Vybírat už nelze" : "Vybírat už nemůžeš"}
                  </button>
                ) : (
                  <button
                    className="btn btn-primary btn-block"
                    style={{ minHeight: 44, marginTop: 0 }}
                    onClick={() => setConfirming(topic)}
                    disabled={busy || !live}
                  >
                    {live ? "Vybrat" : "Čekám na spojení…"}
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {visible.length === 0 && (
          <p className="muted py-4 text-center">Nic neodpovídá hledání.</p>
        )}
      </div>

      {/* 03 · Potvrzovací dialog */}
      {confirming && (
        <div className="dialog-backdrop">
          <div
            className="dialog blueprint"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            style={{ background: "var(--color-bg)" }}
          >
            <Corners />
            <div className="dialog-title" id="confirm-title">
              Potvrdit volbu tématu?
            </div>
            <div className="dialog-body">
              <div className="blueprint mb-3 px-3.5 py-3">
                <Corners />
                <div className="topic-num">TÉMA {numbers.get(confirming.id)}</div>
                <div
                  className="text-[19px] leading-[1.2] font-semibold"
                  style={{ fontFamily: "var(--font-heading)" }}
                >
                  {confirming.title}
                </div>
              </div>
              <p className="m-0">
                Volbu už nebude možné změnit. Téma se okamžitě uzamkne pro
                ostatní ve třídě.
              </p>
            </div>
            <div className="dialog-actions">
              <button
                className="btn btn-secondary"
                style={{ minHeight: 44 }}
                onClick={() => setConfirming(null)}
              >
                Zpět
              </button>
              <button
                className="btn btn-primary"
                style={{ minHeight: 44 }}
                onClick={() => claim(confirming)}
                disabled={busy}
              >
                Ano, vzít si téma
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
