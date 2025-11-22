# Setup Payment Proofs Storage Bucket

## Problem
If you're getting "Failed to upload file" error when submitting payment proof, the Supabase Storage bucket `payment-proofs` likely doesn't exist.

## Solution

### Step 1: Create Storage Bucket in Supabase

1. Go to your **Supabase Dashboard**
2. Navigate to **Storage** (left sidebar)
3. Click **"New bucket"** or **"Create bucket"**
4. Configure the bucket:
   - **Name**: `payment-proofs` (exact name, lowercase with hyphen)
   - **Public bucket**: ✅ **Enable** (or configure RLS policies if you prefer private)
   - **File size limit**: Set appropriate limit (e.g., 10 MB)
   - **Allowed MIME types**: Leave empty for all types, or specify: `image/*,application/pdf`

### Step 2: Configure Storage Policies (if bucket is private)

If you set the bucket as **private**, you need to add RLS policies:

```sql
-- Allow authenticated users to upload files
CREATE POLICY "Allow authenticated uploads to payment-proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM tenant_users WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Allow users to read their own files
CREATE POLICY "Allow users to read their payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  (storage.foldername(name))[1] IN (
    SELECT tenant_id::text FROM tenant_users WHERE user_id = auth.uid()
  )
);

-- Allow super admins to read all files
CREATE POLICY "Allow super admins to read all payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  is_super_admin()
);
```

### Step 3: Verify Bucket Creation

After creating the bucket, verify it exists:
- Go to Storage → You should see `payment-proofs` in the list
- Try uploading a test file manually to ensure permissions work

### Step 4: Test Payment Proof Upload

1. Login as a tenant admin
2. Go to Settings → Payment tab
3. Try submitting a payment proof
4. The upload should now work!

## Troubleshooting

### Error: "Storage bucket not configured"
- **Solution**: Create the `payment-proofs` bucket in Supabase Dashboard → Storage

### Error: "Storage permission denied"
- **Solution**: Check bucket policies. If private, add the RLS policies above. If public, ensure the bucket is set to public.

### Error: "Bucket not found"
- **Solution**: Verify the bucket name is exactly `payment-proofs` (lowercase, with hyphen)

## Notes

- The bucket stores files in the format: `payment-proofs/{tenant_id}/{timestamp}.{extension}`
- Each tenant's files are stored in their own folder for organization
- Files are uploaded using the admin Supabase client, which bypasses RLS for uploads

