import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  icon?: ReactNode;
  right?: ReactNode;
};

export default function PageHeader({ eyebrow, title, icon, right }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="space-y-1">
        {eyebrow && (
          <p className="text-[11px] font-medium uppercase tracking-[0.2em] text-black/40">
            {eyebrow}
          </p>
        )}
        <div className="flex items-center gap-3">
          {icon}
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
            {title}
          </h1>
        </div>
      </div>

      {right && (
        <div className="flex items-center gap-3">
          {right}
        </div>
      )}
    </header>
  );
}