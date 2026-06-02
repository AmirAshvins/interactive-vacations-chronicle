import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

interface AuthFormLayoutProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function AuthFormLayout({ title, subtitle, children, footer }: AuthFormLayoutProps) {
  return (
    <div className="flex min-h-full items-center justify-center bg-[#f5f0e8] p-6">
      <div className="w-full max-w-md rounded-2xl border border-[#d4c4a8]/60 bg-[#faf6ef]/95 p-8 shadow-lg backdrop-blur-sm">
        <h1 className="font-serif text-2xl font-light tracking-tight text-[#2c2416]">{title}</h1>
        {subtitle ? (
          <p className="mt-2 text-sm font-light text-[#5c4f3a]/80">{subtitle}</p>
        ) : null}
        <div className="mt-8">{children}</div>
        {footer ? <div className="mt-6 text-center text-sm text-[#5c4f3a]/70">{footer}</div> : null}
      </div>
    </div>
  );
}

export function AuthLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link to={to} className="font-medium text-[#6b5344] underline-offset-2 hover:underline">
      {children}
    </Link>
  );
}
