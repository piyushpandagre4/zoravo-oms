-- Create database views for invoice summary and financial reporting
-- Note: This migration assumes enhance_invoices_table.sql has been run first
-- If total_amount doesn't exist, we'll create it here as a safety measure

-- Ensure total_amount column exists before creating views
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'invoices' AND column_name = 'total_amount'
    ) THEN
        -- Add total_amount column if it doesn't exist
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
                UPDATE invoices SET total_amount = COALESCE(amount, 0) + COALESCE(tax_amount, 0) WHERE total_amount IS NULL;
            ELSE
                UPDATE invoices SET total_amount = COALESCE(amount, 0) WHERE total_amount IS NULL;
            END IF;
        END IF;
    END IF;
END $$;

-- View 1: Invoice Summary by Status
-- Note: Assumes total_amount column exists (created by enhance_invoices_table.sql)
CREATE OR REPLACE VIEW v_invoice_summary AS
SELECT 
  tenant_id,
  status,
  COUNT(*) as count,
  SUM(COALESCE(total_amount, 0)) as total_invoiced,
  SUM(COALESCE(paid_amount, 0)) as total_received,
  SUM(COALESCE(balance_amount, 0)) as total_outstanding
FROM invoices
WHERE tenant_id IS NOT NULL
GROUP BY tenant_id, status;

-- View 2: Outstanding Invoices (with customer and vehicle details)
-- Note: Assumes total_amount column exists (created by enhance_invoices_table.sql)
CREATE OR REPLACE VIEW v_outstanding_invoices AS
SELECT 
  i.id,
  i.tenant_id,
  i.invoice_number,
  i.invoice_date,
  i.due_date,
  i.status,
  i.total_amount,
  i.paid_amount,
  i.balance_amount,
  v.registration_number as vehicle_number,
  v.make,
  v.model,
  c.name as customer_name,
  c.phone as customer_phone,
  c.email as customer_email,
  vi.id as vehicle_inward_id,
  CASE 
    WHEN i.due_date IS NOT NULL AND i.due_date < CURRENT_DATE THEN 
      CURRENT_DATE - i.due_date
    ELSE 0
  END as days_overdue
FROM invoices i
LEFT JOIN vehicle_inward vi ON i.vehicle_inward_id = vi.id
LEFT JOIN vehicles v ON vi.vehicle_id = v.id
LEFT JOIN customers c ON v.customer_id = c.id
WHERE i.status IN ('issued', 'partial', 'overdue')
  AND COALESCE(i.balance_amount, i.total_amount - COALESCE(i.paid_amount, 0)) > 0;

-- View 3: Monthly Revenue Summary
-- Note: Assumes total_amount column exists (created by enhance_invoices_table.sql)
CREATE OR REPLACE VIEW v_monthly_revenue AS
SELECT 
  tenant_id,
  DATE_TRUNC('month', invoice_date) as month,
  COUNT(*) as invoice_count,
  SUM(COALESCE(total_amount, 0)) as total_invoiced,
  SUM(COALESCE(paid_amount, 0)) as total_received,
  SUM(COALESCE(balance_amount, 0)) as total_outstanding
FROM invoices
WHERE tenant_id IS NOT NULL
  AND invoice_date IS NOT NULL
GROUP BY tenant_id, DATE_TRUNC('month', invoice_date)
ORDER BY tenant_id, month DESC;

-- View 4: Payment Methods Summary
CREATE OR REPLACE VIEW v_payment_methods_summary AS
SELECT 
  p.tenant_id,
  p.payment_mode,
  COUNT(*) as payment_count,
  SUM(p.amount) as total_amount,
  MIN(p.payment_date) as first_payment,
  MAX(p.payment_date) as last_payment
FROM payments p
WHERE p.tenant_id IS NOT NULL
GROUP BY p.tenant_id, p.payment_mode
ORDER BY p.tenant_id, total_amount DESC;

-- View 5: Customer Payment History
-- Note: Assumes total_amount column exists (created by enhance_invoices_table.sql)
CREATE OR REPLACE VIEW v_customer_payment_history AS
SELECT 
  c.id as customer_id,
  c.name as customer_name,
  c.phone as customer_phone,
  i.tenant_id,
  COUNT(DISTINCT i.id) as total_invoices,
  SUM(COALESCE(i.total_amount, 0)) as total_invoiced,
  SUM(COALESCE(i.paid_amount, 0)) as total_paid,
  SUM(COALESCE(i.balance_amount, 0)) as total_outstanding,
  COUNT(DISTINCT CASE WHEN i.status = 'overdue' THEN i.id END) as overdue_count
FROM customers c
JOIN vehicles v ON c.id = v.customer_id
JOIN vehicle_inward vi ON v.id = vi.vehicle_id
JOIN invoices i ON vi.id = i.vehicle_inward_id
WHERE i.tenant_id IS NOT NULL
GROUP BY c.id, c.name, c.phone, i.tenant_id
ORDER BY total_outstanding DESC;
