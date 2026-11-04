import type { ReactNode } from "react";

export function LargeTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <header className="px-4 pt-3 pb-2">
      {subtitle ? <p className="text-[13px] font-semibold text-ios-secondary uppercase">{subtitle}</p> : null}
      <h1 className="text-[34px] leading-tight font-bold tracking-tight">{title}</h1>
    </header>
  );
}

export function Section({
  header,
  trailing,
  footer,
  children,
}: {
  header?: string;
  trailing?: ReactNode;
  footer?: string;
  children: ReactNode;
}) {
  return (
    <section className="mx-4 mt-6">
      {header || trailing ? (
        <div className="flex items-end justify-between px-4 pb-1.5 text-[13px] text-ios-secondary">
          <h2 className="uppercase">{header}</h2>
          {trailing}
        </div>
      ) : null}
      <div className="divide-y divide-ios-separator overflow-hidden rounded-[10px] bg-ios-card [&>*]:border-ios-separator">
        {children}
      </div>
      {footer ? <p className="px-4 pt-1.5 text-[13px] text-ios-secondary">{footer}</p> : null}
    </section>
  );
}

export function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex min-h-11 items-center justify-between gap-4 px-4 py-2.5">
      <span>{label}</span>
      <span className="text-right text-ios-secondary">{value}</span>
    </div>
  );
}
