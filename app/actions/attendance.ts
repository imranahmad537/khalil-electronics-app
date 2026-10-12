"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/db-errors";
import { getCurrentPermissions } from "@/lib/current-user";
import { MARKABLE, type AttendanceStatus } from "@/lib/attendance";

type Result = { ok: true } | { ok: false; error: string };
const DAY = /^\d{4}-\d{2}-\d{2}$/;

function refresh() {
  revalidatePath("/attendance");
  revalidatePath("/dashboard");
  revalidatePath("/avo");
}

export async function checkInAction(lat: number | null, lng: number | null): Promise<{ ok: true; status: AttendanceStatus } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("attendance_check_in", { p_lat: lat, p_lng: lng });
  if (error) return { ok: false, error: friendlyDbError(error, "Could not check in.") };
  refresh();
  return { ok: true, status: (data as { status: AttendanceStatus }).status };
}

export async function checkOutAction(lat: number | null, lng: number | null): Promise<{ ok: true; status: AttendanceStatus; hours: number } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("attendance_check_out", { p_lat: lat, p_lng: lng });
  if (error) return { ok: false, error: friendlyDbError(error, "Could not check out.") };
  refresh();
  const r = data as { status: AttendanceStatus; hours: number };
  return { ok: true, status: r.status, hours: Number(r.hours) };
}

/** status null clears the day. */
export async function markAttendanceAction(employeeId: string, day: string, status: AttendanceStatus | null, note?: string): Promise<Result> {
  if (!(await getCurrentPermissions()).canMarkAttendance) return { ok: false, error: "Only the owner or manager can mark attendance." };
  if (!DAY.test(day)) return { ok: false, error: "Invalid date." };
  if (status !== null && !MARKABLE.includes(status)) return { ok: false, error: "Unknown status." };
  const supabase = await createClient();
  const { error } = await supabase.rpc("mark_attendance", { p_employee: employeeId, p_day: day, p_status: status, p_note: note ?? null });
  if (error) return { ok: false, error: friendlyDbError(error, "Could not save attendance.") };
  refresh();
  return { ok: true };
}

export async function markAllAction(day: string, status: "present" | "holiday"): Promise<{ ok: true; count: number } | { ok: false; error: string }> {
  if (!(await getCurrentPermissions()).canMarkAttendance) return { ok: false, error: "Only the owner or manager can mark attendance." };
  if (!DAY.test(day)) return { ok: false, error: "Invalid date." };
  const supabase = await createClient();
  // "present" fills in only the people not yet marked; a holiday applies to everyone
  const { data, error } = await supabase.rpc("mark_attendance_bulk", { p_day: day, p_status: status, p_only_unmarked: status === "present" });
  if (error) return { ok: false, error: friendlyDbError(error, "Could not save attendance.") };
  refresh();
  return { ok: true, count: Number(data ?? 0) };
}

export async function updateAttendanceSettingsAction(input: {
  shiftStart: string;
  graceMinutes: number;
  halfDayHours: number;
  weeklyOff: number;
}): Promise<Result> {
  if (!(await getCurrentPermissions()).canMarkAttendance) return { ok: false, error: "Only the owner or manager can change attendance settings." };
  if (!/^\d{2}:\d{2}$/.test(input.shiftStart)) return { ok: false, error: "Choose a shift start time." };
  if (!(input.graceMinutes >= 0 && input.graceMinutes <= 180)) return { ok: false, error: "Grace must be 0–180 minutes." };
  if (!(input.halfDayHours >= 0 && input.halfDayHours <= 12)) return { ok: false, error: "Half-day hours must be 0–12." };
  if (!(input.weeklyOff >= -1 && input.weeklyOff <= 6)) return { ok: false, error: "Choose a weekly off day." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("attendance_settings")
    .update({
      shift_start: input.shiftStart,
      grace_minutes: Math.round(input.graceMinutes),
      half_day_hours: input.halfDayHours,
      weekly_off: input.weeklyOff,
    })
    .eq("id", 1);
  if (error) return { ok: false, error: friendlyDbError(error, "Could not save settings.") };
  refresh();
  return { ok: true };
}
