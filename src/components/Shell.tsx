import { Link } from "@tanstack/react-router";
import { Home, Moon, Wind, NotebookPen, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { dbError } from "@/lib/store";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/sleep", label: "Sleep", icon: Moon },
  { to: "/calm", label: "Calm", icon: Wind },
  { to: "/journal", label: "Journal", icon: NotebookPen },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="mx-auto min-h-screen max-w-md pb-28 pt-[max(env(safe-area-inset-top),1rem)]">
      {dbError && <div className="mx-4 mb-3 rounded-xl border border-destructive bg-destructive/15 p-3 text-sm">{dbError}</div>}
      {children}
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/90 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {tabs.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="group relative flex flex-col items-center gap-1 py-3 text-[11px] text-muted-foreground data-[status=active]:text-foreground"
              >
                <span className="absolute top-0 h-0.5 w-8 rounded-full bg-primary opacity-0 shadow-glow group-data-[status=active]:opacity-100" />
                <Icon className="h-5 w-5 group-data-[status=active]:text-primary-glow" />
                {label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function PageHead({ title, sub, right }: { title: string; sub?: string; right?: ReactNode }) {
  return (
    <header className="mb-5 flex items-end justify-between px-4">
      <div>
        <h1 className="text-3xl font-bold">{title}</h1>
        {sub && <p className="mt-1 text-sm text-muted-foreground">{sub}</p>}
      </div>
      {right}
    </header>
  );
}

export function Rating({ value, onChange, label }: { value?: number; onChange: (v?: number) => void; label: string }) {
  return (
    <div>
      <p className="mb-1.5 text-sm text-muted-foreground">{label}</p>
      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            aria-pressed={value === n}
            onClick={() => onChange(value === n ? undefined : n)}
            className="h-10 flex-1 rounded-lg border border-input bg-secondary text-sm aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
