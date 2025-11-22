# ZORAVO OMS - Developer & Technical Presentation Guide
## Complete Technical Overview for Developers, Super Admins, and Technical Stakeholders

---

## 🏗️ System Architecture Overview

### Technology Stack

#### **Frontend Framework**
- **Next.js 15.5.6** (React 18.2.0)
  - Server-Side Rendering (SSR)
  - Static Site Generation (SSG)
  - API Routes
  - File-based routing
  - Built-in optimization

#### **Backend & Database**
- **Supabase** (PostgreSQL)
  - Real-time database
  - Row Level Security (RLS)
  - Authentication & Authorization
  - Storage for file uploads
  - Edge Functions support

#### **UI/UX Libraries**
- **Tailwind CSS 3.3.5**: Utility-first CSS framework
- **Radix UI**: Accessible component primitives
  - Dialog, Dropdown, Select, Tabs, Toast
- **Lucide React**: Icon library
- **Recharts 2.8.0**: Data visualization and charts

#### **Form Management**
- **React Hook Form 7.48.2**: Performant form handling
- **Zod 3.22.4**: Schema validation
- **@hookform/resolvers**: Form validation integration

#### **PDF Generation**
- **PDFKit 0.17.2**: Server-side PDF generation
  - Job sheets
  - Invoices
  - Daily reports

#### **Email Service**
- **Resend 6.4.2**: Transactional email service
  - Welcome emails
  - Daily reports
  - Notifications

#### **WhatsApp Integration**
- **MessageAutoSender API**: WhatsApp messaging
  - Customer notifications
  - Daily reports
  - Status updates

#### **Data Processing**
- **PapaParse 5.4.1**: CSV import/export
- **TypeScript 5.2.2**: Type safety

#### **Deployment & Hosting**
- **Vercel**: Production hosting
  - Automatic deployments
  - Edge network
  - Cron jobs support
  - Environment variables management

---

## 🗄️ Database Architecture

### Multi-Tenant Architecture

#### **Core Concept**
- **Tenant Isolation**: Each customer (tenant) has completely isolated data
- **Row Level Security (RLS)**: Database-level security policies
- **Tenant ID**: Every table includes `tenant_id` for data segregation

#### **Key Tables**

##### **1. Tenants Table**
```sql
- id (UUID, Primary Key)
- name (VARCHAR)
- code (VARCHAR, Unique)
- is_active (BOOLEAN)
- subscription_status (VARCHAR)
- created_at, updated_at
```

##### **2. Tenant Users (Multi-tenancy)**
```sql
- Links users to tenants
- Supports user access to multiple tenants
- Role-based access per tenant
```

##### **3. Profiles (User Management)**
```sql
- id (UUID, references auth.users)
- email, name, role
- tenant_id (for multi-tenant support)
- phone, avatar_url
- created_at, updated_at
```

##### **4. Vehicle Inward**
```sql
- Complete vehicle registration
- Customer information
- Service requirements
- Status tracking
- tenant_id for isolation
```

##### **5. Service Trackers**
```sql
- Service entries
- Installer assignments
- Progress tracking
- Priority levels
- tenant_id for isolation
```

##### **6. Work Orders**
```sql
- Work order management
- Vehicle-service linking
- Status updates
- tenant_id for isolation
```

##### **7. Invoices & Payments**
```sql
- Automated invoice generation
- Payment tracking
- Financial records
- tenant_id for isolation
```

##### **8. System Settings**
```sql
- Platform-wide settings (tenant_id = NULL)
- Tenant-specific settings (tenant_id = UUID)
- Key-value storage
- Setting groups (email, whatsapp, platform, etc.)
```

##### **9. Notification Preferences**
```sql
- User notification settings
- Email preferences
- WhatsApp preferences
- Phone numbers
- tenant_id for isolation
```

---

## 🔐 Security Implementation

### Authentication & Authorization

#### **Authentication Flow**
1. **Supabase Auth**: Email/password authentication
2. **Session Management**: Server-side session handling
3. **JWT Tokens**: Secure token-based authentication
4. **Middleware Protection**: Route-level authentication

#### **Row Level Security (RLS) Policies**
```sql
-- Example: Users can only see their tenant's data
CREATE POLICY "tenant_isolation" ON vehicles
  FOR ALL USING (
    tenant_id IN (
      SELECT tenant_id FROM tenant_users 
      WHERE user_id = auth.uid()
    )
  );
```

#### **Role-Based Access Control (RBAC)**
- **Super Admin**: Platform-wide access
- **Tenant Admin**: Full tenant access
- **Manager**: Operations oversight
- **Coordinator**: Service coordination
- **Installer**: Work order access
- **Accountant**: Financial data access

