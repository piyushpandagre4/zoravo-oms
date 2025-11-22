# Database Audit - Zoravo OMS

## Current Tables in Supabase

### ✅ Core Tables (Correct)
1. **customers** - Correct structure
2. **vehicles** - Correct structure  
3. **work_orders** - Correct structure
4. **invoices** - Correct structure
5. **payments** - Correct structure
6. **profiles** - User profiles

### ⚠️ Tables with Issues
1. **vehicle_inward** - Missing several columns (see fix_vehicle_inward_complete.sql)
2. **service_tracker** - Should be `service_trackers` (plural)
3. **vehicle_inwards** - Duplicate of `vehicle_inward` - should be removed

### ❓ Additional Tables (Need Verification)
1. **audit_logs** - Not in schema.sql
2. **expenses** - Not in schema.sql
3. **call_followups** - Not in schema.sql, should be `follow_ups`
4. **customer_requirements** - Should be `requirements`

### 📊 Views (Dashboard KPIs)
1. **v_vehicles_in_workshop**
2. **v_jobs_in_progress**
3. **v_todays_intakes**
4. **v_unpaid_invoices**
5. **v_overdue_invoices**
6. **v_revenue_monthly**
7. **v_inward_30d**

## Required Schema from schema.sql

The following tables should exist based on `database/schema.sql`:

### Core Entity Tables
- ✅ customers
- ✅ vehicles
- ✅ vehicle_inward (incomplete - need to fix)
- ✅ work_orders
- ✅ invoices
- ✅ payments

### Service & Tracking Tables
- ⚠️ service_trackers (exists as singular `service_tracker`)
- ⚠️ follow_ups (exists as `call_followups`)
- ⚠️ requirements (exists as `customer_requirements`)

## Fixes Required

### Priority 1: Fix vehicle_inward table
**File**: `database/fix_vehicle_inward_complete.sql`
**Action**: Run this SQL in Supabase to add missing columns

### Priority 2: Handle naming inconsistencies
1. **service_tracker** vs **service_trackers**
   - Either rename table or update code to use correct name
   
2. **vehicle_inwards** vs **vehicle_inward**
   - Delete `vehicle_inwards` table if it's a duplicate
   - Use singular `vehicle_inward`

3. **call_followups** vs **follow_ups**
   - Either rename or update code references
   
4. **customer_requirements** vs **requirements**
   - Either rename or update code references

### Priority 3: Verify additional tables
Check if these serve a purpose or should be removed:
- **audit_logs** - If not used, consider removing
- **expenses** - If not used, consider removing

## Recommended Actions

1. **Run** `database/fix_vehicle_inward_complete.sql` in Supabase SQL Editor
2. **Check** if `vehicle_inwards` (plural) has data - if not, delete it
3. **Verify** service_tracker vs service_trackers naming
4. **Update** code references to match actual table names OR rename tables to match schema

## Tables Not in Schema but Present in DB

These tables exist in your Supabase but are NOT in the official schema.sql:
- audit_logs
- expenses
- call_followups (should be follow_ups)
- customer_requirements (should be requirements)
- service_tracker (should be service_trackers)

**Decision needed**: Either add these to schema.sql or remove them if not used.

