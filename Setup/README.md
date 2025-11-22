# ZORAVO OMS - Car Accessories Management System

> **Complete Order Management System for Car Accessories Installation Businesses**

[![Next.js](https://img.shields.io/badge/Next.js-15.5.6-black)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.2.2-blue)](https://www.typescriptlang.org/)
[![Supabase](https://img.shields.io/badge/Supabase-Backend-green)](https://supabase.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployed-black)](https://vercel.com/)

## Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
# Required - Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Optional - Email Service (Resend)
RESEND_API_KEY=your_resend_api_key
RESEND_FROM_EMAIL=social@sunkool.in
```

**Important**: 
- `NEXT_PUBLIC_*` variables are exposed to the browser
- `SUPABASE_SERVICE_ROLE_KEY` is server-only and must be kept secret
- See `env.example` for reference
- For Vercel deployment, add these in Project Settings → Environment Variables

## Supabase Database Schema

Run the following SQL commands in your Supabase SQL editor to set up the database schema:

### 1. Enable Row Level Security (RLS)

```sql
-- Enable RLS on auth.users
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;
```

### 2. Create Profiles Table

```sql
-- Create profiles table
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'manager', 'coordinator', 'installer', 'accountant')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create policies for profiles
CREATE POLICY "Users can view their own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can insert profiles" ON profiles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
```

### 3. Create Vehicles Table

```sql
-- Create vehicles table
CREATE TABLE vehicles (
  id SERIAL PRIMARY KEY,
  registration_number TEXT UNIQUE NOT NULL,
  make TEXT NOT NULL,
  model TEXT NOT NULL,
  year INTEGER NOT NULL,
  color TEXT NOT NULL,
  engine_number TEXT NOT NULL,
  chassis_number TEXT NOT NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  customer_address TEXT NOT NULL,
  service_type TEXT NOT NULL CHECK (service_type IN ('installation', 'repair', 'maintenance', 'inspection')),
  accessories TEXT NOT NULL,
  estimated_cost DECIMAL(10,2) NOT NULL,
  estimated_duration TEXT NOT NULL,
  special_instructions TEXT,
  status TEXT NOT NULL DEFAULT 'inward' CHECK (status IN ('inward', 'in_progress', 'completed', 'delivered')),
  assigned_to TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on vehicles
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Create policies for vehicles
CREATE POLICY "Authenticated users can view vehicles" ON vehicles
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Coordinators and above can insert vehicles" ON vehicles
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'coordinator')
    )
  );

CREATE POLICY "Coordinators and above can update vehicles" ON vehicles
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'coordinator')
    )
  );
```

### 4. Create Call Followups Table

```sql
-- Create call_followups table
CREATE TABLE call_followups (
  id SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  vehicle_registration TEXT,
  followup_date DATE NOT NULL,
  followup_time TIME NOT NULL,
  purpose TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on call_followups
ALTER TABLE call_followups ENABLE ROW LEVEL SECURITY;

-- Create policies for call_followups
CREATE POLICY "Authenticated users can view call followups" ON call_followups
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Coordinators and above can manage call followups" ON call_followups
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'coordinator')
    )
  );
```

### 5. Create Service Trackers Table

```sql
-- Create service_trackers table
CREATE TABLE service_trackers (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
  service_type TEXT NOT NULL,
  start_date DATE NOT NULL,
  estimated_completion DATE NOT NULL,
  actual_completion DATE,
  current_status TEXT NOT NULL DEFAULT 'in_progress' CHECK (current_status IN ('in_progress', 'completed', 'delivered')),
  progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  assigned_to TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on service_trackers
ALTER TABLE service_trackers ENABLE ROW LEVEL SECURITY;

-- Create policies for service_trackers
CREATE POLICY "Authenticated users can view service trackers" ON service_trackers
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Installers and above can manage service trackers" ON service_trackers
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'installer')
    )
  );
```

### 6. Create Customer Requirements Table

```sql
-- Create customer_requirements table
CREATE TABLE customer_requirements (
  id SERIAL PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  requirement TEXT NOT NULL,
  budget DECIMAL(10,2),
  timeline TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on customer_requirements
ALTER TABLE customer_requirements ENABLE ROW LEVEL SECURITY;

-- Create policies for customer_requirements
CREATE POLICY "Authenticated users can view customer requirements" ON customer_requirements
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Coordinators and above can manage customer requirements" ON customer_requirements
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'coordinator')
    )
  );
```

### 7. Create Invoices Table

```sql
-- Create invoices table
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  invoice_number TEXT UNIQUE NOT NULL,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_email TEXT,
  service_type TEXT NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue', 'cancelled')),
  due_date DATE NOT NULL,
  payment_date DATE,
  payment_method TEXT,
  notes TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on invoices
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;

-- Create policies for invoices
CREATE POLICY "Authenticated users can view invoices" ON invoices
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Accountants and above can manage invoices" ON invoices
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() AND role IN ('admin', 'manager', 'accountant')
    )
  );
```

### 8. Create Functions and Triggers

```sql
-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vehicles_updated_at BEFORE UPDATE ON vehicles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_call_followups_updated_at BEFORE UPDATE ON call_followups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_service_trackers_updated_at BEFORE UPDATE ON service_trackers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_requirements_updated_at BEFORE UPDATE ON customer_requirements
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

