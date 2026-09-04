"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabaseBrowser } from "@/lib/supabase/client";
import { errorText, type Board, type BoardInfo, type BoardTopic } from "@/lib/types";
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
  const [notice, setNotice] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [live, setLive] = useState(false);
  const [confirming, setConfirming] = useState<BoardTopic | null>(null);
  const [query, setQuery] = useState("");
  const [onlyFree, setOnlyFree] = useState(false);
  const [openedAt, setOpenedAt] = useState(() => Date.now());

  // Kód a jméno drží prohlížeč, aby žák po náhodném zavření karty
  // nezačínal znovu.
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
    setNotice(null);
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

    if (error) {
      setNotice(errorText("CONFLICT"));
    } else if (!result.ok) {
      setNotice(errorText(result.error));
    }
    refresh();
    setBusy(false);
  }

  const notOpenYet = info.opens_at ? new Date(info.opens_at).getTime() > openedAt : false;

  if (notOpenYet && !board?.my_selection) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 p-6 text-center">
        <p className="text-muted-foreground">{info.class_name}</p>
        <h1 className="text-2xl font-semibold">{info.title}</h1>
        <p className="text-muted-foreground">Výběr se otevře za</p>
        <Countdown to={info.opens_at!} onDone={() => setOpenedAt(Date.now())} />
        <p className="text-sm text-muted-foreground">
          Nech si stránku otevřenou, sama se přepne.
        </p>
      </main>
    );
  }

  // ── Vstupní brána ────────────────────────────────────────────────────
  if (!board) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-6 p-6">
        <header className="space-y-1">
          <p className="text-sm text-muted-foreground">{info.class_name}</p>
          <h1 className="text-2xl font-semibold">{info.title}</h1>
          <p className="text-sm text-muted-foreground">
            Volných témat: {info.topic_count - info.taken_count} z {info.topic_count}
          </p>
        </header>

        <form onSubmit={submitGate} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Tvoje jméno a příjmení</span>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              minLength={3}
              autoComplete="name"
              className="min-h-11 w-full rounded-lg border border-border bg-muted px-3"
            />
          </label>

          <label className="block space-y-1">
            <span className="text-sm font-medium">Přístupový kód</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              required
              inputMode="text"
              autoCapitalize="characters"
              className="min-h-11 w-full rounded-lg border border-border bg-muted px-3 font-mono text-lg tracking-widest"
            />
          </label>

          {gateError && (
            <p role="alert" className="text-sm text-danger">
              {gateError}
            </p>
          )}

          <button
            type="submit"
            disabled={busy}
            className="min-h-11 w-full rounded-lg bg-accent px-4 font-medium text-accent-foreground disabled:opacity-50"
          >
            Pokračovat
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Téma si vybíráš jen jednou. Volba je konečná.
          </p>
        </form>
      </main>
    );
  }

  // ── Seznam témat ─────────────────────────────────────────────────────
  const free = board.topics.filter((t) => !t.taken).length;
  const mine = board.my_selection;
  const closed = board.status === "closed";
  const visible = board.topics.filter((t) => {
    if (onlyFree && t.taken) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      t.title.toLowerCase().includes(q) ||
      (t.description ?? "").toLowerCase().includes(q)
    );
  });

  return (
    <main className="mx-auto max-w-2xl pb-16">
      <header className="sticky top-0 z-10 space-y-3 border-b border-border bg-background/95 p-4 backdrop-blur">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="text-xs text-muted-foreground">{board.class_name}</p>
            <h1 className="text-lg font-semibold">{board.title}</h1>
          </div>
          <span
            className="flex items-center gap-1.5 text-xs text-muted-foreground"
            title={live ? "Připojeno, změny se ukazují ihned" : "Obnovuji spojení…"}
          >
            <span
              aria-hidden
              className={`inline-block size-2 rounded-full ${live ? "bg-emerald-500" : "bg-amber-500"}`}
            />
            {live ? "živě" : "obnovuji…"}
          </span>
        </div>

        <p className="text-sm text-muted-foreground">
          Zbývá <strong className="text-foreground">{free}</strong> z {board.topics.length} témat
        </p>

        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Hledat téma"
            className="min-h-11 flex-1 rounded-lg border border-border bg-muted px-3"
          />
          <button
            type="button"
            onClick={() => setOnlyFree((v) => !v)}
            aria-pressed={onlyFree}
            className={`min-h-11 rounded-lg border border-border px-3 text-sm ${
              onlyFree ? "bg-accent text-accent-foreground" : "bg-muted"
            }`}
          >
            Jen volná
          </button>
        </div>
      </header>

      {mine && (
        <div className="m-4 rounded-xl border-2 border-accent p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            Tvoje téma
          </p>
          <p className="text-lg font-semibold">
            {board.topics.find((t) => t.id === mine.topic_id)?.title}
          </p>
          <p className="text-sm text-muted-foreground">
            Vybráno {new Date(mine.created_at).toLocaleTimeString("cs-CZ")}
          </p>
        </div>
      )}

      {notice && (
        <p
          role="alert"
          className="mx-4 mb-2 rounded-lg border border-danger p-3 text-sm text-danger"
        >
          {notice}
        </p>
      )}

      {closed && (
        <p className="mx-4 mb-2 rounded-lg bg-muted p-3 text-sm">
          Výběr je uzavřený.
        </p>
      )}

      <ul className="space-y-3 p-4">
        {visible.map((topic) => (
          <li
            key={topic.id}
            className={`rounded-xl border p-4 ${
              topic.taken
                ? "border-border bg-muted opacity-60"
                : "border-border bg-background"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h2
                  className={`font-medium ${topic.taken ? "line-through" : ""}`}
                >
                  {topic.title}
                </h2>
                {topic.description && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {topic.description}
                  </p>
                )}
                {topic.taken && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    {topic.taken_by ? `Obsazeno — ${topic.taken_by}` : "Obsazeno"}
                  </p>
                )}
              </div>

              {!topic.taken && !mine && !closed && (
                <button
                  type="button"
                  onClick={() => setConfirming(topic)}
                  disabled={busy}
                  className="min-h-11 shrink-0 rounded-lg bg-accent px-4 font-medium text-accent-foreground disabled:opacity-50"
                >
                  Vybrat
                </button>
              )}
            </div>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="p-4 text-center text-muted-foreground">
            Nic neodpovídá hledání.
          </li>
        )}
      </ul>

      {confirming && (
        <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/50 p-4 sm:items-center">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            className="w-full max-w-md space-y-4 rounded-2xl border border-border bg-background p-5"
          >
            <h2 id="confirm-title" className="text-lg font-semibold">
              Opravdu tohle téma?
            </h2>
            <p className="rounded-lg bg-muted p-3">{confirming.title}</p>
            <p className="text-sm text-muted-foreground">
              Volbu už nepůjde změnit. Uvolnit téma může jen vyučující.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setConfirming(null)}
                className="min-h-11 flex-1 rounded-lg border border-border"
              >
                Zpět
              </button>
              <button
                type="button"
                onClick={() => claim(confirming)}
                disabled={busy}
                className="min-h-11 flex-1 rounded-lg bg-accent font-medium text-accent-foreground disabled:opacity-50"
              >
                Vybrat téma
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
