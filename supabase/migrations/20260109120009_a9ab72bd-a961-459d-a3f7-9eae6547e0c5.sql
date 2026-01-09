-- Add image_urls array column to products table for multiple images
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS image_urls text[] DEFAULT '{}';