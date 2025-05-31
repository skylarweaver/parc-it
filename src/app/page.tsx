"use client";
import Image from "next/image";
import { Button } from "../components/ui/button";
import { LoginModal } from "../components/LoginModal";
import React, { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { generateSignature, verifySignature, getPlonky2Worker } from "../helpers/plonky2/utils";
import { Switch } from "../components/ui/switch";
import EmojiPicker, { Theme, EmojiStyle } from 'emoji-picker-react';
import ProgressBar from "../components/ui/ProgressBar";
import PLONKY2_SCRIPT from "./helpers/plonky2/plonky2Script";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

function AnimatedEquation({ loading }: { loading: boolean }) {
  const [equation, setEquation] = React.useState("");
  const [elapsed, setElapsed] = React.useState(0);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  React.useEffect(() => {
    if (!loading) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setElapsed(0);
      return;
    }
    const p = (2n ** 64n) - (2n ** 32n) + 1n;
    function randomBigInt(min: bigint, max: bigint) {
      const range = max - min;
      const rand = BigInt(Math.floor(Math.random() * Number(range)));
      return min + rand;
    }
    function fmt(n: bigint) {
      return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    function generateEquation() {
      const a = randomBigInt(10n ** 18n, 15n * 10n ** 18n);
      const b = randomBigInt(8n * 10n ** 18n, 12n * 10n ** 18n);
      const c = BigInt(Math.floor(Math.random() * 999) + 1);
      const d = (a * b + c) % p;
      return `${fmt(d)} = ${fmt(a)} × ${fmt(b)} + ${fmt(c)} (mod p)`;
    }
    setEquation(generateEquation());
    setElapsed(0);
    const interval = 50;
    intervalRef.current = setInterval(() => {
      setEquation(generateEquation());
      setElapsed(e => e + interval / 1000);
    }, interval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loading]);
  if (!loading) return null;
  return (
    <>
      <div className="w-full text-center text-xs font-mono text-gray-500 mb-1" style={{userSelect:'none'}}>
        {equation}
        <br />
        where Goldilocks prime p = 18,446,744,069,414,584,321
      </div>
    </>
  );
}

function ProofTimer({ loading }: { loading: boolean }) {
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    if (!loading) {
      setElapsed(0);
      return;
    }
    let elapsedMs = 0;
    const interval = setInterval(() => {
      elapsedMs += 1000;
      setElapsed(Math.floor(elapsedMs / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [loading]);
  if (!loading) return null;
  return (
    <div className="w-full text-center text-xs font-mono text-gray-400 mt-1 mb-2" style={{userSelect:'none'}}>
      {elapsed} / ~500 seconds
    </div>
  );
}

// SpeedReader component
function SpeedReader({ script, loading }: { script: string, loading: boolean }) {
  const [index, setIndex] = React.useState(0);
  const [words, setWords] = React.useState<string[]>([]);
  const [wpm, setWpm] = React.useState(100);
  const [maxWpm, setMaxWpm] = React.useState(300);
  const [paused, setPaused] = React.useState(false);
  const [showControls, setShowControls] = React.useState(false);
  const rampUpTime = 5; // seconds to reach target speed
  const minWpm = 100;
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Split script into words, keeping section breaks and line breaks as tokens
  React.useEffect(() => {
    const tokens = script
      .replace(/\n/g, ' <br> ')
      .replace(/⸻/g, ' <section> ')
      .split(/\s+/)
      .filter(Boolean);
    setWords(tokens);
    setIndex(0);
    setWpm(minWpm);
    setMaxWpm(300);
    setPaused(false);
    setShowControls(false);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (loading) {
      controlsTimeoutRef.current = setTimeout(() => setShowControls(true), 10000);
    }
  }, [script, loading]);

  // Animate word display
  React.useEffect(() => {
    if (!loading || words.length === 0 || paused) {
      if (intervalRef.current) clearTimeout(intervalRef.current);
      return;
    }
    if (index >= words.length) return;
    // Calculate current wpm (ramp up)
    let rampProgress = Math.min(index / (words.length * (rampUpTime * minWpm / 60)), 1);
    // If maxWpm was increased, ramp up to new maxWpm immediately
    let currentWpm = Math.round(minWpm + (maxWpm - minWpm) * rampProgress);
    if (rampProgress >= 1 || maxWpm > 300) currentWpm = maxWpm;
    setWpm(currentWpm);
    // Determine delay
    let delay = 60000 / currentWpm;
    const word = words[index];
    if (word === '<br>') delay = 400;
    if (word === '<section>') delay = 900;
    if (/[.!?…]$/.test(word)) delay += 200;
    intervalRef.current = setTimeout(() => {
      setIndex(i => i + 1);
    }, delay);
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [index, words, loading, paused, maxWpm]);

  React.useEffect(() => {
    if (!loading) setIndex(0);
  }, [loading]);

  if (!loading || words.length === 0 || index >= words.length) return null;
  const word = words[index];
  const controls = showControls && (
    <div className="flex items-center justify-between w-full max-w-xs mx-auto mb-2" style={{ minHeight: 40 }}>
      {/* Pause/Play button on the left */}
      <button
        aria-label={paused ? 'Resume' : 'Pause'}
        onClick={() => {
          setPaused(p => !p);
          // TODO: Remove this log
          console.log(paused ? 'SpeedReader: Resume' : 'SpeedReader: Pause');
        }}
        className="text-gray-600 hover:text-gray-900 text-lg px-2 py-1 rounded-full bg-gray-200 hover:bg-gray-300 shadow transition-all focus:outline-none"
        style={{ minWidth: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {paused ? (
          // Play icon (right-facing triangle)
          <svg width="1.1em" height="1.1em" viewBox="0 0 20 20" fill="none"><polygon points="7,5 15,10 7,15" fill="currentColor"/></svg>
        ) : (
          // Pause icon (two vertical bars)
          <svg width="1.1em" height="1.1em" viewBox="0 0 20 20" fill="none"><rect x="6" y="5" width="2.5" height="10" rx="1" fill="currentColor"/><rect x="11.5" y="5" width="2.5" height="10" rx="1" fill="currentColor"/></svg>
        )}
      </button>
      {/* Word display in the center */}
      <div className="flex-1 flex justify-center items-center">
        {word === '<br>' ? (
          <div style={{height:32}}></div>
        ) : word === '<section>' ? (
          <div style={{height:32}}><span className="text-2xl text-gray-300">⸻</span></div>
        ) : (
          <div className="w-full text-center text-2xl font-mono text-gray-700 select-none" style={{minHeight:40, lineHeight:'40px'}}>
            {word}
          </div>
        )}
      </div>
      {/* Speed controls on the right, vertical layout */}
      <div className="flex flex-col items-center justify-center ml-2" style={{height: 40}}>
        <button
          aria-label="Speed up"
          onClick={() => {
            setMaxWpm(w => {
              const newWpm = w + 100;
              return newWpm;
            });
          }}
          className="text-blue-700 hover:text-white text-base px-2 py-1 rounded-full bg-blue-100 hover:bg-blue-500 shadow transition-all focus:outline-none mb-1"
          style={{ minWidth: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {/* Upward arrow icon */}
          <svg width="1em" height="1em" viewBox="0 0 20 20" fill="none"><path d="M10 16V4M10 4L6 8M10 4L14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
        <button
          aria-label="Speed down"
          onClick={() => {
            setMaxWpm(w => {
              const newWpm = Math.max(100, w - 100);
              return newWpm;
            });
          }}
          className="text-blue-700 hover:text-white text-base px-2 py-1 rounded-full bg-blue-100 hover:bg-blue-500 shadow transition-all focus:outline-none mt-1"
          style={{ minWidth: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {/* Downward arrow icon */}
          <svg width="1em" height="1em" viewBox="0 0 20 20" fill="none"><path d="M10 4V16M10 16L6 12M10 16L14 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>
    </div>
  );
  // Always render controls above the word display, even for breaks
  return (
    <div className="w-full flex flex-col items-center">
      {controls}
    </div>
  );
}

export default function Home() {
  const [loginOpen, setLoginOpen] = React.useState(false);
  const [loginStatus, setLoginStatus] = React.useState<string | null>(null);
  const [loggedIn, setLoggedIn] = React.useState(false);
  const [userPubKey, setUserPubKey] = React.useState<string | null>(null);
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [members, setMembers] = React.useState<any[]>([]);
  const [memberLoading, setMemberLoading] = React.useState(false);
  const [addUsername, setAddUsername] = React.useState("");
  const [adminMsg, setAdminMsg] = React.useState<string | null>(null);
  const [addRequestOpen, setAddRequestOpen] = React.useState(false);
  const [requestEmoji, setRequestEmoji] = React.useState("");
  const [requestDesc, setRequestDesc] = React.useState("");
  const [requestMsg, setRequestMsg] = React.useState<string | null>(null);
  const [requestLoading, setRequestLoading] = React.useState(false);
  const [requests, setRequests] = React.useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = React.useState(false);
  const [verifyModalOpen, setVerifyModalOpen] = React.useState(false);
  const [verifyRequest, setVerifyRequest] = React.useState<any>(null);
  const [deleteLoading, setDeleteLoading] = React.useState(false);
  const [keyModalOpen, setKeyModalOpen] = React.useState(false);
  const [keyMember, setKeyMember] = React.useState<any>(null);
  const [selectedGroup, setSelectedGroup] = React.useState<string[]>([]);
  const [parcItKey, setParcItKey] = React.useState<string | null>(null);
  const [verifyResult, setVerifyResult] = React.useState<{valid: boolean, groupKeys?: string, error?: any} | null>(null);
  const [isDoxxed, setIsDoxxed] = React.useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = React.useState(false);
  const emojiPickerRef = React.useRef<HTMLDivElement>(null);
  const [admins, setAdmins] = React.useState<any[]>([]);
  const [verifyLoading, setVerifyLoading] = React.useState(false);
  const verifyResultCache = React.useRef<Record<string, {valid: boolean, groupKeys?: string, error?: any}>>({});

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

  // Add member handler
  const handleAddMember = async () => {
    setAdminMsg(null);
    if (!addUsername.trim()) {
      setAdminMsg("Please enter a GitHub username.");
      return;
    }
    setMemberLoading(true);
    try {
      const username = addUsername.trim();
      const avatar_url = `https://github.com/${username}.png`;
      // Use the new API route to fetch keys
      const keysResp = await fetch(`/api/github-keys?username=${encodeURIComponent(username)}`);
      const keysData = await keysResp.json();
      if (!keysResp.ok) {
        setAdminMsg(keysData.error || "Failed to fetch keys for this user.");
        setMemberLoading(false);
        return;
      }
      // Find the first ssh-rsa key
      const public_key = (keysData.keys || []).find((k: string) => k.startsWith("ssh-rsa ")) || "";
      if (!public_key) {
        setAdminMsg("No ssh-rsa public key found for this GitHub user.");
        setMemberLoading(false);
        return;
      }
      const { error } = await supabase.from("group_members").insert({
        github_username: username,
        avatar_url,
        public_key,
      });
      if (error) {
        setAdminMsg("Failed to add member: " + error.message);
        console.error(error);
      } else {
        setAdminMsg("Member added successfully.");
        setAddUsername("");
        // Refresh member list
        const { data } = await supabase.from("group_members").select("id, github_username, avatar_url, public_key");
        setMembers(data || []);
      }
    } catch (e) {
      setAdminMsg("Unexpected error adding member.");
      console.error(e);
    }
    setMemberLoading(false);
  };

  // Remove member handler
  const handleRemoveMember = async (id: string) => {
    setAdminMsg(null);
    setMemberLoading(true);
    try {
      const { error } = await supabase.from("group_members").delete().eq("id", id);
      if (error) {
        setAdminMsg("Failed to remove member: " + error.message);
        console.error(error);
      } else {
        setAdminMsg("Member removed successfully.");
        // Refresh member list
        const { data } = await supabase.from("group_members").select("id, github_username, avatar_url, public_key");
        setMembers(data || []);
      }
    } catch (e) {
      setAdminMsg("Unexpected error removing member.");
      console.error(e);
    }
    setMemberLoading(false);
  };

  // When opening the Add Request modal, default to all members selected (only if selectedGroup is empty)
  useEffect(() => {
    if (addRequestOpen && selectedGroup.length === 0 && members.length > 0) {
      setSelectedGroup(members.map((m) => m.github_username));
    }
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
    setRequestLoading(true);
    try {
      // Determine group_members and doxxed_member_id
      let groupMembers: string[] = [];
      let doxxedMemberId: string | null = null;
      if (isDoxxed) {
        const self = members.find(m => m.public_key === userPubKey);
        if (!self) {
          setRequestMsg("Could not find your group member info for doxxed request.");
          setRequestLoading(false);
          return;
        }
        groupMembers = [self.github_username];
        doxxedMemberId = self.id;
      } else {
        groupMembers = selectedGroup;
        doxxedMemberId = null;
      }
      // Build message and group keys
      const message = `${requestEmoji} ${requestDesc}`;
      const groupKeys = members
        .filter((m) => groupMembers.includes(m.github_username))
        .map((m) => m.public_key)
        .join('\n');
      // Generate signature only if anonymous
      let signature = null;
      if (!isDoxxed) {
        signature = await generateSignature(message, groupKeys, parcItKey);
      }
      // Submit request with signature (or null)
      const { error } = await supabase.from("office_requests").insert({
        emoji: requestEmoji.trim(),
        description: requestDesc.trim(),
        signature, // null for doxxed, real signature for anonymous
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
        if (isDoxxed) {
          setRequestMsg("Proof Generated ✅");
        } else {
          setRequestMsg("Your proof has been generated and is ready to use.");
        }
        setRequestEmoji("");
        setRequestDesc("");
        // Do NOT close the modal automatically; let the user close it
        // setTimeout(() => {
        //   setAddRequestOpen(false);
        //   setRequestMsg(null);
        // }, 1000);
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

  // Fetch requests from Supabase
  const fetchRequests = async () => {
    setRequestsLoading(true);
    try {
      const { data, error } = await supabase
        .from("office_requests")
        .select("id, emoji, description, created_at, deleted, group_members, signature, doxxed_member_id")
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Failed to fetch requests:", error);
        setRequests([]);
      } else {
        setRequests((data || []).filter((r: any) => !r.deleted));
      }
    } catch (e) {
      console.error("Unexpected error fetching requests:", e);
      setRequests([]);
    }
    setRequestsLoading(false);
  };

  // Fetch requests on mount and after modal closes
  useEffect(() => {
    fetchRequests();
  }, []);
  useEffect(() => {
    if (!addRequestOpen) {
      fetchRequests();
    }
  }, [addRequestOpen]);

  // Open verify modal for a request
  const handleOpenVerify = (req: any) => {
    setVerifyRequest(req);
    // Use request.id if available, else fallback to signature as key
    const cacheKey = req.id || req.signature || '';
    if (verifyResultCache.current[cacheKey]) {
      setVerifyResult(verifyResultCache.current[cacheKey]);
    } else {
      setVerifyResult(null);
    }
    setVerifyModalOpen(true);
  };
  const handleCloseVerify = () => {
    setVerifyModalOpen(false);
    setVerifyRequest(null);
  };

  // Admin delete handler
  const handleDeleteRequest = async (id: string) => {
    setDeleteLoading(true);
    try {
      const { error } = await supabase.from("office_requests").update({ deleted: true }).eq("id", id);
      if (error) {
        alert("Failed to delete request: " + error.message);
      } else {
        handleCloseVerify();
        fetchRequests();
      }
    } catch (e) {
      alert("Unexpected error deleting request.");
      console.error(e);
    }
    setDeleteLoading(false);
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
      const result = await verifySignature(message, signature);
      setVerifyResult(result);
      // Store in cache
      const cacheKey = verifyRequest.id || verifyRequest.signature || '';
      verifyResultCache.current[cacheKey] = result;
    } catch (e) {
      setVerifyResult({ valid: false, error: e });
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

  return (
    <div className="relative min-h-screen bg-gray-200 font-sans">
      {/* Title Bar/Header (Retro Windows 95 style) */}
      <header className="w-full flex items-center bg-[#1a237e] text-white px-4 py-2 border-b-4 border-gray-400 shadow-lg relative">
        <span className="font-bold text-xl mr-4">📝 Parc-It</span>
        <span className="ml-2 text-sm font-mono tracking-tight">Anonymous Office Request Board for 0xPARC</span>
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
          <a href="/admin" className="underline text-xs text-white hover:text-blue-200 mr-4">Admin Portal</a>
          {!loggedIn ? (
            <button
              className="px-4 py-2 bg-white text-[#1a237e] font-bold rounded border-2 border-gray-400 shadow active:translate-y-0.5 active:shadow-none transition-all retro-btn ml-2 my-1"
              onClick={() => setLoginOpen(true)}
              disabled={loading}
              style={{ minWidth: 160 }}
            >
              {loading ? "Logging in..." : "Login with Parc-It Key"}
            </button>
          ) : (
            <>
              <span className="font-mono text-xs bg-gray-100 text-[#1a237e] px-2 py-1 rounded border border-gray-300">Logged in</span>
              <button
                className="px-3 py-1 bg-gray-300 text-[#1a237e] font-bold rounded border-2 border-gray-400 shadow active:translate-y-0.5 active:shadow-none transition-all retro-btn"
                onClick={() => { setLoggedIn(false); setUserPubKey(null); setIsAdmin(false); localStorage.removeItem('parcItKey'); localStorage.removeItem('parcItPubKey'); }}
              >
                Logout
              </button>
            </>
          )}
        </div>
      </header>
      {/* Main Layout: Sidebar + Feed */}
      <div className="flex flex-row w-full max-w-7xl mx-auto mt-8">
        {/* Sidebar: Group Members */}
        <aside className="w-64 bg-gray-100 border-r border-gray-300 p-4 flex flex-col gap-4 shadow-lg">
          <h3 className="font-bold text-blue-800 mb-2">Group Members</h3>
          <ul className="flex-1 overflow-y-auto space-y-2">
            {members
              .slice() // copy to avoid mutating state
              .sort((a, b) => a.github_username.localeCompare(b.github_username))
              .map((m) => (
                <li key={m.id} className="flex items-center gap-2 p-2 rounded hover:bg-gray-200">
                  <img src={m.avatar_url} alt={m.github_username} className="w-8 h-8 rounded-full border border-gray-400" />
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
        </aside>
        {/* Main Feed Area */}
        <main className="flex-1 flex flex-col items-center px-8">
          {/* Custom Copy/Intro */}
          <section className="w-full max-w-2xl mt-8 mb-8 bg-white border-2 border-gray-400 rounded-lg shadow p-6">
            <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">📝 Parc-It <span className="text-purple-500">✦</span></h1>
            <p className="mb-2 text-lg">Every suggestion here was posted by a member of 0xPARC—but we don't know which one, thanks to Zero Knowledge Proofs and Group Signatures.</p>
            <p className="text-sm text-gray-700">Submit requests for the office anonymously. Only group members can post, but no one (not even admins) can see who posted what.</p>
          </section>
          {/* Request Feed */}
          <div className="w-full max-w-xl mb-20">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Office Requests</h2>
              <button
                className="ml-4 px-4 py-2 bg-[#1a237e] hover:bg-blue-800 text-white font-bold rounded border-2 border-gray-400 shadow retro-btn"
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
              <ul className="space-y-4">
                {requests.map((req) => {
                  // Find group member objects for avatars
                  const groupMemberObjs = Array.isArray(req.group_members)
                    ? members.filter(m => req.group_members.includes(m.github_username))
                    : [];
                  const isDoxxed = !!req.doxxed_member_id;
                  return (
                    <li key={req.id} className="border-2 border-gray-400 rounded-lg p-4 bg-white shadow-sm">
                      <div className="flex items-center gap-4">
                        <span className="text-3xl w-10 text-center">{req.emoji}</span>
                        <span className="flex-1 font-bold text-lg flex items-center gap-2">
                          {req.description}
                          <span className={`px-2 py-1 rounded text-xs font-semibold flex items-center gap-1 ${isDoxxed ? 'bg-blue-100 text-blue-800 border border-blue-300' : 'bg-gray-200 text-gray-700 border border-gray-300'}`}>{isDoxxed ? (<><span>Doxxed</span><span title="Your username is visible to admins and other users for this request." style={{cursor:'help'}}>ℹ️</span></>) : 'Anonymous'}</span>
                        </span>
                        <Button variant="outline" size="sm" className="ml-2" onClick={() => handleOpenVerify(req)}>Verify</Button>
                      </div>
                      <div className="flex items-center gap-2 mt-2 ml-14">
                        {groupMemberObjs.slice(0, 5).map((m, idx) => (
                          <img
                            key={m.id}
                            src={m.avatar_url}
                            alt={m.github_username}
                            title={m.github_username}
                            className="w-7 h-7 rounded-full border-2 border-white shadow -ml-2 first:ml-0"
                            style={{ zIndex: 10 - idx }}
                          />
                        ))}
                        {groupMemberObjs.length > 5 && (
                          <span className="ml-1 px-2 py-0.5 bg-gray-200 text-xs rounded-full border border-gray-400 font-mono">+{groupMemberObjs.length - 5} more</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </main>
      </div>
      {/* Modals (Key, Add Request, Verify) remain unchanged */}
      {addRequestOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md border-2 border-gray-300">
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
                  className="w-6 h-6 rounded-full border border-gray-300"
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
                {members.map((m) => (
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
                    <img src={m.avatar_url} alt={m.github_username} className="w-6 h-6 rounded-full border border-gray-300" />
                    <span className="font-mono text-xs">{m.github_username}</span>
                  </label>
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-1">{isDoxxed ? "Only you will be included in the group signature. To select other members, switch the toggle to anonymous." : "Only the selected members will be included in the group signature proof."}</div>
            </div>
            {requestMsg && (
              <div className={`mb-2 text-sm font-semibold ${requestMsg.includes('Proof Generated') ? 'text-green-600 bg-green-50 border border-green-200 rounded px-2 py-1' : requestMsg.toLowerCase().includes('success') ? 'text-green-600' : 'text-red-600'}`}>{requestMsg}</div>
            )}
            {/* Progress bar for signature generation */}
            {requestLoading && <AnimatedEquation loading={requestLoading} />}
            {requestLoading && <ProgressBar />}
            {requestLoading && <ProofTimer loading={requestLoading} />}
            {/* Show SpeedReader if loading or proof generated */}
            {(requestLoading || (requestMsg && requestMsg.includes('Proof Generated'))) && (
              <SpeedReader script={PLONKY2_SCRIPT} loading={Boolean(requestLoading || (requestMsg && requestMsg.includes('Proof Generated')))} />
            )}
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setAddRequestOpen(false)} disabled={requestLoading}>
                {requestMsg && requestMsg.includes('Proof Generated') ? 'Close' : 'Cancel'}
              </Button>
              {requestMsg && requestMsg.includes('Proof Generated') ? (
                <Button variant="default" disabled className="bg-green-500 text-white cursor-not-allowed">
                  Proof Generated ✅
                </Button>
              ) : (
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
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md border-2 border-gray-300">
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
                        className="w-6 h-6 rounded-full border border-gray-300"
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
                      disabled={!verifyRequest.signature}
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="font-mono bg-gray-100 rounded px-2 py-1 block whitespace-pre-wrap break-words max-w-full">
                    {(() => {
                      if (typeof verifyRequest.signature !== 'string') return "N/A";
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
                    })()}
                  </pre>
                </div>
                <div className="mb-4">
                  <Button variant="default" onClick={handleVerifySignature} disabled={verifyLoading}>
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
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md border-2 border-gray-300">
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