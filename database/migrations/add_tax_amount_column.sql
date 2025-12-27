-- Quick fix: Add tax_amount column to invoices table if it doesn't exist
-- This fixes the error: "Could not find the 'tax_amount' column of 'invoices' in the schema cache"
-- Also ensures customer_name column exists and is nullable if needed

DO $$
BEGIN
    -- Add tax_amount column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'tax_amount'
    ) THEN
        ALTER TABLE invoices ADD COLUMN tax_amount DECIMAL(10,2) DEFAULT 0;
        
        -- Update existing invoices to have tax_amount = 0 if they don't have it
        UPDATE invoices SET tax_amount = 0 WHERE tax_amount IS NULL;
        
        RAISE NOTICE 'tax_amount column added to invoices table';
    ELSE
        RAISE NOTICE 'tax_amount column already exists in invoices table';
    END IF;

    -- Handle customer_name column: make it nullable if it has NOT NULL constraint
    -- This allows invoices to be created even if customer info is not immediately available
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'customer_name'
        AND is_nullable = 'NO'
    ) THEN
        -- Check if there are any NULL values (shouldn't be, but just in case)
        -- If column exists with NOT NULL, we'll make it nullable to prevent constraint violations
        ALTER TABLE invoices ALTER COLUMN customer_name DROP NOT NULL;
        
        -- Set default for any NULL values
        UPDATE invoices SET customer_name = 'Unknown Customer' WHERE customer_name IS NULL;
        
        RAISE NOTICE 'customer_name column made nullable in invoices table';
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'customer_name'
    ) THEN
        -- Add customer_name column if it doesn't exist (nullable)
        ALTER TABLE invoices ADD COLUMN customer_name VARCHAR(255);
        RAISE NOTICE 'customer_name column added to invoices table';
    END IF;

    -- Handle amount column: ensure it has a default value if it has NOT NULL constraint
    -- The amount column represents subtotal after discount (before tax)
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' 
        AND column_name = 'amount'
        AND is_nullable = 'NO'
    ) THEN
        -- If amount is NOT NULL but has no default, set default to 0
        -- Update any existing NULL values to 0 (shouldn't happen, but safety check)
        UPDATE invoices SET amount = 0 WHERE amount IS NULL;
        
        -- Try to set default if not already set
        BEGIN
            ALTER TABLE invoices ALTER COLUMN amount SET DEFAULT 0;
        EXCEPTION WHEN OTHERS THEN
            -- Default might already be set, ignore error
            NULL;
        END;
        
        RAISE NOTICE 'amount column default value ensured in invoices table';
    ELSIF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'amount'
    ) THEN
        -- Add amount column if it doesn't exist (with default)
        ALTER TABLE invoices ADD COLUMN amount DECIMAL(10,2) DEFAULT 0 NOT NULL;
        RAISE NOTICE 'amount column added to invoices table';
    END IF;

    -- Handle paid_date column: ensure it exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'paid_date'
    ) THEN
        ALTER TABLE invoices ADD COLUMN paid_date DATE;
        RAISE NOTICE 'paid_date column added to invoices table';
    END IF;

    -- Handle payments table: ensure payment_method column compatibility
    -- The table might have payment_method (NOT NULL) while code uses payment_mode
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payments') THEN
        -- If payment_method exists with NOT NULL but payment_mode doesn't exist, add payment_mode
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payments' AND column_name = 'payment_method'
        ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payments' AND column_name = 'payment_mode'
        ) THEN
            ALTER TABLE payments ADD COLUMN payment_mode VARCHAR(50);
            -- Copy data from payment_method to payment_mode
            UPDATE payments SET payment_mode = payment_method WHERE payment_mode IS NULL;
            RAISE NOTICE 'payment_mode column added to payments table (copied from payment_method)';
        END IF;

        -- If payment_method has NOT NULL constraint, make it nullable or ensure it has a default
        IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payments' 
            AND column_name = 'payment_method'
            AND is_nullable = 'NO'
        ) THEN
            -- Try to make it nullable (if no existing NOT NULL values would violate this)
            BEGIN
                -- First, ensure all existing records have a value
                UPDATE payments SET payment_method = 'cash' WHERE payment_method IS NULL;
                -- Then make it nullable
                ALTER TABLE payments ALTER COLUMN payment_method DROP NOT NULL;
                RAISE NOTICE 'payment_method column made nullable in payments table';
            EXCEPTION WHEN OTHERS THEN
                -- If we can't make it nullable, at least set a default
                BEGIN
                    ALTER TABLE payments ALTER COLUMN payment_method SET DEFAULT 'cash';
                    RAISE NOTICE 'payment_method column default set in payments table';
                EXCEPTION WHEN OTHERS THEN
                    -- Ignore if default already exists
                    NULL;
                END;
            END;
        END IF;
    END IF;
END $$;
