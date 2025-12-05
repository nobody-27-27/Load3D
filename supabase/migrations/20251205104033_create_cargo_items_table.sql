/*
  # Create cargo_items table for user cargo configurations
  
  1. New Tables
    - `cargo_items`
      - `id` (uuid, primary key) - Unique identifier for cargo item
      - `user_id` (uuid) - References auth.users, allows RLS per user
      - `name` (text) - Display name for the cargo item
      - `type` (text) - Type: 'box', 'roll', or 'pallet'
      - `weight` (numeric) - Weight in kilograms
      - `quantity` (integer) - Number of items (default 1)
      - `dimensions` (jsonb) - Box dimensions {length, width, height} in meters
      - `roll_dimensions` (jsonb) - Roll dimensions {diameter, length} in meters
      - `color` (text) - Hex color code for 3D visualization
      - `stackable` (boolean) - Whether item can have others stacked on it (default false)
      - `is_palletized` (boolean) - Whether item is on a pallet (default false)
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp
  
  2. Security
    - Enable RLS on `cargo_items` table
    - Add policy for users to read their own cargo items
    - Add policy for users to insert their own cargo items
    - Add policy for users to update their own cargo items
    - Add policy for users to delete their own cargo items
  
  3. Indexes
    - Index on user_id for efficient queries
    - Index on type for filtering by cargo type
*/

CREATE TABLE IF NOT EXISTS cargo_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('box', 'roll', 'pallet')),
  weight numeric NOT NULL CHECK (weight > 0),
  quantity integer NOT NULL DEFAULT 1 CHECK (quantity > 0),
  dimensions jsonb,
  roll_dimensions jsonb,
  color text,
  stackable boolean DEFAULT false,
  is_palletized boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE cargo_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own cargo items
CREATE POLICY "Users can view own cargo items"
  ON cargo_items FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own cargo items
CREATE POLICY "Users can insert own cargo items"
  ON cargo_items FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own cargo items
CREATE POLICY "Users can update own cargo items"
  ON cargo_items FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own cargo items
CREATE POLICY "Users can delete own cargo items"
  ON cargo_items FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS cargo_items_user_id_idx ON cargo_items(user_id);
CREATE INDEX IF NOT EXISTS cargo_items_type_idx ON cargo_items(type);
CREATE INDEX IF NOT EXISTS cargo_items_created_at_idx ON cargo_items(created_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_cargo_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER cargo_items_updated_at
  BEFORE UPDATE ON cargo_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cargo_items_updated_at();
