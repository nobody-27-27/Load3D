import { supabase } from '../lib/supabase';
import type { ICargoItem } from '../core/types';

export interface CargoItemDB {
  id: string;
  user_id: string;
  name: string;
  type: string;
  weight: number;
  quantity: number;
  dimensions: any;
  roll_dimensions: any;
  color: string | null;
  stackable: boolean;
  is_palletized: boolean;
  created_at: string;
  updated_at: string;
}

function convertToCargoItem(dbItem: CargoItemDB): ICargoItem {
  return {
    id: dbItem.id,
    type: dbItem.type as 'box' | 'roll' | 'pallet',
    name: dbItem.name,
    weight: dbItem.weight,
    quantity: dbItem.quantity,
    dimensions: dbItem.dimensions,
    rollDimensions: dbItem.roll_dimensions,
    stackable: dbItem.stackable,
    isPalletized: dbItem.is_palletized,
    color: dbItem.color || undefined,
  };
}

function convertFromCargoItem(item: Omit<ICargoItem, 'id'>, userId: string): Partial<CargoItemDB> {
  return {
    user_id: userId,
    name: item.name,
    type: item.type,
    weight: item.weight,
    quantity: item.quantity,
    dimensions: item.dimensions || null,
    roll_dimensions: item.rollDimensions || null,
    color: item.color || null,
    stackable: item.stackable || false,
    is_palletized: item.isPalletized || false,
  };
}

export async function fetchCargoItems(): Promise<ICargoItem[]> {
  const { data, error } = await supabase
    .from('cargo_items')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Error fetching cargo items:', error);
    throw error;
  }

  return (data || []).map(convertToCargoItem);
}

export async function createCargoItem(item: Omit<ICargoItem, 'id'>): Promise<ICargoItem> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User must be authenticated to create cargo items');
  }

  const { data, error } = await supabase
    .from('cargo_items')
    .insert([convertFromCargoItem(item, user.id)])
    .select()
    .single();

  if (error) {
    console.error('Error creating cargo item:', error);
    throw error;
  }

  return convertToCargoItem(data);
}

export async function updateCargoItem(id: string, updates: Partial<ICargoItem>): Promise<ICargoItem> {
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error('User must be authenticated to update cargo items');
  }

  const dbUpdates: any = {};
  if (updates.name !== undefined) dbUpdates.name = updates.name;
  if (updates.type !== undefined) dbUpdates.type = updates.type;
  if (updates.weight !== undefined) dbUpdates.weight = updates.weight;
  if (updates.quantity !== undefined) dbUpdates.quantity = updates.quantity;
  if (updates.dimensions !== undefined) dbUpdates.dimensions = updates.dimensions;
  if (updates.rollDimensions !== undefined) dbUpdates.roll_dimensions = updates.rollDimensions;
  if (updates.color !== undefined) dbUpdates.color = updates.color;
  if (updates.stackable !== undefined) dbUpdates.stackable = updates.stackable;
  if (updates.isPalletized !== undefined) dbUpdates.is_palletized = updates.isPalletized;

  const { data, error } = await supabase
    .from('cargo_items')
    .update(dbUpdates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    console.error('Error updating cargo item:', error);
    throw error;
  }

  return convertToCargoItem(data);
}

export async function deleteCargoItem(id: string): Promise<void> {
  const { error } = await supabase
    .from('cargo_items')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('Error deleting cargo item:', error);
    throw error;
  }
}
