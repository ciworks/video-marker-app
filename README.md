# 🎬 Video Marker App

A React + Vite + TailwindCSS video annotation tool with Supabase sync.

## 🚀 Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Add your video file to:
   ```
   public/sample-video.mpg
   ```

3. Create a Supabase project and table:
   ```sql
   create table markers (
     id uuid primary key default uuid_generate_v4(),
     video_id text not null,
     time numeric not null,
     label text not null,
     category text not null,
     created_at timestamp default now()
   );
   ```

4. Add your Supabase keys in `src/supabaseClient.js`.

5. Run the app:
   ```bash
   npm run dev
   ```
