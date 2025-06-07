import { useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { OfficeRequest, GroupMember } from '../../types/models';
import { generateSignatureWithNullifier, to32ByteNonce } from '../plonky2/utils';

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
      if (!loggedIn || !parcItKey || !userPubKey) {
        setUpvoteMsg((prev) => ({ ...prev, [req.id]: 'You must be logged in to upvote.' }));
        return;
      }
      setUpvoteLoading(req.id);
      setUpvoteMsg((prev) => ({ ...prev, [req.id]: '' }));
      try {
        const groupKeys = Array.isArray(req.group_members)
          ? members.filter((m) => req.group_members.includes(m.github_username)).map((m) => m.public_key).join('\n')
          : '';
        if (!groupKeys) {
          setUpvoteMsg((prev) => ({ ...prev, [req.id]: 'No group keys found for this request.' }));
          setUpvoteLoading(null);
          return;
        }
        const message = `${req.emoji} ${req.description}`;
        const nonce = await to32ByteNonce(req.id);
        const signature = await generateSignatureWithNullifier(message, groupKeys, parcItKey, nonce);
        const upvoteFunctionUrl = process.env.NEXT_PUBLIC_UPVOTE_FUNCTION_URL!;
        const res = await fetch(upvoteFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({ requestId: req.id, signature, message })
        });
        const result = await res.json();
        if (res.ok && result.success) {
          setUpvoteMsg((prev) => ({ ...prev, [req.id]: 'Upvote submitted!' }));
          fetchUpvoteCountsCallback([req.id]);
        } else {
          setUpvoteMsg((prev) => ({ ...prev, [req.id]: result.error || 'Error submitting upvote.' }));
        }
      } catch (e: unknown) {
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