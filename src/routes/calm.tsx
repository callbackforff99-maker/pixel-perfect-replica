```tsx
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import {
  Check,
  Moon,
  Pause,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  Wind,
} from "lucide-react";
import { PageHead, Shell } from "@/components/Shell";
import { nowISO, uid, update, useDB } from "@/lib/store";

export const Route = createFileRoute("/calm")({
  head: () => ({
    meta: [
      { title: "Calm Mind — SleeepX 3_4" },
      { name: "description", content: "Gentle guided breathing sessions." },
    ],
  }),
  component: Calm,
});

const IN = 4;
const OUT = 6;

const checklist = [
  "Dim the lights",
  "Put the phone face down",
  "Keep some water nearby",
  "Make the room cool and quiet",
];

function Calm() {
  const db = useDB();
  const [len, setLen] = useState(3);
  const [state, setState] = useState<"idle" | "running" | "paused" | "done">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [checked, setChecked] = useState<string[]>([]);
  const audio = useRef<AudioContext | null>(null);

  const total = len * 60;
  const phase = elapsed % (IN + OUT) < IN ? "in" : "out";
  const remaining = Math.max(0, total - elapsed);
  const progress = Math.min(100, (elapsed / total) * 100);

  useEffect(() => {
    if (state !== "running") return;

    const id = window.setInterval(() => {
      setElapsed((e) => e + 1);
    }, 1000);

    return () => window.clearInterval(id);
  }, [state]);

  useEffect(() => {
    if (state !== "running") return;

    if (elapsed >= total) {
      finish(true);
      return;
    }

    if (db.settings.sound) {
      if (elapsed % (IN + OUT) === 0) chime(396);
      else if (elapsed % (IN + OUT) === IN) chime(264);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [elapsed]);

  function chime(frequency: number) {
    const AudioContextClass =
      window.AudioContext ||
      (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) return;

    audio.current ??= new AudioContextClass();

    const context = audio.current;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.04, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 1.2);

    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + 1.2);
  }

  function finish(completed: boolean) {
    if (elapsed > 0) {
      update((d) => ({
        ...d,
        breath: [
          ...d.breath,
          {
            id: uid(),
            at: nowISO(),
            seconds: Math.min(elapsed, total),
            completed,
          },
        ],
      }));
    }

    setState(completed ? "done" : "idle");

    if (!completed) setElapsed(0);
  }

  function resetSession() {
    setState("idle");
    setElapsed(0);
  }

 const time = String(Math.floor(remaining / 60)) + ":" + String(remaining % 60).padStart(2, "0");

  const completedSessions = db.breath.filter((b) => b.completed).length;

  return (
    <Shell>
      <PageHead
        title="Calm Mind"
        sub="Take a little pause. Let your mind slow down."
      />

      <div className="space-y-5 px-4 pb-6">

        {/* Intro */}
        <section className="card-x relative overflow-hidden border-0 bg-gradient-to-br from-[#e9f0e7] via-[#f4f7f1] to-[#e3ece3] p-5 dark:from-[#26372c] dark:via-[#293a30] dark:to-[#304337]">
          <div className="relative z-10 flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white/70 text-primary shadow-sm dark:bg-white/10">
              <Wind size={22} />
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">
                Your quiet space
              </p>
              <h2 className="mt-1 text-xl font-bold">
                Find your calm.
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                Just a few minutes of gentle breathing can help you slow down and reset.
              </p>
            </div>
          </div>

          <Sparkles className="absolute -bottom-3 -right-2 h-24 w-24 text-primary/10" />
        </section>

        {/* Breathing session */}
        {state === "done" ? (
          <section className="card-x py-10 text-center">
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-secondary text-primary">
              <Check size={38} />
            </div>

            <h2 className="mt-5 text-2xl font-bold">
              Beautifully done.
            </h2>

            <p className="mx-auto mt-2 max-w-xs text-sm text-muted-foreground">
              You gave yourself {len} minutes of calm. Take this peaceful feeling with you.
            </p>

            <button
              onClick={resetSession}
              className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-primary px-7 py-3 font-semibold text-primary-foreground shadow-glow"
            >
              <RotateCcw size={17} />
              Start again
            </button>
          </section>
        ) : (
          <section className="card-x overflow-hidden p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Guided breathing
                </p>
                <h2 className="mt-1 text-lg font-bold">
                  {state === "idle" ? "Ready when you are" : "Follow the rhythm"}
                </h2>
              </div>

              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
                <Wind size={20} />
              </div>
            </div>

            {/* Breathing circle */}
            <div className="my-7 flex justify-center">
              <div className="relative flex h-64 w-64 items-center justify-center">
                <div className="absolute inset-2 rounded-full border border-primary/10" />
                <div className="absolute inset-7 rounded-full border border-primary/15" />

                <div
                 key={
  state === "running"
    ? phase + "-" + Math.floor(elapsed / (IN + OUT))
    : "static"
}
                  className="absolute inset-10 rounded-full bg-primary/20 shadow-glow"
                  style={{
                    transform: "scale(.65)",
                    animation:
                      state === "running"
? (phase === "in" ? "breathe-in " + IN : "breathe-out " + OUT) + "s ease-in-out forwards"
                        : undefined,
                    animationPlayState: state === "paused" ? "paused" : "running",
                  }}
                />

                <div className="relative z-10 text-center">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    {state === "idle"
                      ? "Your moment"
                      : state === "paused"
                        ? "Paused"
                        : phase === "in"
                          ? "Breathe in"
                          : "Breathe out"}
                  </p>

                  <p className="mt-2 font-display text-4xl font-bold tracking-tight">
                    {state === "idle" ? "Relax" : time}
                  </p>

                  {state !== "idle" && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      {phase === "in" ? "Slowly inhale" : "Gently exhale"}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Progress */}
            {state !== "idle" && (
              <div className="mb-5">
                <div className="mb-2 flex justify-between text-xs text-muted-foreground">
                  <span>Session progress</span>
                  <span>{Math.round(progress)}%</span>
                </div>

                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-primary transition-all duration-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Duration */}
            {state === "idle" && (
              <div className="mb-6">
                <p className="mb-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Choose your duration
                </p>

                <div className="grid grid-cols-3 gap-2">
                  {[1, 3, 5].map((minutes) => (
                    <button
                      key={minutes}
                      aria-pressed={len === minutes}
                      onClick={() => setLen(minutes)}
                      className="rounded-2xl border border-border bg-background px-3 py-3 text-sm font-semibold transition-all aria-pressed:border-primary aria-pressed:bg-secondary aria-pressed:text-primary"
                    >
                      {minutes} min
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Controls */}
            <div className="flex gap-3">
              {state === "idle" && (
                <button
                  onClick={() => {
                    setElapsed(0);
                    setState("running");
                  }}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-semibold text-primary-foreground shadow-glow"
                >
                  <Play size={18} fill="currentColor" />
                  Start breathing
                </button>
              )}

              {state === "running" && (
                <button
                  onClick={() => setState("paused")}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-secondary py-3.5 font-semibold text-foreground"
                >
                  <Pause size={18} />
                  Pause
                </button>
              )}

              {state === "paused" && (
                <button
                  onClick={() => setState("running")}
                  className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-primary py-3.5 font-semibold text-primary-foreground"
                >
                  <Play size={18} fill="currentColor" />
                  Resume
                </button>
              )}

              {(state === "running" || state === "paused") && (
                <button
                  onClick={() => finish(false)}
                  className="rounded-2xl border border-border px-5 py-3.5 text-sm font-medium"
                >
                  Stop
                </button>
              )}
            </div>

            {/* Sound */}
            <div className="mt-5 flex items-center justify-between border-t border-border pt-4">
              <div className="flex items-center gap-2">
                <Volume2 size={17} className="text-muted-foreground" />
                <span className="text-sm font-medium">Soft breathing tones</span>
              </div>

              <input
                type="checkbox"
                checked={db.settings.sound}
                onChange={(e) =>
                  update((d) => ({
                    ...d,
                    settings: {
                      ...d.settings,
                      sound: e.target.checked,
                    },
                  }))
                }
                className="h-4 w-4 accent-primary"
              />
            </div>
          </section>
        )}

        {/* Breathing guide */}
        <section className="card-x p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <Wind size={19} />
            </div>

            <div>
              <h2 className="font-bold">Your breathing rhythm</h2>
              <p className="text-xs text-muted-foreground">
                A gentle, natural breathing pattern
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-secondary/70 p-4">
              <p className="text-xs text-muted-foreground">Inhale</p>
              <p className="mt-1 text-2xl font-bold text-primary">4 sec</p>
              <p className="mt-1 text-xs text-muted-foreground">Breathe in gently</p>
            </div>

            <div className="rounded-2xl bg-secondary/70 p-4">
              <p className="text-xs text-muted-foreground">Exhale</p>
              <p className="mt-1 text-2xl font-bold text-primary">6 sec</p>
              <p className="mt-1 text-xs text-muted-foreground">Breathe out slowly</p>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
            Keep your breathing comfortable. Don't force it or hold your breath.
            If you feel dizzy or uncomfortable, stop and breathe normally.
          </p>
        </section>

        {/* Wind down checklist */}
        <section className="card-x p-5">
          <div className="mb-4 flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary text-primary">
              <Moon size={19} />
            </div>

            <div>
              <h2 className="font-bold">Wind-down checklist</h2>
              <p className="text-xs text-muted-foreground">
                Prepare your space for a peaceful rest
              </p>
            </div>
          </div>

          <div className="space-y-1">
            {checklist.map((item) => {
              const isChecked = checked.includes(item);

              return (
                <label
                  key={item}
                  className="flex cursor-pointer items-center gap-3 rounded-xl px-2 py-3 transition-colors hover:bg-secondary/50"
                >
                  <input
                    type="checkbox"
                    checked={isChecked}
                    onChange={() =>
                      setChecked((current) =>
                        isChecked
                          ? current.filter((value) => value !== item)
                          : [...current, item]
                      )
                    }
                    className="sr-only"
                  />

                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md border ${
                      isChecked
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border"
                    }`}
                  >
                    {isChecked && <Check size={13} />}
                  </span>

                  <span
                    className={`text-sm ${
                      isChecked
                        ? "text-muted-foreground line-through"
                        : "font-medium"
                    }`}
                  >
                    {item}
                  </span>
                </label>
              );
            })}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            {checked.length} of {checklist.length} completed
          </p>
        </section>

        {/* Session summary */}
        <section className="card-x flex items-center justify-between p-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Your progress
            </p>
            <h2 className="mt-1 text-2xl font-bold">
              {completedSessions}
            </h2>
            <p className="text-xs text-muted-foreground">
              Completed breathing sessions
            </p>
          </div>

          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary text-primary">
            <Sparkles size={25} />
          </div>
        </section>

        <p className="pb-2 text-center text-xs text-muted-foreground">
          A little calm goes a long way.
        </p>
      </div>
    </Shell>
  );
}
```