#### **API Security**
- **Server-Side Validation**: All API routes validate requests
- **Tenant Context**: Automatic tenant isolation
- **Rate Limiting**: Protection against abuse
- **CORS Configuration**: Secure cross-origin requests

---

## 🔄 System Workflows & Data Flow

### 1. Vehicle Intake Workflow

```
User Input → Frontend Validation → API Route
  ↓
Supabase Insert (with tenant_id)
  ↓
RLS Policy Check
  ↓
Database Insert
  ↓
Real-time Subscription Update
  ↓
Frontend UI Update
```

**Technical Details:**
- **Client Component**: `VehicleInwardPageClient.tsx`
- **API Route**: `/api/vehicles/inward`
- **Database**: `vehicle_inward` table
- **Real-time**: Supabase real-time subscriptions

### 2. Service Tracking Workflow

```
Service Creation → Assignment → Status Updates
  ↓
Service Tracker Entry
  ↓
Work Order Generation
  ↓
Installer Notification (Email/WhatsApp)
  ↓
Progress Updates
  ↓
Completion & Invoice Generation
```

**Technical Details:**
- **Service Tracker**: `ServiceTrackerPageClient.tsx`
- **Work Orders**: Linked to vehicles and services
- **Notifications**: Automated via email/WhatsApp service
- **Status Machine**: Enforced status transitions

### 3. Invoice Generation Workflow

```
Service Completion → Invoice Trigger
  ↓
PDF Generation (PDFKit)
  ↓
Database Record Creation
  ↓
Email/WhatsApp Notification
  ↓
Payment Tracking
```

**Technical Details:**
- **PDF Service**: `lib/pdf-service.ts`
- **Invoice API**: `/api/invoices/generate`
- **Payment Tracking**: Real-time updates
- **Notifications**: Resend API integration

### 4. Daily Report Automation

```
Cron Job (7:30 PM IST) → API Trigger
  ↓
Fetch All Active Tenants
  ↓
For Each Tenant:
  - Fetch Managers/Coordinators
  - Query Vehicles (Tomorrow + Pending)
  - Generate PDF Report
  - Send via Email (Resend)
  - Send via WhatsApp (if configured)
```

**Technical Details:**
- **Cron Job**: Vercel cron (`vercel.json`)
- **API Route**: `/api/reports/daily-vehicle-report`
- **PDF Generation**: PDFKit with tenant branding
- **Dual Delivery**: Email + WhatsApp simultaneously
- **Multi-tenant**: Processes all tenants automatically

---

## 🛠️ Key Technical Features

### 1. Multi-Tenancy Implementation

#### **Tenant Detection**
- **Subdomain-based**: `tenant-code.yourdomain.com`
- **Workspace Detection**: Automatic tenant identification
- **Fallback**: Default tenant or manual selection

#### **Data Isolation**
- **RLS Policies**: Database-level isolation
- **Application-Level**: Tenant context in all queries
- **Middleware**: Automatic tenant injection

#### **Tenant Configuration**
- **System Settings**: Tenant-specific configurations
- **WhatsApp Config**: Per-tenant WhatsApp API settings
- **Email Settings**: Tenant-specific email preferences

### 2. Real-Time Updates

#### **Supabase Real-Time**
```typescript
const subscription = supabase
  .channel('vehicles')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'vehicle_inward',
    filter: `tenant_id=eq.${tenantId}`
  }, (payload) => {
    // Update UI in real-time
  })
  .subscribe()
```

**Use Cases:**
- Vehicle status updates
- New vehicle intakes
- Payment updates
- Work order assignments

### 3. File Upload & Storage

#### **Supabase Storage**
- **Buckets**: Organized file storage
- **Payment Proofs**: Secure payment document storage
- **Attachments**: Service-related file attachments
- **Access Control**: RLS policies for file access

### 4. PDF Generation

#### **PDFKit Implementation**
```typescript
// Job Sheet Generation
const doc = new PDFDocument()
doc.text('Job Sheet', { align: 'center' })
// Add vehicle details, customer info, etc.
```

**Generated Documents:**
- Job sheets
- Invoices
- Daily reports
- Financial reports

### 5. Email Service Integration

#### **Resend API**
```typescript
await resend.emails.send({
  from: 'social@sunkool.in',
  to: recipient,
  subject: 'Daily Report',
  html: emailHTML,
  attachments: [pdfBuffer]
})
```

**Email Types:**
- Welcome emails (tenant registration)
- Daily vehicle reports
- Status update notifications
- Payment reminders

### 6. WhatsApp Integration

#### **MessageAutoSender API**
- **Multi-tenant Support**: Per-tenant API configuration
- **Global Fallback**: Default config if tenant-specific not found
- **Phone Number Formatting**: Auto-format Indian numbers (+91)
- **PDF Attachments**: Send reports via WhatsApp

