import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Phone, Droplets, FileDown, Plus } from "lucide-react";
import { PageHead, Shell } from "@/components/Shell";
import { localDate, useDB } from "@/lib/store";

export const Route = createFileRoute("/daily")({ component: DailyTools });
type Contact = { name: string; phone: string };
const CONTACTS_KEY = "sleeepx.emergency.contacts.v1";
const WATER_KEY = "sleeepx.water.v1";
function read<T>(key: string, fallback: T): T { if (typeof window === "undefined") return fallback; try { return JSON.parse(window.localStorage.getItem(key) || "null") ?? fallback; } catch { return fallback; } }
function DailyTools() {
  const db = useDB();
  const today = localDate();
  const [contacts, setContacts] = useState<Contact[]>(() => read(CONTACTS_KEY, Array.from({length:5},()=>({name:"",phone:""}))));
  const [water, setWater] = useState<Record<string, number>>(() => read(WATER_KEY, {}));
  const [date, setDate] = useState(today);
  const [stress, setStress] = useState("3");
  const [comment, setComment] = useState("");
  const count = water[date] || 0;
  const saveContacts = (next: Contact[]) => { setContacts(next); localStorage.setItem(CONTACTS_KEY, JSON.stringify(next)); };
  const addWater = (n: number) => { const next = {...water, [date]: Math.max(0, (water[date] || 0) + n)}; setWater(next); localStorage.setItem(WATER_KEY, JSON.stringify(next)); };
  const exportReport = () => {
    const end = new Date(date + "T12:00:00"); const start = new Date(end); start.setDate(start.getDate()-29);
    const days: string[] = []; for(let d=new Date(start); d<=end; d.setDate(d.getDate()+1)) days.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`);
    const rows = days.map(day => { const logs = db.sleep.filter(x => x.end.slice(0,10)===day); const mins = logs.reduce((sum,x)=>sum+Math.max(0,(new Date(x.end).getTime()-new Date(x.start).getTime())/60000),0); const mood=db.mood.filter(x=>x.date===day); return `<tr><td>${day}</td><td>${logs.length ? (mins/60).toFixed(2)+" h" : "—"}</td><td>${water[day]||0} glasses / ${((water[day]||0)*.25).toFixed(2)} L</td><td>${mood.map(x=>`stress ${x.stress ?? "—"}/5; ${escapeHtml(x.text||"")}`).join(" | ")||"—"}</td></tr>`; }).join("");
    const w=window.open("", "_blank"); if(!w){alert("Allow pop-ups to create the PDF report.");return;} w.document.write(`<!doctype html><html><head><title>SleeepX 30-day report</title><style>body{font:14px Arial;padding:24px;color:#243b2b}h1{color:#426b4d}table{border-collapse:collapse;width:100%}td,th{border:1px solid #ccd8cb;padding:8px;text-align:left}th{background:#eaf2e8}@media print{button{display:none}}</style></head><body><h1>SleeepX · 30-day wellbeing report</h1><p>${days[0]} to ${date}</p><p>Sleep entries are user-recorded. Water is counted as 250 ml per glass. Print dialog → Save as PDF.</p><table><thead><tr><th>Date</th><th>Sleep duration</th><th>Water</th><th>Mood/stress notes</th></tr></thead><tbody>${rows}</tbody></table><h2>Sleep average since first recorded entry</h2><p>${db.sleep.length ? (db.sleep.reduce((s,x)=>s+Math.max(0,new Date(x.end).getTime()-new Date(x.start).getTime()),0)/db.sleep.length/3600000).toFixed(2)+" hours per recorded night" : "No sleep entries recorded yet."}</p><button onclick="window.print()">Print / Save PDF</button></body></html>`); w.document.close(); };
  const startCall = (i: number) => { const c=contacts[i]; if(!c?.phone.trim()) return; window.location.href=`tel:${c.phone.replace(/[^+\d]/g,"")}`; };
  return <Shell><PageHead title="Daily Care" sub="Emergency contacts, water and monthly report"/><div className="space-y-4 px-4">
    <section className="card-x space-y-3"><h2 className="flex items-center gap-2 font-semibold"><Phone className="h-5 w-5 text-primary"/> Emergency contacts (up to 5)</h2><p className="text-xs text-muted-foreground">Tap Call to open your phone dialer. If nobody answers, return here and tap the next contact. Automatic call monitoring/auto-redial requires a native Android implementation and cannot be safely done by this web preview.</p>{contacts.map((c,i)=><div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2"><input aria-label={`Contact ${i+1} name`} placeholder={`Contact ${i+1} name`} value={c.name} onChange={e=>saveContacts(contacts.map((x,j)=>j===i?{...x,name:e.target.value}:x))} className="field min-w-0"/><input aria-label={`Contact ${i+1} phone`} placeholder="Phone number" type="tel" value={c.phone} onChange={e=>saveContacts(contacts.map((x,j)=>j===i?{...x,phone:e.target.value}:x))} className="field min-w-0"/><button type="button" onClick={()=>startCall(i)} disabled={!c.phone.trim()} className="rounded-lg bg-primary px-3 text-primary-foreground disabled:opacity-40"><Phone className="h-4 w-4"/></button></div>)}</section>
    <section className="card-x space-y-3"><h2 className="flex items-center gap-2 font-semibold"><Droplets className="h-5 w-5 text-primary"/> Water tracker</h2><label className="block text-sm text-muted-foreground">Choose date<input type="date" value={date} max={today} onChange={e=>setDate(e.target.value)} className="field mt-1"/></label><div className="rounded-xl bg-secondary p-4 text-center"><p className="text-3xl font-bold">{(count*.25).toFixed(2)} L</p><p className="text-sm text-muted-foreground">{count} glasses · 250 ml each</p></div><div className="flex gap-2"><button onClick={()=>addWater(1)} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground"><Plus className="h-4 w-4"/> Add 1 glass</button><button onClick={()=>addWater(-1)} disabled={!count} className="rounded-xl border border-border px-4 disabled:opacity-40">Undo</button></div></section>
    <section className="card-x space-y-3"><h2 className="font-semibold">30-day report (PDF)</h2><p className="text-sm text-muted-foreground">Choose the final date above. The report covers that date and the previous 29 days, including recorded sleep duration, daily water and mood/stress notes.</p><button onClick={exportReport} className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 font-semibold text-primary-foreground"><FileDown className="h-4 w-4"/> Create / Download PDF</button><p className="text-xs text-muted-foreground">Your browser's print window opens; choose “Save as PDF”. Sleep average is calculated from saved sleep entries since app use began. This preview stores data locally on this device/browser.</p></section>
  </div></Shell>;
}
function escapeHtml(s:string){return s.replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]!));}
