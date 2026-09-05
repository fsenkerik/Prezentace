"use client";

import { useEffect, useState } from "react";

/** Odpočet do otevření výběru. Až doběhne, zavolá onDone a stránka se
 *  přepne sama — žák nemusí nic mačkat. */
export default function Countdown({
  to,
  onDone,
  size = "lg",
}: {
  to: string;
  onDone: () => void;
  /** Na bráně stojí vedle formuláře, tam je menší; na čekací
   *  obrazovce je jediným obsahem, tak může být velký. */
  size?: "lg" | "md";
}) {
  const target = new Date(to).getTime();
  const [left, setLeft] = useState(() => target - Date.now());

  useEffect(() => {
    const timer = setInterval(() => {
      const remaining = target - Date.now();
      setLeft(remaining);
      if (remaining <= 0) {
        clearInterval(timer);
        onDone();
      }
    }, 250);
    return () => clearInterval(timer);
  }, [target, onDone]);

  const total = Math.max(0, Math.floor(left / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div
      className={`mono leading-none tabular-nums ${
        size === "lg" ? "text-[56px]" : "text-[38px]"
      }`}
      aria-live="polite"
    >
      {hours > 0 && `${pad(hours)}:`}
      {pad(minutes)}:{pad(seconds)}
    </div>
  );
}
