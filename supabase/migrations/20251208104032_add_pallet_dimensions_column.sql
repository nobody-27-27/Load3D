/*
  # Add pallet_dimensions column to cargo_items
  
  1. Changes
    - Add `pallet_dimensions` column (jsonb) to cargo_items table
    - Stores pallet dimensions {length, width, height} in meters
    - Used when isPalletized is true to define the pallet footprint
  
  2. Notes
    - When an item isPalletized=true, its footprint = pallet dimensions (L×W)
    - Total height = box height + pallet height
    - This ensures accurate space calculation and prevents out-of-bounds placement
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'cargo_items' AND column_name = 'pallet_dimensions'
  ) THEN
    ALTER TABLE cargo_items ADD COLUMN pallet_dimensions jsonb;
  END IF;
END $$;