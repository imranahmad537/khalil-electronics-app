-- Exception-based attendance: a working day nobody marked counts as present
-- (the manager records only absences, leave, lates and half days). The
-- strict mode — unmarked past days count as absent — stays available.
-- The app reads this setting (lib/attendance.ts dayState); payroll follows it.

alter table attendance_settings add column if not exists unmarked_as text not null default 'present'
  check (unmarked_as in ('present', 'absent'));
