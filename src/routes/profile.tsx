import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type ChangeEvent } from "react";
import { ArrowLeft, Camera, Check, UserRound } from "lucide-react";
import { PageHead, Shell } from "@/components/Shell";
import { emptyProfile, update, useDB, type Profile } from "@/lib/store";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [
      { title: "Personal Profile — SleepX" },
      { name: "description", content: "Manage your personal wellness details and sleep goal." },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const db = useDB();
  const [form, setForm] = useState<Profile>(db.profile ?? emptyProfile());
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setForm(db.profile ?? emptyProfile());
  }, [db.profile]);

  const change = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setSaved(false);
  };

  const choosePhoto = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      window.alert("Please choose an image file.");
      return;
    }
    if (file.size > 1_200_000) {
      window.alert("Please choose a photo smaller than 1.2 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => change("photo", String(reader.result ?? ""));
    reader.readAsDataURL(file);
  };

  const save = () => {
    const age = form.age.trim();
    const height = form.heightCm.trim();
    const weight = form.weightKg.trim();
    if (age && (!Number.isFinite(Number(age)) || Number(age) < 1 || Number(age) > 120)) {
      window.alert("Enter a valid age between 1 and 120.");
      return;
    }
    if (height && (!Number.isFinite(Number(height)) || Number(height) < 40 || Number(height) > 250)) {
      window.alert("Enter a valid height in centimetres.");
      return;
    }
    if (weight && (!Number.isFinite(Number(weight)) || Number(weight) < 2 || Number(weight) > 500)) {
      window.alert("Enter a valid weight in kilograms.");
      return;
    }
    const ok = update((current) => ({ ...current, profile: form }));
    setSaved(ok);
    if (!ok) window.alert("Profile could not be saved. Check available device storage.");
  };

  const inputClass = "field mt-2";
  const labelClass = "block text-xs font-semibold text-muted-foreground";

  return (
    <Shell>
      <PageHead
        title="Personal Profile"
        sub="Your details, your wellness space."
        right={
          <Link to="/settings" aria-label="Back to settings" className="flex h-10 w-10 items-center justify-center rounded-full border border-border bg-card">
            <ArrowLeft size={18} />
          </Link>
        }
      />

      <div className="space-y-5 px-4 pb-8">
        <section className="relative overflow-hidden rounded-3xl border border-[#8e1830]/20 bg-gradient-to-br from-[#fff0f2] via-[#fff8f8] to-[#f8e4e8] p-5 dark:from-[#32151e] dark:via-[#28151b] dark:to-[#391923]">
          <div className="relative z-10 flex items-center gap-4">
            <label className="group relative flex h-20 w-20 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-3xl border-2 border-[#b51f3b]/30 bg-white text-[#b51f3b] shadow-sm dark:bg-black/20">
              {form.photo ? (
                <img src={form.photo} alt="Profile" className="h-full w-full object-cover" />
              ) : (
                <UserRound size={34} />
              )}
              <span className="absolute inset-x-0 bottom-0 flex items-center justify-center bg-[#8f1830]/90 py-1 text-white">
                <Camera size={13} />
              </span>
              <input type="file" accept="image/*" className="sr-only" onChange={choosePhoto} />
            </label>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#a51d39] dark:text-[#ff9bad]">MY WELLNESS PROFILE</p>
              <h2 className="mt-1 text-xl font-extrabold">{form.name.trim() || "Your profile"}</h2>
              <p className="mt-1 text-xs text-muted-foreground">Add a few details to make SleepX yours.</p>
            </div>
          </div>
          <p className="relative z-10 mt-4 text-[11px] text-muted-foreground">Photo stays on this device. Maximum size: 1.2 MB.</p>
          <div className="pointer-events-none absolute -bottom-12 -right-8 h-36 w-36 rounded-full border-[22px] border-[#b51f3b]/[0.06]" />
        </section>

        <section className="card-x space-y-4 p-5">
          <div>
            <h2 className="font-bold">Basic information</h2>
            <p className="mt-1 text-xs text-muted-foreground">All fields are optional. You can update them anytime.</p>
          </div>
          <label className={labelClass}>Full name
            <input className={inputClass} value={form.name} maxLength={60} placeholder="Enter your name" onChange={(e) => change("name", e.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>Age
              <input className={inputClass} type="number" min="1" max="120" inputMode="numeric" value={form.age} placeholder="e.g. 22" onChange={(e) => change("age", e.target.value)} />
            </label>
            <label className={labelClass}>Gender
              <select className={inputClass} value={form.gender} onChange={(e) => change("gender", e.target.value as Profile["gender"])}>
                <option value="">Not specified</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="prefer-not-to-say">Prefer not to say</option>
              </select>
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>Height (cm)
              <input className={inputClass} type="number" min="40" max="250" inputMode="decimal" value={form.heightCm} placeholder="e.g. 170" onChange={(e) => change("heightCm", e.target.value)} />
            </label>
            <label className={labelClass}>Weight (kg)
              <input className={inputClass} type="number" min="2" max="500" inputMode="decimal" value={form.weightKg} placeholder="e.g. 65" onChange={(e) => change("weightKg", e.target.value)} />
            </label>
          </div>
          <label className={labelClass}>Occupation
            <input className={inputClass} value={form.occupation} maxLength={60} placeholder="e.g. Student, Developer" onChange={(e) => change("occupation", e.target.value)} />
          </label>
          <label className={labelClass}>Daily activity level
            <select className={inputClass} value={form.activityLevel} onChange={(e) => change("activityLevel", e.target.value as Profile["activityLevel"])}>
              <option value="">Choose activity level</option>
              <option value="low">Low — mostly sitting</option>
              <option value="moderate">Moderate — some movement</option>
              <option value="high">High — physically active</option>
            </select>
          </label>
        </section>

        <section className="card-x space-y-4 p-5">
          <div>
            <h2 className="font-bold">Sleep preferences</h2>
            <p className="mt-1 text-xs text-muted-foreground">Set a personal sleep goal and preferred schedule.</p>
          </div>
          <label className={labelClass}>Daily sleep goal
            <select className={inputClass} value={form.sleepGoalHours} onChange={(e) => change("sleepGoalHours", e.target.value)}>
              {[6, 6.5, 7, 7.5, 8, 8.5, 9, 9.5, 10, 11, 12].map((hours) => <option key={hours} value={String(hours)}>{hours} hours</option>)}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className={labelClass}>Preferred bedtime
              <input className={inputClass} type="time" value={db.settings.bedtime} onChange={(e) => update((current) => ({ ...current, settings: { ...current.settings, bedtime: e.target.value } }))} />
            </label>
            <label className={labelClass}>Preferred wake-up
              <input className={inputClass} type="time" value={db.settings.wake} onChange={(e) => update((current) => ({ ...current, settings: { ...current.settings, wake: e.target.value } }))} />
            </label>
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">Your preferred bedtime and wake-up time are saved with your existing routine settings.</p>
        </section>

        <button onClick={save} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-[#a91d39] px-5 py-4 text-sm font-bold text-white shadow-lg shadow-[#a91d39]/15 transition hover:bg-[#8f1830]">
          {saved ? <Check size={18} /> : null}
          {saved ? "Profile saved" : "Save profile"}
        </button>
        <p className="text-center text-[11px] text-muted-foreground">Your profile is stored locally and does not change or delete your existing sleep records.</p>
      </div>
    </Shell>
  );
}
