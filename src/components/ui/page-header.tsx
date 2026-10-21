import * as React from "react";

export function PageHeader({
  title,
  subtitle,
  tabs,
  children,
}: {
  title: string;
  subtitle?: string;
  tabs?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex min-w-0 flex-wrap items-center justify-between gap-4">
      <div className="flex min-w-0 flex-wrap items-center gap-x-8 gap-y-2">
        <div className="min-w-0">
          <h1 className="break-words text-3xl font-semibold tracking-tight text-ink">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-ink-3">{subtitle}</p> : null}
        </div>
        {tabs ? <div className="min-w-0">{tabs}</div> : null}
      </div>
      {children ? (
        <div className="flex flex-wrap items-center justify-end gap-2">{children}</div>
      ) : null}
    </header>
  );
}
