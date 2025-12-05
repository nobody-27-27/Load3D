/*
  # Make weight field nullable in cargo_items table

  1. Changes
    - Alter the `cargo_items` table to make the `weight` field nullable
    - Remove the NOT NULL constraint from the `weight` column
    - Keep the CHECK constraint (weight > 0) but only when weight is provided

  2. Important Notes
    - This allows users to create cargo items without specifying weight
    - When weight is provided, it must still be greater than 0
    - Existing records with weight values will remain unchanged
*/

-- Make weight nullable and update the constraint
ALTER TABLE cargo_items 
  ALTER COLUMN weight DROP NOT NULL;

-- Drop the old check constraint if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'cargo_items_weight_check'
  ) THEN
    ALTER TABLE cargo_items DROP CONSTRAINT cargo_items_weight_check;
  END IF;
END $$;

-- Add a new check constraint that only validates weight when it's not null
ALTER TABLE cargo_items 
  ADD CONSTRAINT cargo_items_weight_check 
  CHECK (weight IS NULL OR weight > 0);
