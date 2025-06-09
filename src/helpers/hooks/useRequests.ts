import { useState, useCallback } from 'react';
import { createClient } from '@supabase/supabase-js';
import { OfficeRequest, GroupMember } from '../../types/models';
import { generateSignature } from '../plonky2/utils';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function useRequests() {
  const [requests, setRequests] = useState<OfficeRequest[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalRequests, setTotalRequests] = useState(0);
  const [requestMsg, setRequestMsg] = useState<string | null>(null);
  const [requestLoading, setRequestLoading] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  const fetchRequests = useCallback(async (page: number, pageSize: number) => {
    setLoading(true);
    setError(null);
    try {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error, count } = await supabase
        .from('office_requests')
        .select('id, emoji, description, created_at, deleted, group_members, doxxed_member_id', { count: 'exact' })
        .eq('deleted', false)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (error) {
        setError(error.message);
        setRequests([]);
        setTotalRequests(0);
      } else {
        setRequests(data || []);
        setTotalRequests(count || 0);
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError('Unexpected error fetching requests.');
      }
      setRequests([]);
      setTotalRequests(0);
    }
    setLoading(false);
  }, []);

  // Request submission logic
  const submitRequest = useCallback(
    async (
      requestEmoji: string,
      requestDesc: string,
      isDoxxed: boolean,
      selectedGroup: string[],
      parcItKey: string | null,
      userPubKey: string | null,
      members: GroupMember[],
      fetchRequestsCallback: (page: number, pageSize: number) => void,
      currentPage: number,
      pageSize: number
    ) => {
      setRequestMsg(null);
      setRequestSuccess(false);
      if (!requestEmoji.trim() || !requestDesc.trim()) {
        setRequestMsg('Please enter an emoji and a description.');
        return;
      }
      if (!parcItKey) {
        setRequestMsg('You must be logged in to submit a request.');
        return;
      }
      if (!isDoxxed && selectedGroup.length < 2) {
        setRequestMsg('Please select at least two group members.');
        return;
      }
      // Enforce: user must be in selected group for anonymous requests
      if (!isDoxxed) {
        const userMember = members.find(m => m.public_key === userPubKey);
        if (!userMember || !selectedGroup.includes(userMember.github_username)) {
          setRequestMsg('You must include yourself in the selected group to submit an anonymous request. This is required because the anonymous group signature can only be generated if your key is part of the group—otherwise, the cryptographic proof will not work.');
          return;
        }
      }
      setRequestLoading(true);
      // DOXXED: Fast path
      if (isDoxxed) {
        try {
          const self = members.find(m => m.public_key === userPubKey);
          if (!self) {
            setRequestMsg('Could not find your group member info for doxxed request.');
            setRequestLoading(false);
            return;
          }
          const groupMembers = [self.github_username];
          const doxxedMemberId = self.id;
          const { error } = await supabase.from('office_requests').insert({
            emoji: requestEmoji.trim(),
            description: requestDesc.trim(),
            signature: null,
            group_id: '00000000-0000-0000-0000-000000000000',
            public_signal: 'dummy-signal',
            group_members: groupMembers,
            doxxed_member_id: doxxedMemberId,
            deleted: false,
            metadata: {},
          });
          if (error) {
            setRequestMsg('Failed to submit request: ' + error.message);
            setRequestSuccess(false);
          } else {
            setRequestMsg('Request submitted!');
            setRequestSuccess(true);
            fetchRequestsCallback(currentPage, pageSize);
          }
        } catch {
          setRequestMsg('Unexpected error submitting request.');
          setRequestSuccess(false);
        }
        setRequestLoading(false);
        return;
      }
      // ANONYMOUS: Existing flow (with loading/progress/proof UI)
      try {
        const groupMembers = selectedGroup;
        const doxxedMemberId = null;
        const message = `${requestEmoji} ${requestDesc}`;
        const groupKeys = members
          .filter((m) => groupMembers.includes(m.github_username))
          .map((m) => m.public_key);
        const signature = await generateSignature(message, groupKeys.join('\n'), parcItKey);
        // POST to Edge Function
        const officeRequestFunctionUrl = process.env.NEXT_PUBLIC_OFFICE_REQUEST_FUNCTION_URL!;
        const res = await fetch(officeRequestFunctionUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${supabaseAnonKey}`
          },
          body: JSON.stringify({
            description: requestDesc.trim(),
            emoji: requestEmoji.trim(),
            group: groupKeys,
            signature,
            doxxed_member_id: doxxedMemberId,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) {
          setRequestMsg(data.error || 'Failed to submit idea.');
        } else {
          setRequestMsg('Your proof has been generated and was submitted successfully.');
          setRequestSuccess(true);
          fetchRequestsCallback(currentPage, pageSize);
        }
      } catch {
        setRequestMsg('Unexpected error submitting request.');
      }
      setRequestLoading(false);
    },
    []
  );

  return { requests, loading, error, totalRequests, fetchRequests, setRequests, requestMsg, requestLoading, submitRequest, setRequestMsg, setRequestLoading, requestSuccess, setRequestSuccess };
} 