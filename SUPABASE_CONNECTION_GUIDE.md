# 🔌 Supabase Connection Guide - Step by Step

## Current Status
✅ Your app is already configured to use Supabase  
✅ Safety checks are in place (won't break if env vars missing)  
⏳ **Next:** Connect to a Supabase project

---

## STEP 1: Create Supabase Project

### 1.1 Go to Supabase
1. Open your browser
2. Navigate to: **https://app.supabase.com**
3. Sign in (or create a free account if needed)

### 1.2 Create New Project
1. Click the **"New Project"** button (usually top right or in dashboard)
2. You'll see a form with these fields:

**Fill in:**
- **Organization:** Select your organization (or create one if first time)
- **Name:** `gameplay` (or any name you prefer)
- **Database Password:** 
  - ⚠️ **IMPORTANT:** Create a STRONG password and **SAVE IT SOMEWHERE SAFE**
  - You'll need this if you ever reset the database
  - Use a password manager or write it down securely
- **Region:** Choose the region closest to you (affects latency)
  - Examples: `US East`, `EU West`, `Asia Pacific`
- **Pricing Plan:** Select **Free** (perfect for development)

### 1.3 Wait for Project Creation
- Click **"Create new project"**
- ⏱️ **Wait 2-3 minutes** for Supabase to provision your project
- You'll see a loading screen with progress
- **DO NOT close the browser tab** during this time

### 1.4 Project is Ready
- You'll be redirected to your project dashboard
- You should see: "Project is ready" or similar message
- **Stop here** - come back to this guide for Step 2

---

## STEP 2: Get Your API Credentials

### 2.1 Navigate to API Settings
1. In your Supabase project dashboard, look for the **left sidebar**
2. Click on **"Settings"** (gear icon at bottom)
3. Click on **"API"** in the settings menu

### 2.2 Find Your Credentials
You'll see a page with several sections. Look for:

**Project URL:**
- Section: **"Project URL"** or **"Configuration"**
- You'll see a URL like: `https://xxxxxxxxxxxxx.supabase.co`
- **Copy this entire URL** (starts with `https://`)

**API Keys:**
- Section: **"Project API keys"** or **"API Keys"**
- You'll see multiple keys:
  - `anon` `public` ← **USE THIS ONE**
  - `service_role` `secret` ← **DO NOT USE THIS** (it's for server-side only)

### 2.3 Copy the Correct Key
1. Find the row that says:
   - **Key name:** `anon` or `public`
   - **Key type:** `public` or `anon`
2. Click the **eye icon** or **"Reveal"** button to show the key
3. **Copy the entire key** (it's a long string starting with `eyJ...`)

### 2.4 What You Should Have Now
✅ **Project URL:** `https://xxxxxxxxxxxxx.supabase.co`  
✅ **Anon Key:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (long string)

**⚠️ CRITICAL:** Make sure you copied the **anon/public** key, NOT the service_role key!

---

## STEP 3: Create Environment File

### 3.1 Navigate to Project Root
1. Open your terminal
2. Make sure you're in the project root directory:
   ```bash
   cd /Users/erikfreitas/gameplay
   ```
3. Verify you're in the right place:
   ```bash
   ls -la
   ```
   You should see: `package.json`, `src/`, `next.config.ts`, etc.

### 3.2 Create .env.local File
1. Create the file in the project root:
   ```bash
   touch .env.local
   ```
   
   Or use your code editor to create a new file named `.env.local` in the root directory.

### 3.3 Add Environment Variables
Open `.env.local` in your editor and add these **exact** lines:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

**Replace:**
- `https://your-project-id.supabase.co` with your **actual Project URL** from Step 2
- `your-anon-key-here` with your **actual anon key** from Step 2

### 3.4 Common Mistakes to Avoid

❌ **DON'T add quotes around values:**
```bash
# WRONG:
NEXT_PUBLIC_SUPABASE_URL="https://..."
NEXT_PUBLIC_SUPABASE_ANON_KEY="eyJ..."

# CORRECT:
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

❌ **DON'T use the wrong filename:**
- Must be `.env.local` (with the dot at the start)
- NOT `env.local` (missing dot)
- NOT `.env` (different file)
- NOT `.env.local.example` (that's just a template)

❌ **DON'T use service_role key:**
- Must be `anon` or `public` key
- Service role key bypasses security (dangerous!)

❌ **DON'T add spaces around the `=` sign:**
```bash
# WRONG:
NEXT_PUBLIC_SUPABASE_URL = https://...

# CORRECT:
NEXT_PUBLIC_SUPABASE_URL=https://...
```

❌ **DON'T commit this file to git:**
- `.env.local` should already be in `.gitignore`
- Never share your keys publicly!

### 3.5 Verify File Location
Your file structure should look like:
```
gameplay/
├── .env.local          ← HERE (project root)
├── package.json
├── src/
├── next.config.ts
└── ...
```

**NOT:**
```
gameplay/
├── src/
│   └── .env.local     ← WRONG (inside src/)
```

---

## STEP 4: Restart Dev Server

### 4.1 Stop Current Server
1. In your terminal where `npm run dev` is running
2. Press **Ctrl + C** (or Cmd + C on Mac) to stop the server

### 4.2 Why Restart is Required
- Next.js reads environment variables **only at startup**
- Changes to `.env.local` won't be picked up until restart
- This is by design for security

### 4.3 Start Server Again
```bash
npm run dev
```

---

## STEP 5: Verify Connection

### 5.1 Check for Errors
1. Look at your terminal output
2. **Success looks like:**
   ```
   ▲ Next.js 16.1.4
   - Local:        http://localhost:3000
   - Ready in 2.3s
   ```
   No errors about missing Supabase variables!

3. **Failure looks like:**
   ```
   Error: Missing Supabase environment variables...
   ```
   If you see this, go back to Step 3 and check your `.env.local` file.

### 5.2 Check Browser Console
1. Open http://localhost:3000 in your browser
2. Open Developer Tools (F12 or Cmd+Option+I)
3. Go to **Console** tab
4. **Success:** No errors about Supabase
5. **Failure:** Red errors mentioning Supabase or environment variables

### 5.3 What Success Looks Like
At this stage, success means:
- ✅ Dev server starts without errors
- ✅ No Supabase-related errors in terminal
- ✅ No Supabase-related errors in browser console
- ✅ App loads (even if it shows "no clips" - that's expected!)

**It's OK if:**
- The homepage shows "No clips found" or empty state
- The database is empty (we haven't created tables yet)
- You see placeholder content

**It's NOT OK if:**
- Error about missing environment variables
- Error about Supabase client initialization
- App crashes on load

---

## Troubleshooting

### Problem: "Missing Supabase environment variables"
**Solution:**
1. Verify `.env.local` exists in project root
2. Check variable names are EXACTLY:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Make sure no quotes around values
4. Restart dev server after changes

### Problem: "Invalid API key"
**Solution:**
1. Verify you copied the **anon/public** key (not service_role)
2. Make sure you copied the entire key (they're very long)
3. Check for extra spaces or line breaks

### Problem: "Failed to fetch" or network errors
**Solution:**
1. Verify Project URL is correct (starts with `https://`)
2. Check you're using the right region
3. Verify Supabase project is active (not paused)

### Problem: File not found errors
**Solution:**
1. Make sure `.env.local` is in project root (same level as `package.json`)
2. Check filename has dot at start: `.env.local`
3. Some editors hide dotfiles - use terminal to verify:
   ```bash
   ls -la | grep env
   ```

---

## ✅ Success Checklist

Before proceeding, verify:
- [ ] Supabase project created and active
- [ ] `.env.local` file exists in project root
- [ ] Both environment variables added (URL and anon key)
- [ ] Dev server restarted after adding env vars
- [ ] No errors in terminal about Supabase
- [ ] No errors in browser console about Supabase
- [ ] App loads successfully (even if showing empty state)

---

## 🛑 STOP HERE

Once you've verified all checklist items above, **STOP**.

**DO NOT:**
- Create database tables yet (that's Phase 1, Step 5)
- Enable authentication yet (that's Phase 2)
- Add any features

**You're done when:**
- Supabase is connected
- App runs without Supabase errors
- You can see the homepage (even if empty)

**Next steps will be:**
- Creating database schema (Phase 1)
- Seeding test data
- Building the display layer

But for now, **just verify the connection works!**
