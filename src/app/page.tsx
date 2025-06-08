"use client";
import { LoginModal } from "../components/LoginModal";
import React, { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { getPlonky2Worker } from "../helpers/plonky2/utils";
import RetroHeader from "../components/RetroHeader";
import { OfficeRequest, GroupMember } from "../types/models";
import { is4096RsaKey } from "../helpers/utils";
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
  const { requests, loading: requestsLoading, totalRequests, fetchRequests, requestMsg, requestLoading, submitRequest } = useRequests();
  const { upvoteCounts, upvoteLoading, fetchUpvoteCounts, submitUpvote, upvoteMsg } = useUpvotes();
  const { verifyResult, verifyLoading, verifyRequestSignature, setVerifyResult } = useRequestVerification();

  const handleLogin = async (key: string, pubKey: string) => {
    setIsAdmin(false);
    try {
      // Only local validation: check if we can derive a valid SSH key from the Parc-It Key
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
    // setRequestMsg(null);
    // setRequestLoading(false);
    // Instead, rely on useRequests hook's state reset on modal open/close
  }, [addRequestOpen]);

  // Add this useEffect after the isDoxxed state declaration:
  useEffect(() => {
    if (addRequestOpen) {
      setIsDoxxed(true); // Doxxed is default
    }
  }, [addRequestOpen]);

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
    // Auto-login if Parc-It key is in localStorage
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

  return (
    <div className="retro-container">
      <div style={{ width: '100%' }}>
      <RetroHeader 
        setLoginOpen={setLoginOpen}
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
              <RequestFeed
                requests={requests}
                members={members}
                upvoteCounts={upvoteCounts}
                loggedIn={loggedIn}
                upvoteLoading={upvoteLoading}
                submitUpvote={submitUpvote}
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
      />
      <VerifyModal
        isOpen={verifyModalOpen}
        onClose={handleCloseVerify}
        request={verifyRequest}
        loading={verifyLoading}
        result={verifyResult}
        onVerify={verifyRequestSignature}
        members={members}
      />
      <KeyModal
        isOpen={keyModalOpen}
        onClose={handleCloseKeyModal}
        member={keyMember}
      />
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