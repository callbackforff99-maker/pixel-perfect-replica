import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, ShieldAlert } from "lucide-react";
import { PageHead, Shell } from "@/components/Shell";

export const Route = createFileRoute("/emergency")({ component: EmergencyContacts });
type Contact = { name: string; phone: string };
const KEY = "sleeepx.emergency.contacts.v1";
function readContacts(): Contact[] {
  if (typeof window === "undefined") return Array.from({ length: 5 }, () => ({ name: "", phone: "" }));
  try { return JSON.parse(window.localStorage.getItem(KEY) || "null") ?? Array.from({ length: 5 }, () => ({ name: "", phone: "" })); }
  catch { return Array.from({ length: 5 }, () => ({ name: "", phone: "" })); }
}
function normalizePhone(value: string) {
  const bengaliDigits = "০১২৩৪৫৬৭৮৯";
  const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
  const latin = value.replace(/[০-৯٠-٩]/g, (digit) => {
    const bn = bengaliDigits.indexOf(digit);
    return String(bn >= 0 ? bn : arabicDigits.indexOf(digit));
  });
  const cleaned = latin.replace(/[^+\d]/g, "");
  return cleaned.startsWith("+") ? "+" + cleaned.slice(1).replace(/\+/g, "") : cleaned.replace(/\+/g, "");
}
function EmergencyContacts() {
  const [contacts, setContacts] = useState<Contact[]>(readContacts);
  const save = (next: Contact[]) => { setContacts(next); window.localStorage.setItem(KEY, JSON.stringify(next)); };
  return <Shell><PageHead title="Emergency contacts" sub="Five trusted people, ready to call."/><div className="space-y-4 px-4 pb-6">
    <p className="flex gap-2 rounded-xl border border-primary/30 bg-accent p-3 text-sm"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary"/> Tap the phone button to open your phone dialer. If the first person doesn't answer, return and call the next contact.</p>
    <section className="card-x space-y-3">{contacts.map((c,i)=>{
      const phone = normalizePhone(c.phone);
      return <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2">
        <input aria-label={`Contact ${i+1} name`} placeholder={`Contact ${i+1} name`} value={c.name} onChange={e=>save(contacts.map((x,j)=>j===i?{...x,name:e.target.value}:x))} className="field min-w-0"/>
        <input aria-label={`Contact ${i+1} phone`} placeholder="Phone number" type="tel" inputMode="tel" value={c.phone} onChange={e=>save(contacts.map((x,j)=>j===i?{...x,phone:e.target.value}:x))} className="field min-w-0"/>
        <a aria-label={`Dial ${c.name || `contact ${i+1}`}`} href={phone ? `tel:${phone}` : undefined} onClick={(e)=>{if(!phone)e.preventDefault();}} className={`flex min-h-11 items-center justify-center rounded-lg bg-primary px-3 text-primary-foreground ${phone ? "" : "pointer-events-none opacity-40"}`}><Phone className="h-4 w-4"/></a>
      </div>;
    })}</section>
    <p className="text-xs text-muted-foreground">The Dial button opens Android's phone app with the number filled in. You can review it before placing the call.</p>
  </div></Shell>;
}
