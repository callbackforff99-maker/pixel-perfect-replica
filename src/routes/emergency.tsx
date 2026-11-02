import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, ShieldAlert } from "lucide-react";
import { PageHead, Shell } from "@/components/Shell";

export const Route = createFileRoute("/emergency")({ component: EmergencyContacts });
type Contact = { name: string; phone: string };
const KEY = "sleeepx.emergency.contacts.v1";
function readContacts(): Contact[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "null") ?? Array.from({ length: 5 }, () => ({ name: "", phone: "" })); }
  catch { return Array.from({ length: 5 }, () => ({ name: "", phone: "" })); }
}
function EmergencyContacts() {
  const [contacts, setContacts] = useState<Contact[]>(readContacts);
  const save = (next: Contact[]) => { setContacts(next); localStorage.setItem(KEY, JSON.stringify(next)); };
  const call = (i: number) => { const phone = contacts[i]?.phone.trim(); if (phone) window.location.href = `tel:${phone.replace(/[^+\\d]/g, "")}`; };
  return <Shell><PageHead title="Emergency contacts" sub="Five trusted people, ready to call."/><div className="space-y-4 px-4 pb-6">
    <p className="flex gap-2 rounded-xl border border-primary/30 bg-accent p-3 text-sm"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-primary"/> Tap the phone button to open your phone dialer. If the first person doesn't answer, return and call the next contact.</p>
    <section className="card-x space-y-3">{contacts.map((c,i)=><div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2"><input aria-label={`Contact ${i+1} name`} placeholder={`Contact ${i+1} name`} value={c.name} onChange={e=>save(contacts.map((x,j)=>j===i?{...x,name:e.target.value}:x))} className="field min-w-0"/><input aria-label={`Contact ${i+1} phone`} placeholder="Phone number" type="tel" value={c.phone} onChange={e=>save(contacts.map((x,j)=>j===i?{...x,phone:e.target.value}:x))} className="field min-w-0"/><button type="button" aria-label={`Call contact ${i+1}`} onClick={()=>call(i)} disabled={!c.phone.trim()} className="rounded-lg bg-primary px-3 text-primary-foreground disabled:opacity-40"><Phone className="h-4 w-4"/></button></div>)}</section>
  </div></Shell>;
}
