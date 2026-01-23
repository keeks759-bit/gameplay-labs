# Supabase Authentication Implementation

## Files Created/Modified

### New Files Created

1. **`src/lib/supabaseServer.ts`**
   - Server-side Supabase client for middleware and server components
   - Uses `@supabase/ssr` for cookie-based session management

2. **`src/middleware.ts`**
   - Protects `/upload` route
   - Redirects unauthenticated users to `/login?redirect=/upload`
   - Refreshes session on every request

3. **`src/contexts/AuthContext.tsx`**
   - React context for auth state management
   - Provides `user`, `session`, `loading`, and `signOut` to all components
   - Listens to auth state changes

4. **`src/app/auth/callback/route.ts`**
   - Handles email confirmation redirects
   - Exchanges confirmation code for session

### Modified Files

5. **`src/lib/supabaseClient.ts`**
   - Changed from `createClient` to `createBrowserClient` from `@supabase/ssr`
   - **WHY:** Enables cookie-based session persistence across page refreshes
   - Session now stored in HTTP-only cookies (more secure than localStorage)

6. **`src/app/layout.tsx`**
   - Wrapped app with `<AuthProvider>` to provide auth context globally

7. **`src/components/NavBar.tsx`**
   - Uses `useAuth()` hook to get real auth state
   - Shows "Profile" + "Logout" when logged in
   - Shows "Log In" + "Sign Up" when logged out
   - Handles logout button click

8. **`src/app/signup/page.tsx`**
   - Fully functional signup form
   - Email/password validation
   - Error handling and success messages
   - Email confirmation flow

9. **`src/app/login/page.tsx`**
   - Fully functional login form
   - Handles redirect parameter (for protected routes)
   - Error handling

10. **`package.json`**
    - Added `@supabase/ssr` dependency

---

## Why Refactor supabaseClient.ts?

**Original:** Used `createClient` from `@supabase/supabase-js`
- Session stored in localStorage
- Lost on page refresh in some cases
- Not accessible server-side

