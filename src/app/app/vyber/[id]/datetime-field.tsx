"use client";

import { useEffect, useState } from "react";

/** Pole pro datum a čas.
 *
 *  Vstup typu datetime-local nese čas bez zóny („2026-09-05T11:52"), takže
 *  by ho server přečetl ve své vlastní zóně. Lokálně to projde, na Vercelu
 *  ale server běží v UTC a učiteli by se výběr otevřel o dvě hodiny jinde.
 *  Převod proto děláme v prohlížeči, kde místní čas skutečně je ten
 *  učitelův, a odesíláme rovnou ISO řetězec.
 */
export default function DateTimeField({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value: string | null;
}) {
  const [local, setLocal] = useState("");

  // Předvyplnění až po připojení, aby se server a klient neshodovaly
  // na prázdné hodnotě místo hlášky o rozdílné hydrataci.
  useEffect(() => {
    if (!value) return;
    const d = new Date(value);
    const pad = (n: number) => String(n).padStart(2, "0");
    setLocal(
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`,
    );
  }, [value]);

  return (
    <div className="field" style={{ width: 200 }}>
      <label htmlFor={name}>{label}</label>
      <input
        id={name}
        type="datetime-local"
        className="input"
        style={{ minHeight: 40 }}
        value={local}
        onChange={(e) => setLocal(e.target.value)}
      />
      <input
        type="hidden"
        name={name}
        value={local ? new Date(local).toISOString() : ""}
      />
    </div>
  );
}
