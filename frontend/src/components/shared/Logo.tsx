type LogoProps = {
  size?: "sm" | "md";
  showText?: boolean;
  textClassName?: string;
};

const sizeMap = {
  sm: { box: "h-7 w-7", icon: "h-4 w-4", text: "text-sm" },
  md: { box: "h-9 w-9", icon: "h-5 w-5", text: "text-lg" },
} as const;

export default function Logo({ size = "md", showText = true, textClassName }: LogoProps) {
  const s = sizeMap[size];
  return (
    <div className="flex items-center gap-2">
      <span
        className={`relative flex shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary-500 via-primary-600 to-primary-800 shadow-[0_4px_16px_-2px_rgba(11,99,216,0.65)] ${s.box}`}
      >
        <span className="absolute inset-0 rounded-xl bg-gradient-to-t from-transparent to-white/25" />
        <svg viewBox="0 0 24 24" fill="none" className={`relative ${s.icon} text-white`}>
          <path
            d="M12 2 20 6.5V17.5L12 22 4 17.5V6.5Z"
            fill="white"
            fillOpacity="0.18"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          <path d="M12 2 20 6.5 12 11 4 6.5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
          <path d="M12 11V22" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </span>
      {showText && <span className={`font-semibold text-white ${s.text} ${textClassName ?? ""}`}>Inventra</span>}
    </div>
  );
}
