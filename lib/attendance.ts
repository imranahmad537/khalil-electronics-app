// Attendance rules shared by the register, the monthly report and the
// check-in widget. Mirrors supabase/migrations/0008_attendance.sql.

export type AttendanceStatus = "present" | "late" | "half_day" | "leave" | "absent" | "holiday";
/** What a calendar day shows: a recorded status, or a derived one. */
export type DayState = AttendanceStatus | "off" | "unmarked" | "upcoming" | "not_joined";

export const STATUS_LABEL: Record<DayState, string> = {
  present: "Present",
  late: "Late",
  half_day: "Half day",
  leave: "Leave",
  absent: "Absent",
  holiday: "Holiday",
  off: "Weekly off",
  unmarked: "Not marked",
  upcoming: "—",
  not_joined: "—",
};

export const STATUS_SHORT: Record<DayState, string> = {
  present: "P",
  late: "L",
  half_day: "H",
  leave: "LV",
  absent: "A",
  holiday: "HO",
  off: "OFF",
  unmarked: "?",
  upcoming: "",
  not_joined: "",
};

export const STATUS_COLOR: Record<DayState, { bg: string; fg: string }> = {
  present: { bg: "var(--g50)", fg: "var(--g700)" },
  late: { bg: "var(--amber50)", fg: "#8a5a10" },
  half_day: { bg: "var(--amber50)", fg: "#8a5a10" },
  leave: { bg: "#eef2ff", fg: "#3730a3" },
  absent: { bg: "var(--red50)", fg: "var(--red)" },
  holiday: { bg: "var(--soft)", fg: "var(--ink2)" },
  off: { bg: "var(--soft)", fg: "var(--ink3)" },
  unmarked: { bg: "var(--red50)", fg: "var(--red)" },
  upcoming: { bg: "transparent", fg: "var(--ink3)" },
  not_joined: { bg: "transparent", fg: "var(--ink3)" },
};

/** Statuses the register lets the office choose. */
export const MARKABLE: AttendanceStatus[] = ["present", "late", "half_day", "leave", "absent", "holiday"];

export const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export interface AttendanceSettings {
  shiftStart: string; // "HH:MM"
  graceMinutes: number;
  halfDayHours: number;
  weeklyOff: number; // 0=Sunday … 6=Saturday, -1 none
}

export interface AttendanceRecord {
  employeeId: string;
  day: string; // YYYY-MM-DD
  status: AttendanceStatus;
  checkIn: string | null;
  checkOut: string | null;
  note: string | null;
  source: "self" | "office";
}

export function weekdayOf(day: string): number {
  return new Date(`${day}T00:00:00Z`).getUTCDay();
}

export function daysOfMonth(monthKey: string): string[] {
  const [y, m] = monthKey.split("-").map(Number);
  const n = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return Array.from({ length: n }, (_, i) => `${monthKey}-${String(i + 1).padStart(2, "0")}`);
}

/** What a day means for one employee, recorded or not. */
export function dayState(
  day: string,
  record: AttendanceRecord | undefined,
  opts: { today: string; joinedOn: string | null; weeklyOff: number }
): DayState {
  if (record) return record.status;
  if (opts.joinedOn && day < opts.joinedOn) return "not_joined";
  if (day > opts.today) return "upcoming";
  if (weekdayOf(day) === opts.weeklyOff) return "off";
  if (day === opts.today) return "unmarked"; // the day isn't over yet
  return "absent"; // a past working day with nothing recorded
}

export interface MonthSummary {
  present: number;
  late: number;
  halfDay: number;
  leave: number;
  absent: number;
  holiday: number;
  off: number;
  /** working days so far (excludes off days, holidays and days before joining) */
  workingDays: number;
  /** present + late + ½ half days, over working days */
  attendancePct: number | null;
}

export function summarize(states: DayState[]): MonthSummary {
  const c = (s: DayState) => states.filter((x) => x === s).length;
  const present = c("present"),
    late = c("late"),
    halfDay = c("half_day"),
    leave = c("leave"),
    absent = c("absent"),
    holiday = c("holiday"),
    off = c("off");
  const workingDays = present + late + halfDay + leave + absent;
  const attended = present + late + halfDay / 2;
  return {
    present,
    late,
    halfDay,
    leave,
    absent,
    holiday,
    off,
    workingDays,
    attendancePct: workingDays ? Math.round((attended / workingDays) * 100) : null,
  };
}

export function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleTimeString("en-US", { timeZone: "Asia/Karachi", hour: "numeric", minute: "2-digit" });
}

export function fmtShift(hhmm: string): string {
  const [h, m] = hhmm.split(":").map(Number);
  const d = new Date(Date.UTC(2000, 0, 1, h, m));
  return d.toLocaleTimeString("en-US", { timeZone: "UTC", hour: "numeric", minute: "2-digit" });
}
