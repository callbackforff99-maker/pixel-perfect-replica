import { Capacitor } from "@capacitor/core";
import { LocalNotifications } from "@capacitor/local-notifications";
import type { Medication } from "@/lib/store";

const IDS_KEY = "sleeepx.med.notification.ids.v1";
const FIRST_PROMPT_KEY = "sleeepx.notifications.prompted.v1";
const DAYS_AHEAD = 45;
const MAX_PENDING = 450;

function readIds(): number[] {
  try { return JSON.parse(localStorage.getItem(IDS_KEY) || "[]"); } catch { return []; }
}
function notificationId(medId: string, date: string, time: string) {
  const value = medId + "|" + date + "|" + time;
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return (hash >>> 0) % 2000000000 + 1;
}
function dateKey(d: Date) {
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}
export function isNativeAndroid() {
  return Capacitor.isNativePlatform() && Capacitor.getPlatform() === "android";
}
export async function notificationPermission() {
  if (!isNativeAndroid()) return "unsupported";
  const result = await LocalNotifications.checkPermissions();
  return result.display;
}
export async function requestNotificationPermission() {
  if (!isNativeAndroid()) return "unsupported";
  const result = await LocalNotifications.requestPermissions();
  if (result.display === "granted") {
    await LocalNotifications.createChannel({
      id: "medication-reminders",
      name: "Medication reminders",
      description: "Scheduled reminders saved in SleeepX",
      importance: 5,
      visibility: 1,
      vibration: true,
    });
  }
  return result.display;
}
export async function requestFirstRunPermission() {
  if (!isNativeAndroid() || localStorage.getItem(FIRST_PROMPT_KEY) === "true") return;
  localStorage.setItem(FIRST_PROMPT_KEY, "true");
  try { await requestNotificationPermission(); } catch (error) { console.warn("Notification permission request failed", error); }
}
export async function syncMedicationNotifications(meds: Medication[]) {
  if (!isNativeAndroid()) return;
  const permission = await notificationPermission();
  if (permission !== "granted") return;

  const oldIds = readIds();
  if (oldIds.length) await LocalNotifications.cancel({ notifications: oldIds.map(id => ({ id })) });

  const now = new Date();
  const pending: Array<{ id: number; title: string; body: string; schedule: { at: Date; allowWhileIdle: boolean }; channelId: string }> = [];
  for (let offset = 0; offset < DAYS_AHEAD && pending.length < MAX_PENDING; offset++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset);
    const key = dateKey(day);
    for (const med of meds) {
      if (!med.enabled || key < med.startDate || (med.endDate && key > med.endDate)) continue;
      for (const time of med.times) {
        const [hour, minute] = time.split(":").map(Number);
        const at = new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour, minute, 0, 0);
        if (at <= now) continue;
        pending.push({
          id: notificationId(med.id, key, time),
          title: "SleeepX · Medication reminder",
          body: "Your scheduled reminder is due. Open SleeepX to review your instructions.",
          schedule: { at, allowWhileIdle: true },
          channelId: "medication-reminders",
        });
        if (pending.length >= MAX_PENDING) break;
      }
      if (pending.length >= MAX_PENDING) break;
    }
  }
  if (pending.length) await LocalNotifications.schedule({ notifications: pending });
  localStorage.setItem(IDS_KEY, JSON.stringify(pending.map(n => n.id)));
}
