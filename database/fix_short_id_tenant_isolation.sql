-- Fix short_id generation for multi-tenant support
-- This fixes the duplicate key constraint violation by making short_id unique per tenant

-- Step 1: Drop the old unique constraint on short_id (if it exists)
DO $$
BEGIN
    -- Find and drop the existing unique constraint
    IF EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'vehicle_inward_short_id_key'
    ) THEN
        ALTER TABLE vehicle_inward DROP CONSTRAINT vehicle_inward_short_id_key;
        RAISE NOTICE 'Dropped old unique constraint on short_id';
    END IF;
END $$;

-- Step 2: Create a new composite unique constraint on (tenant_id, short_id)
-- This allows each tenant to have their own sequence (ZO01, ZO02, etc.)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'vehicle_inward_tenant_short_id_unique'
    ) THEN
        ALTER TABLE vehicle_inward 
        ADD CONSTRAINT vehicle_inward_tenant_short_id_unique 
        UNIQUE (tenant_id, short_id);
        RAISE NOTICE 'Created composite unique constraint on (tenant_id, short_id)';
    END IF;
END $$;

-- Step 3: Update the generate_short_id function to filter by tenant_id
-- This version uses advisory locks to prevent race conditions
CREATE OR REPLACE FUNCTION generate_short_id()
RETURNS TRIGGER AS $$
DECLARE
    next_num INTEGER;
    new_short_id VARCHAR(10);
    lock_key1 INTEGER;
    lock_key2 INTEGER;
BEGIN
    -- Only generate if tenant_id is present and short_id is NULL
    IF NEW.tenant_id IS NULL THEN
        RAISE EXCEPTION 'tenant_id is required for vehicle_inward entries';
    END IF;
    
    -- Generate lock keys from tenant_id hash
    -- This ensures we lock per tenant, preventing race conditions for concurrent inserts
    -- Using two-part hash for better distribution and to avoid collisions
    -- UUID is 36 chars, split into two parts
    lock_key1 := hashtext(SUBSTRING(NEW.tenant_id::TEXT, 1, 18));
    lock_key2 := hashtext(SUBSTRING(NEW.tenant_id::TEXT, 19, 18));
    
    -- Acquire an advisory lock for this tenant (blocks concurrent inserts for same tenant)
    -- This lock is automatically released when the transaction commits or rolls back
    PERFORM pg_advisory_xact_lock(lock_key1, lock_key2);
    
    -- Get the next number for THIS tenant only
    -- The advisory lock ensures only one transaction can calculate this at a time per tenant
    -- Query all existing short_ids for this tenant and find the next available number
    -- Support both old format (ZO01-ZO99) and new format (ZO001-ZO999)
    SELECT COALESCE(MAX(CAST(SUBSTRING(short_id FROM 3) AS INTEGER)), 0) + 1
    INTO next_num
    FROM vehicle_inward
    WHERE tenant_id = NEW.tenant_id 
      AND short_id IS NOT NULL 
      AND short_id ~ '^ZO[0-9]+$';
    
    -- Format as ZO001, ZO002, etc. (3 digits to support up to 999 entries per tenant)
    new_short_id := 'ZO' || LPAD(next_num::TEXT, 3, '0');
    
    -- Double-check: If this short_id already exists (shouldn't happen with lock), find next available
    -- This handles edge cases where duplicates might exist from before the fix
    -- Note: During INSERT, NEW.id doesn't exist yet, so we just check if the short_id exists
    WHILE EXISTS (
        SELECT 1 FROM vehicle_inward 
        WHERE tenant_id = NEW.tenant_id 
          AND short_id = new_short_id
    ) LOOP
        next_num := next_num + 1;
        new_short_id := 'ZO' || LPAD(next_num::TEXT, 3, '0');
        -- Safety: prevent infinite loop (supports up to 999 entries per tenant)
        IF next_num > 999 THEN
            RAISE EXCEPTION 'Too many vehicle_inward entries for tenant %. Cannot generate unique short_id. Maximum 999 entries per tenant.', NEW.tenant_id;
        END IF;
    END LOOP;
    
    NEW.short_id := new_short_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Ensure the trigger exists
DROP TRIGGER IF EXISTS set_short_id ON vehicle_inward;
CREATE TRIGGER set_short_id
BEFORE INSERT ON vehicle_inward
FOR EACH ROW
WHEN (NEW.short_id IS NULL)
EXECUTE FUNCTION generate_short_id();

-- Step 5: Fix any existing records that might have duplicate short_ids
-- This will regenerate short_ids per tenant
DO $$
DECLARE
    tenant_rec RECORD;
    rec RECORD;
    counter INTEGER;
BEGIN
    -- For each tenant, regenerate short_ids sequentially
    FOR tenant_rec IN 
        SELECT DISTINCT tenant_id 
        FROM vehicle_inward 
        WHERE tenant_id IS NOT NULL
    LOOP
        counter := 1;
        -- Update all records for this tenant with sequential short_ids
        FOR rec IN 
            SELECT id 
            FROM vehicle_inward 
            WHERE tenant_id = tenant_rec.tenant_id 
              AND (short_id IS NULL OR short_id ~ '^ZO[0-9]+$')
            ORDER BY created_at
        LOOP
            UPDATE vehicle_inward 
            SET short_id = 'ZO' || LPAD(counter::TEXT, 3, '0')
            WHERE id = rec.id;
            counter := counter + 1;
        END LOOP;
    END LOOP;
    
    RAISE NOTICE 'Regenerated short_ids for all tenants';
END $$;

SELECT '✅ Fixed short_id generation for multi-tenant support!' as result;
