import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  icon?: ReactNode;
  right?: ReactNode;
};

export default function PageHeader({ eyebrow, title, icon, right }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        {icon && (
          <div className="h-10 w-10 rounded-full border border-black/10 bg-white/80 shadow-inner flex items-center justify-center text-black/70">
            {icon}
          </div>
        )}
        <div>
          {eyebrow && (
            <div className="text-xs uppercase tracking-[0.3em] text-black/50">{eyebrow}</div>
          )}
          <h1 className="mt-2 text-3xl font-semibold tracking-tight">{title}</h1>
        </div>
      </div>
      <div className="flex items-center justify-end gap-2">{right}</div>
    </header>
  );
}
