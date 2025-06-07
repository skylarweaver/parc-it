import { useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { GroupMember } from '../../types/models';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function useMembers() {
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchMembers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase
        .from('group_members')
        .select('id, github_username, avatar_url, public_key');
      if (error) {
        setError(error.message);
        setMembers([]);
      } else {
        setMembers(data || []);
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Unexpected error fetching group members.');
      }
      setMembers([]);
    }
    setLoading(false);
  }, []);

  return { members, loading, error, fetchMembers, setMembers };
} 