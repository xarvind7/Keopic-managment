import { useState, useEffect, useCallback, Dispatch, SetStateAction } from 'react';
import { supabase, fetchUserProfileSupabase, SupabaseProfile } from '../lib/supabase';
import { MetaConfig } from '../types';

export interface UseProfileReturn {
  profile: SupabaseProfile | null;
  loading: boolean;
  error: Error | null;
  refetchProfile: () => Promise<SupabaseProfile | null>;
}

/**
  * Custom hook to fetch the authenticated user's profile from Supabase (`profiles` table)
  * upon successful login and update the `meta` and user role state accordingly.
  */
export function useProfile(
  currentUser: any | null,
  setMeta?: Dispatch<SetStateAction<MetaConfig>>,
  setUserRole?: Dispatch<SetStateAction<'staff' | 'admin' | null>>
): UseProfileReturn {
  const [profile, setProfile] = useState<SupabaseProfile | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchProfile = useCallback(async () => {
    if (!currentUser) {
      setProfile(null);
      setLoading(false);
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const userId = currentUser.id || currentUser.uid;
      let fetchedProfile = await fetchUserProfileSupabase(userId);

      // If not found by ID/UID, attempt lookup by email if available
      if (!fetchedProfile && currentUser.email) {
        const { data, error: emailErr } = await supabase
          .from('profiles')
          .select('*')
          .eq('email', currentUser.email)
          .maybeSingle();

        if (!emailErr && data) {
          fetchedProfile = {
            id: data.id,
            auth_user_id: data.auth_user_id || data.id,
            employee_id: data.employee_id || 'EMP-1001',
            username: data.username || data.email,
            full_name: data.full_name || data.emp_name || 'User',
            emp_name: data.emp_name || data.full_name || 'User',
            branch_name: data.branch_name || data.location || 'Main Counter',
            location: data.location || data.branch_name || 'Main Counter',
            role: data.role || 'staff',
            status: data.status || 'active',
            rating: data.rating || 5
          };
        }
      }

      if (fetchedProfile) {
        setProfile(fetchedProfile);

        // Update meta state with user profile data
        if (setMeta) {
          setMeta(prev => ({
            ...prev,
            empName: fetchedProfile.emp_name || fetchedProfile.full_name || prev.empName,
            locVal: fetchedProfile.branch_name || fetchedProfile.location || prev.locVal,
          }));
        }

        // Update user role if present
        if (setUserRole && fetchedProfile.role) {
          setUserRole(fetchedProfile.role === 'admin' ? 'admin' : 'staff');
        }
      } else {
        // Construct fallback profile from auth session user metadata
        const fallbackName = currentUser.displayName ||
          currentUser.user_metadata?.full_name ||
          currentUser.user_metadata?.name ||
          (currentUser.email ? currentUser.email.split('@')[0] : 'User');

        const fallbackProfile: SupabaseProfile = {
          id: userId,
          auth_user_id: userId,
          employee_id: 'EMP-1001',
          username: currentUser.email || 'user',
          full_name: fallbackName,
          emp_name: fallbackName,
          branch_name: 'Main Counter',
          location: 'Main Counter',
          role: 'staff',
          status: 'active'
        };

        setProfile(fallbackProfile);

        if (setMeta) {
          setMeta(prev => ({
            ...prev,
            empName: fallbackName,
            locVal: prev.locVal || 'Main Counter'
          }));
        }
      }

      return fetchedProfile;
    } catch (err: any) {
      console.error('[useProfile] Error fetching profile:', err);
      setError(err instanceof Error ? err : new Error(String(err)));
      return null;
    } finally {
      setLoading(false);
    }
  }, [currentUser, setMeta, setUserRole]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  return {
    profile,
    loading,
    error,
    refetchProfile: fetchProfile
  };
}
