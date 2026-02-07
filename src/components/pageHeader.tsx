import type { ReactNode } from "react";

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  icon?: ReactNode;
  right?: ReactNode;
};

export default function PageHeader({ eyebrow, title, icon, right }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
      {/* Title Area */}
      <div className="flex items-start gap-4">
        {icon && (
          <div className="shrink-0 flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 rounded-2xl border border-zinc-200 bg-zinc-50 text-zinc-500 shadow-sm">
            {icon}
          </div>
        )}

        <div className="flex flex-col pt-0.5">
          {eyebrow && (
            <p className="text-xs font-medium uppercase tracking-widest text-zinc-500">
              {eyebrow}
            </p>
          )}
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-3xl leading-tight">
            {title}
          </h1>
        </div>
      </div>

      {/* Actions Area */}
      {right && (
        <div className="flex items-center gap-3 sm:self-start sm:mt-1">
          {right}
        </div>
      )}
    </header>
  );
}