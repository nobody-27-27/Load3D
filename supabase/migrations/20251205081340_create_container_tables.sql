/*
  # Create Container Management Tables

  1. New Tables
    - `container_presets`
      - `id` (uuid, primary key)
      - `name` (text) - Display name like "20ft Dry Container"
      - `type` (text) - Short type identifier like "20DC"
      - `length` (integer) - Length in centimeters
      - `width` (integer) - Width in centimeters
      - `height` (integer) - Height in centimeters
      - `max_weight` (integer) - Maximum weight in kilograms
      - `is_default` (boolean) - Whether this is a system default preset
      - `created_at` (timestamptz) - Creation timestamp
    
    - `user_containers`
      - `id` (uuid, primary key)
      - `user_id` (uuid) - Foreign key to auth.users (nullable for now)
      - `name` (text) - Custom container name
      - `length` (integer) - Length in centimeters
      - `width` (integer) - Width in centimeters
      - `height` (integer) - Height in centimeters
      - `max_weight` (integer) - Maximum weight in kilograms
      - `created_at` (timestamptz) - Creation timestamp
      - `updated_at` (timestamptz) - Last update timestamp

  2. Security
    - Enable RLS on both tables
    - Allow public read access to container_presets (they are system defaults)
    - Allow authenticated users to manage their own user_containers

  3. Initial Data
    - Insert four default container types with accurate dimensions:
      - 20ft Dry Container: 590cm x 235cm x 237cm
      - 40ft Dry Container: 1198cm x 235cm x 235cm
      - 40ft High Cube: 1198cm x 235cm x 269cm
      - Truck: 1360cm x 242cm x 260cm
*/

-- Create container_presets table
CREATE TABLE IF NOT EXISTS container_presets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL UNIQUE,
  length integer NOT NULL CHECK (length > 0),
  width integer NOT NULL CHECK (width > 0),
  height integer NOT NULL CHECK (height > 0),
  max_weight integer NOT NULL DEFAULT 0 CHECK (max_weight >= 0),
  is_default boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Create user_containers table
CREATE TABLE IF NOT EXISTS user_containers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  length integer NOT NULL CHECK (length > 0),
  width integer NOT NULL CHECK (width > 0),
  height integer NOT NULL CHECK (height > 0),
  max_weight integer NOT NULL DEFAULT 0 CHECK (max_weight >= 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE container_presets ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_containers ENABLE ROW LEVEL SECURITY;

-- Policies for container_presets (public read access for defaults)
CREATE POLICY "Anyone can view default container presets"
  ON container_presets FOR SELECT
  USING (is_default = true);

-- Policies for user_containers
CREATE POLICY "Users can view own containers"
  ON user_containers FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own containers"
  ON user_containers FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own containers"
  ON user_containers FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own containers"
  ON user_containers FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Insert default container presets
INSERT INTO container_presets (name, type, length, width, height, max_weight, is_default)
VALUES
  ('20ft Dry Container', '20DC', 590, 235, 237, 28000, true),
  ('40ft Dry Container', '40DC', 1198, 235, 235, 29000, true),
  ('40ft High Cube', '40HC', 1198, 235, 269, 29000, true),
  ('Truck', 'TRUCK', 1360, 242, 260, 24000, true)
ON CONFLICT (type) DO NOTHING;