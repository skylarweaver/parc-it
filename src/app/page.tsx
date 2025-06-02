"use client";
import { Button } from "../components/ui/button";
import { LoginModal } from "../components/LoginModal";
import React, { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { generateSignature, verifySignature, getPlonky2Worker, generateSignatureWithNullifier, to32ByteNonce } from "../helpers/plonky2/utils";
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import ProgressBar from "../components/ui/ProgressBar";
import PLONKY2_SCRIPT from "./helpers/plonky2/plonky2Script";
import RetroHeader from "../components/RetroHeader";
import { OfficeRequest, GroupMember, Admin, Upvote } from "../types/models";
import { is4096RsaKey } from "../helpers/utils";
import AnimatedEquation from "../components/AnimatedEquation";
import ProofTimer from "../components/ProofTimer";
import SpeedReader from "../components/SpeedReader";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [loginStatus, setLoginStatus] = React.useState<string | null>(null);
  const [loggedIn, setLoggedIn] = React.useState(false);
  const [userPubKey, setUserPubKey] = React.useState<string | null>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [members, setMembers] = React.useState<GroupMember[]>([]);
  const [memberLoading, setMemberLoading] = React.useState(false);
  const [addUsername, setAddUsername] = React.useState("");
  const [adminMsg, setAdminMsg] = React.useState<string | null>(null);
  const [addRequestOpen, setAddRequestOpen] = React.useState(false);
  const [requestEmoji, setRequestEmoji] = React.useState("");
  const [requestDesc, setRequestDesc] = React.useState("");
  const [requestMsg, setRequestMsg] = React.useState<string | null>(null);
  const [requestLoading, setRequestLoading] = React.useState(false);
  const [requests, setRequests] = React.useState<OfficeRequest[]>([]);
  const [requestsLoading, setRequestsLoading] = React.useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = React.useState(false);
  const [verifyRequest, setVerifyRequest] = React.useState<OfficeRequest | null>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [keyModalOpen, setKeyModalOpen] = React.useState(false);
  const [keyMember, setKeyMember] = React.useState<GroupMember | null>(null);
  const [selectedGroup, setSelectedGroup] = React.useState<string[]>([]);
  const [parcItKey, setParcItKey] = React.useState<string | null>(null);
  const [verifyResult, setVerifyResult] = React.useState<{valid: boolean, groupKeys?: string, nullifier?: Uint8Array | string, error?: any} | null>(null);
  const [isDoxxed, setIsDoxxed] = React.useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const emojiPickerRef = React.useRef<HTMLDivElement>(null);
  const [admins, setAdmins] = React.useState<Admin[]>([]);
  const [verifyLoading, setVerifyLoading] = React.useState(false);
  const verifyResultCache = React.useRef<Record<string, {valid: boolean, groupKeys?: string, error?: any}>>({});
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize, setPageSize] = React.useState(10);
  const [totalRequests, setTotalRequests] = React.useState(0);
  const [signatureLoading, setSignatureLoading] = React.useState(false);
  const [upvoteLoading, setUpvoteLoading] = React.useState<string | null>(null);
  const [upvoteMsg, setUpvoteMsg] = React.useState<{ [requestId: string]: string }>({});
  const [upvoteCounts, setUpvoteCounts] = React.useState<{ [requestId: string]: number }>({});

  const handleLogin = async (key: string, pubKey: string) => {
    setLoading(true);
    setLoginStatus(null);
    setIsAdmin(false);
    try {
      // Only local validation: check if we can derive a valid SSH key from the Parc-It Key
      if (!pubKey || pubKey.startsWith("ERROR")) {
        setLoginStatus("Could not extract a valid SSH public key from the signature.");
        setLoggedIn(false);
        setUserPubKey(null);
        setParcItKey(null);
        setLoading(false);
        return;
      }
      if (!is4096RsaKey(pubKey)) {
        setLoginStatus("Login failed: Your key is not a 4096-bit RSA key. Please generate a new 4096-bit RSA key and try again.");
        setLoggedIn(false);
        setUserPubKey(null);
        setParcItKey(null);
        setLoading(false);
        return;
      }
      setLoggedIn(true);
      setUserPubKey(pubKey);
      setParcItKey(key);
      setLoginStatus("Login successful! You are recognized as a group member.");
      setLoginOpen(false);
      localStorage.setItem("parcItKey", key);
      localStorage.setItem("parcItPubKey", pubKey);
      // Start circuit initialization in the background
      const worker = getPlonky2Worker();
      const id = Date.now().toString() + Math.random().toString(16);
      worker.postMessage({ id, op: 'initCircuit', args: {} });
    } catch (e) {
      setLoginStatus("Unexpected error during login. Please try again.");
      setLoggedIn(false);
      setUserPubKey(null);
      setParcItKey(null);
      setIsAdmin(false);
      console.error(e);
    }
    setLoading(false);
  };

  // Fetch group members (always, not just for admins)
  const fetchMembers = async () => {
    setMemberLoading(true);
    try {
      const { data, error } = await supabase
        .from("group_members")
        .select("id, github_username, avatar_url, public_key");
      if (error) {
        setAdminMsg("Failed to fetch group members.");
        setMembers([]);
        console.error(error);
      } else {
        setMembers(data || []);
        setAdminMsg(null);
        // console.log("Fetched group members:", data);
      }
    } catch (e) {
      setAdminMsg("Unexpected error fetching group members.");
      setMembers([]);
      console.error(e);
    }
    setMemberLoading(false);
  };

  // Fetch admins from Supabase
  const fetchAdmins = async () => {
    try {
      const { data, error } = await supabase
        .from("admins")
        .select("id, github_username");
      if (!error && data) setAdmins(data);
    } catch (e) {
      setAdmins([]);
    }
  };

  // Fetch members on mount and after add/remove
  useEffect(() => {
    fetchMembers();
    fetchAdmins();
  }, []);

  // When opening the Add Request modal, default to all members selected (only if selectedGroup is empty)
  useEffect(() => {
    if (addRequestOpen && selectedGroup.length === 0 && members.length > 0) {
      setSelectedGroup(members.map((m) => m.github_username));
    }
    // Reset request modal state (message, loading) whenever modal is opened or closed
    setRequestMsg(null);
    setRequestLoading(false);
    // eslint-disable-next-line
  }, [addRequestOpen]);

  // Add Request modal submit handler
  const handleSubmitRequest = async () => {
    setRequestMsg(null);
    if (!requestEmoji.trim() || !requestDesc.trim()) {
      setRequestMsg("Please enter an emoji and a description.");
      return;
    }
    if (!parcItKey) {
      setRequestMsg("You must be logged in to submit a request.");
      return;
    }
    if (!isDoxxed && selectedGroup.length < 2) {
      setRequestMsg("Please select at least two group members.");
      return;
    }
    // Enforce: user must be in selected group for anonymous requests
    if (!isDoxxed) {
      const userMember = members.find(m => m.public_key === userPubKey);
      if (!userMember || !selectedGroup.includes(userMember.github_username)) {
        setRequestMsg("You must include yourself in the selected group to submit an anonymous request. This is required because the anonymous group signature can only be generated if your key is part of the group—otherwise, the cryptographic proof will not work.");
        return;
      }
    }
    // DOXXED: Fast path, no loading, no proof UI, auto-close modal
    if (isDoxxed) {
      try {
        const self = members.find(m => m.public_key === userPubKey);
        if (!self) {
          setRequestMsg("Could not find your group member info for doxxed request.");
          return;
        }
        const groupMembers = [self.github_username];
        const doxxedMemberId = self.id;
        const { error } = await supabase.from("office_requests").insert({
          emoji: requestEmoji.trim(),
          description: requestDesc.trim(),
          signature: null,
          group_id: "00000000-0000-0000-0000-000000000000", // TODO: real group logic
          public_signal: "dummy-signal", // TODO: real signal
          group_members: groupMembers,
          doxxed_member_id: doxxedMemberId,
          deleted: false,
          metadata: {},
        });
        if (error) {
          let msg = "Failed to submit request: " + error.message;
          if (error instanceof Error) {
            msg = error.message;
          }
          setRequestMsg(msg);
        } else {
          setRequestMsg("Request submitted!");
          setRequestEmoji("");
          setRequestDesc("");
          setTimeout(() => {
            setAddRequestOpen(false);
            setRequestMsg(null);
          }, 1000);
        }
      } catch (e) {
        let msg = "Unexpected error submitting request.";
        if (e instanceof Error) {
          msg = e.message;
        }
        setRequestMsg(msg);
        console.error(e);
      }
      return;
    }
    // ANONYMOUS: Existing flow (with loading/progress/proof UI)
    setRequestLoading(true);
    try {
      const groupMembers = selectedGroup;
      const doxxedMemberId = null;
      const message = `${requestEmoji} ${requestDesc}`;
      const groupKeys = members
        .filter((m) => groupMembers.includes(m.github_username))
        .map((m) => m.public_key)
        .join('\n');
      const signature = await generateSignature(message, groupKeys, parcItKey);
      const { error } = await supabase.from("office_requests").insert({
        emoji: requestEmoji.trim(),
        description: requestDesc.trim(),
        signature,
        group_id: "00000000-0000-0000-0000-000000000000", // TODO: real group logic
        public_signal: "dummy-signal", // TODO: real signal
        group_members: groupMembers,
        doxxed_member_id: doxxedMemberId,
        deleted: false,
        metadata: {},
      });
      if (error) {
        let msg = "Failed to submit request: " + error.message;
        if (error instanceof Error) {
          if (error.message.includes("does not match any public key")) {
            msg = "Your Parc-It key is not a member of the selected group. Please check your group selection or log in with the correct key.";
          } else {
            msg = error.message;
          }
        }
        setRequestMsg(msg);
      } else {
        setRequestMsg("Your proof has been generated and is ready to use.");
        setRequestEmoji("");
        setRequestDesc("");
        // Do NOT close the modal automatically; let the user close it
      }
    } catch (e) {
      let msg = "Unexpected error submitting request.";
      if (e instanceof Error) {
        if (e.message.includes("does not match any public key")) {
          msg = "Your Parc-It key is not a member of the selected group. Please check your group selection or log in with the correct key.";
        } else {
          msg = e.message;
        }
      }
      setRequestMsg(msg);
      console.error(e);
    }
    setRequestLoading(false);
  };

  // Fetch requests from Supabase (with pagination)
  const fetchRequests = async (page = currentPage, size = pageSize) => {
    setRequestsLoading(true);
    try {
      const from = (page - 1) * size;
      const to = from + size - 1;
      const { data, error, count } = await supabase
        .from("office_requests")
        .select("id, emoji, description, created_at, deleted, group_members, doxxed_member_id", { count: "exact" })
        .eq('deleted', false)
        .order("created_at", { ascending: false })
        .range(from, to);
      console.log('fetchRequests', { page, size, from, to, data, count, error });
      if (error) {
        console.error("Failed to fetch requests:", error);
        setRequests([]);
        setTotalRequests(0);
      } else {
        setRequests(data || []);
        setTotalRequests(count || 0);
      }
    } catch (e) {
      console.error("Unexpected error fetching requests:", e);
      setRequests([]);
      setTotalRequests(0);
    }
    setRequestsLoading(false);
  };

  // Replace with a single effect:
  useEffect(() => {
    if (!addRequestOpen) {
      fetchRequests(currentPage, pageSize);
    }
  }, [currentPage, pageSize, addRequestOpen]);

  // Open verify modal for a request
  const handleOpenVerify = async (req: any) => {
    if (req.signature) {
      setVerifyRequest(req);
      const cacheKey = req.id || req.signature || '';
      if (verifyResultCache.current[cacheKey]) {
        setVerifyResult(verifyResultCache.current[cacheKey]);
      } else {
        setVerifyResult(null);
      }
      setSignatureLoading(false);
      setVerifyModalOpen(true);
    } else {
      // Open modal immediately with loading state
      setVerifyRequest(req);
      setSignatureLoading(true);
      setVerifyModalOpen(true);
      // Fetch the full request with signature
      const { data, error } = await supabase
        .from("office_requests")
        .select("id, emoji, description, created_at, deleted, group_members, doxxed_member_id, signature")
        .eq("id", req.id)
        .single();
      if (error) {
        alert("Failed to fetch signature for this request.");
        setSignatureLoading(false);
        return;
      }
      setVerifyRequest(data);
      const cacheKey = data.id || data.signature || '';
      if (verifyResultCache.current[cacheKey]) {
        setVerifyResult(verifyResultCache.current[cacheKey]);
      } else {
        setVerifyResult(null);
      }
      setSignatureLoading(false);
    }
  };
  const handleCloseVerify = () => {
    setVerifyModalOpen(false);
    setVerifyRequest(null);
  };

  // Open/close key modal
  const handleOpenKeyModal = (member: any) => {
    setKeyMember(member);
    setKeyModalOpen(true);
  };
  const handleCloseKeyModal = () => {
    setKeyModalOpen(false);
    setKeyMember(null);
  };

  // Handler for verifying signature
  const handleVerifySignature = async () => {
    console.log('[UI] User clicked Verify Signature');
    setVerifyResult(null);
    setVerifyLoading(true);
    if (!verifyRequest) {
      setVerifyLoading(false);
      return;
    }
    const message = `${verifyRequest.emoji} ${verifyRequest.description}`;
    const signature = verifyRequest.signature;
    if (!signature || typeof signature !== 'string' || signature.length < 10) {
      setVerifyResult({ valid: false, error: { message: "No valid signature found for this request." } });
      setVerifyLoading(false);
      return;
    }
    try {
      console.log('[UI] Starting verification with message:', message, 'signature:', signature.slice(0, 32) + '...');
      const result = await verifySignature(message, signature);
      setVerifyResult(result);
      // Store in cache
      const cacheKey = verifyRequest.id || verifyRequest.signature || '';
      verifyResultCache.current[cacheKey] = result;
      console.log('[UI] Verification finished. Result:', result);
    } catch (e) {
      setVerifyResult({ valid: false, error: e });
      console.error('[UI] Verification error:', e);
    }
    setVerifyLoading(false);
  };

  useEffect(() => {
    // Auto-login if Parc-It key is in localStorage
    const storedKey = localStorage.getItem("parcItKey");
    const storedPubKey = localStorage.getItem("parcItPubKey");
    if (storedKey && storedPubKey) {
      setLoggedIn(true);
      setUserPubKey(storedPubKey);
      setParcItKey(storedKey);
      setLoginStatus("Login successful! You are recognized as a group member.");
      // Start circuit initialization in the background (for auto-login)
      const worker = getPlonky2Worker();
      const id = Date.now().toString() + Math.random().toString(16);
      worker.postMessage({ id, op: 'initCircuit', args: {} });
    }
  }, []);

  React.useEffect(() => {
    if (!showEmojiPicker) return;
    function handleClickOutside(event: MouseEvent) {
      if (emojiPickerRef.current && !emojiPickerRef.current.contains(event.target as Node)) {
        setShowEmojiPicker(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showEmojiPicker]);

  // Fetch upvote counts for all requests
  const fetchUpvoteCounts = async (requestIds: string[]) => {
    console.log('[Upvote] fetchUpvoteCounts called with requestIds:', requestIds);
    if (!requestIds.length) return;
    try {
      const { data, error } = await supabase
        .from('request_upvotes')
        .select('request_id')
        .in('request_id', requestIds);
      if (error) {
        console.error('[Upvote] Failed to fetch upvote counts:', error);
        setUpvoteCounts({});
      } else {
        const counts: { [requestId: string]: number } = {};
        (data || []).forEach((row: any) => {
          counts[row.request_id] = (counts[row.request_id] || 0) + 1;
        });
        console.log('[Upvote] Upvote counts result:', counts);
        setUpvoteCounts(counts);
      }
    } catch (e) {
      console.error('[Upvote] Unexpected error fetching upvote counts:', e);
      setUpvoteCounts({});
    }
  };

  // Fetch upvote counts whenever requests change
  useEffect(() => {
    if (requests.length > 0) {
      fetchUpvoteCounts(requests.map(r => r.id));
    }
  }, [requests]);

  // Upvote handler
  const handleUpvote = async (req: OfficeRequest) => {
    console.log('[Upvote] handleUpvote called for request:', req);
    if (!loggedIn || !parcItKey || !userPubKey) {
      setUpvoteMsg((prev) => ({ ...prev, [req.id]: "You must be logged in to upvote." }));
      console.warn('[Upvote] Not logged in or missing key');
      return;
    }
    setUpvoteLoading(req.id);
    setUpvoteMsg((prev) => ({ ...prev, [req.id]: "" }));
    try {
      // Use request ID as the nullifier context
      const groupKeys = Array.isArray(req.group_members)
        ? members.filter((m) => req.group_members.includes(m.github_username)).map((m) => m.public_key).join("\n")
        : "";
      console.log('[Upvote] groupKeys:', groupKeys);
      if (!groupKeys) {
        setUpvoteMsg((prev) => ({ ...prev, [req.id]: "No group keys found for this request." }));
        setUpvoteLoading(null);
        console.warn('[Upvote] No group keys found');
        return;
      }
      const message = `${req.emoji} ${req.description}`;
      console.log('[Upvote] message:', message);
      // Hash the requestId to a 32-byte nonce
      const nonce = await to32ByteNonce(req.id);
      console.log(`[Upvote] Nonce for requestId ${req.id}:`, nonce, 'Length:', nonce.length);
      // Generate group signature with nullifier
      const signature = await generateSignatureWithNullifier(message, groupKeys, parcItKey, nonce);
      console.log('[Upvote] generated signature:', signature);
      // Send to backend endpoint
      // console.log('[Upvote] Sending POST to /api/upvote', { requestId: req.id, signature, message });
      const edgeFunctionUrl = 'https://ihoatybozktclkxgemsz.supabase.co/functions/v1/upvote';
      const res = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlob2F0eWJvemt0Y2xreGdlbXN6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg1MzgxODMsImV4cCI6MjA2NDExNDE4M30.cJvF7ddfTkf6VNKopn9sP5yVLGHaaBTw3Um1eanCkfw`
        },
        body: JSON.stringify({ requestId: req.id, signature, message })
      });
      console.log('[Upvote] /api/upvote response status:', res.status);
      const result = await res.json();
      console.log('[Upvote] /api/upvote response body:', result);
      if (res.ok && result.success) {
        setUpvoteMsg((prev) => ({ ...prev, [req.id]: "Upvote submitted!" }));
        // Refetch upvote counts
        fetchUpvoteCounts([req.id]);
      } else {
        setUpvoteMsg((prev) => ({ ...prev, [req.id]: result.error || "Error submitting upvote." }));
        console.warn('[Upvote] Upvote failed:', result.error);
      }
    } catch (e: any) {
      setUpvoteMsg((prev) => ({ ...prev, [req.id]: e?.message || "Error submitting upvote." }));
      console.error('[Upvote] Exception in handleUpvote:', e);
    }
    setUpvoteLoading(null);
    console.log('[Upvote] handleUpvote finished for request:', req.id);
  };

  return (
    <div className="retro-container">
      <div style={{ width: '100%' }}>
      <RetroHeader 
        setLoginOpen={setLoginOpen}
        loggedIn={loggedIn}
        loading={loading}
        setLoggedIn={setLoggedIn}
        setUserPubKey={setUserPubKey}
        setIsAdmin={setIsAdmin}
      />
      </div>
      {/* Main Layout: Sidebar + Feed */}
      <div className="flex flex-row max-w-7xl mx-auto mt-8">
        {/* Sidebar: Group Members */}
        <aside className="w-64 mt-8 bg-gray-100 border-r border-gray-300 p-4 flex flex-col gap-4 shadow-lg"
          style={{ height: 'auto', minHeight: 'unset', alignSelf: 'flex-start' }}>
          <h3 className="font-bold text-blue-800 mb-2">0XPARC Group Members</h3>
          <ul className="overflow-y-auto space-y-2">
            {members
              .slice() // copy to avoid mutating state
              .sort((a, b) => a.github_username.localeCompare(b.github_username))
              .map((m) => (
                <li key={m.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-200">
                  <img src={m.avatar_url} alt={m.github_username} className="retro-avatar" />
                  <span className="flex-1 font-mono text-sm">{m.github_username}</span>
                  <button
                    className="ml-1 p-1 rounded hover:bg-gray-300"
                    title="View public key"
                    onClick={() => handleOpenKeyModal(m)}
                  >
                    <span className="text-lg" role="img" aria-label="key">🔑</span>
                  </button>
                </li>
              ))}
          </ul>
          {/* Info note for joining group */}
          <div className="mt-4 text-xs text-gray-700 border-t pt-3">
            Want to be a part of the group? <br />
            <a href="#" className="underline text-blue-700" onClick={e => { e.preventDefault(); setLoginOpen(true); }}>Follow these steps</a> to generate an SSH key, then message an admin:
            <ul className="mt-1 ml-4 list-disc">
              {admins.length === 0 ? (
                <li className="italic text-gray-400">No admins listed</li>
              ) : (
                admins.map(a => (
                  <li key={a.id} className="font-mono">{a.github_username}</li>
                ))
              )}
            </ul>
          </div>
          {/* Admin Portal button at the bottom */}
          <a
            href="/admin"
            className="retro-btn mt-6"
            style={{
              background: 'transparent',
              color: '#1a237e',
              border: 'none',
              textDecoration: 'underline',
              fontWeight: 'normal',
              fontSize: 14,
              padding: 0,
              display: 'block',
              textAlign: 'center',
              borderRadius: 0,
              boxShadow: 'none',
              marginTop: 24,
            }}
          >
            Admin Portal
          </a>
        </aside>
        {/* Main Feed Area */}
        <main className="flex-1 flex flex-col items-center px-8">
          {/* Custom Copy/Intro */}
          <section className="w-full max-w-2xl mt-8 mb-8 bg-white border-2 border-gray-400  shadow p-6">
            <h1 className="retro-title mb-2 flex items-center gap-2">📝 Parc-It <span className="text-purple-500">✦</span></h1>
            <p className="retro-subtitle mb-2 text-lg">Every office suggestion here was posted by a member of 0xPARC—but we don't know which one, thanks to Zero Knowledge Proofs and Group Signatures.</p>
            <p className="text-sm text-gray-700">Submit requests for the office anonymously. Only group members can post, but no one (not even admins) can see who posted what.</p>
            <span className="blinking">✨ Verified by ZK Proofs ✨</span>
          </section>
          {/* Request Feed */}
          <div className="w-full max-w-xl mb-20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Office Requests</h2>
              <button
                className="ml-4 px-4 py-2 bg-[#1a237e] hover:bg-blue-800 text-white font-bold rounded border-2 border-gray-400 shadow"
                onClick={() => loggedIn && setAddRequestOpen(true)}
                disabled={!loggedIn}
                title={loggedIn ? "Submit a new office request" : "Log in to submit a request"}
                style={{ minWidth: 120, filter: !loggedIn ? 'grayscale(80%) opacity(0.5)' : 'none', cursor: !loggedIn ? 'not-allowed' : 'pointer' }}
              >
                + Add Request
              </button>
            </div>
            {requestsLoading ? (
              <div>Loading requests...</div>
            ) : requests.length === 0 ? (
              <div className="text-gray-500">No requests yet.</div>
            ) : (
              <>
                <ul className="space-y-4">
                  {requests.map((req) => {
                    // Find group member objects for avatars
                    const groupMemberObjs = Array.isArray(req.group_members)
                      ? members.filter(m => req.group_members.includes(m.github_username))
                      : [];
                    const isDoxxed = !!req.doxxed_member_id;
                    return (
                      <li key={req.id} className="border-2 border-gray-400  p-4 bg-white shadow-sm relative">
                        <div className="flex items-center gap-4">
                          <span className="text-3xl w-10 text-center">{req.emoji}</span>
                          <span className="flex-1 flex items-center gap-2">
                            <span className="retro-text">{req.description}</span>
                            <span className="retro-label flex items-center gap-1">{isDoxxed ? (<><span>Doxxed</span><span title="Your username is visible to admins and other users for this request." style={{cursor:'help'}}>ℹ️</span></>) : 'Anonymous'}</span>
                          </span>
                          <Button variant="outline" size="sm" className="ml-2" onClick={() => handleOpenVerify(req)}>Verify</Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="ml-2"
                            onClick={() => handleUpvote(req)}
                            disabled={!loggedIn || upvoteLoading === req.id /* || alreadyUpvoted */}
                          >
                            {upvoteLoading === req.id ? "Upvoting..." : "Upvote"}
                          </Button>
                        </div>
                        {/* Upvote count badge in bottom right */}
                        <span className="absolute bottom-2 right-4 text-xs text-purple-800 font-mono bg-purple-100 px-2 py-1 rounded shadow border border-purple-300 retro-badge">
                          {upvoteCounts[req.id] || 0} upvotes
                        </span>
                        <div className="flex items-center gap-2 mt-2 ml-14">
                          {groupMemberObjs.slice(0, 5).map((m, idx) => (
                            <img
                              key={m.id}
                              src={m.avatar_url}
                              alt={m.github_username}
                              title={m.github_username}
                              className="retro-avatar -ml-2 first:ml-0"
                              style={{ zIndex: 10 - idx }}
                            />
                          ))}
                          {groupMemberObjs.length > 5 && (
                            <span className="ml-1 px-2 py-0.5 bg-gray-200 text-xs rounded-full border border-gray-400 font-mono">+{groupMemberObjs.length - 5} more</span>
                          )}
                        </div>
                        {upvoteMsg[req.id] && (
                          <div className="text-xs mt-2 ml-14 text-purple-700">{upvoteMsg[req.id]}</div>
                        )}
                      </li>
                    );
                  })}
                </ul>
                {/* Pagination Controls */}
                <div className="flex justify-center items-center mt-6 gap-2">
                  <button
                    className="retro-btn px-3 py-1"
                    onClick={() => {
                      if (currentPage > 1) {
                        setCurrentPage(currentPage - 1);
                        fetchRequests(currentPage - 1, pageSize);
                      }
                    }}
                    disabled={currentPage === 1}
                    style={{ minWidth: 40 }}
                  >
                    &#8592; Prev
                  </button>
                  {/* Page Numbers */}
                  {Array.from({ length: Math.ceil(totalRequests / pageSize) }, (_, i) => i + 1).map(pageNum => (
                    <button
                      key={pageNum}
                      className={`retro-btn px-3 py-1 ${pageNum === currentPage ? 'bg-blue-200 border-blue-700' : ''}`}
                      onClick={() => {
                        setCurrentPage(pageNum);
                        fetchRequests(pageNum, pageSize);
                      }}
                      disabled={pageNum === currentPage}
                      style={{ minWidth: 32 }}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    className="retro-btn px-3 py-1"
                    onClick={() => {
                      const totalPages = Math.ceil(totalRequests / pageSize);
                      if (currentPage < totalPages) {
                        setCurrentPage(currentPage + 1);
                        fetchRequests(currentPage + 1, pageSize);
                      }
                    }}
                    disabled={currentPage === Math.ceil(totalRequests / pageSize) || totalRequests === 0}
                    style={{ minWidth: 40 }}
                  >
                    Next &#8594;
                  </button>
                  <span className="ml-4 text-xs text-gray-600 font-mono">
                    Page {currentPage} of {Math.max(1, Math.ceil(totalRequests / pageSize))}
                  </span>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
      {/* Modals (Key, Add Request, Verify) remain unchanged */}
      {addRequestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white  shadow-lg p-6 w-full max-w-md border-2 border-gray-300">
            <h2 className="text-xl font-bold mb-4">New Office Request</h2>
            {/* Toggle for Anonymous/Doxxed */}
            <div className="mb-4">
              <div className="flex items-center gap-4">
                <span className={`text-base font-semibold transition-colors duration-200 ${!isDoxxed ? 'text-[#1a237e]' : 'text-gray-500'}`}>Anonymous</span>
                <button
                  type="button"
                  className={`relative w-12 h-7 rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400
                    ${isDoxxed ? 'bg-blue-600 border-blue-700' : 'bg-gray-300 border-gray-400'}`}
                  onClick={() => setIsDoxxed(!isDoxxed)}
                  disabled={requestLoading}
                  aria-pressed={isDoxxed}
                  aria-label="Toggle anonymous/doxxed"
                  tabIndex={0}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200
                      ${isDoxxed ? 'translate-x-5' : 'translate-x-0'}`}
                    style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.10)' }}
                  />
                </button>
                <span className={`text-base font-semibold transition-colors duration-200 ${isDoxxed ? 'text-[#1a237e]' : 'text-gray-500'}`}>Doxxed</span>
              </div>
              <div className="mt-1">
                <span className="text-xs text-gray-500">{isDoxxed ? "Your username will be shown with this request." : "Your request will be anonymous among the group you select below."}</span>
              </div>
            </div>
            {/* If doxxed, show preview of user info */}
            {isDoxxed && loggedIn && (
              <div className="mb-4 flex items-center gap-2 bg-gray-50 p-2 rounded border">
                <img
                  src={members.find(m => m.public_key === userPubKey)?.avatar_url || ""}
                  alt={members.find(m => m.public_key === userPubKey)?.github_username || ""}
                  className="retro-avatar"
                />
                <span className="font-mono text-xs">{members.find(m => m.public_key === userPubKey)?.github_username || "Unknown"}</span>
              </div>
            )}
            <div className="mb-4">
              <label className="block mb-1 font-semibold">Emoji</label>
              <div className="relative flex items-center gap-2">
                <input
                  className="border rounded p-2 w-16 text-center text-2xl cursor-pointer bg-white"
                  placeholder="😀"
                  value={requestEmoji}
                  onClick={() => setShowEmojiPicker(v => !v)}
                  readOnly
                  disabled={requestLoading}
                  aria-label="Pick an emoji"
                />
                {showEmojiPicker && (
                  <div ref={emojiPickerRef} className="absolute z-50 top-12 left-0">
                    <EmojiPicker
                      onEmojiClick={(emojiData, event) => {
                        setRequestEmoji(emojiData.emoji);
                        setShowEmojiPicker(false);
                      }}
                      theme={Theme.LIGHT}
                      width={300}
                      height={350}
                      previewConfig={{ showPreview: false }}
                      emojiStyle={EmojiStyle.NATIVE}
                      style={{ '--epr-emoji-size': '1.4em' } as any}
                    />
                  </div>
                )}
              </div>
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-semibold">Description</label>
              <textarea
                className="border rounded p-2 w-full min-h-[80px]"
                placeholder="Describe your request..."
                value={requestDesc}
                onChange={e => setRequestDesc(e.target.value)}
                disabled={requestLoading}
              />
            </div>
            <div className="mb-4">
              <label className="block mb-1 font-semibold">Select Group Members</label>
              <div className="max-h-40 overflow-y-auto border rounded p-2 bg-gray-50">
                {[...(members || [])]
                  .sort((a, b) => {
                    if (a.public_key === userPubKey) return -1;
                    if (b.public_key === userPubKey) return 1;
                    return a.github_username.localeCompare(b.github_username);
                  })
                  .map((m) => (
                  <label key={m.id} className="flex items-center gap-2 py-1 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isDoxxed
                        ? m.public_key === userPubKey
                        : selectedGroup.includes(m.github_username)}
                      onChange={e => {
                        if (isDoxxed) return; // doxxed: only self, can't change
                        if (e.target.checked) {
                          setSelectedGroup([...selectedGroup, m.github_username]);
                        } else {
                          setSelectedGroup(selectedGroup.filter(u => u !== m.github_username));
                        }
                      }}
                      disabled={requestLoading || (isDoxxed && m.public_key !== userPubKey)}
                    />
                    <img src={m.avatar_url} alt={m.github_username} className="retro-avatar" />
                    <span className="font-mono text-xs">{m.github_username}</span>
                  </label>
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-1">{isDoxxed ? "Only you will be included in the group signature. To select other members, switch the toggle to anonymous." : "Only the selected members will be included in the group signature proof."}</div>
            </div>
            {requestMsg && (
              <div className={`mb-2 text-sm font-semibold ${requestMsg.includes('proof has been generated') ? 'text-green-600 bg-green-50 border border-green-200 rounded px-2 py-1' : requestMsg.toLowerCase().includes('success') ? 'text-green-600' : 'text-red-600'}`}>{
                requestMsg.includes('proof has been generated')
                  ? 'Your signature proof has been generated successfully. Your request has been submitted.'
                  : requestMsg
              }</div>
            )}
            {/* Progress bar for signature generation */}
            {requestLoading && <AnimatedEquation loading={requestLoading} />}
            {requestLoading && <ProgressBar />}
            {requestLoading && <ProofTimer loading={requestLoading} />}
            {/* Show SpeedReader if loading or proof generated */}
            {(requestLoading || (requestMsg && requestMsg.includes('proof has been generated'))) && (
              <SpeedReader script={PLONKY2_SCRIPT} loading={Boolean(requestLoading || (requestMsg && requestMsg.includes('proof has been generated')))} />
            )}
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setAddRequestOpen(false)} disabled={requestLoading}>
                {requestMsg && requestMsg.includes('proof has been generated') ? 'Close' : 'Cancel'}
              </Button>
              {requestMsg && requestMsg.includes('proof has been generated') ? null : (
                <Button variant="default" onClick={handleSubmitRequest} disabled={requestLoading}>
                  {requestLoading ? "Generating Proof..." : "Submit"}
                </Button>
              )}
            </div>
          </div>
        </div>
      )}
      {verifyModalOpen && verifyRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white  shadow-lg p-6 w-full max-w-md border-2 border-gray-300">
            <h2 className="text-xl font-bold mb-4">Verify Group Signature</h2>
            {/* Show request info */}
            <div className="mb-2">
              <span className="font-bold">Emoji:</span> <span className="text-2xl">{verifyRequest.emoji}</span>
            </div>
            <div className="mb-2">
              <span className="font-bold">Description:</span> {verifyRequest.description}
            </div>
            <div className="mb-4">
              <span className="font-bold">Group Members:</span>
              <ul className="list-none ml-0 text-sm">
                {Array.isArray(verifyRequest.group_members) && verifyRequest.group_members.length > 0 ? (
                  verifyRequest.group_members.map((username: string, idx: number) => (
                    <li key={idx} className="flex items-center gap-2 py-1">
                      <img
                        src={`https://github.com/${username}.png`}
                        alt={username}
                        className="retro-avatar"
                      />
                      <span className="font-mono">{username}</span>
                      <a
                        href={`https://github.com/${username}.keys`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 py-0.5 bg-gray-200 rounded text-xs hover:bg-blue-100 ml-1 flex items-center gap-1"
                      >
                        Verify Key
                        <svg xmlns="http://www.w3.org/2000/svg" width="1.25em" height="1.25em" viewBox="0 0 20 20" fill="none"><path d="M7 13L13 7M13 7H8M13 7V12" stroke="#1a237e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      </a>
                    </li>
                  ))
                ) : (
                  <li className="italic text-gray-500">No group members listed</li>
                )}
              </ul>
            </div>
            {/* If doxxed, skip signature verification */}
            {verifyRequest.doxxed_member_id ? (
              <div className="mb-4 text-blue-700 font-semibold bg-blue-50 border border-blue-200 rounded p-3 text-center flex flex-col items-center">
                <span>No signature to verify for doxxed requests.</span>
                <span className="mt-2 text-xs text-blue-900 flex items-center gap-1"><span>Doxxed</span><span title="The username of the submitter is visible to admins and other users for this request." style={{cursor:'help'}}>ℹ️</span></span>
              </div>
            ) : (
              <>
                {/* Raw signature with copy button */}
                <div className="mb-4">
                  <div className="flex items-center mb-1">
                    <span className="font-bold">Raw Signature:</span>
                    <button
                      className="ml-2 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                      onClick={() => {
                        if (verifyRequest.signature) {
                          navigator.clipboard.writeText(verifyRequest.signature);
                        }
                      }}
                      disabled={!verifyRequest.signature || signatureLoading}
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="font-mono bg-gray-100 rounded px-2 py-1 block whitespace-pre-wrap break-words max-w-full" style={{ minHeight: 40 }}>
                    {signatureLoading
                      ? <span className="text-gray-400">Loading signature...</span>
                      : (typeof verifyRequest.signature !== 'string' ? "N/A" : (() => {
                          const lines = verifyRequest.signature.split('\n').filter(Boolean);
                          if (lines.length < 4) return lines.join('\n');
                          const maxLen = 33;
                          return [
                            lines[0],
                            lines[1].slice(0, maxLen),
                            '...',
                            lines[lines.length - 2].slice(-maxLen),
                            lines[lines.length - 1]
                          ].join('\n');
                        })())}
                  </pre>
                </div>
                <div className="mb-4">
                  <Button variant="default" onClick={handleVerifySignature} disabled={signatureLoading || !verifyRequest.signature || verifyLoading}>
                    Verify Signature
                  </Button>
                </div>
                {verifyLoading && <AnimatedEquation loading={verifyLoading} />}
                {verifyLoading && <ProgressBar />}
                {verifyLoading && <ProofTimer loading={verifyLoading} />}
                {verifyLoading && <SpeedReader script={PLONKY2_SCRIPT} loading={verifyLoading} />}
                {verifyResult && (
                  <div className={`mb-4 ${verifyResult.valid ? 'text-green-700 bg-green-50 border border-green-200 rounded' : ''}`}>
                    <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
{verifyResult.valid
  ? `Proof Generated ✅\nSignature is valid!\nGroup keys:\n${verifyResult.groupKeys}`
  : `Invalid signature: ${verifyResult.error?.message || String(verifyResult.error)}`}
                    </pre>
                    {/* Nullifier display: only for upvotes (not regular group signatures) */}
                    {verifyResult.valid && 'nullifier' in verifyResult && verifyResult.nullifier && (
                      <div className="mt-2 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded p-2">
                        <span className="font-bold">Nullifier:</span> {Array.isArray(verifyResult.nullifier) ?
                          Buffer.from(verifyResult.nullifier).toString('hex') : String(verifyResult.nullifier)}
                        <br />
                        <span className="text-gray-500">(Nullifiers are only present for upvotes or actions requiring uniqueness. Regular group signatures do not include a nullifier.)</span>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={handleCloseVerify}>Close</Button>
            </div>
          </div>
        </div>
      )}
      {keyModalOpen && keyMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white  shadow-lg p-6 w-full max-w-md border-2 border-gray-300">
            <h2 className="text-xl font-bold mb-4">Public Key for {keyMember.github_username}</h2>
            <div className="mb-2 font-mono text-xs break-all bg-gray-100 p-2 rounded border border-gray-200">
              {keyMember.public_key}
            </div>
            <div className="flex gap-2 mb-4">
              <button
                className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                onClick={() => {
                  navigator.clipboard.writeText(keyMember.public_key);
                }}
              >
                Copy
              </button>
              <a
                className="px-2 py-1 bg-gray-300 rounded text-xs hover:bg-gray-400"
                href={`https://github.com/${keyMember.github_username}.keys`}
                target="_blank"
                rel="noopener noreferrer"
              >
                Verify on GitHub
              </a>
            </div>
            <div className="flex justify-end">
              <Button variant="outline" onClick={handleCloseKeyModal}>Close</Button>
            </div>
          </div>
        </div>
      )}
      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLogin={handleLogin}
        groupPublicKeys={members.map(m => m.public_key).join('\n')}
        admin={isAdmin}
      />
    </div>
  );
}