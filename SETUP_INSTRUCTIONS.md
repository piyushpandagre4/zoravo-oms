# Accounts & Billing Module - Setup Instructions

## ✅ Code Implementation Complete

All code has been implemented. The errors you're seeing are because the database tables/views need to be created first.

## 🔧 Required Steps

### Step 1: Run Database Migrations (In Order)

Execute these SQL files in your Supabase SQL Editor in this exact order:

1. **`database/migrations/enhance_invoices_table.sql`**
   - Adds invoice lifecycle fields to invoices table
   - Makes invoice_number nullable for drafts

2. **`database/migrations/create_invoice_line_items.sql`**
   - Creates invoice_line_items table
   - Sets up RLS policies

3. **`database/migrations/enhance_payments_table.sql`**
   - Adds payment_mode, reference_number, paid_by, created_by to payments table

4. **`database/migrations/create_invoice_functions.sql`**
   - Creates functions: calculate_invoice_balance, update_invoice_status, mark_overdue_invoices, generate_invoice_number
   - Creates trigger for auto-updating invoice status

5. **`database/migrations/create_accounts_views.sql`**
   - Creates views: v_invoice_summary, v_outstanding_invoices, v_monthly_revenue, v_payment_methods_summary, v_customer_payment_history

6. **`database/migrations/migrate_existing_accounts_data.sql`** (Optional but Recommended)
   - Converts existing completed vehicle_inward entries to invoices
   - Creates invoice_line_items from accessories_requested JSON

### Step 2: Verify Tables Exist

After running migrations, verify these tables exist:
- ✅ `invoices` (with new columns: vehicle_inward_id, invoice_date, status, paid_amount, balance_amount, etc.)
- ✅ `invoice_line_items`
- ✅ `payments` (with payment_mode, reference_number, etc.)
- ✅ Views: `v_invoice_summary`, `v_outstanding_invoices`, `v_monthly_revenue`, etc.

### Step 3: Test the Application

1. Refresh the Accounts page
2. The summary cards should show (may be 0 if no invoices exist yet)
3. Click on invoice status tabs (Drafts, Issued, etc.)
4. Try creating an invoice from a completed job

## 🐛 Troubleshooting

### If you still see 400/500 errors:

1. **Check if tables exist:**
   ```sql
   SELECT table_name FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name IN ('invoices', 'invoice_line_items', 'payments');
   ```

2. **Check if views exist:**
   ```sql
   SELECT table_name FROM information_schema.views 
   WHERE table_schema = 'public' 
   AND table_name LIKE 'v_%';
   ```

3. **Check if functions exist:**
   ```sql
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_schema = 'public' 
   AND routine_name IN ('calculate_invoice_balance', 'update_invoice_status', 'mark_overdue_invoices');
   ```

4. **Verify RLS policies:**
   - Make sure RLS is enabled on invoice_line_items
   - Check that policies allow authenticated users to read/write

### Common Issues:

- **"relation does not exist"**: Run the migration SQL files
- **"column does not exist"**: The enhance_invoices_table.sql migration may not have run
- **"permission denied"**: Check RLS policies on invoice_line_items table
- **Cookies error**: Already fixed in code - should not appear after refresh

## 📝 Next Steps After Migrations

1. Create your first invoice:
   - Go to `/accounts/invoices/create`
   - Select a completed job
   - Review products
   - Save as draft or issue immediately

2. Test payment recording:
   - Open an issued invoice
   - Click "Record Payment"
   - Enter payment details

3. Verify notifications:
   - Issue an invoice → Should send WhatsApp notification
   - Record payment → Should send confirmation
   - Mark overdue → Should send reminder

## 🎯 Features Now Available

- ✅ Invoice lifecycle (Draft → Issued → Partial → Paid)
- ✅ Multiple payments per invoice
- ✅ Automatic status updates
- ✅ Overdue detection (cron job configured)
- ✅ Financial summary cards
- ✅ Status-based invoice tabs
- ✅ Payment method tracking
- ✅ WhatsApp notifications for invoice events