### 7. Automated Cron Jobs

#### **Vercel Cron Configuration**
```json
{
  "crons": [
    {
      "path": "/api/reports/daily-vehicle-report",
      "schedule": "0 14 * * *"  // 7:30 PM IST
    },
    {
      "path": "/api/cron/check-subscription-expiry",
      "schedule": "0 0 * * *"  // Daily at midnight
    }
  ]
}
```

**Automated Tasks:**
- Daily vehicle reports (7:30 PM IST)
- Subscription expiry checks (midnight)
- Payment reminders
- Status update notifications

---

## 📱 Frontend Architecture

### Component Structure

#### **Page Components**
```
app/
  (dashboard)/
    dashboard/        # Main dashboard
    vehicles/         # Vehicle management
    inward/           # Vehicle intake
    trackers/         # Service tracking
    accounts/         # Financial management
    settings/         # Tenant settings
    admin/            # Super admin panel
      tenants/        # Tenant management
      settings/       # Platform settings
```

#### **Reusable Components**
```
components/
  sidebar.tsx         # Navigation sidebar
  topbar.tsx          # Top navigation
  ui/                 # Radix UI components
  SubscriptionGuard.tsx  # Subscription protection
  UserManagementModal.tsx
  VehicleDetailsModal.tsx
```

### State Management

#### **React Hooks**
- `useState`: Component-level state
- `useEffect`: Side effects and data fetching
- `useRouter`: Next.js navigation
- `usePathname`: Current route detection

#### **Supabase Client**
- **Server Client**: Server-side data fetching
- **Client Component**: Client-side real-time subscriptions
- **Admin Client**: Super admin operations

### Routing & Navigation

#### **Next.js App Router**
- **Route Groups**: `(dashboard)`, `(auth)`
- **Dynamic Routes**: `/vehicles/[id]`
- **Middleware**: Authentication and tenant detection
- **Layouts**: Shared layouts for route groups

---

## 🔧 API Architecture

### API Routes Structure

```
app/api/
  vehicles/
    inward/route.ts        # Vehicle intake
  services/
    tracker/route.ts       # Service tracking
  invoices/
    generate/route.ts      # Invoice generation
  reports/
    daily-vehicle-report/  # Daily reports
  cron/
    check-subscription-expiry/  # Subscription checks
  whatsapp/
    send/route.ts          # WhatsApp messaging
  admin/
    tenants/route.ts       # Tenant management
    settings/route.ts      # Platform settings
```

### API Design Patterns

#### **RESTful Design**
- **GET**: Fetch data
- **POST**: Create resources
- **PUT/PATCH**: Update resources
- **DELETE**: Remove resources

#### **Error Handling**
```typescript
try {
  // Operation
  return NextResponse.json({ success: true, data })
} catch (error) {
  return NextResponse.json(
    { error: error.message },
    { status: 500 }
  )
}
```

