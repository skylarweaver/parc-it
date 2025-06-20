"use client";
import { LoginModal } from "../components/LoginModal";
import React, { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { getPlonky2Worker, getDKGroupCheck } from "../helpers/plonky2/utils";
import RetroHeader from "../components/RetroHeader";
import { OfficeRequest, GroupMember } from "../types/models";
import { is4096RsaKey, sha256Hex } from "../helpers/utils";
import { useMembers } from "../helpers/hooks/useMembers";
import { useAdmins } from "../helpers/hooks/useAdmins";
import { useRequests } from "../helpers/hooks/useRequests";
import { useUpvotes } from "../helpers/hooks/useUpvotes";
import { useRequestVerification } from "../helpers/hooks/useRequestVerification";
import { GroupSidebar } from "../components/GroupSidebar";
import { RequestFeed } from "../components/RequestFeed";
import { AddRequestModal } from "../components/AddRequestModal";
import { VerifyModal } from "../components/VerifyModal";
import { KeyModal } from "../components/KeyModal";
import { SignupModal } from "../components/SignupModal";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function Home() {
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [loggedIn, setLoggedIn] = React.useState(false);
  const [userPubKey, setUserPubKey] = React.useState<string | null>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [addRequestOpen, setAddRequestOpen] = React.useState(false);
  const [requestEmoji, setRequestEmoji] = React.useState("");
  const [requestDesc, setRequestDesc] = React.useState("");
  const [verifyModalOpen, setVerifyModalOpen] = React.useState(false);
  const [verifyRequest, setVerifyRequest] = React.useState<OfficeRequest | null>(null);
  const [keyModalOpen, setKeyModalOpen] = React.useState(false);
  const [keyMember, setKeyMember] = React.useState<GroupMember | null>(null);
  const [selectedGroup, setSelectedGroup] = React.useState<string[]>([]);
  const [parcItKey, setParcItKey] = React.useState<string | null>(null);
  const [isDoxxed, setIsDoxxed] = React.useState(true);
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const emojiPickerRef = React.useRef<HTMLDivElement>(null);
  const verifyResultCache = React.useRef<Record<string, {valid: boolean, groupKeys?: string, error?: unknown}>>({});
  const [currentPage, setCurrentPage] = React.useState(1);
  const [pageSize] = React.useState(10);
  const { members, fetchMembers } = useMembers();
  const { admins, fetchAdmins } = useAdmins();
  const { requests, loading: requestsLoading, totalRequests, fetchRequests, requestMsg, requestLoading, submitRequest, setRequestMsg, setRequestLoading, requestSuccess, setRequestSuccess } = useRequests();
  const { upvoteCounts, upvoteLoading, fetchUpvoteCounts, submitUpvote, unUpvote, upvoteMsg, upvotersByRequest } = useUpvotes();
  const { verifyResult, verifyLoading, verifyRequestSignature, setVerifyResult } = useRequestVerification();
  const [signupOpen, setSignupOpen] = React.useState(false);
  const [signupLoading, setSignupLoading] = React.useState(false);
  const [signupError, setSignupError] = React.useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = React.useState(false);
  const [signupAlreadySignedUp, setSignupAlreadySignedUp] = React.useState(false);
  const [signupPrefillKey, setSignupPrefillKey] = React.useState<string | undefined>(undefined);
  const [sortOrder, setSortOrder] = React.useState<'date' | 'upvotes'>('date');
  const [dateFilter, setDateFilter] = React.useState<'all' | 'week' | 'twoweeks' | 'month'>('all');

  const handleLogin = async (key: string, pubKey: string) => {
    setIsAdmin(false);
    try {
      // Only local validation: check if we can derive a valid SSH key from the Double Blind Key
      if (!pubKey || pubKey.startsWith("ERROR")) {
        setLoggedIn(false);
        setUserPubKey(null);
        setParcItKey(null);
        return;
      }
      if (!is4096RsaKey(pubKey)) {
        setLoggedIn(false);
        setUserPubKey(null);
        setParcItKey(null);
        return;
      }
      setLoggedIn(true);
      setUserPubKey(pubKey);
      setParcItKey(key);
      setLoginOpen(false);
      localStorage.setItem("parcItKey", key);
      localStorage.setItem("parcItPubKey", pubKey);
      // Compute and store SHA-256 hash of the key
      const hashedKey = await sha256Hex(key);
      localStorage.setItem("parcItHashedKey", hashedKey);
      // Start circuit initialization in the background
      const worker = getPlonky2Worker();
      const id = Date.now().toString() + Math.random().toString(16);
      worker.postMessage({ id, op: 'initCircuit', args: {} });
    } catch (e) {
      setLoggedIn(false);
      setUserPubKey(null);
      setParcItKey(null);
      setIsAdmin(false);
      console.error(e);
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
  }, [addRequestOpen]);

  // Add this useEffect after the isDoxxed state declaration:
  useEffect(() => {
    if (addRequestOpen) {
      setIsDoxxed(true); // Doxxed is default
    }
  }, [addRequestOpen]);

  // Reset all AddRequestModal state fields when modal is opened
  useEffect(() => {
    if (addRequestOpen) {
      setRequestEmoji("");
      setRequestDesc("");
      setIsDoxxed(true);
      setShowEmojiPicker(false);
      if (members.length > 0) {
        setSelectedGroup(members.map((m) => m.github_username));
      } else {
        setSelectedGroup([]);
      }
      // Reset request modal state
      setRequestMsg(null);
      setRequestLoading(false);
    }
  }, [addRequestOpen, members]);

  // Open verify modal for a request
  const handleOpenVerify = async (req: OfficeRequest) => {
    if (req.signature) {
      setVerifyRequest(req);
      const cacheKey = req.id || req.signature || '';
      if (verifyResultCache.current[cacheKey]) {
        setVerifyResult(verifyResultCache.current[cacheKey]);
      } else {
        setVerifyResult(null);
      }
      setVerifyModalOpen(true);
    } else {
      // Open modal immediately with loading state
      setVerifyRequest(req);
      setVerifyModalOpen(true);
      // Fetch the full request with signature
      const { data, error } = await supabase
        .from("office_requests")
        .select("id, emoji, description, created_at, deleted, group_members, doxxed_member_id, signature")
        .eq("id", req.id)
        .single();
      if (error) {
        alert("Failed to fetch signature for this request.");
        return;
      }
      setVerifyRequest(data);
      const cacheKey = data.id || data.signature || '';
      if (verifyResultCache.current[cacheKey]) {
        setVerifyResult(verifyResultCache.current[cacheKey]);
      } else {
        setVerifyResult(null);
      }
    }
  };
  const handleCloseVerify = () => {
    setVerifyModalOpen(false);
    setVerifyRequest(null);
  };

  // Open/close key modal
  const handleOpenKeyModal = (member: GroupMember) => {
    setKeyMember(member);
    setKeyModalOpen(true);
  };
  const handleCloseKeyModal = () => {
    setKeyModalOpen(false);
    setKeyMember(null);
  };

  React.useEffect(() => {
    // Auto-login if Double Blind Key is in localStorage
    const storedKey = localStorage.getItem("parcItKey");
    const storedPubKey = localStorage.getItem("parcItPubKey");
    if (storedKey && storedPubKey) {
      setLoggedIn(true);
      setUserPubKey(storedPubKey);
      setParcItKey(storedKey);
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

  // Fetch upvote counts whenever requests change
  useEffect(() => {
    if (requests.length > 0) {
      fetchUpvoteCounts(requests.map(r => r.id));
    }
  }, [requests, fetchUpvoteCounts]);

  useEffect(() => {
    if (!addRequestOpen) {
      fetchRequests(currentPage, pageSize);
    }
  }, [currentPage, pageSize, addRequestOpen, fetchRequests]);

  // Handler for signup
  const handleSignup = async (githubUsername: string, hashedKey: string, doubleBlindKey: string) => {
    setSignupLoading(true);
    setSignupError(null);
    setSignupSuccess(false);
    setSignupAlreadySignedUp(false);
    try {
      const resp = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ githubUsername, hashedKey })
      });
      const data = await resp.json();
      if (!resp.ok) {
        setSignupError(data.error || "Signup failed. Please try again.");
        setSignupLoading(false);
        return;
      }
      setSignupSuccess(true);
      setSignupAlreadySignedUp(!!data.alreadySignedUp);
      // Store hashed key in localStorage for login flow
      localStorage.setItem("parcItHashedKey", hashedKey);
      // Derive and store public key just like in login
      const groupPublicKeys = members.map(m => m.public_key).join("\n");
      let userPubKey: string | null = null;
      try {
        const result = await getDKGroupCheck(groupPublicKeys, doubleBlindKey);
        const idx = result.user_public_key_index;
        const groupKeysArray = groupPublicKeys.split('\n');
        if (idx !== undefined && idx >= 0 && idx < groupKeysArray.length) {
          userPubKey = groupKeysArray[idx];
        }
      } catch {
        // fallback: do not set userPubKey
      }
      setLoggedIn(true);
      setUserPubKey(userPubKey);
      setParcItKey(doubleBlindKey);
      setLoginOpen(false);
      localStorage.setItem("parcItKey", doubleBlindKey);
      if (userPubKey) {
        localStorage.setItem("parcItPubKey", userPubKey);
      }
      // Start circuit initialization in the background
      const worker = getPlonky2Worker();
      const id = Date.now().toString() + Math.random().toString(16);
      worker.postMessage({ id, op: 'initCircuit', args: {} });
    } catch {
      setSignupError("Network error. Please try again.");
    } finally {
      setSignupLoading(false);
    }
  };

  // Reset success state when modal is closed or opened
  React.useEffect(() => {
    if (!signupOpen) {
      setSignupSuccess(false);
      setSignupAlreadySignedUp(false);
      setSignupError(null);
    }
  }, [signupOpen]);

  // Handler to open signup modal with prefilled key
  const handleSignupWithKey = (key: string) => {
    setSignupPrefillKey(key);
    setSignupOpen(true);
    setLoginOpen(false);
  };

  // Reset prefill key when signup modal closes
  React.useEffect(() => {
    if (!signupOpen) {
      setSignupPrefillKey(undefined);
    }
  }, [signupOpen]);

  // Compute filtered and sorted requests
  const filteredRequests = React.useMemo(() => {
    if (dateFilter === 'all') return requests;
    const now = new Date();
    let cutoff: Date;
    if (dateFilter === 'week') {
      cutoff = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (dateFilter === 'twoweeks') {
      cutoff = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
    } else if (dateFilter === 'month') {
      cutoff = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    } else {
      cutoff = new Date(0);
    }
    return requests.filter(r => new Date(r.created_at) >= cutoff);
  }, [requests, dateFilter]);

  const sortedRequests = React.useMemo(() => {
    if (sortOrder === 'upvotes') {
      return [...filteredRequests].sort((a, b) => {
        const upA = upvoteCounts[a.id] || 0;
        const upB = upvoteCounts[b.id] || 0;
        if (upB !== upA) return upB - upA;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else {
      return [...filteredRequests].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  }, [filteredRequests, upvoteCounts, sortOrder]);

  return (
    <div className="retro-container">
      <div style={{ width: '100%' }}>
        <RetroHeader 
          setLoginOpen={(open: boolean) => { setLoginOpen(open); if (open) setSignupOpen(false); }}
          setSignupOpen={setSignupOpen}
          loggedIn={loggedIn}
          setLoggedIn={setLoggedIn}
          setUserPubKey={setUserPubKey}
          setIsAdmin={setIsAdmin}
        />
      </div>
      {/* Main Layout: Sidebar + Feed */}
      <div className="flex flex-row max-w-7xl mx-auto mt-8">
        {/* Sidebar: Group Members */}
        <GroupSidebar members={members} admins={admins} setLoginOpen={setLoginOpen} handleOpenKeyModal={handleOpenKeyModal} />
        {/* Main Feed Area */}
        <main className="flex-1 flex flex-col items-center px-8">
          {/* Custom Copy/Intro */}
          <section className="w-full max-w-2xl mt-8 mb-8 bg-white border-2 border-gray-400  shadow p-6">
            <h1 className="retro-title mb-2 flex items-center gap-2">📝 Parc-It <span className="text-purple-500">✦</span></h1>
            <p className="retro-subtitle mb-2 text-lg">Every office suggestion here was posted by a member of 0xPARC—but we don&apos;t know which one, thanks to Zero Knowledge Proofs and Group Signatures.</p>
            <p className="text-sm text-gray-700">Submit your ideas to improve the new office. Only group members can post. If posted in anonymous mode, no one (not even admins) can see who posted the idea.</p>
            <span className="blinking">✨ Verified by ZK Proofs ✨</span>
          </section>
          {/* Request Feed */}
          <div className="w-full max-w-xl mb-20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Office Ideas</h2>
              <button
                className="ml-4 px-4 py-2 bg-[#1a237e] hover:bg-blue-800 text-white font-bold rounded border-2 border-gray-400 shadow"
                onClick={() => loggedIn && setAddRequestOpen(true)}
                disabled={!loggedIn}
                title={loggedIn ? "Submit a new office idea" : "Log in to submit a request"}
                style={{ minWidth: 120, filter: !loggedIn ? 'grayscale(80%) opacity(0.5)' : 'none', cursor: !loggedIn ? 'not-allowed' : 'pointer' }}
              >
                + Add Idea
              </button>
            </div>
            {requestsLoading ? (
              <div>Loading requests...</div>
            ) : requests.length === 0 ? (
              <div className="text-gray-500">No requests yet.</div>
            ) : (
              <RequestFeed
                requests={sortedRequests}
                members={members}
                upvoteCounts={upvoteCounts}
                loggedIn={loggedIn}
                upvoteLoading={upvoteLoading}
                submitUpvote={submitUpvote}
                unUpvote={unUpvote}
                handleOpenVerify={handleOpenVerify}
                currentPage={currentPage}
                pageSize={pageSize}
                totalRequests={totalRequests}
                setCurrentPage={setCurrentPage}
                fetchRequests={fetchRequests}
                upvoteMsg={upvoteMsg}
                parcItKey={parcItKey}
                userPubKey={userPubKey}
                fetchUpvoteCounts={fetchUpvoteCounts}
                upvotersByRequest={upvotersByRequest}
                sortOrder={sortOrder}
                setSortOrder={setSortOrder}
                dateFilter={dateFilter}
                setDateFilter={setDateFilter}
              />
            )}
          </div>
        </main>
      </div>
      {/* Modals (Key, Add Request, Verify) remain unchanged */}
      <AddRequestModal
        isOpen={addRequestOpen}
        onClose={() => setAddRequestOpen(false)}
        requestEmoji={requestEmoji}
        setRequestEmoji={setRequestEmoji}
        requestDesc={requestDesc}
        setRequestDesc={setRequestDesc}
        isDoxxed={isDoxxed}
        setIsDoxxed={setIsDoxxed}
        selectedGroup={selectedGroup}
        setSelectedGroup={setSelectedGroup}
        members={members}
        userPubKey={userPubKey}
        loggedIn={loggedIn}
        requestMsg={requestMsg}
        requestLoading={requestLoading}
        submitRequest={() => submitRequest(requestEmoji, requestDesc, isDoxxed, selectedGroup, parcItKey, userPubKey, members, fetchRequests, currentPage, pageSize)}
        showEmojiPicker={showEmojiPicker}
        setShowEmojiPicker={setShowEmojiPicker}
        emojiPickerRef={emojiPickerRef as React.RefObject<HTMLDivElement>}
        requestSuccess={requestSuccess}
        setRequestSuccess={setRequestSuccess}
      />
      <VerifyModal
        isOpen={verifyModalOpen}
        onClose={handleCloseVerify}
        request={verifyRequest}
        loading={verifyLoading}
        result={verifyResult}
        onVerify={verifyRequestSignature}
        members={members}
        upvoters={
          verifyRequest && upvotersByRequest[verifyRequest.id]
            ? (upvotersByRequest[verifyRequest.id]
                .map(pk => {
                  const member = members.find(m => m.public_key === pk);
                  return member ? member.github_username : null;
                })
                .filter((u): u is string => Boolean(u)))
            : []
        }
      />
      <KeyModal
        isOpen={keyModalOpen}
        onClose={handleCloseKeyModal}
        member={keyMember}
      />
      <SignupModal
        isOpen={signupOpen}
        onClose={() => setSignupOpen(false)}
        onSignup={handleSignup}
        loading={signupLoading}
        error={signupError || undefined}
        success={signupSuccess}
        alreadySignedUp={signupAlreadySignedUp}
        prefillKey={signupPrefillKey}
      />
      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLogin={handleLogin}
        groupPublicKeys={members.map(m => m.public_key).join("\n")}
        admin={isAdmin}
        onSignupWithKey={handleSignupWithKey}
      />
    </div>
  );
}