-- Migration script to convert existing completed vehicle_inward entries to invoices
-- This creates invoices from completed jobs and extracts products from accessories_requested

DO $$
DECLARE
  inward_record RECORD;
  invoice_id UUID;
  invoice_number TEXT;
  total_amount NUMERIC := 0;
  product_record JSONB;
  line_item_id UUID;
  tenant_code TEXT;
  invoice_prefix TEXT;
  next_invoice_num INTEGER;
BEGIN
  -- Loop through all completed vehicle_inward entries
  FOR inward_record IN 
    SELECT 
      vi.*,
      v.registration_number,
      v.customer_id,
      c.name as customer_name,
      c.phone as customer_phone
    FROM vehicle_inward vi
    LEFT JOIN vehicles v ON vi.vehicle_id = v.id
    LEFT JOIN customers c ON v.customer_id = c.id
    WHERE vi.status IN ('completed', 'complete_and_delivered', 'delivered', 'delivered_final', 'delivered (final)')
      AND NOT EXISTS (
        SELECT 1 FROM invoices i 
        WHERE i.vehicle_inward_id = vi.id
      )
  LOOP
    -- Skip if no products
    IF inward_record.accessories_requested IS NULL OR inward_record.accessories_requested = '[]' THEN
      CONTINUE;
    END IF;

    BEGIN
      -- Parse products from accessories_requested
      DECLARE
        products JSONB;
        product JSONB;
        subtotal NUMERIC := 0;
      BEGIN
        -- Try to parse JSON
        products := inward_record.accessories_requested::JSONB;
        
        IF jsonb_typeof(products) = 'array' THEN
          -- Calculate total from products
          FOR product IN SELECT * FROM jsonb_array_elements(products)
          LOOP
            subtotal := subtotal + COALESCE((product->>'price')::NUMERIC, 0);
          END LOOP;
        ELSE
          CONTINUE; -- Skip if not a valid array
        END IF;

        total_amount := subtotal;

        -- Get tenant code for invoice number generation
        IF inward_record.tenant_id IS NOT NULL THEN
          SELECT tenant_code INTO tenant_code FROM tenants WHERE id = inward_record.tenant_id;
        END IF;

        invoice_prefix := COALESCE(tenant_code || '-', 'INV-');

        -- Generate invoice number
        SELECT COALESCE(MAX(
          CAST(
            SUBSTRING(invoice_number FROM LENGTH(invoice_prefix) + 1) AS INTEGER
          )
        ), 0) + 1
        INTO next_invoice_num
        FROM invoices
        WHERE invoice_number LIKE invoice_prefix || '%'
          AND invoice_number ~ ('^' || invoice_prefix || '[0-9]+$');

        invoice_number := invoice_prefix || LPAD(next_invoice_num::TEXT, 6, '0');

        -- Check if invoice number already exists in notes (from old system)
        IF inward_record.notes IS NOT NULL THEN
          DECLARE
            notes_data JSONB;
            existing_invoice_number TEXT;
          BEGIN
            BEGIN
              notes_data := inward_record.notes::JSONB;
              existing_invoice_number := notes_data->>'invoiceNumber';
              
              IF existing_invoice_number IS NOT NULL AND existing_invoice_number != '' THEN
                invoice_number := existing_invoice_number;
              END IF;
            EXCEPTION WHEN OTHERS THEN
              -- If notes is not JSON, try to extract invoice number from text
              IF inward_record.notes LIKE '%INV%' OR inward_record.notes ~ '[0-9]+' THEN
                -- Try to extract invoice number pattern
                existing_invoice_number := substring(inward_record.notes from 'INV[^0-9]*([0-9]+)');
                IF existing_invoice_number IS NOT NULL THEN
                  invoice_number := 'INV-' || existing_invoice_number;
                END IF;
              END IF;
            END;
          END;
        END IF;

        -- Determine status: if has invoice number in notes, mark as issued, otherwise draft
        DECLARE
          invoice_status TEXT;
          invoice_date DATE;
          due_date DATE;
          issued_at TIMESTAMP WITH TIME ZONE;
        BEGIN
          IF inward_record.notes IS NOT NULL AND (
            inward_record.notes LIKE '%INV%' OR 
            inward_record.notes ~ '[0-9]+' OR
            (inward_record.notes::JSONB->>'invoiceNumber') IS NOT NULL
          ) THEN
            invoice_status := 'issued';
            issued_at := COALESCE(inward_record.updated_at, inward_record.created_at);
          ELSE
            invoice_status := 'draft';
            issued_at := NULL;
          END IF;

          invoice_date := COALESCE(inward_record.updated_at::DATE, inward_record.created_at::DATE);
          due_date := invoice_date + INTERVAL '30 days';

          -- Create invoice
          -- Note: vehicle_id column may not exist, so we only insert it if the column exists
          INSERT INTO invoices (
            tenant_id,
            vehicle_inward_id,
            invoice_number,
            invoice_date,
            due_date,
            status,
            total_amount,
            paid_amount,
            balance_amount,
            discount_amount,
            tax_amount,
            notes,
            issued_at,
            created_at,
            updated_at
          ) VALUES (
            inward_record.tenant_id,
            inward_record.id,
            invoice_number,
            invoice_date,
            due_date,
            invoice_status,
            total_amount,
            0,
            total_amount,
            0,
            0,
            COALESCE(inward_record.notes, ''),
            issued_at,
            inward_record.created_at,
            inward_record.updated_at
          )
          RETURNING id INTO invoice_id;

          -- Create line items from products
          FOR product IN SELECT * FROM jsonb_array_elements(products)
          LOOP
            INSERT INTO invoice_line_items (
              invoice_id,
              tenant_id,
              product_name,
              brand,
              department,
              quantity,
              unit_price,
              line_total,
              created_at
            ) VALUES (
              invoice_id,
              inward_record.tenant_id,
              COALESCE(product->>'product', ''),
              product->>'brand',
              product->>'department',
              1,
              COALESCE((product->>'price')::NUMERIC, 0),
              COALESCE((product->>'price')::NUMERIC, 0),
              inward_record.created_at
            );
          END LOOP;

          RAISE NOTICE 'Created invoice % for vehicle_inward %', invoice_number, inward_record.id;

        END;
      END;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Error processing vehicle_inward %: %', inward_record.id, SQLERRM;
      CONTINUE;
    END;
  END LOOP;
END $$;

-- Update any existing payments to link to invoices if possible
-- This is a best-effort attempt to link payments to invoices
DO $$
DECLARE
  payment_record RECORD;
BEGIN
  FOR payment_record IN 
    SELECT p.*, i.invoice_number, i.tenant_id as invoice_tenant_id
    FROM payments p
    JOIN invoices i ON p.invoice_id = i.id
    WHERE p.tenant_id IS NULL
  LOOP
    -- Update payment with tenant_id from invoice
    UPDATE payments
    SET tenant_id = payment_record.invoice_tenant_id
    WHERE id = payment_record.id
      AND tenant_id IS NULL;
  END LOOP;
END $$;

-- Verify migration results
SELECT 
  'Migration Summary' as summary,
  COUNT(*) FILTER (WHERE status = 'draft') as draft_invoices,
  COUNT(*) FILTER (WHERE status = 'issued') as issued_invoices,
  COUNT(*) as total_invoices,
  SUM(total_amount) as total_invoiced_amount
FROM invoices
WHERE vehicle_inward_id IS NOT NULL;