#### **Authentication Middleware**
```typescript
const user = await getUser()
if (!user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

---

## 🧪 Testing & Quality Assurance

### Testing Framework
- **Vitest**: Unit and integration testing
- **Test Files**: `__tests__/` directory
- **Middleware Tests**: Authentication and RBAC testing

### Code Quality
- **TypeScript**: Full type safety
- **ESLint**: Code linting
- **Next.js Lint**: Framework-specific rules

---

## 📊 Performance Optimization

### Frontend Optimizations
- **Code Splitting**: Automatic route-based splitting
- **Image Optimization**: Next.js Image component
- **Lazy Loading**: Dynamic imports
- **Memoization**: React.memo, useMemo, useCallback

### Database Optimizations
- **Indexes**: Strategic database indexes
- **Query Optimization**: Efficient Supabase queries
- **Pagination**: Large dataset handling
- **Caching**: Strategic data caching

### API Optimizations
- **Server-Side Rendering**: Faster initial loads
- **Edge Functions**: Geographic distribution
- **Response Compression**: Reduced payload sizes

---

## 🔄 Deployment & DevOps

### Deployment Pipeline

#### **Vercel Deployment**
1. **Git Integration**: Automatic deployments on push
2. **Environment Variables**: Secure configuration
3. **Build Process**: Next.js optimized builds
4. **Edge Network**: Global CDN distribution

#### **Database Migrations**
- **SQL Scripts**: Version-controlled migrations
- **Supabase SQL Editor**: Direct execution
- **Schema Management**: `database/` directory

### Environment Configuration

#### **Required Variables**
```env
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY
RESEND_API_KEY
RESEND_FROM_EMAIL
CRON_SECRET (optional)
```

### Monitoring & Logging
- **Vercel Analytics**: Performance monitoring
- **Error Tracking**: Built-in error logging
- **Console Logging**: Strategic debug logs

---

## 🎯 Super Admin Features

### Platform Management

#### **Tenant Management**
- **Create Tenants**: Onboard new customers
- **View All Tenants**: Complete tenant list
- **Tenant Details**: Expandable tenant information
- **Subscription Management**: Track subscriptions
- **Payment Proofs**: Review and approve payments

#### **Platform Settings**
- **General Settings**: Platform name, support email
- **Subscription Settings**: Trial days, currency, plans
- **Email Settings**: Email provider, API keys, configuration

#### **User Management**
- **View All Users**: Cross-tenant user management
- **Role Assignment**: Manage user roles
- **Access Control**: Super admin access

### Analytics & Reporting
- **Platform Analytics**: Overall system metrics
- **Tenant Analytics**: Per-tenant statistics
- **Usage Reports**: System usage tracking

---

## 🔐 Security Best Practices

### Implemented Security Measures

1. **Row Level Security (RLS)**
   - Database-level data isolation
   - Tenant-specific data access
   - User role-based restrictions

2. **Authentication**
   - Secure password hashing (Supabase)
   - Session management
   - JWT token validation

3. **API Security**
   - Server-side validation
   - Tenant context verification
   - Rate limiting

4. **Data Protection**
   - Encrypted connections (HTTPS)
   - Secure environment variables
   - No sensitive data in client code

5. **File Security**
   - Secure file uploads
   - Access-controlled storage
   - Payment proof protection

---

## 📈 Scalability Considerations

### Current Architecture Supports
- **Unlimited Tenants**: Multi-tenant architecture
- **Unlimited Users**: Per tenant
- **Unlimited Data**: Scalable database
- **High Traffic**: Vercel edge network

### Future Scalability Options
- **Database Sharding**: If needed
- **Caching Layer**: Redis integration
- **CDN**: Already via Vercel
- **Load Balancing**: Automatic with Vercel

---

## 🛠️ Development Workflow

### Local Development
```bash
npm install          # Install dependencies
npm run dev          # Start development server
npm run build        # Production build
npm run lint         # Code linting
npm test             # Run tests
```

### Code Organization
- **Modular Structure**: Feature-based organization
- **Reusable Components**: Shared UI components
- **Service Layer**: Business logic separation
- **Type Safety**: Full TypeScript coverage

---

## 📚 Key Libraries & Tools

### Core Dependencies
- **Next.js**: React framework
- **Supabase**: Backend as a service
- **TypeScript**: Type safety
- **Tailwind CSS**: Styling
- **Radix UI**: Component primitives

### Development Tools
- **ESLint**: Code linting
- **Vitest**: Testing framework
- **Git**: Version control

### Production Tools
- **Vercel**: Hosting and deployment
- **Resend**: Email service
- **MessageAutoSender**: WhatsApp API
- **PDFKit**: PDF generation

---

## 🎯 Technical Highlights

### What Makes This System Robust?

1. **Multi-Tenancy**: True SaaS architecture
2. **Real-Time Updates**: Live data synchronization
3. **Automation**: Cron jobs and notifications
4. **Security**: RLS, RBAC, encryption
5. **Scalability**: Cloud-native architecture
6. **Type Safety**: Full TypeScript coverage
7. **Modern Stack**: Latest technologies
8. **Performance**: Optimized for speed

### Developer Experience
- **Clear Code Structure**: Easy to navigate
- **Type Safety**: Catch errors early
- **Documentation**: Comprehensive docs
- **Modular Design**: Easy to extend
- **Best Practices**: Industry standards

---

## 📋 Technical Specifications

### System Requirements
- **Node.js**: >=18.0.0
- **npm**: >=9.0.0
- **Database**: PostgreSQL (via Supabase)
- **Storage**: Supabase Storage

### Browser Support
- **Modern Browsers**: Chrome, Firefox, Safari, Edge
- **Mobile Responsive**: iOS and Android
- **Progressive Web App**: PWA capabilities

---

## 🚀 Future Enhancements

### Planned Features
- **Mobile App**: React Native application
- **Advanced Analytics**: More detailed reports
- **API Access**: RESTful API for integrations
- **Webhooks**: Event-driven integrations
- **Multi-language**: Internationalization

---

## 📞 Technical Support

### For Developers
- **Documentation**: Comprehensive technical docs
- **Code Comments**: Inline documentation
- **Git Repository**: Version-controlled codebase
- **Issue Tracking**: Bug reporting system

### For Super Admins
- **Admin Dashboard**: Complete platform management
- **Analytics**: System-wide insights
- **Configuration**: Platform settings management

---

*This document is designed for technical presentations to developers, super admins, and technical stakeholders. Use this content to create detailed technical PowerPoint presentations showcasing ZORAVO OMS architecture, implementation, and technical capabilities.*

