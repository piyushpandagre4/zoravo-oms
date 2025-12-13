# Security Checklist - Zoravo OMS

## ✅ Completed Security Measures

### Tenant Isolation
- [x] All vehicle_inward queries filtered by tenant_id
- [x] All profiles queries filtered via tenant_users relationship
- [x] All customer queries filtered by tenant_id
- [x] All service_tracker queries filtered by tenant_id
- [x] All accounts queries filtered by tenant_id
- [x] Installer dashboard filtered by tenant_id + assigned_installer_id
- [x] Manager fetching with double-verification against tenant_users

### API Security
- [x] User creation validates email uniqueness
- [x] User creation prevents cross-tenant linking
- [x] User deletion removes tenant_users links first
- [x] Profile update validates tenant access
- [x] All API routes use admin client with proper validation
- [x] Export routes include tenant filtering

### Frontend Security
- [x] Tenant context verified from database (not just sessionStorage)
- [x] All fetch functions include tenant filtering
- [x] Super admin checks before bypassing filters
- [x] Proper error handling for unauthorized access

### Database Security
- [x] RLS policies enabled on tenant-scoped tables
- [x] Tenant_id indexes for performance
- [x] Foreign key constraints with CASCADE
- [x] Unique constraints on critical fields

## 🔒 Security Best Practices

### When Adding New Features

1. **Always include tenant_id in queries:**
   ```typescript
   const tenantId = getCurrentTenantId()
   const isSuper = isSuperAdmin()
   
   let query = supabase.from('table_name').select('*')
   if (!isSuper && tenantId) {
     query = query.eq('tenant_id', tenantId)
   }
   ```

2. **Validate tenant access in API routes:**
   ```typescript
   // Verify user belongs to the tenant they're accessing
   const { data: tenantUser } = await supabase
     .from('tenant_users')
     .select('tenant_id')
     .eq('user_id', userId)
     .eq('tenant_id', tenantId)
     .single()
   
   if (!tenantUser) {
     return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
   }
   ```

3. **Use tenant_users for user queries:**
   ```typescript
   // Get users for tenant via tenant_users, not direct profile query
   const { data: tenantUsers } = await supabase
     .from('tenant_users')
     .select('user_id')
     .eq('tenant_id', tenantId)
     .eq('role', 'manager')
   
   const userIds = tenantUsers.map(tu => tu.user_id)
   const { data: profiles } = await supabase
     .from('profiles')
     .select('*')
     .in('id', userIds)
   ```

4. **Verify tenant_id from database:**
   ```typescript
   // Always verify tenant_id from database, not just sessionStorage
   const tenantId = await getTenantIdForCurrentUser()
   ```

## 🚨 Security Red Flags to Watch For

1. ❌ Queries without tenant_id filter (except super admin)
2. ❌ Direct profile queries without tenant_users join
3. ❌ API routes without tenant validation
4. ❌ User creation without email uniqueness check
5. ❌ Profile updates without tenant access validation
6. ❌ Missing RLS policies on new tables

## 📊 Performance Optimizations

1. ✅ Tenant_id indexes on all tenant-scoped tables
2. ✅ Efficient queries with proper filtering
3. ✅ Limited result sets with pagination
4. ✅ Cached tenant context (with database verification)
5. ✅ Optimized joins with tenant filtering

## 🔍 Regular Security Checks

### Weekly
- [ ] Review new API routes for tenant filtering
- [ ] Check for any queries without tenant_id
- [ ] Verify RLS policies are active

### Monthly
- [ ] Full security audit of all API routes
- [ ] Review database access patterns
- [ ] Check for any data leakage incidents
- [ ] Performance review and optimization

### Quarterly
- [ ] Complete security penetration testing
- [ ] Review and update RLS policies
- [ ] Audit user access patterns
- [ ] Review and update security documentation

