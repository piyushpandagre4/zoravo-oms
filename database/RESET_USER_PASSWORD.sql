-- Reset or Set Password for a User
-- Run this in Supabase SQL Editor

-- Example: Reset password for an installer
-- Replace the email and password with your user's details

-- Step 1: Find the user's auth.uid
SELECT 
  id as auth_user_id,
  email
FROM auth.users
WHERE email = 'installer@zoravo.com';  -- Change this to your installer email

-- Step 2: Update the password (you'll need the user ID from step 1)
-- Replace <USER_ID> with the ID from step 1, and set a new password
UPDATE auth.users 
SET encrypted_password = crypt('NewPassword123!', gen_salt('bf'))
WHERE email = 'installer@zoravo.com';

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Password updated successfully!';
    RAISE NOTICE 'Email: installer@zoravo.com';
    RAISE NOTICE 'Password: NewPassword123!';
END $$;
