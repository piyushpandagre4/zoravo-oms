-- Fix: Drop the problematic trigger that's causing user creation to fail
-- Run this in Supabase SQL Editor

-- Drop the trigger that auto-creates profiles
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function (optional but recommended)
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Success message
DO $$ 
BEGIN
    RAISE NOTICE 'Trigger dropped! User creation should work now.';
    RAISE NOTICE 'The API will create profiles manually now.';
END $$;
