import Link from "next/link";

type BottomBarProps = {
  active: "usage" | "plan" | "morning";
};

export default function BottomBar({ active }: BottomBarProps) {
  const base = "px-4 py-1.5 text-sm rounded-full transition";
  const inactive = "text-black/70 hover:bg-black/5 hover:text-black";
  const activeClasses = "bg-black text-white hover:bg-black/90";

  return (
    <div className="fixed bottom-6 inset-x-0 flex justify-center z-20 pointer-events-auto">
      <div className="rounded-full bg-white/90 border border-black/10 shadow-[0_12px_40px_rgba(0,0,0,0.08)] backdrop-blur px-1 py-1 flex items-center gap-1">
        <Link
          className={`${base} ${active === "usage" ? activeClasses : inactive}`}
          href="/usage"
        >
          All
        </Link>
        <Link
          className={`${base} ${active === "plan" ? activeClasses : inactive}`}
          href="/"
        >
          Day
        </Link>
        <Link
          className={`${base} ${active === "morning" ? activeClasses : inactive}`}
          href="/morning"
        >
          Morning
        </Link>
      </div>
    </div>
  );
}
