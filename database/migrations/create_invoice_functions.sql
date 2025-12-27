-- Create database functions for invoice balance calculation and automatic status updates

-- Function 1: Calculate Invoice Balance
CREATE OR REPLACE FUNCTION calculate_invoice_balance(invoice_uuid UUID)
RETURNS NUMERIC AS $$
DECLARE
  invoice_total NUMERIC;
  invoice_paid NUMERIC;
BEGIN
  SELECT COALESCE(total_amount, 0) INTO invoice_total 
  FROM invoices 
  WHERE id = invoice_uuid;
  
  SELECT COALESCE(SUM(amount), 0) INTO invoice_paid 
  FROM payments 
  WHERE invoice_id = invoice_uuid;
  
  RETURN invoice_total - invoice_paid;
END;
$$ LANGUAGE plpgsql;

-- Function 2: Update Invoice Status Automatically (Trigger Function)
CREATE OR REPLACE FUNCTION update_invoice_status()
RETURNS TRIGGER AS $$
DECLARE
  invoice_total NUMERIC;
  invoice_paid NUMERIC;
  invoice_due_date DATE;
  invoice_status VARCHAR;
  invoice_balance NUMERIC;
BEGIN
  -- Get invoice details
  SELECT total_amount, due_date, status 
  INTO invoice_total, invoice_due_date, invoice_status
  FROM invoices 
  WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  -- Calculate total paid amount
  SELECT COALESCE(SUM(amount), 0) INTO invoice_paid 
  FROM payments 
  WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  -- Calculate balance
  invoice_balance := invoice_total - invoice_paid;
  
  -- Auto-update status based on payments
  IF invoice_paid = 0 THEN
    -- No payment yet
    IF invoice_status = 'issued' AND invoice_due_date IS NOT NULL AND invoice_due_date < CURRENT_DATE THEN
      -- Check if overdue
      UPDATE invoices 
      SET status = 'overdue', 
          paid_amount = invoice_paid, 
          balance_amount = invoice_balance
      WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    ELSIF invoice_status IN ('overdue', 'issued') THEN
      -- Keep status as is, just update amounts
      UPDATE invoices 
      SET paid_amount = invoice_paid, 
          balance_amount = invoice_balance
      WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
    END IF;
  ELSIF invoice_paid > 0 AND invoice_paid < invoice_total THEN
    -- Partial payment
    UPDATE invoices 
    SET status = CASE 
                   WHEN invoice_status = 'cancelled' THEN 'cancelled'
                   WHEN invoice_due_date IS NOT NULL AND invoice_due_date < CURRENT_DATE THEN 'overdue'
                   ELSE 'partial'
                 END,
        paid_amount = invoice_paid, 
        balance_amount = invoice_balance
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  ELSIF invoice_paid >= invoice_total THEN
    -- Fully paid
    UPDATE invoices 
    SET status = 'paid', 
        paid_amount = invoice_paid, 
        balance_amount = 0,
        paid_date = COALESCE(
          (SELECT MAX(payment_date) FROM payments WHERE invoice_id = COALESCE(NEW.invoice_id, OLD.invoice_id)),
          CURRENT_DATE
        )
    WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic status updates
DROP TRIGGER IF EXISTS trigger_update_invoice_status ON payments;

CREATE TRIGGER trigger_update_invoice_status
AFTER INSERT OR UPDATE OR DELETE ON payments
FOR EACH ROW 
EXECUTE FUNCTION update_invoice_status();

-- Function 3: Auto-detect Overdue Invoices (for Cron Job)
CREATE OR REPLACE FUNCTION mark_overdue_invoices()
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE invoices
  SET status = 'overdue',
      updated_at = NOW()
  WHERE status IN ('issued', 'partial')
    AND due_date IS NOT NULL
    AND due_date < CURRENT_DATE
    AND (total_amount - COALESCE(paid_amount, 0)) > 0;
  
  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- Function 4: Generate Invoice Number (Helper function)
CREATE OR REPLACE FUNCTION generate_invoice_number(tenant_uuid UUID DEFAULT NULL)
RETURNS TEXT AS $$
DECLARE
  tenant_code TEXT;
  invoice_prefix TEXT;
  next_number INTEGER;
  new_invoice_number TEXT;
BEGIN
  -- Get tenant code if provided
  IF tenant_uuid IS NOT NULL THEN
    SELECT tenant_code INTO tenant_code FROM tenants WHERE id = tenant_uuid;
  END IF;
  
  -- Set prefix
  invoice_prefix := COALESCE(tenant_code || '-', 'INV-');
  
  -- Get next number
  SELECT COALESCE(MAX(
    CAST(
      SUBSTRING(invoice_number FROM LENGTH(invoice_prefix) + 1) AS INTEGER
    )
  ), 0) + 1
  INTO next_number
  FROM invoices
  WHERE invoice_number LIKE invoice_prefix || '%'
    AND invoice_number ~ ('^' || invoice_prefix || '[0-9]+$');
  
  -- Generate new invoice number
  new_invoice_number := invoice_prefix || LPAD(next_number::TEXT, 6, '0');
  
  RETURN new_invoice_number;
END;
$$ LANGUAGE plpgsql;
