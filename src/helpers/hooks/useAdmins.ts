import { useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Admin } from '../../types/models';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function useAdmins() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchAdmins = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('admins')
        .select('id, github_username, public_key');
      if (error) {
        setError(error.message);
        setAdmins([]);
      } else {
        setAdmins(data || []);
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Unexpected error fetching admins.');
      }
      setAdmins([]);
    }
    setLoading(false);
  }, []);

  return { admins, loading, error, fetchAdmins, setAdmins };
} 