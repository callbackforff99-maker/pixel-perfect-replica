import { Home, Moon, Wind, NotebookPen, Settings, Pill } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { dbError } from "@/lib/store";

const tabs = [
  { to: "/", label: "Home", icon: Home },
  { to: "/sleep", label: "Sleep", icon: Moon },
  { to: "/calm", label: "Calm", icon: Wind },
  { to: "/journal", label: "Journal", icon: NotebookPen },
  { to: "/meds", label: "Meds", icon: Pill },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

export function Shell({ children }: { children: ReactNode }) {
  const [activePath, setActivePath] = useState("/");

  useEffect(() => {
    document.documentElement.classList.toggle(
      "dark",
      localStorage.getItem("sleeepx.theme") === "dark"
    );

    const syncActiveTab = () => {
      const path = window.location.hash.replace(/^#/, "") || "/";
      setActivePath(path);
    };

    syncActiveTab();
    window.addEventListener("hashchange", syncActiveTab);
    return () => window.removeEventListener("hashchange", syncActiveTab);
  }, []);

  return (
    <div className="relative mx-auto min-h-screen max-w-md bg-background pb-28 pt-[max(env(safe-area-inset-top),1.25rem)]">
      {dbError && (
        <div className="mx-4 mb-4 rounded-2xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {dbError}
        </div>
      )}

      <main>{children}</main>

      <nav
        aria-label="Main navigation"
        className="fixed inset-x-3 bottom-3 z-20 mx-auto max-w-md rounded-[1.7rem] border border-border/90 bg-card/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_34px_rgba(0,0,0,0.32)] backdrop-blur-2xl"
      >
        <ul className="mx-auto grid max-w-md grid-cols-6 px-2">
          {tabs.map(({ to, label, icon: Icon }) => {
            const active = activePath === to;
            return (
              <li key={to}>
                <a
                  href={`#${to}`}
                  aria-current={active ? "page" : undefined}
                  className={`group relative flex min-h-[66px] flex-col items-center justify-center gap-1.5 rounded-2xl px-1 py-2 text-[10px] font-semibold transition-all ${
                    active ? "text-primary" : "text-muted-foreground"
                  }`}
                >
                  <span
                    className={`absolute top-0 h-[3px] w-7 rounded-b-full bg-primary transition-opacity ${
                      active ? "opacity-100" : "opacity-0"
                    }`}
                  />
                  <span
                    className={`flex h-9 w-11 items-center justify-center rounded-2xl transition-all ${
                      active ? "bg-primary/15 shadow-[0_0_18px_rgba(189,54,84,0.16)]" : ""
                    }`}
                  >
                    <Icon
                      className={`h-[21px] w-[21px] transition-transform ${
                        active ? "scale-110" : ""
                      }`}
                      strokeWidth={active ? 2.3 : 1.8}
                    />
                  </span>
                  <span>{label}</span>
                </a>
              </li>
            );
          })}
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
    <header className="mb-6 flex items-center justify-between gap-3 px-4 pt-1">
      <div className="min-w-0">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-[0.24em] text-primary">
          SleeepX
        </p>
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
