import Link from "next/link";
import { ChevronLeft, ChevronRight, UserCheck, Clock, Plane, UserX, X } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { StatTile } from "@/components/stat-tile";
import { PrintButton } from "@/components/print-button";
import { AccessDenied } from "@/components/access-denied";
import { AttendanceRegister } from "@/components/attendance-register";
import { AttendanceSettingsDialog } from "@/components/attendance-settings-dialog";
import { getCurrentPermissions } from "@/lib/current-user";
import { getDailyRegister, getMonthlyAttendance, type MonthlyRow } from "@/lib/data/attendance";
import { STATUS_COLOR, STATUS_LABEL, STATUS_SHORT, WEEKDAYS, fmtShift, fmtTime, weekdayOf } from "@/lib/attendance";
import { ROLE_LABEL } from "@/lib/roles";
import { SHOP_NAME } from "@/lib/constants";
import { shopTodayStr } from "@/lib/shop-time";

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MONTH = /^\d{4}-\d{2}$/;

function shiftDay(day: string, by: number) {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + by);
  return d.toISOString().slice(0, 10);
}
function shiftMonth(month: string, by: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 1 + by, 1));
  return d.toISOString().slice(0, 7);
}
function dayLabel(day: string) {
  return new Date(`${day}T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", weekday: "long", day: "numeric", month: "long", year: "numeric" });
}
function monthName(month: string) {
  return new Date(`${month}-01T00:00:00Z`).toLocaleDateString("en-US", { timeZone: "UTC", month: "long", year: "numeric" });
}

const navBtn = "w-9 h-9 rounded-full bg-panel shadow-[var(--sh)] text-ink2 flex items-center justify-center";
const tabCls = (active: boolean) =>
  `rounded-full px-[16px] py-[8px] text-[12.5px] font-bold ${active ? "bg-ink text-white" : "text-ink2"}`;

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; date?: string; month?: string; employee?: string }>;
}) {
  const permissions = await getCurrentPermissions();
  if (!permissions.canViewAttendance) {
    return <AccessDenied title="Attendance" note="The attendance register is visible to the owner, manager and accountant." />;
  }

  const sp = await searchParams;
  const today = shopTodayStr();
  const view = sp.view === "monthly" ? "monthly" : "daily";
  const day = sp.date && DAY.test(sp.date) ? sp.date : today;
  const month = sp.month && MONTH.test(sp.month) ? sp.month : today.slice(0, 7);
  const canMark = permissions.canMarkAttendance;

  const tabs = (
    <div className="no-print flex gap-1 p-1 bg-panel rounded-full shadow-[var(--sh)]">
      <Link href={`/attendance?view=daily&date=${day}`} className={tabCls(view === "daily")}>
        Daily register
      </Link>
      <Link href={`/attendance?view=monthly&month=${day.slice(0, 7)}`} className={tabCls(view === "monthly")}>
        Monthly sheet
      </Link>
    </div>
  );

  if (view === "daily") {
    const data = await getDailyRegister(day);
    const attended = data.rows.filter((r) => ["present", "late", "half_day"].includes(r.state)).length;
    const late = data.rows.filter((r) => r.state === "late").length;
    const leave = data.rows.filter((r) => r.state === "leave").length;
    const missing = data.rows.filter((r) => r.state === "absent" || r.state === "unmarked").length;
    const isOff = weekdayOf(day) === data.settings.weeklyOff;

    return (
      <div className="print-report flex flex-col gap-4">
        <div className="print-only text-[11px] text-ink3 border-b border-line pb-2">{SHOP_NAME} · Attendance · {dayLabel(day)}</div>
        <PageHeader
          title="Attendance"
          hint={`Shift ${fmtShift(data.settings.shiftStart)} · ${data.settings.graceMinutes} min grace · weekly off ${data.settings.weeklyOff >= 0 ? WEEKDAYS[data.settings.weeklyOff] : "none"}`}
        >
          {tabs}
          {canMark && <AttendanceSettingsDialog settings={data.settings} />}
          <PrintButton />
        </PageHeader>

        <div className="no-print flex items-center gap-2 flex-wrap">
          <Link href={`/attendance?view=daily&date=${shiftDay(day, -1)}`} className={navBtn} title="Previous day">
            <ChevronLeft size={18} strokeWidth={2.4} />
          </Link>
          <div className="text-[15px] font-extrabold px-1">
            {dayLabel(day)}
            {day === today && <span className="ml-2 text-[11.5px] font-bold text-g700">Today</span>}
            {isOff && <span className="ml-2 text-[11.5px] font-bold text-ink3">Weekly off</span>}
          </div>
          <Link href={`/attendance?view=daily&date=${shiftDay(day, 1)}`} className={navBtn} title="Next day">
            <ChevronRight size={18} strokeWidth={2.4} />
          </Link>
          <form action="/attendance" className="flex items-center gap-2 ml-auto">
            <input type="hidden" name="view" value="daily" />
            <input type="date" name="date" defaultValue={day} className="px-[12px] py-[8px] rounded-xl border border-line bg-panel text-[12.5px]" />
            <button className="rounded-full px-[14px] py-[8px] text-[12px] font-bold bg-ink text-white">Go</button>
            {day !== today && (
              <Link href="/attendance?view=daily" className="rounded-full px-[14px] py-[8px] text-[12px] font-bold border border-line bg-white text-ink2">
                Today
              </Link>
            )}
          </form>
        </div>

        <div className="kpis">
          <StatTile label="Attended" value={`${attended} / ${data.rows.length}`} note="Present, late or half day" tone="hero" icon={UserCheck} />
          <StatTile label="Late" value={String(late)} note={`After ${fmtShift(data.settings.shiftStart)} + ${data.settings.graceMinutes} min`} tone="warn" icon={Clock} />
          <StatTile label="On leave" value={String(leave)} note="Approved leave" tone="plain" icon={Plane} />
          <StatTile
            label={day === today ? "Not in yet" : "Absent"}
            value={String(missing)}
            note={day === today ? "No check-in or mark yet" : "Nothing recorded on a working day"}
            tone={missing ? "warn" : "plain"}
            icon={UserX}
          />
        </div>

        <AttendanceRegister day={day} today={today} rows={data.rows} canMark={canMark} />
      </div>
    );
  }

  // ---------------- monthly sheet ----------------
  const data = await getMonthlyAttendance(month);
  const selected = sp.employee ? data.rows.find((r) => r.employee.id === sp.employee) : undefined;
  const cols = `minmax(170px,1.6fr) repeat(${data.days.length}, 26px) repeat(6, 44px) 56px`;

  return (
    <div className="print-report flex flex-col gap-4">
      <div className="print-only text-[11px] text-ink3 border-b border-line pb-2">{SHOP_NAME} · Attendance sheet · {monthName(month)}</div>
      <PageHeader title="Attendance" hint={`Monthly sheet · ${monthName(month)} · ${data.rows.length} staff`}>
        {tabs}
        <PrintButton />
      </PageHeader>

      <div className="no-print flex items-center gap-2">
        <Link href={`/attendance?view=monthly&month=${shiftMonth(month, -1)}`} className={navBtn} title="Previous month">
          <ChevronLeft size={18} strokeWidth={2.4} />
        </Link>
        <div className="text-[15px] font-extrabold px-1">{monthName(month)}</div>
        <Link href={`/attendance?view=monthly&month=${shiftMonth(month, 1)}`} className={navBtn} title="Next month">
          <ChevronRight size={18} strokeWidth={2.4} />
        </Link>
      </div>

      {selected && <EmployeeMonth row={selected} month={month} />}

      <div className="p-[19px_20px_12px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-[13px]">
        <div className="flex items-center gap-2 flex-wrap">
          <h2 className="text-[16.5px] font-extrabold m-0 flex-1">Attendance sheet</h2>
          {(["present", "late", "half_day", "leave", "absent", "holiday", "off"] as const).map((s) => (
            <span key={s} className="flex items-center gap-1 text-[11px] text-ink2">
              <span className="rounded-[5px] px-[5px] py-[1px] font-bold text-[10px]" style={{ background: STATUS_COLOR[s].bg, color: STATUS_COLOR[s].fg }}>
                {STATUS_SHORT[s]}
              </span>
              {STATUS_LABEL[s]}
            </span>
          ))}
        </div>

        <div className="tblwrap">
          <div className="tblinner" style={{ minWidth: 170 + data.days.length * 30 + 6 * 48 + 60 }}>
            <div className="grid gap-[4px] items-end pb-2 border-b border-line text-[10px] font-bold text-ink3" style={{ gridTemplateColumns: cols }}>
              <span className="uppercase tracking-[.08em]">Employee</span>
              {data.days.map((d) => (
                <span key={d} className="text-center leading-tight" style={{ color: d === data.today ? "var(--g700)" : undefined }}>
                  {WEEKDAYS[weekdayOf(d)][0]}
                  <br />
                  {Number(d.slice(8))}
                </span>
              ))}
              {["P", "L", "H", "LV", "A", "HO"].map((h) => (
                <span key={h} className="text-center">
                  {h}
                </span>
              ))}
              <span className="text-right">%</span>
            </div>
            {data.rows.map((r) => (
              <div key={r.employee.id} className="trow grid gap-[4px] items-center py-[7px] border-b border-line" style={{ gridTemplateColumns: cols }}>
                <Link
                  href={`/attendance?view=monthly&month=${month}&employee=${r.employee.id}`}
                  className="min-w-0 text-ink"
                  title="Open day-by-day record"
                >
                  <span className="block text-[12.5px] font-bold truncate">{r.employee.fullName}</span>
                  <span className="block text-[10.5px] text-ink3">{ROLE_LABEL[r.employee.role]}</span>
                </Link>
                {r.days.map((d) => (
                  <span
                    key={d.day}
                    title={`${d.day} · ${STATUS_LABEL[d.state]}${d.record?.note ? " · " + d.record.note : ""}`}
                    className="h-[22px] rounded-[5px] flex items-center justify-center text-[9.5px] font-bold"
                    style={{ background: STATUS_COLOR[d.state].bg, color: STATUS_COLOR[d.state].fg }}
                  >
                    {STATUS_SHORT[d.state]}
                  </span>
                ))}
                {[r.summary.present, r.summary.late, r.summary.halfDay, r.summary.leave, r.summary.absent, r.summary.holiday].map((n, i) => (
                  <span key={i} className="num text-center text-[12px] font-bold" style={{ color: i === 4 && n > 0 ? "var(--red)" : undefined }}>
                    {n}
                  </span>
                ))}
                <span className="num text-right text-[12.5px] font-extrabold">{r.summary.attendancePct === null ? "—" : `${r.summary.attendancePct}%`}</span>
              </div>
            ))}
            {data.rows.length === 0 && <div className="p-7 text-center text-[13px] text-ink2">No active staff. Add staff in Employees.</div>}
          </div>
        </div>
        <p className="m-0 text-[11.5px] text-ink3">
          A past working day with nothing recorded counts as absent. Weekly off days and days before an employee joined don&apos;t count. Attendance % = (present
          + late + ½ half days) ÷ working days. Click a name for the day-by-day record.
        </p>
      </div>
    </div>
  );
}

function EmployeeMonth({ row, month }: { row: MonthlyRow; month: string }) {
  const s = row.summary;
  const firstWeekday = weekdayOf(row.days[0].day);
  return (
    <div className="p-[19px_20px] rounded-[var(--r-lg)] bg-panel shadow-[var(--sh)] flex flex-col gap-4">
      <div className="flex items-start gap-3 flex-wrap">
        <div className="flex-1 min-w-[200px]">
          <h2 className="text-[16.5px] font-extrabold m-0">{row.employee.fullName}</h2>
          <p className="m-0 mt-1 text-[12px] text-ink3">
            {ROLE_LABEL[row.employee.role]} · {monthName(month)}
            {row.employee.joinedOn && ` · joined ${row.employee.joinedOn}`}
          </p>
        </div>
        <Link href={`/attendance?view=monthly&month=${month}`} className="no-print w-8 h-8 rounded-full bg-soft text-ink2 flex items-center justify-center" title="Close">
          <X size={16} strokeWidth={2.4} />
        </Link>
      </div>

      <div className="flex gap-2 flex-wrap">
        {[
          ["Present", s.present, "present"],
          ["Late", s.late, "late"],
          ["Half day", s.halfDay, "half_day"],
          ["Leave", s.leave, "leave"],
          ["Absent", s.absent, "absent"],
          ["Holiday", s.holiday, "holiday"],
          ["Weekly off", s.off, "off"],
        ].map(([label, n, key]) => (
          <span
            key={key as string}
            className="rounded-xl px-3 py-2 flex flex-col"
            style={{ background: STATUS_COLOR[key as keyof typeof STATUS_COLOR].bg, color: STATUS_COLOR[key as keyof typeof STATUS_COLOR].fg }}
          >
            <span className="text-[10.5px] font-bold uppercase tracking-[.06em]">{label}</span>
            <span className="num text-[18px] font-extrabold">{n}</span>
          </span>
        ))}
        <span className="rounded-xl px-3 py-2 flex flex-col bg-g900 text-white">
          <span className="text-[10.5px] font-bold uppercase tracking-[.06em] text-white/70">Attendance</span>
          <span className="num text-[18px] font-extrabold">{s.attendancePct === null ? "—" : `${s.attendancePct}%`}</span>
        </span>
      </div>

      <div className="grid grid-cols-7 gap-[6px]">
        {WEEKDAYS.map((w) => (
          <span key={w} className="text-center text-[10.5px] font-bold text-ink3 uppercase">
            {w.slice(0, 3)}
          </span>
        ))}
        {Array.from({ length: firstWeekday }, (_, i) => (
          <span key={`pad${i}`} />
        ))}
        {row.days.map((d) => {
          const c = STATUS_COLOR[d.state];
          return (
            <div
              key={d.day}
              className="rounded-xl p-2 min-h-[64px] flex flex-col gap-[2px] border border-line"
              style={{ background: c.bg === "transparent" ? "#fff" : c.bg }}
              title={d.record?.note ?? undefined}
            >
              <span className="text-[11px] font-bold text-ink3">{Number(d.day.slice(8))}</span>
              <span className="text-[11px] font-extrabold" style={{ color: c.fg }}>
                {d.state === "upcoming" || d.state === "not_joined" ? "" : STATUS_LABEL[d.state]}
              </span>
              {d.record?.checkIn && (
                <span className="text-[10px] text-ink2">
                  {fmtTime(d.record.checkIn)}–{d.record.checkOut ? fmtTime(d.record.checkOut) : "…"}
                </span>
              )}
              {d.record?.note && <span className="text-[10px] text-ink3 truncate">{d.record.note}</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
