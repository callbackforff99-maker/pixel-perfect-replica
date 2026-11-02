import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
  type ErrorComponentProps,
} from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold text-foreground">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: ErrorComponentProps) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold tracking-tight text-foreground">
          This page didn't load
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Something went wrong on our end. You can try refreshing or head back home.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="inline-flex items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
          >
            Try again
          </button>
          <a
            href="/"
            className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "SleeepX 3_4" },
      { name: "description", content: "Private sleep and calm companion." },
      { name: "theme-color", content: "#F6F8F3" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:site", content: "@Lovable" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: appCss,
      },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600&family=Syne:wght@600;700;800&display=swap" },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const [stage, setStage] = useState<"splash" | "pin" | "app">("splash");
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [pin, setPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setSavedPin(localStorage.getItem("sleeepx.pin.v1"));
    const timer = window.setTimeout(() => setStage("pin"), 1600);
    return () => window.clearTimeout(timer);
  }, []);

  const submitPin = () => {
    if (!/^\d{4,6}$/.test(pin)) {
      setMessage("Enter a 4–6 digit PIN.");
      return;
    }
    if (!savedPin) {
      if (pin !== confirmPin) {
        setMessage("PINs do not match. Try again.");
        return;
      }
      localStorage.setItem("sleeepx.pin.v1", pin);
      setSavedPin(pin);
      setMessage("");
      setStage("app");
      return;
    }
    if (pin !== savedPin) {
      setMessage("Incorrect PIN. Try again.");
      setPin("");
      return;
    }
    setMessage("");
    setStage("app");
  };

  if (stage !== "app") {
    return (
      <div className="fixed inset-0 z-50 flex min-h-screen items-center justify-center bg-[#050806] px-6 text-white">
        {stage === "splash" ? (
          <div className="text-center">
            <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-3xl border border-emerald-400/30 bg-emerald-400/10 text-emerald-300">
              <span className="text-3xl font-extrabold">S</span>
            </div>
            <p className="text-xs font-bold tracking-[0.35em] text-emerald-300">SLEEEPX</p>
            <h1 className="mt-3 text-2xl font-extrabold tracking-wide">Rest. Reset. Rise.</h1>
            <p className="mt-8 text-[10px] tracking-[0.25em] text-white/45">DEVELOPED BY ZEROX</p>
          </div>
        ) : (
          <div className="w-full max-w-sm rounded-3xl border border-white/10 bg-[#0c120e] p-6 shadow-2xl">
            <p className="text-xs font-bold tracking-[0.25em] text-emerald-300">SLEEEPX SECURITY</p>
            <h1 className="mt-3 text-2xl font-bold">{savedPin ? "Welcome back" : "Set up your PIN"}</h1>
            <p className="mt-2 text-sm text-white/60">
              {savedPin ? "Enter your PIN to open your private space." : "Create a 4–6 digit PIN to protect access to this app."}
            </p>
            <input
              aria-label="PIN"
              type="password"
              inputMode="numeric"
              autoComplete="off"
              maxLength={6}
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setMessage(""); }}
              placeholder="Enter PIN"
              className="mt-5 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-center text-xl tracking-[0.5em] text-white outline-none focus:border-emerald-400"
            />
            {!savedPin && (
              <input
                aria-label="Confirm PIN"
                type="password"
                inputMode="numeric"
                autoComplete="off"
                maxLength={6}
                value={confirmPin}
                onChange={(e) => { setConfirmPin(e.target.value.replace(/\D/g, "").slice(0, 6)); setMessage(""); }}
                placeholder="Confirm PIN"
                className="mt-3 w-full rounded-2xl border border-white/10 bg-black px-4 py-4 text-center text-xl tracking-[0.5em] text-white outline-none focus:border-emerald-400"
              />
            )}
            {message && <p className="mt-3 text-sm text-red-300">{message}</p>}
            <button onClick={submitPin} className="mt-5 w-full rounded-2xl bg-emerald-400 px-4 py-4 font-bold text-[#061009]">
              {savedPin ? "Unlock SleeepX" : "Save PIN & continue"}
            </button>
            <p className="mt-4 text-center text-xs text-white/35">PIN is stored locally on this device.</p>
          </div>
        )}
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      {/* Required: nested routes render here. Removing <Outlet /> breaks all child routes. */}
      <Outlet />
    </QueryClientProvider>
  );
}
