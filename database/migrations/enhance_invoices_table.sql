-- Enhance invoices table for professional invoice lifecycle management
-- This migration adds all necessary columns for draft, issued, partial, paid, overdue, cancelled statuses

-- Add vehicle_inward_id to link invoice to the job
DO $$ 
DECLARE
    status_type TEXT;
    enum_name TEXT;
    view_record RECORD;
    has_total_amount BOOLEAN;
    has_amount BOOLEAN;
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'invoices') THEN
        -- Add vehicle_inward_id if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invoices' AND column_name = 'vehicle_inward_id'
        ) THEN
            ALTER TABLE invoices ADD COLUMN vehicle_inward_id UUID REFERENCES vehicle_inward(id) ON DELETE SET NULL;
        END IF;

        -- Add invoice_date if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invoices' AND column_name = 'invoice_date'
        ) THEN
            ALTER TABLE invoices ADD COLUMN invoice_date DATE;
            -- Set invoice_date to created_at for existing records
            UPDATE invoices SET invoice_date = created_at::DATE WHERE invoice_date IS NULL;
        END IF;

        -- Modify status to include new statuses and set default to 'draft'
        -- First, convert enum to VARCHAR if it's an enum (more flexible)
        -- Get the data type of status column
        SELECT data_type, udt_name INTO status_type, enum_name
        FROM information_schema.columns
        WHERE table_name = 'invoices' AND column_name = 'status';
        
        -- If it's an enum, convert to VARCHAR with CHECK constraint
        -- First, drop any views that depend on the status column
        IF status_type = 'USER-DEFINED' AND enum_name IS NOT NULL THEN
            -- Drop all views that might depend on invoices.status
            -- Using CASCADE to drop dependent objects automatically
            DROP VIEW IF EXISTS v_unpaid_invoices CASCADE;
            DROP VIEW IF EXISTS v_invoice_summary CASCADE;
            DROP VIEW IF EXISTS v_outstanding_invoices CASCADE;
            DROP VIEW IF EXISTS v_monthly_revenue CASCADE;
            DROP VIEW IF EXISTS v_customer_payment_history CASCADE;
            DROP VIEW IF EXISTS v_payment_methods_summary CASCADE;
            
            -- Also drop any other views that might reference invoices table
            -- This is a safety measure - views will be recreated by create_accounts_views.sql
            FOR view_record IN 
                SELECT viewname 
                FROM pg_views 
                WHERE schemaname = 'public' 
                AND viewname LIKE 'v_%'
            LOOP
                EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(view_record.viewname) || ' CASCADE';
            END LOOP;
            
            -- Convert enum to VARCHAR
            ALTER TABLE invoices ALTER COLUMN status TYPE VARCHAR(50) USING status::text;
        END IF;
        
        -- Drop existing constraint if it exists
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'invoices' 
            AND constraint_name = 'invoices_status_check'
        ) THEN
            ALTER TABLE invoices DROP CONSTRAINT invoices_status_check;
        END IF;
        
        -- Add new CHECK constraint with all valid statuses (including 'pending' for migration)
        ALTER TABLE invoices ADD CONSTRAINT invoices_status_check 
        CHECK (status IN ('draft', 'issued', 'partial', 'paid', 'overdue', 'cancelled', 'pending'));
        
        -- Now update existing statuses to match new values
        UPDATE invoices SET status = 'issued' WHERE status = 'pending' AND invoice_number IS NOT NULL;
        UPDATE invoices SET status = 'draft' WHERE status = 'pending' AND invoice_number IS NULL;
        
        -- Ensure total_amount column exists (add if missing, calculate from amount + tax_amount)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invoices' AND column_name = 'total_amount'
        ) THEN
            -- Add total_amount column
            ALTER TABLE invoices ADD COLUMN total_amount DECIMAL(10,2);
            -- Calculate total_amount from amount + tax_amount for existing records
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'invoices' AND column_name = 'amount'
            ) THEN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'invoices' AND column_name = 'tax_amount'
                ) THEN
                    UPDATE invoices SET total_amount = COALESCE(amount, 0) + COALESCE(tax_amount, 0);
                ELSE
                    UPDATE invoices SET total_amount = COALESCE(amount, 0);
                END IF;
            END IF;
        END IF;

        -- Add new status columns
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invoices' AND column_name = 'paid_amount'
        ) THEN
            ALTER TABLE invoices ADD COLUMN paid_amount DECIMAL(10,2) DEFAULT 0;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invoices' AND column_name = 'balance_amount'
        ) THEN
            ALTER TABLE invoices ADD COLUMN balance_amount DECIMAL(10,2);
            -- Calculate balance for existing records
            -- Check which column exists and use it
            -- Check if total_amount column exists
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'invoices' AND column_name = 'total_amount'
            ) INTO has_total_amount;
            
            -- Check if amount column exists
            SELECT EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'invoices' AND column_name = 'amount'
            ) INTO has_amount;
            
            -- Update balance based on which column exists
            IF has_total_amount THEN
                UPDATE invoices SET balance_amount = total_amount - COALESCE(paid_amount, 0);
            ELSIF has_amount THEN
                -- If only amount exists, calculate total as amount + tax_amount (if tax_amount exists)
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns 
                    WHERE table_name = 'invoices' AND column_name = 'tax_amount'
                ) THEN
                    UPDATE invoices SET balance_amount = (COALESCE(amount, 0) + COALESCE(tax_amount, 0)) - COALESCE(paid_amount, 0);
                ELSE
                    UPDATE invoices SET balance_amount = COALESCE(amount, 0) - COALESCE(paid_amount, 0);
                END IF;
            END IF;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invoices' AND column_name = 'tax_amount'
        ) THEN
            ALTER TABLE invoices ADD COLUMN tax_amount DECIMAL(10,2) DEFAULT 0;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invoices' AND column_name = 'discount_amount'
        ) THEN
            ALTER TABLE invoices ADD COLUMN discount_amount DECIMAL(10,2) DEFAULT 0;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invoices' AND column_name = 'discount_reason'
        ) THEN
            ALTER TABLE invoices ADD COLUMN discount_reason TEXT;
        END IF;

        -- Rename description to notes if needed, or add notes separately
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invoices' AND column_name = 'notes'
        ) THEN
            ALTER TABLE invoices ADD COLUMN notes TEXT;
            -- Copy description to notes if description exists
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'invoices' AND column_name = 'description'
            ) THEN
                UPDATE invoices SET notes = description WHERE notes IS NULL AND description IS NOT NULL;
            END IF;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invoices' AND column_name = 'issued_at'
        ) THEN
            ALTER TABLE invoices ADD COLUMN issued_at TIMESTAMP WITH TIME ZONE;
            -- Set issued_at for existing issued invoices
            UPDATE invoices SET issued_at = created_at WHERE status = 'issued' AND issued_at IS NULL;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invoices' AND column_name = 'cancelled_at'
        ) THEN
            ALTER TABLE invoices ADD COLUMN cancelled_at TIMESTAMP WITH TIME ZONE;
        END IF;

        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invoices' AND column_name = 'cancelled_reason'
        ) THEN
            ALTER TABLE invoices ADD COLUMN cancelled_reason TEXT;
        END IF;

        -- Add paid_date if it doesn't exist (date when invoice was fully paid)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'invoices' AND column_name = 'paid_date'
        ) THEN
            ALTER TABLE invoices ADD COLUMN paid_date DATE;
        END IF;

        -- Make invoice_number nullable for drafts (will be generated on issue)
        IF EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'invoices' 
            AND constraint_name LIKE '%invoice_number%' 
            AND constraint_type = 'UNIQUE'
        ) THEN
            -- Drop the NOT NULL constraint if it exists
            ALTER TABLE invoices ALTER COLUMN invoice_number DROP NOT NULL;
        END IF;

        -- Update status default
        ALTER TABLE invoices ALTER COLUMN status SET DEFAULT 'draft';
    END IF;
END $$;

-- Create index for vehicle_inward_id
CREATE INDEX IF NOT EXISTS idx_invoices_vehicle_inward_id ON invoices(vehicle_inward_id);

-- Create index for status
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

-- Create index for invoice_date
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);

-- Create index for due_date
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON invoices(due_date);

-- Create composite index for overdue detection
CREATE INDEX IF NOT EXISTS idx_invoices_status_due_date ON invoices(status, due_date) 
WHERE status IN ('issued', 'partial');
