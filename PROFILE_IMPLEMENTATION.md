# Profile Feature Implementation

## Files Created/Modified

### New Files
1. **`src/app/api/profile/route.ts`**
   - GET: Fetch user's profile
   - POST: Create new profile
   - PUT: Update existing profile

2. **`database/profiles_table.sql`**
   - SQL schema for profiles table
   - RLS policies
   - Indexes and triggers

### Modified Files
3. **`src/types/database.ts`**
   - Added `Profile` type definition

4. **`src/app/profile/page.tsx`**
   - Complete rewrite with form functionality
   - Fetches existing profile on load
   - Create/update profile form

5. **`src/middleware.ts`**
   - Added `/profile` route protection

6. **`src/app/login/page.tsx`**
   - Added profile check after login
   - Redirects to `/profile` if profile missing

7. **`src/app/auth/callback/route.ts`**
   - Added profile check after email confirmation
   - Redirects to `/profile` if profile missing

---

## Database Setup

### Step 1: Create Profiles Table

1. Go to Supabase Dashboard → SQL Editor
2. Copy and paste the contents of `database/profiles_table.sql`
3. Click "Run"
4. Verify success: Should see "Success. No rows returned"

**What this creates:**
- `profiles` table with all required fields
- RLS policies (users can only access their own profile)
- Index on `display_name` for faster lookups
- Auto-update trigger for `updated_at` timestamp

---

## Manual Test Checklist

### ✅ Test 1: Database Setup
- [ ] Run `profiles_table.sql` in Supabase SQL Editor
- [ ] Verify table created (Table Editor → `profiles`)
- [ ] Verify RLS is enabled (Settings → API → RLS)

### ✅ Test 2: Profile Page Access (Logged Out)
- [ ] Log out (if logged in)
- [ ] Navigate directly to `http://localhost:3000/profile`
- [ ] **Expected:** Redirected to `/login?redirect=/profile`
- [ ] Log in
- [ ] **Expected:** Redirected to `/profile` (if profile missing) or intended page

### ✅ Test 3: Create New Profile
- [ ] Log in with account that has no profile
- [ ] Navigate to `/profile`
- [ ] **Expected:** Form is empty (no existing profile)
- [ ] Fill in:
  - Display Name: `TestUser123` (required)
  - Platforms: Select at least one (e.g., PC, PlayStation) (required)
  - Favorite Genres: Select multiple (e.g., FPS, MOBA)
  - Primary Games: `Valorant, CS2`
  - Region: `North America`
  - Playstyle: `Competitive`
- [ ] Click "Save Profile"
- [ ] **Expected:** Green success message "Profile saved successfully!"
- [ ] **Expected:** Form still shows filled values
- [ ] Refresh page
- [ ] **Expected:** Form still shows filled values (profile persisted)

### ✅ Test 4: Edit Existing Profile
- [ ] With existing profile, navigate to `/profile`
- [ ] **Expected:** Form is pre-filled with existing data
- [ ] Change some values:
  - Display Name: `UpdatedUser456`
  - Add/remove platforms
  - Change region
- [ ] Click "Save Profile"
- [ ] **Expected:** Success message appears
- [ ] Refresh page
- [ ] **Expected:** Updated values are shown

### ✅ Test 5: Form Validation
- [ ] Navigate to `/profile`
- [ ] Try to submit with empty Display Name
- [ ] **Expected:** Browser validation prevents submit (required field)
- [ ] Fill Display Name but don't select any platforms
- [ ] **Expected:** "Save Profile" button is disabled
- [ ] Select at least one platform
- [ ] **Expected:** "Save Profile" button becomes enabled

### ✅ Test 6: Redirect After Signup
- [ ] Sign up with a new email
- [ ] Confirm email via link
- [ ] **Expected:** Redirected to `/profile` (not homepage)
- [ ] Fill in profile and save
- [ ] Navigate to homepage
- [ ] **Expected:** Can access site normally

### ✅ Test 7: Redirect After Login (No Profile)
- [ ] Create a new account (or use one without profile)
- [ ] Log out
- [ ] Log back in
- [ ] **Expected:** Redirected to `/profile` (not homepage)
- [ ] Fill in profile and save
- [ ] Log out and log back in
- [ ] **Expected:** Redirected to homepage (profile exists)

