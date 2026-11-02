-- Supabase SQL Editor: run once if you want uploaded mantra audio synced across devices.
-- The existing mindflow_mantra_entries table stores practice session logs separately.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('mindflow-mantra-audio','mindflow-mantra-audio',false,47185920,ARRAY['audio/mpeg','audio/mp4','audio/x-m4a','audio/aac','audio/wav','audio/x-wav','audio/ogg','audio/webm'])
on conflict (id) do nothing;

create policy "Mindflow mantra audio select own" on storage.objects for select to authenticated
using (bucket_id='mindflow-mantra-audio' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Mindflow mantra audio insert own" on storage.objects for insert to authenticated
with check (bucket_id='mindflow-mantra-audio' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "Mindflow mantra audio delete own" on storage.objects for delete to authenticated
using (bucket_id='mindflow-mantra-audio' and (storage.foldername(name))[1]=auth.uid()::text);
