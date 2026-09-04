/** Registrační značky v rozích. V návrhu drží celý „technický výkres"
 *  pohromadě, takže je má každý rám a karta. */
export function Corners() {
  return (
    <>
      <i className="corner tl" />
      <i className="corner tr" />
      <i className="corner bl" />
      <i className="corner br" />
    </>
  );
}

type IconProps = {
  size?: number;
  className?: string;
  style?: React.CSSProperties;
};

function Svg({
  size = 16,
  className,
  style,
  children,
}: IconProps & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
      style={style}
      aria-hidden
    >
      {children}
    </svg>
  );
}

export function LockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="4" y="10" width="16" height="11" rx="1" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </Svg>
  );
}

export function SearchIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.5-3.5" />
    </Svg>
  );
}

export function CheckIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="m4 12 5.5 5.5L20 7" />
    </Svg>
  );
}

export function WarningIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 9v4M12 17h.01" />
      <path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0Z" />
    </Svg>
  );
}

export function WifiIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 20h.01" />
      <path d="M5 12.9a10 10 0 0 1 14 0" />
      <path d="M8.5 16.4a5 5 0 0 1 7 0" />
    </Svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l3 2" />
    </Svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" />
    </Svg>
  );
}

/** Pořadové číslo tématu tak, jak ho ukazuje návrh: 01, 02, … */
export function topicNumber(index: number) {
  return String(index + 1).padStart(2, "0");
}

export function timeOnly(value: string) {
  return new Date(value).toLocaleTimeString("cs-CZ", {
    hour: "numeric",
    minute: "2-digit",
  });
}
