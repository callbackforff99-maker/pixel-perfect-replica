import { Link } from "@tanstack/react-router";
import { Home, Moon, Wind, NotebookPen, Settings } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { dbError } from "@/lib/store";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/sleep", label: "Sleep", icon: Moon },
  { to: "/calm", label: "Calm", icon: Wind },
  { to: "/journal", label: "Journal", icon: NotebookPen },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      localStorage.getItem("sleeepx.theme") === "dark"
    );
  }, []);

  return (
    <div className="relative mx-auto min-h-screen max-w-md bg-background pb-28 pt-[max(env(safe-area-inset-top),1.25rem)]">
      {dbError && (
        <div className="mx-4 mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {dbError}
        </div>
      )}

      <main>{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border/70 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-5px_25px_rgba(50,75,55,0.06)] backdrop-blur-xl">
        <ul className="mx-auto grid max-w-md grid-cols-5 px-2">
          {tabs.map(({ to, label, icon: Icon }) => (
            <li key={to}>
              <Link
                to={to}
                activeOptions={{ exact: to === "/" }}
                className="group relative flex min-h-[68px] flex-col items-center justify-center gap-1.5 py-2 text-[11px] font-medium text-muted-foreground transition-colors data-[status=active]:text-primary"
              >
                <span className="absolute top-0 h-[3px] w-8 rounded-b-full bg-primary opacity-0 transition-opacity group-data-[status=active]:opacity-100" />

                <span className="flex h-9 w-11 items-center justify-center rounded-2xl transition-all group-data-[status=active]:bg-secondary">
                  <Icon
                    className="h-[21px] w-[21px] transition-transform group-data-[status=active]:scale-110"
                    strokeWidth={2}
                  />
                </span>

                <span>{label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function PageHead({
  title,
  sub,
  right,
}: {
  title: string;
  sub?: string | undefined;
  right?: ReactNode;
}) {
  return (
    <header className="mb-6 flex items-center justify-between gap-3 px-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-foreground">
          {title}
        </h1>
        {sub && (
          <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
        )}
      </div>
      {right}
    </header>
  );
}

export function Rating({
  value,
  onChange,
  label,
}: {
  value?: number | undefined;
  onChange: (v?: number) => void;
  label: string;
}) {
  return (
    <div>
      <p className="mb-2 text-sm font-medium text-muted-foreground">
        {label}
      </p>

      <div className="flex gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            type="button"
            key={n}
            aria-pressed={value === n}
            onClick={() => onChange(value === n ? undefined : n)}
            className="h-11 flex-1 rounded-xl border border-input bg-secondary text-sm font-semibold transition-all aria-pressed:border-primary aria-pressed:bg-primary aria-pressed:text-primary-foreground"
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
