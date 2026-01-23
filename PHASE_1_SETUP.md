# Phase 1 Setup Instructions

## ✅ Phase 1 Complete When:
- [ ] Supabase project created
- [ ] Database schema executed
- [ ] Seed data inserted
- [ ] Environment variables configured
- [ ] App runs locally and shows clips from Supabase
- [ ] Homepage displays real data
- [ ] Top page displays real data sorted by votes

---

## Step 1: Install Dependencies

```bash
npm install @supabase/supabase-js
```

---

## Step 2: Create Supabase Project

1. Go to https://app.supabase.com
2. Click "New Project"
3. Fill in:
   - Project name: `gameplay` (or your choice)
   - Database password: (save this!)
   - Region: Choose closest to you
4. Wait for project to initialize (~2 minutes)

---

## Step 3: Get API Credentials

1. In Supabase dashboard, go to **Settings** → **API**
2. Copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Step 4: Configure Environment Variables

1. Copy `.env.local.example` to `.env.local`:
   ```bash
   cp .env.local.example .env.local
   ```

2. Edit `.env.local` and add your Supabase credentials:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
   ```

---

## Step 5: Create Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Click **New Query**
3. Copy and paste the entire contents of `database/schema.sql`
4. Click **Run** (or press Cmd/Ctrl + Enter)
5. Verify success: You should see "Success. No rows returned"

**What this does:**
- Creates `categories`, `videos`, `votes`, `reports` tables
- Sets up indexes for performance
- Enables Row Level Security (RLS)
- Creates public read policies
- Creates trigger to auto-update vote_count

---

## Step 6: Seed Test Data

1. In Supabase SQL Editor, click **New Query**
2. Copy and paste the entire contents of `database/seed.sql`
3. Click **Run**
4. Verify: Go to **Table Editor** → `videos` table, you should see 8 videos

**Note:** The playback_id values are placeholders. Replace them with real Cloudflare Stream IDs when you have them.

---

## Step 7: Verify RLS is Working

1. In Supabase dashboard, go to **Table Editor** → `videos`
2. You should see all 8 videos (none are hidden)
3. Try toggling `hidden` to `true` on one video
4. Refresh your app - that video should disappear (RLS filtering)

---

## Step 8: Run the App

```bash
npm run dev
```

1. Open http://localhost:3000
2. You should see clips displayed in a grid
3. Check http://localhost:3000/top - should show same clips sorted by votes

---

## Troubleshooting

### "Missing Supabase environment variables"
- Check `.env.local` exists and has correct values
- Restart dev server after adding env vars
- Make sure variable names start with `NEXT_PUBLIC_`

### "Failed to fetch videos"
- Check Supabase project is active
- Verify RLS policies were created (Settings → API → RLS)
- Check browser console for specific error

### No videos showing
- Verify seed data was inserted (Table Editor → videos)
- Check `hidden` column is `false` for all videos
- Verify RLS policies allow SELECT (should be automatic from schema.sql)

### Database errors
- Make sure you ran `schema.sql` BEFORE `seed.sql`
- Check SQL Editor for any error messages
- Verify all tables exist (Table Editor sidebar)

---

## Next Steps

Once Phase 1 is working:
- ✅ Homepage shows clips from Supabase
- ✅ Top page shows clips sorted by votes
- ✅ RLS is enabled and working

**STOP HERE** and confirm Phase 1 is complete before proceeding to Phase 2 (Authentication).
