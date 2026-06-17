import { Link } from "wouter";

interface LogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
  className?: string;
}

export default function Logo({ size = "md", showText = true, className = "" }: LogoProps) {
  const sizes = {
    sm: { icon: "w-8 h-8 text-lg", text: "text-lg" },
    md: { icon: "w-10 h-10 text-xl", text: "text-xl" },
    lg: { icon: "w-16 h-16 text-3xl", text: "text-3xl" },
  };
  const s = sizes[size];

  return (
    <Link href="/" className={"flex items-center gap-2.5 group " + className}>
      <div className={"rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-violet-600 flex items-center justify-center text-white font-black shadow-lg shadow-primary/25 group-hover:shadow-primary/40 transition-all group-hover:scale-105 flex-shrink-0 " + s.icon}>
        <svg viewBox="0 0 24 24" fill="none" className="w-[55%] h-[55%]">
          <path d="M12 2L3 7l9 5 9-5-9-5z" fill="white" opacity="0.9"/>
          <path d="M3 12l9 5 9-5" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.7"/>
          <path d="M3 17l9 5 9-5" stroke="white" strokeWidth="2" strokeLinecap="round" fill="none" opacity="0.5"/>
        </svg>
      </div>
      {showText && (
        <span className={"font-black tracking-tight text-foreground " + s.text}>
          Skill<span className="text-primary">Swap</span>
        </span>
      )}
    </Link>
  );
}
