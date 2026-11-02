# Mind Flow – 3 KPI update (2026-11-02)

- Bottom tabs: Home, Breathing, Meditation, Mantra, Records. Removed the schedule tab from navigation; older plan/deep-link handling remains in source for compatibility.
- Home: 3 primary KPIs only: actual breath repetitions, natural-sound playback minutes, mantra playback minutes; daily targets; manual entry.
- Records: calendar, seven-day totals, manually entered records, deletion.
- Mantra: YouTube bookmark tab and uploaded-audio tab; local audio time is measured from actual player progress, excluding pausing and seeking. YouTube iframe playtime is **not** inferred; log it manually.
- Audio upload: attempts user-scoped private Supabase Storage bucket (run MANTRA_AUDIO_STORAGE.sql); if unavailable, stores in browser IndexedDB (not cross-device).
- Existing mantra bookmarks, yoga content and session/mood data are preserved.

IMPORTANT: This environment could parse/bundle the source via esbuild but could not complete `npm run build`, because the source archive lacks the original root `node_modules` packages including @supabase/supabase-js and external network package download was unavailable. Run `npm ci && npm run build` in a connected development environment before production upload.
