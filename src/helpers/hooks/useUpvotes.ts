import { useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { OfficeRequest, GroupMember } from '../../types/models';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function useUpvotes() {
  const [upvoteCounts, setUpvoteCounts] = useState<{ [requestId: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upvoteMsg, setUpvoteMsg] = useState<{ [requestId: string]: string }>({});
  const [upvoteLoading, setUpvoteLoading] = useState<string | null>(null);

  const fetchUpvoteCounts = useCallback(async (requestIds: string[]) => {
    setLoading(true);
    setError(null);
    if (!requestIds.length) {
      setUpvoteCounts({});
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('request_upvotes')
        .select('request_id')
        .in('request_id', requestIds);
      if (error) {
        setError(error.message);
        setUpvoteCounts({});
      } else {
        const counts: { [requestId: string]: number } = {};
        (data || []).forEach((row: { request_id: string }) => {
          counts[row.request_id] = (counts[row.request_id] || 0) + 1;
        });
        setUpvoteCounts(counts);
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Unexpected error fetching upvote counts.');
      }
      setUpvoteCounts({});
    }
    setLoading(false);
  }, []);

  // Upvote submission logic
  const submitUpvote = useCallback(
    async (
      req: OfficeRequest,
      loggedIn: boolean,
      parcItKey: string | null,
      userPubKey: string | null,
      members: GroupMember[],
      fetchUpvoteCountsCallback: (ids: string[]) => void
    ) => {
      console.log('submitUpvote called', { req, loggedIn, parcItKey, userPubKey });
      if (!loggedIn || !userPubKey) {
        setUpvoteMsg((prev) => ({ ...prev, [req.id]: 'You must be logged in to upvote.' }));
        return;
      }
      setUpvoteLoading(req.id);
      setUpvoteMsg((prev) => ({ ...prev, [req.id]: '' }));
      try {
        const payload = { requestId: req.id, publicKey: userPubKey };
        console.log('Upvote API payload:', payload);
        const res = await fetch('/api/upvote-public', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        console.log('Upvote API response:', res.status, result);
        if (res.ok && result.success) {
          setUpvoteMsg((prev) => ({ ...prev, [req.id]: 'Upvote submitted!' }));
          fetchUpvoteCountsCallback([req.id]);
        } else if (res.status === 409) {
          setUpvoteMsg((prev) => ({ ...prev, [req.id]: result.error || 'You have already upvoted this request.' }));
        } else {
          setUpvoteMsg((prev) => ({ ...prev, [req.id]: result.error || 'Error submitting upvote.' }));
        }
      } catch (e: unknown) {
        console.error('Upvote API error:', e);
        if (e instanceof Error) {
          setUpvoteMsg((prev) => ({ ...prev, [req.id]: e.message || 'Error submitting upvote.' }));
        } else {
          setUpvoteMsg((prev) => ({ ...prev, [req.id]: 'Error submitting upvote.' }));
        }
      }
      setUpvoteLoading(null);
    },
    []
  );

  return { upvoteCounts, loading, error, fetchUpvoteCounts, setUpvoteCounts, upvoteMsg, upvoteLoading, submitUpvote };
} 