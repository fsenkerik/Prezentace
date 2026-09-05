"use client";

/** Hromadné uvolnění. Kromě úklidu po zkoušce se hodí, když chce
 *  vyučující rozdělení spustit znovu od nuly. */
export default function ReleaseAllButton({ count }: { count: number }) {
  return (
    <button
      className="btn btn-ghost"
      style={{ minHeight: 40, color: "var(--color-danger)" }}
      disabled={count === 0}
      onClick={(e) => {
        const ok = window.confirm(
          `Opravdu uvolnit všech ${count} vybraných témat? Žáci si budou vybírat znovu.`,
        );
        if (!ok) e.preventDefault();
      }}
    >
      Uvolnit všechna témata
    </button>
  );
}
