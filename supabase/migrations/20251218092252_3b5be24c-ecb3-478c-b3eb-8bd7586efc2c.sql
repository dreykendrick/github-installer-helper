-- Create storage bucket for verification images
INSERT INTO storage.buckets (id, name, public)
VALUES ('verification-images', 'verification-images', false);

-- Allow authenticated users to upload their own verification image
CREATE POLICY "Users can upload own verification image"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'verification-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to view their own verification image
CREATE POLICY "Users can view own verification image"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own verification image
CREATE POLICY "Users can update own verification image"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'verification-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own verification image
CREATE POLICY "Users can delete own verification image"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'verification-images' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow admins to view all verification images
CREATE POLICY "Admins can view all verification images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'verification-images' 
  AND is_admin(auth.uid())
);