### ✅ Test 8: Redirect After Login (Has Profile)
- [ ] Log in with account that has a profile
- [ ] **Expected:** Redirected to homepage (or intended page)
- [ ] **Expected:** NOT redirected to `/profile`

### ✅ Test 9: Profile Link in NavBar
- [ ] While logged in, check NavBar
- [ ] **Expected:** "Profile" link is visible
- [ ] Click "Profile" link
- [ ] **Expected:** Navigate to `/profile` page
- [ ] Log out
- [ ] **Expected:** "Profile" link is NOT visible

### ✅ Test 10: Unique Display Name
- [ ] Create profile with Display Name: `UniqueName123`
- [ ] Log out
- [ ] Create new account and log in
- [ ] Try to create profile with same Display Name: `UniqueName123`
- [ ] **Expected:** Error message about duplicate display name
- [ ] Change to different name
- [ ] **Expected:** Profile saves successfully

### ✅ Test 11: Checkbox Functionality
- [ ] Navigate to `/profile`
- [ ] Check multiple platforms
- [ ] **Expected:** All checked platforms are selected
- [ ] Uncheck one platform
- [ ] **Expected:** That platform is removed from selection
- [ ] Save profile
- [ ] Refresh page
- [ ] **Expected:** Previously selected platforms are still checked

### ✅ Test 12: Optional Fields
- [ ] Navigate to `/profile`
- [ ] Fill only required fields (Display Name, Platforms)
- [ ] Leave optional fields empty (Primary Games, Region, Playstyle)
- [ ] Save profile
- [ ] **Expected:** Profile saves successfully
- [ ] **Expected:** Optional fields remain empty/null

### ✅ Test 13: Error Handling
- [ ] Navigate to `/profile`
- [ ] Fill form and save
- [ ] Disconnect internet (or simulate error)
- [ ] Try to save again
- [ ] **Expected:** Error message displayed
- [ ] **Expected:** Form data is not lost
- [ ] Reconnect and save again
- [ ] **Expected:** Saves successfully

### ✅ Test 14: Loading States
- [ ] Navigate to `/profile` while logged in
- [ ] **Expected:** Brief "Loading..." message while fetching profile
- [ ] **Expected:** Form appears after loading
- [ ] Click "Save Profile"
- [ ] **Expected:** Button shows "Saving..." and is disabled
- [ ] **Expected:** Button returns to "Save Profile" after save

### ✅ Test 15: RLS Security
- [ ] Create profile as User A
- [ ] Note the user ID from Supabase dashboard
- [ ] Try to access another user's profile via API (advanced test)
- [ ] **Expected:** Cannot access other user's profile (RLS blocks it)

---

## Success Criteria

✅ All tests pass  
✅ Profile page accessible only when logged in  
✅ New users redirected to profile after signup/login  
✅ Profile can be created and updated  
✅ Form validation works (required fields)  
✅ Data persists across page refreshes  
✅ NavBar shows Profile link when logged in  
✅ RLS policies prevent unauthorized access  
✅ No console errors  
✅ No TypeScript errors  

---

## Common Issues & Solutions

### Issue: "Table 'profiles' does not exist"
**Solution:** Run `database/profiles_table.sql` in Supabase SQL Editor

### Issue: "Permission denied" when saving profile
**Solution:** 
- Check RLS policies were created
- Verify user is logged in
- Check user ID matches profile ID

### Issue: "Display name already exists"
**Solution:** This is expected - display names must be unique. Choose a different name.

### Issue: Redirect loop after login
**Solution:** 
- Check profile API is working (test in browser console)
- Verify RLS allows user to read their own profile
- Check middleware isn't blocking profile route

### Issue: Form doesn't load existing profile
**Solution:**
- Check browser console for API errors
- Verify profile exists in Supabase dashboard
- Check user ID matches profile ID

---

## Next Steps

After profile feature is verified:
- Phase 3: Implement voting system (can use profile.display_name)
- Phase 4: Implement upload functionality (requires authenticated user with profile)
