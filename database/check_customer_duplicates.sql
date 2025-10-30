-- Check if you have duplicate customers
-- Run this in Supabase SQL Editor to see the data structure

-- Show all customers with their details
SELECT 
    id,
    name,
    phone,
    email,
    address,
    created_at,
    updated_at
FROM customers
ORDER BY phone, created_at;

-- Count how many times each phone number appears
SELECT 
    phone,
    COUNT(*) as count,
    STRING_AGG(name, ', ') as names
FROM customers
GROUP BY phone
HAVING COUNT(*) > 1
ORDER BY count DESC;

-- Show vehicles linked to customers
SELECT 
    c.phone,
    c.name as customer_name,
    v.registration_number,
    v.make,
    v.model,
    v.created_at as vehicle_created
FROM customers c
LEFT JOIN vehicles v ON v.customer_id = c.id
ORDER BY c.phone, v.created_at;

