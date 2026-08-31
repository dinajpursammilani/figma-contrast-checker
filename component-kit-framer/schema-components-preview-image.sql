-- Real raster preview images (screenshots), separate from preview_svg (hand-drawn/vector only).
-- Rendering preference everywhere: preview_image_url > preview_svg > category-icon fallback.
alter table components add column if not exists preview_image_url text;

-- Public-read bucket — preview images need to load in the plugin UI without auth. Writes only
-- ever happen via the upload-component-preview Edge Function's service role, gated to
-- ADMIN_EMAILS; no bucket policy grants direct client write access. allowed_mime_types /
-- file_size_limit enforce the same image-only, 500KB-max rule at the storage layer itself, as a
-- second line of defense alongside the Edge Function's own check.
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values ('component-previews', 'component-previews', true, array['image/*'], 512000)
on conflict (id) do update set
  public = excluded.public,
  allowed_mime_types = excluded.allowed_mime_types,
  file_size_limit = excluded.file_size_limit;