**New:** Uses `createBrowserClient` from `@supabase/ssr`
- Session stored in HTTP-only cookies
- Persists across page refreshes
- Accessible server-side (via middleware)
- More secure (cookies can't be accessed by JavaScript)

This is **necessary** for App Router because:
- Middleware needs to check session server-side
- Cookies are the only way to share session between client and server
- Provides better security and UX

---

## Installation Required

Run this command to install the new dependency:

```bash
npm install @supabase/ssr
```

---

## Supabase Configuration Needed

In your Supabase dashboard:

1. **Go to:** Authentication → URL Configuration
2. **Add to "Redirect URLs":**
   - `http://localhost:3000/auth/callback` (for local dev)
   - `https://yourdomain.com/auth/callback` (for production)

3. **Email Templates (Optional):**
   - Customize confirmation email if desired
   - Default templates work fine

---

## Manual Test Plan

### Test 1: Sign Up Flow

**Steps:**
1. Navigate to `http://localhost:3000/signup`
2. Fill in:
   - Email: `test@example.com`
   - Password: `password123` (min 6 chars)
3. Click "Create Profile"
4. **Expected:** Green success message: "Check your email for the confirmation link!"
5. Check your email inbox
6. **Expected:** Email from Supabase with confirmation link
7. Click the confirmation link
8. **Expected:** Redirected to homepage, logged in automatically

**Verify:**
- ✅ NavBar shows "Profile" and "Logout" buttons
- ✅ No "Log In" or "Sign Up" buttons visible
- ✅ User email visible in browser (check Supabase dashboard → Authentication → Users)

---

### Test 2: Email Confirmation Behavior

**Scenario A: User tries to login before confirming email**

1. Sign up with new email (don't confirm yet)
2. Try to log in at `/login`
3. **Expected:** Error message: "Email not confirmed" or similar
4. Check email and confirm
5. Try logging in again
6. **Expected:** Successful login

**Scenario B: User confirms email**

1. Sign up with email
2. Click confirmation link in email
3. **Expected:** Redirected to homepage, automatically logged in
4. Refresh page
5. **Expected:** Still logged in (session persisted)

---

### Test 3: Login Flow

**Steps:**
1. Navigate to `http://localhost:3000/login`
2. Fill in:
   - Email: `test@example.com` (from Test 1)
   - Password: `password123`
3. Click "Log In"
4. **Expected:** Redirected to homepage, logged in

**Verify:**
- ✅ NavBar shows "Profile" and "Logout"
- ✅ Can navigate to `/upload` (protected route)
- ✅ Session persists after page refresh

---

### Test 4: Logout Flow

**Steps:**
1. While logged in, click "Logout" button in NavBar
2. **Expected:** Redirected to homepage, logged out

**Verify:**
- ✅ NavBar shows "Log In" and "Sign Up" buttons
- ✅ No "Profile" or "Logout" buttons
- ✅ Cannot access `/upload` (redirected to login)

---

### Test 5: Upload Route Protection

**Scenario A: Logged Out User**

1. Make sure you're logged out
2. Navigate directly to `http://localhost:3000/upload`
3. **Expected:** Automatically redirected to `/login?redirect=/upload`
4. Log in
5. **Expected:** Redirected back to `/upload` after login

**Scenario B: Logged In User**

1. Log in first
2. Navigate to `http://localhost:3000/upload`
3. **Expected:** Page loads normally (no redirect)

**Verify:**
- ✅ Middleware correctly protects route
- ✅ Redirect parameter works
- ✅ User returns to intended page after login

---

### Test 6: Session Persistence

**Steps:**
1. Log in
2. Close browser tab
3. Open new tab, navigate to `http://localhost:3000`
4. **Expected:** Still logged in (session persisted)

**Alternative Test:**
1. Log in
2. Refresh page (F5 or Cmd+R)
3. **Expected:** Still logged in, no flash of login buttons

**Verify:**
- ✅ Session stored in cookies (check DevTools → Application → Cookies)
- ✅ No localStorage used for session
- ✅ Session persists across browser restarts

---

### Test 7: Error Handling

**Test Invalid Login:**
1. Go to `/login`
2. Enter wrong email or password
3. Click "Log In"
4. **Expected:** Red error message displayed
5. **Expected:** Form still accessible (can retry)

**Test Invalid Signup:**
1. Go to `/signup`
2. Enter email that already exists
3. Enter password less than 6 characters
4. Click "Create Profile"
5. **Expected:** Appropriate error message displayed

---

### Test 8: Navigation States

**Verify NavBar shows correct state:**

1. **Logged Out:**
   - Shows: "Home", "Upload", "Top", "Log In", "Sign Up"
   - "Upload" link works but redirects to login when clicked

2. **Logged In:**
   - Shows: "Home", "Upload", "Top", "Profile", "Logout"
   - All links work normally

3. **Loading State:**
   - On initial page load, auth buttons may briefly not show
   - This is expected (checking session)

---

## Troubleshooting

### Issue: "Module not found: @supabase/ssr"
**Solution:** Run `npm install @supabase/ssr`

### Issue: Email confirmation not working
**Solution:** 
- Check Supabase dashboard → Authentication → URL Configuration
- Add `http://localhost:3000/auth/callback` to redirect URLs

### Issue: Session not persisting
**Solution:**
- Check browser cookies (DevTools → Application → Cookies)
- Verify `.env.local` has correct Supabase credentials
- Clear cookies and try again

### Issue: Middleware not protecting route
**Solution:**
- Verify `src/middleware.ts` exists
- Check middleware matcher config
- Restart dev server

### Issue: "useAuth must be used within AuthProvider"
**Solution:**
- Verify `AuthProvider` wraps app in `layout.tsx`
- Check component is client component (`'use client'`)

---

## Success Criteria

✅ All tests pass  
✅ Signup creates account and sends confirmation email  
✅ Login works with confirmed email  
✅ Logout clears session  
✅ `/upload` protected (redirects when logged out)  
✅ Session persists across page refreshes  
✅ NavBar shows correct buttons based on auth state  
✅ No console errors  
✅ No TypeScript errors  

---

## Next Steps (After Testing)

Once authentication is verified working:
- Phase 3: Implement voting system (requires user ID)
- Phase 4: Implement upload functionality (requires authenticated user)
