import type { PropsWithChildren } from 'react';

export function H1({ children }: PropsWithChildren) {
  return <h1 className="h1">{children}</h1>;
}

export function H2({ children }: PropsWithChildren) {
  return <h2 className="h2">{children}</h2>;
}

export function H3({ children }: PropsWithChildren) {
  return <h3 className="h3">{children}</h3>;
}

export function Subtitle({ children }: PropsWithChildren) {
  return <p className="subtitle">{children}</p>;
}
