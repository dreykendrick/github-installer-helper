-- Make verification-images bucket public so admins can view uploaded documents
UPDATE storage.buckets SET public = true WHERE id = 'verification-images';