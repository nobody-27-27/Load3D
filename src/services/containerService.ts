import { supabase } from '../lib/supabase';
import type { IContainerPreset } from '../core/types';
import type { Database } from '../types/database';

type ContainerPresetRow = Database['public']['Tables']['container_presets']['Row'];
type UserContainerRow = Database['public']['Tables']['user_containers']['Row'];
type UserContainerInsert = Database['public']['Tables']['user_containers']['Insert'];
type UserContainerUpdate = Database['public']['Tables']['user_containers']['Update'];

function mapPresetRowToContainerPreset(row: ContainerPresetRow): IContainerPreset {
  return {
    id: row.id,
    name: row.name,
    type: row.type as IContainerPreset['type'],
    length: row.length,
    width: row.width,
    height: row.height,
    maxWeight: row.max_weight,
    isDefault: row.is_default,
  };
}

export async function fetchContainerPresets(): Promise<IContainerPreset[]> {
  try {
    const { data, error } = await supabase
      .from('container_presets')
      .select('*')
      .eq('is_default', true)
      .order('type');

    if (error) throw error;

    return data ? data.map(mapPresetRowToContainerPreset) : [];
  } catch (error) {
    console.error('Error fetching container presets:', error);
    return [];
  }
}

export async function fetchUserContainers(userId: string): Promise<IContainerPreset[]> {
  try {
    const { data, error } = await supabase
      .from('user_containers')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data ? data.map(row => ({
      id: row.id,
      name: row.name,
      type: 'TRUCK' as IContainerPreset['type'],
      length: row.length,
      width: row.width,
      height: row.height,
      maxWeight: row.max_weight,
      isDefault: false,
    })) : [];
  } catch (error) {
    console.error('Error fetching user containers:', error);
    return [];
  }
}

export async function createUserContainer(
  container: Omit<UserContainerInsert, 'id' | 'created_at' | 'updated_at'>
): Promise<IContainerPreset | null> {
  try {
    const { data, error } = await supabase
      .from('user_containers')
      .insert(container)
      .select()
      .single();

    if (error) throw error;

    return data ? {
      id: data.id,
      name: data.name,
      type: 'TRUCK' as IContainerPreset['type'],
      length: data.length,
      width: data.width,
      height: data.height,
      maxWeight: data.max_weight,
      isDefault: false,
    } : null;
  } catch (error) {
    console.error('Error creating user container:', error);
    return null;
  }
}

export async function updateUserContainer(
  id: string,
  updates: UserContainerUpdate
): Promise<IContainerPreset | null> {
  try {
    const { data, error } = await supabase
      .from('user_containers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    return data ? {
      id: data.id,
      name: data.name,
      type: 'TRUCK' as IContainerPreset['type'],
      length: data.length,
      width: data.width,
      height: data.height,
      maxWeight: data.max_weight,
      isDefault: false,
    } : null;
  } catch (error) {
    console.error('Error updating user container:', error);
    return null;
  }
}

export async function deleteUserContainer(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('user_containers')
      .delete()
      .eq('id', id);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting user container:', error);
    return false;
  }
}
