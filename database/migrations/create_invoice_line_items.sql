-- Create invoice_line_items table to store individual products/services on invoices
-- This allows proper invoice structure with line-by-line itemization

CREATE TABLE IF NOT EXISTS invoice_line_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
    product_name VARCHAR(255) NOT NULL,
    brand VARCHAR(100),
    department VARCHAR(100),
    quantity DECIMAL(10,2) DEFAULT 1,
    unit_price DECIMAL(10,2) NOT NULL,
    line_total DECIMAL(10,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_tenant_id ON invoice_line_items(tenant_id);

-- Create trigger to update updated_at
CREATE TRIGGER update_invoice_line_items_updated_at 
BEFORE UPDATE ON invoice_line_items 
FOR EACH ROW 
EXECUTE FUNCTION update_updated_at_column();

-- Add RLS policies (if RLS is enabled)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'invoice_line_items') THEN
        -- RLS already configured
        NULL;
    ELSE
        -- Enable RLS
        ALTER TABLE invoice_line_items ENABLE ROW LEVEL SECURITY;

        -- Policy: Users can view invoice line items for invoices in their tenant
        CREATE POLICY "Users can view invoice line items in their tenant"
        ON invoice_line_items FOR SELECT
        USING (
            tenant_id IN (
                SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
            )
            OR EXISTS (
                SELECT 1 FROM super_admins WHERE user_id = auth.uid()
            )
        );

        -- Policy: Accountants and above can manage invoice line items
        CREATE POLICY "Accountants can manage invoice line items"
        ON invoice_line_items FOR ALL
        USING (
            EXISTS (
                SELECT 1 FROM profiles 
                WHERE id = auth.uid() 
                AND role IN ('admin', 'manager', 'accountant')
            )
            AND (
                tenant_id IN (
                    SELECT tenant_id FROM tenant_users WHERE user_id = auth.uid()
                )
                OR EXISTS (
                    SELECT 1 FROM super_admins WHERE user_id = auth.uid()
                )
            )
        );
    END IF;
END $$;
