import { supabase } from '../components/SupabaseClient';

// Function to store user profile data
export const createOrUpdateUserProfile = async (userData) => {
  const { 
    id, // Supabase auth user id
    name,
    companyName,
    address,
    email,
    phone,
    // Add any other fields you need
  } = userData;

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .upsert({
        user_id: id,
        name,
        company_name: companyName,
        address,
        email,
        phone,
        updated_at: new Date().toISOString(),
      }, { 
        onConflict: 'user_id',
        returning: 'minimal'
      });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error storing user profile:', error);
    return { success: false, error: error.message };
  }
};

// Function to get a user profile by id
export const getUserProfile = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return { success: false, error: error.message };
  }
};

// Function to get all user profiles (for admin)
export const getAllUserProfiles = async () => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error('Error fetching all user profiles:', error);
    return { success: false, error: error.message };
  }
};

// Function to get user profiles filtered by role
export const getUserProfilesByRole = async (role) => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('role', role)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data };
  } catch (error) {
    console.error(`Error fetching ${role} profiles:`, error);
    return { success: false, error: error.message };
  }
};

// Function to delete a user profile
export const deleteUserProfile = async (userId) => {
  try {
    const { error } = await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userId);

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Error deleting user profile:', error);
    return { success: false, error: error.message };
  }
}; 