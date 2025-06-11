import { useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { OfficeRequest, GroupMember } from '../../types/models';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Utility to get key hash from localStorage
function getKeyHash() {
  return (typeof window !== 'undefined') ? localStorage.getItem('parcItHashedKey') : null;
}

export function useUpvotes() {
  const [upvoteCounts, setUpvoteCounts] = useState<{ [requestId: string]: number }>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [upvoteMsg, setUpvoteMsg] = useState<{ [requestId: string]: string }>({});
  const [upvoteLoading, setUpvoteLoading] = useState<string | null>(null);
  const [upvotersByRequest, setUpvotersByRequest] = useState<{ [requestId: string]: string[] }>({});

  const fetchUpvoteCounts = useCallback(async (requestIds: string[]) => {
    setLoading(true);
    setError(null);
    if (!requestIds.length) {
      setUpvoteCounts({});
      setUpvotersByRequest({});
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('request_upvotes')
        .select('request_id, nullifier')
        .in('request_id', requestIds);
      if (error) {
        setError(error.message);
        setUpvoteCounts({});
        setUpvotersByRequest({});
      } else {
        const counts: { [requestId: string]: number } = {};
        const upvoters: { [requestId: string]: string[] } = {};
        (data || []).forEach((row: { request_id: string, nullifier: string }) => {
          counts[row.request_id] = (counts[row.request_id] || 0) + 1;
          if (!upvoters[row.request_id]) upvoters[row.request_id] = [];
          upvoters[row.request_id].push(row.nullifier);
        });
        setUpvoteCounts(counts);
        setUpvotersByRequest(upvoters);
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Unexpected error fetching upvote counts.');
      }
      setUpvoteCounts({});
      setUpvotersByRequest({});
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
      fetchUpvoteCountsCallback: (ids: string[]) => void,
      allRequestIds: string[]
    ) => {
      console.log('submitUpvote called', { req, loggedIn, parcItKey, userPubKey });
      if (!loggedIn || !userPubKey) {
        setUpvoteMsg((prev) => ({ ...prev, [req.id]: 'You must be logged in to upvote.' }));
        return;
      }
      setUpvoteLoading(req.id);
      setUpvoteMsg((prev) => ({ ...prev, [req.id]: '' }));
      try {
        const keyHash = getKeyHash();
        const payload = { requestId: req.id, publicKey: userPubKey, keyHash };
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
          setUpvoteMsg((prev) => ({ ...prev, [req.id]: 'Upvote submitted! Note: upvotes are public.' }));
          fetchUpvoteCountsCallback(allRequestIds);
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

  const unUpvote = useCallback(
    async (
      req: OfficeRequest,
      loggedIn: boolean,
      parcItKey: string | null,
      userPubKey: string | null,
      members: GroupMember[],
      fetchUpvoteCountsCallback: (ids: string[]) => void,
      allRequestIds: string[]
    ) => {
      if (!loggedIn || !userPubKey) {
        setUpvoteMsg((prev) => ({ ...prev, [req.id]: 'You must be logged in to un-upvote.' }));
        return;
      }
      setUpvoteLoading(req.id);
      setUpvoteMsg((prev) => ({ ...prev, [req.id]: '' }));
      try {
        const keyHash = getKeyHash();
        const payload = { requestId: req.id, publicKey: userPubKey, keyHash };
        const res = await fetch('/api/upvote-public', {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (res.ok && result.success) {
          setUpvoteMsg((prev) => ({ ...prev, [req.id]: 'Upvote removed.' }));
          fetchUpvoteCountsCallback(allRequestIds);
        } else {
          setUpvoteMsg((prev) => ({ ...prev, [req.id]: result.error || 'Error removing upvote.' }));
        }
      } catch {
        setUpvoteMsg((prev) => ({ ...prev, [req.id]: 'Error removing upvote.' }));
      }
      setUpvoteLoading(null);
    },
    []
  );

  return { upvoteCounts, loading, error, fetchUpvoteCounts, setUpvoteCounts, upvoteMsg, upvoteLoading, submitUpvote, unUpvote, upvotersByRequest };
} 