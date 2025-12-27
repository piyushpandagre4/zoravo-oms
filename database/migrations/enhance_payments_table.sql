-- Enhance payments table with additional fields for professional payment tracking
-- Adds payment_mode, reference_number, paid_by, notes, created_by, and tenant_id

DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'payments') THEN
        -- Add tenant_id if it doesn't exist (should exist from multi_tenant_schema, but check anyway)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payments' AND column_name = 'tenant_id'
        ) THEN
            ALTER TABLE payments ADD COLUMN tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE;
        END IF;

        -- Rename payment_method to payment_mode for consistency, or add payment_mode
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payments' AND column_name = 'payment_mode'
        ) THEN
            -- If payment_method exists, copy to payment_mode and keep both for migration
            IF EXISTS (
                SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'payments' AND column_name = 'payment_method'
            ) THEN
                ALTER TABLE payments ADD COLUMN payment_mode VARCHAR(50);
                UPDATE payments SET payment_mode = payment_method WHERE payment_mode IS NULL;
            ELSE
                ALTER TABLE payments ADD COLUMN payment_mode VARCHAR(50) NOT NULL;
            END IF;
        END IF;

        -- Add paid_by if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payments' AND column_name = 'paid_by'
        ) THEN
            ALTER TABLE payments ADD COLUMN paid_by VARCHAR(255);
        END IF;

        -- Add created_by if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payments' AND column_name = 'created_by'
        ) THEN
            ALTER TABLE payments ADD COLUMN created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;
        END IF;

        -- Ensure notes exists (it should already exist)
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payments' AND column_name = 'notes'
        ) THEN
            ALTER TABLE payments ADD COLUMN notes TEXT;
        END IF;

        -- Add updated_at if it doesn't exist
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'payments' AND column_name = 'updated_at'
        ) THEN
            ALTER TABLE payments ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
        END IF;
    END IF;
END $$;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_payments_tenant_id ON payments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_mode ON payments(payment_mode);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON payments(created_by);

-- Create trigger to update updated_at
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'update_payments_updated_at'
    ) THEN
        CREATE TRIGGER update_payments_updated_at 
        BEFORE UPDATE ON payments 
        FOR EACH ROW 
        EXECUTE FUNCTION update_updated_at_column();
    END IF;
END $$;
