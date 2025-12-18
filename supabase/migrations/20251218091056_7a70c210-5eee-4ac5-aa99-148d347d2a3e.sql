-- Add separate verification columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS email_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS image_verified boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS verification_image_url text,
ADD COLUMN IF NOT EXISTS phone_verification_code text,
ADD COLUMN IF NOT EXISTS phone_code_expires_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS email_verification_code text,
ADD COLUMN IF NOT EXISTS email_code_expires_at timestamp with time zone;

-- Drop the old verification_status column if it exists (optional - keep for backward compatibility)
-- We'll keep it as a computed status based on other verifications

COMMENT ON COLUMN public.profiles.phone_verified IS 'Whether phone number has been verified via SMS';
COMMENT ON COLUMN public.profiles.email_verified IS 'Whether email has been verified';
COMMENT ON COLUMN public.profiles.image_verified IS 'Whether identity image/document has been verified by admin';
COMMENT ON COLUMN public.profiles.verification_image_url IS 'URL to uploaded verification image/document';
COMMENT ON COLUMN public.profiles.phone_verification_code IS 'Temporary SMS verification code';
COMMENT ON COLUMN public.profiles.email_verification_code IS 'Temporary email verification code';