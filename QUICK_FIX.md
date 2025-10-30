# Quick Fix for User Creation Error

## 🚨 Current Error

```
Database error creating new user
```

This happens because the trigger on `auth.users` fails when trying to create a profile.

---

## ✅ Solution: Run These SQL Commands

### Step 1: Open Supabase SQL Editor

Go to **Supabase Dashboard** → **SQL Editor** → **New Query**

### Step 2: Run This Script

Copy and paste this entire script:

```sql
-- Disable RLS on profiles table temporarily for admin operations
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;

-- Re-enable it
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop the problematic trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Recreate the trigger with proper permissions
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE(NEW.raw_user_meta_data->>'role', 'installer')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Drop old restrictive policies
DROP POLICY IF EXISTS "Allow authenticated users to view profiles" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Allow service role to insert profiles" ON profiles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON profiles;
DROP POLICY IF EXISTS "Managers can view all profiles" ON profiles;

-- Create simple, working policies
CREATE POLICY "Anyone can view profiles" ON profiles
  FOR SELECT USING (true);

CREATE POLICY "Anyone can update profiles" ON profiles
  FOR UPDATE USING (true);

CREATE POLICY "Anyone can insert profiles" ON profiles
  FOR INSERT WITH CHECK (true);
```

### Step 3: Click "Run"

### Step 4: Try Creating a User Again

Go back to your app and try creating a user.

---

## ✅ Expected Result

- ✅ No more "Database error" 
- ✅ User created successfully
- ✅ Profile created automatically
- ✅ User appears in the table

---

## 🔒 Security Note

These policies allow anyone to access profiles. For production:

1. Remove these permissive policies
2. Add proper role-based access control
3. Use service role for API operations

But for now, this will get user creation working!