### 9. Insert Sample Data

```sql
-- Insert sample profiles (you'll need to replace UUIDs with actual user IDs from auth.users)
INSERT INTO profiles (id, email, name, role) VALUES
  ('00000000-0000-0000-0000-000000000001', 'admin@zoravo.com', 'Admin User', 'admin'),
  ('00000000-0000-0000-0000-000000000002', 'manager@zoravo.com', 'Manager User', 'manager'),
  ('00000000-0000-0000-0000-000000000003', 'coordinator@zoravo.com', 'Coordinator User', 'coordinator'),
  ('00000000-0000-0000-0000-000000000004', 'installer@zoravo.com', 'Installer User', 'installer'),
  ('00000000-0000-0000-0000-000000000005', 'accountant@zoravo.com', 'Accountant User', 'accountant');

-- Insert sample vehicles
INSERT INTO vehicles (
  registration_number, make, model, year, color, engine_number, chassis_number,
  customer_name, customer_phone, customer_email, customer_address,
  service_type, accessories, estimated_cost, estimated_duration, special_instructions
) VALUES
  ('MH12AB1234', 'Toyota', 'Camry', 2020, 'White', 'ENG123456789', 'CHS123456789',
   'Rajesh Kumar', '+91 9876543210', 'rajesh.kumar@email.com', '123 Main Street, Mumbai',
   'installation', 'Premium Audio System Installation', 15000, '4 hours', 'Customer prefers morning service'),
  ('MH12CD5678', 'Honda', 'Civic', 2019, 'Black', 'ENG987654321', 'CHS987654321',
   'Priya Sharma', '+91 9876543211', 'priya.sharma@email.com', '456 Park Avenue, Mumbai',
   'repair', 'GPS Tracker Repair', 8000, '2 hours', 'Handle with care'),
  ('MH12EF9012', 'Maruti', 'Swift', 2021, 'Silver', 'ENG456789123', 'CHS456789123',
   'Amit Singh', '+91 9876543212', 'amit.singh@email.com', '789 Business District, Mumbai',
   'maintenance', 'Regular Maintenance', 5000, '3 hours', 'Complete service check');
```

## Setup Instructions

1. **Create Supabase Project**: Go to [supabase.com](https://supabase.com) and create a new project.

2. **Get API Keys**: Copy your project URL and anon key from the Supabase dashboard.

3. **Create Environment File**: Create `.env.local` file with your Supabase credentials.

4. **Run SQL Schema**: Execute the SQL commands above in your Supabase SQL editor.

5. **Create Auth Users**: Use Supabase Auth to create user accounts with the emails from the sample profiles.

6. **Install Dependencies**: Run `npm install` to install all required packages.

7. **Start Development Server**: Run `npm run dev` to start the development server.

## Demo Credentials

For testing purposes, you can create these user accounts in Supabase Auth:

- **Admin**: admin@zoravo.com / admin123
- **Manager**: manager@zoravo.com / manager123  
- **Coordinator**: coordinator@zoravo.com / coordinator123
- **Installer**: installer@zoravo.com / installer123
- **Accountant**: accountant@zoravo.com / accountant123

## Features Implemented

✅ **Authentication & Authorization**
- Supabase Auth integration
- Role-based access control (RBAC)
- Protected routes with middleware

✅ **Dashboard**
- KPI cards with key metrics
- Recent activities feed
- Upcoming tasks overview

✅ **Vehicle Management**
- Vehicle inward form with validation
- Vehicle records listing
- Vehicle details view
- Status tracking

✅ **Trackers**
- Call follow-up management
- Service progress tracking
- Customer requirements tracking

✅ **Accounts**
- Invoice management
- Financial reports with charts
- Payment tracking

✅ **Settings**
- Business configuration
- User management
- Notification settings
- System information

✅ **UI Components**
- Responsive design with Tailwind CSS
- shadcn/ui component library
- Role-aware navigation
- Modern, professional interface

## Deployment

### Quick Deploy to Vercel

The application is ready for deployment on Vercel. Follow these steps:

1. **Push your code to GitHub/GitLab/Bitbucket**
2. **Connect repository to Vercel**: Go to [vercel.com/new](https://vercel.com/new)
3. **Add environment variables** in Vercel Dashboard → Settings → Environment Variables:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `RESEND_API_KEY` (optional)
   - `RESEND_FROM_EMAIL` (optional)
4. **Deploy!** Vercel will automatically build and deploy your application

### Detailed Deployment Guide

For comprehensive deployment instructions, see:
- **[VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md)** - Complete step-by-step guide
- **[DEPLOYMENT_CHECKLIST.md](./DEPLOYMENT_CHECKLIST.md)** - Pre and post-deployment checklist

### Important Notes

- ✅ **Build Configuration**: Already optimized for Vercel
- ✅ **Image Domains**: Supabase storage domains configured in `next.config.js`
- ✅ **Environment Variables**: All required variables documented
- ✅ **TypeScript/ESLint**: Errors ignored during build (check logs for warnings)
- ✅ **Multi-tenant Support**: Works with Vercel subdomain patterns

### Post-Deployment

After deployment, ensure:
1. Supabase database schema is set up
2. Storage buckets are created and configured
3. First super admin user is created
4. Test authentication and core features
