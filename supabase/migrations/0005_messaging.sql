-- Cron-driven messaging: queue reminders/overdue notices and keep installment
-- status columns current. The actual send (WhatsApp/SMS) happens in the
-- supabase/functions/send-messages Edge Function, which drains status='queued'.

create extension if not exists pg_cron;

-- Daily bookkeeping: transition installments.status with the calendar, since
-- customer_month_status computes due_now/status from raw amounts (see
-- 0002_billing.sql) and never reads this column — but the ledger UI and the
-- "oldest open installment" logic (lib/data/agreements.ts) do.
create or replace function mark_installment_statuses() returns void
language plpgsql as $$
begin
  update installments i
     set status = 'overdue'::inst_state
    from agreements a
   where i.agreement_id = a.id
     and a.status = 'open'
     and i.status <> 'paid'
     and i.status <> 'overdue'
     and (
       i.due_month < date_trunc('month', current_date)::date
       or (i.due_month = date_trunc('month', current_date)::date and extract(day from current_date) > 5)
     );

  update installments i
     set status = 'due'::inst_state
    from agreements a
   where i.agreement_id = a.id
     and a.status = 'open'
     and i.status = 'upcoming'
     and i.due_month = date_trunc('month', current_date)::date
     and extract(day from current_date) <= 5;
end $$;

-- Queue a "reminder" for every customer with an installment due *next* month.
-- Guarded so re-running the same day doesn't double-queue.
create or replace function queue_month_reminders() returns integer
language plpgsql as $$
declare
  v_next date := (date_trunc('month', current_date) + interval '1 month')::date;
  v_count integer;
begin
  with due_next_month as (
    select distinct a.customer_id, i.due_amount
      from installments i
      join agreements a on a.id = i.agreement_id and a.status = 'open'
     where i.due_month = v_next and i.status <> 'paid'
  ),
  inserted as (
    insert into messages (customer_id, channel, template, body, status)
    select c.id, t.channel, 'reminder',
           replace(replace(replace(t.body, '{{name}}', c.full_name), '{{amount}}', d.due_amount::text), '{{month}}', to_char(v_next, 'Mon YYYY')),
           'queued'
      from due_next_month d
      join customers c on c.id = d.customer_id
      cross join message_templates t
     where t.key = 'reminder'
       and not exists (
         select 1 from messages m
          where m.customer_id = c.id and m.template = 'reminder' and m.created_at::date = current_date
       )
    returning 1
  )
  select count(*) into v_count from inserted;
  return v_count;
end $$;

-- Queue an "overdue" notice for every account the view currently classes as
-- overdue or default. Guarded the same way.
create or replace function queue_overdue_messages() returns integer
language plpgsql as $$
declare v_count integer;
begin
  with inserted as (
    insert into messages (customer_id, channel, template, body, status)
    select s.customer_id, t.channel, 'overdue',
           replace(replace(t.body, '{{name}}', s.full_name), '{{amount}}', greatest(s.due_now, 0)::text),
           'queued'
      from customer_month_status s
      cross join message_templates t
     where t.key = 'overdue'
       and s.status in ('overdue', 'default')
       and not exists (
         select 1 from messages m
          where m.customer_id = s.customer_id and m.template = 'overdue' and m.created_at::date = current_date
       )
    returning 1
  )
  select count(*) into v_count from inserted;
  return v_count;
end $$;

select cron.schedule('mark-installment-statuses', '5 0 * * *', $$select mark_installment_statuses()$$);
select cron.schedule('queue-month-reminders', '0 9 28 * *', $$select queue_month_reminders()$$);
select cron.schedule('queue-overdue-messages', '0 9 6 * *', $$select queue_overdue_messages()$$);

-- Deliberately not scheduling supabase/functions/send-messages from here via
-- pg_net: that would mean committing a service-role key into a SQL migration
-- (pg_net needs it in an Authorization header, and there's nowhere else to
-- source it from inside a migration). Schedule the actual send instead via
-- Supabase Dashboard → Edge Functions → send-messages → Cron (hosted
-- projects), or an external scheduler hitting the function URL with the
-- secret key for self-hosted deployments.
