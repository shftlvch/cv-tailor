import type { PropsWithChildren, ReactNode } from 'react';

export function A4Page({ children }: PropsWithChildren) {
  return (
    <div className="a4 page">
      {children}
      <div className="absolute top-[281mm] left-0 right-0 h-1 border-t-[1mm] border-gray-300 border-dashed print:hidden" />
    </div>
  );
}

export function Head({ children }: PropsWithChildren) {
  return <header>{children}</header>;
}

export function Section({ title, right, children }: PropsWithChildren<{ title?: ReactNode; right?: ReactNode }>) {
  return (
    <section>
      {title && (
        <div className="flex items-baseline justify-between mb-[2pt]">
          <div>{title}</div>
          {right && <div>{right}</div>}
        </div>
      )}
      <div>{children}</div>
    </section>
  );
}

export function List({ children, className, noPadding }: { noPadding?: boolean; className?: string } & PropsWithChildren) {
  return <ul className={`list-disc space-y-[2pt] ${noPadding ? 'pl-[12pt]' : 'pl-[16pt]'}${className ? ` ${className}` : ''}`}>{children}</ul>;
}

export function ListItem({ children }: PropsWithChildren) {
  return <li className="text-[10pt] leading-tight text-black">{children}</li>;
}
