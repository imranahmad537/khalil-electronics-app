import { createClient } from "@/lib/supabase/server";
import { shopTodayStr } from "@/lib/shop-time";
import {
  dayState,
  daysOfMonth,
  summarize,
  type AttendanceRecord,
  type AttendanceSettings,
  type DayState,
  type MonthSummary,
} from "@/lib/attendance";
import type { UserRole } from "@/lib/types";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const DEFAULT_SETTINGS: AttendanceSettings = { shiftStart: "10:00", graceMinutes: 15, halfDayHours: 4, weeklyOff: 0 };

export interface StaffMember {
  id: string;
  fullName: string;
  role: UserRole;
  joinedOn: string | null;
  hasLogin: boolean;
}

async function getSettings(supabase: Supabase): Promise<AttendanceSettings> {
  const { data } = await supabase.from("attendance_settings").select("*").eq("id", 1).maybeSingle();
  if (!data) return DEFAULT_SETTINGS;
  return {
    shiftStart: String(data.shift_start).slice(0, 5),
    graceMinutes: data.grace_minutes,
    halfDayHours: Number(data.half_day_hours),
    weeklyOff: data.weekly_off,
  };
}

async function getStaff(supabase: Supabase): Promise<StaffMember[]> {
  const { data, error } = await supabase.rpc("attendance_staff");
  if (error) throw new Error(error.message);
  return (data ?? []).map((s) => ({ id: s.id, fullName: s.full_name, role: s.role, joinedOn: s.joined_on, hasLogin: s.has_login }));
}

function toRecord(r: {
  employee_id: string;
  day: string;
  status: AttendanceRecord["status"];
  check_in: string | null;
  check_out: string | null;
  note: string | null;
  source: "self" | "office";
}): AttendanceRecord {
  return { employeeId: r.employee_id, day: r.day, status: r.status, checkIn: r.check_in, checkOut: r.check_out, note: r.note, source: r.source };
}

const RECORD_COLS = "employee_id, day, status, check_in, check_out, note, source";

/** For the check-in widget: is this login linked to an employee, and today's record. */
export async function getMyAttendanceToday() {
  const supabase = await createClient();
  const { data: employeeId } = await supabase.rpc("my_employee_id");
  if (!employeeId) return { linked: false as const };
  const [settings, recordRes] = await Promise.all([
    getSettings(supabase),
    supabase.from("attendance").select(RECORD_COLS).eq("employee_id", employeeId).eq("day", shopTodayStr()).maybeSingle(),
  ]);
  return {
    linked: true as const,
    record: recordRes.data ? toRecord(recordRes.data) : null,
    shiftStart: settings.shiftStart,
  };
}
export type MyAttendanceToday = Awaited<ReturnType<typeof getMyAttendanceToday>>;

export interface RegisterRow {
  employee: StaffMember;
  record: AttendanceRecord | null;
  state: DayState;
}

export async function getDailyRegister(day: string) {
  const supabase = await createClient();
  const [settings, staff, recordsRes] = await Promise.all([
    getSettings(supabase),
    getStaff(supabase),
    supabase.from("attendance").select(RECORD_COLS).eq("day", day),
  ]);
  if (recordsRes.error) throw new Error(recordsRes.error.message);
  const byEmployee = new Map((recordsRes.data ?? []).map((r) => [r.employee_id, toRecord(r)]));
  const today = shopTodayStr();

  const rows: RegisterRow[] = staff
    .filter((s) => !s.joinedOn || s.joinedOn <= day)
    .map((employee) => {
      const record = byEmployee.get(employee.id) ?? null;
      return { employee, record, state: dayState(day, record ?? undefined, { today, joinedOn: employee.joinedOn, weeklyOff: settings.weeklyOff }) };
    });

  return { day, today, settings, rows };
}

export interface MonthlyRow {
  employee: StaffMember;
  summary: MonthSummary;
  days: { day: string; state: DayState; record: AttendanceRecord | null }[];
}

export async function getMonthlyAttendance(monthKey: string) {
  const supabase = await createClient();
  const days = daysOfMonth(monthKey);
  const [settings, staff, recordsRes] = await Promise.all([
    getSettings(supabase),
    getStaff(supabase),
    supabase.from("attendance").select(RECORD_COLS).gte("day", days[0]).lte("day", days[days.length - 1]),
  ]);
  if (recordsRes.error) throw new Error(recordsRes.error.message);
  const records = (recordsRes.data ?? []).map(toRecord);
  const key = (e: string, d: string) => `${e}|${d}`;
  const byKey = new Map(records.map((r) => [key(r.employeeId, r.day), r]));
  const today = shopTodayStr();

  const rows: MonthlyRow[] = staff.map((employee) => {
    const perDay = days.map((day) => {
      const record = byKey.get(key(employee.id, day)) ?? null;
      return { day, record, state: dayState(day, record ?? undefined, { today, joinedOn: employee.joinedOn, weeklyOff: settings.weeklyOff }) };
    });
    return { employee, summary: summarize(perDay.map((d) => d.state)), days: perDay };
  });

  return { monthKey, days, today, settings, rows };
}
