-- Fix existing duplicate short_ids before applying the trigger fix
-- This script must be run BEFORE fix_short_id_tenant_isolation.sql if duplicates exist

-- Step 1: Identify duplicate short_ids per tenant
SELECT 
    tenant_id,
    short_id,
    COUNT(*) as duplicate_count,
    ARRAY_AGG(id ORDER BY created_at) as record_ids
FROM vehicle_inward
WHERE tenant_id IS NOT NULL 
  AND short_id IS NOT NULL
  AND short_id ~ '^ZO[0-9]+$'
GROUP BY tenant_id, short_id
HAVING COUNT(*) > 1
ORDER BY tenant_id, short_id;

-- Step 2: Fix duplicates by regenerating short_ids sequentially per tenant
-- This will ensure each tenant has unique sequential IDs
DO $$
DECLARE
    tenant_rec RECORD;
    rec RECORD;
    counter INTEGER;
    current_short_id VARCHAR(10);
BEGIN
    -- For each tenant, regenerate short_ids sequentially
    FOR tenant_rec IN 
        SELECT DISTINCT tenant_id 
        FROM vehicle_inward 
        WHERE tenant_id IS NOT NULL
        ORDER BY tenant_id
    LOOP
        counter := 1;
        
        -- First, set all short_ids to NULL for this tenant to avoid constraint violations
        UPDATE vehicle_inward 
        SET short_id = NULL
        WHERE tenant_id = tenant_rec.tenant_id;
        
        -- Now regenerate them sequentially
        FOR rec IN 
            SELECT id 
            FROM vehicle_inward 
            WHERE tenant_id = tenant_rec.tenant_id
            ORDER BY created_at
        LOOP
            -- Generate new short_id (3 digits to support up to 999 entries per tenant)
            current_short_id := 'ZO' || LPAD(counter::TEXT, 3, '0');
            
            -- Update with new short_id
            UPDATE vehicle_inward 
            SET short_id = current_short_id
            WHERE id = rec.id;
            
            counter := counter + 1;
        END LOOP;
        
        RAISE NOTICE 'Fixed short_ids for tenant %: % records', tenant_rec.tenant_id, counter - 1;
    END LOOP;
    
    RAISE NOTICE '✅ All duplicate short_ids have been fixed!';
END $$;

-- Step 3: Verify no duplicates remain
SELECT 
    tenant_id,
    short_id,
    COUNT(*) as count
FROM vehicle_inward
WHERE tenant_id IS NOT NULL 
  AND short_id IS NOT NULL
GROUP BY tenant_id, short_id
HAVING COUNT(*) > 1;

-- If the above query returns no rows, duplicates are fixed
SELECT '✅ Duplicate check complete. If no rows above, all duplicates are fixed!' as result;
