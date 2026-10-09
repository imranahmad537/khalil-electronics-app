-- Storage bucket for AVO house-verification photos.
-- Path convention (see 0001_schema.sql comment on verifications.photo_paths):
--   verifications/<customer_id>/<filename>

insert into storage.buckets (id, name, public)
values ('verifications', 'verifications', false)
on conflict (id) do nothing;

create policy office_all_verification_photos on storage.objects for all
  using (bucket_id = 'verifications' and is_office())
  with check (bucket_id = 'verifications' and is_office());

create policy avo_own_verification_photos on storage.objects for all
  using (
    bucket_id = 'verifications'
    and exists (
      select 1 from customers c
      where c.id::text = (storage.foldername(name))[1] and c.avo_id = auth.uid()
    )
  )
  with check (
    bucket_id = 'verifications'
    and exists (
      select 1 from customers c
      where c.id::text = (storage.foldername(name))[1] and c.avo_id = auth.uid()
    )
  );
