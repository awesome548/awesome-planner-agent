import { ReactNode } from "react";

type RecordCardProps = {
  eyebrow: string;
  title: string;
  right?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
};

export default function RecordCard({
  eyebrow,
  title,
  right,
  footer,
  children,
}: RecordCardProps) {
  return (
    <section className="rounded-3xl border border-black/10 bg-white/70 backdrop-blur px-6 py-6 shadow-[0_18px_50px_rgba(0,0,0,0.08)]">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-black/50">{eyebrow}</div>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h2>
        </div>
        {right && (
          <div className="text-right text-xs uppercase tracking-[0.25em] text-black/50">
            {right}
          </div>
        )}
      </div>

      <div className="mt-6">{children}</div>

      {footer && (
        <div className="mt-6 text-xs tracking-[0.2em] text-black/50 uppercase">
          {footer}
        </div>
      )}
    </section>
  );
}
