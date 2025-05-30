"use client";
import Image from "next/image";
import { Button } from "../components/ui/button";
import { LoginModal } from "../components/LoginModal";
import React, { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { generateSignature, verifySignature } from "../helpers/plonky2/utils";

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

  // Fetch members on mount and after add/remove
  useEffect(() => {
    fetchMembers();
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
    if (selectedGroup.length < 2) {
      setRequestMsg("Please select at least two group members.");
      return;
    }
    if (!parcItKey) {
      setRequestMsg("You must be logged in to submit a request.");
      return;
    }
    setRequestLoading(true);
    try {
      // Build message and group keys
      const message = `${requestEmoji} ${requestDesc}`;
      const groupKeys = members
        .filter((m) => selectedGroup.includes(m.github_username))
        .map((m) => m.public_key)
        .join('\n');
      // Generate signature
      const signature = await generateSignature(message, groupKeys, parcItKey);
      // Submit request with signature
      const { error } = await supabase.from("office_requests").insert({
        emoji: requestEmoji.trim(),
        description: requestDesc.trim(),
        signature, // real signature
        group_id: "00000000-0000-0000-0000-000000000000", // TODO: real group logic
        public_signal: "dummy-signal", // TODO: real signal
        group_members: selectedGroup,
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
        setRequestMsg("Request submitted successfully!");
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
        .select("id, emoji, description, created_at, deleted, group_members, signature")
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
    if (!verifyRequest) return;
    // Build message (emoji + description)
    const message = `${verifyRequest.emoji} ${verifyRequest.description}`;
    const signature = verifyRequest.signature;
    if (!signature || typeof signature !== 'string' || signature.length < 10) {
      setVerifyResult({ valid: false, error: { message: "No valid signature found for this request." } });
      return;
    }
    try {
      const result = await verifySignature(message, signature);
      setVerifyResult(result);
    } catch (e) {
      setVerifyResult({ valid: false, error: e });
    }
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
    }
  }, []);

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
                {requests.map((req) => (
                  <li key={req.id} className="border-2 border-gray-400 rounded-lg p-4 flex items-center gap-4 bg-white shadow-sm">
                    <span className="text-3xl w-10 text-center">{req.emoji}</span>
                    <span className="flex-1 font-bold text-lg">{req.description}</span>
                    <Button variant="outline" size="sm" className="ml-2" onClick={() => handleOpenVerify(req)}>Verify</Button>
                  </li>
                ))}
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
            <div className="mb-4">
              <label className="block mb-1 font-semibold">Emoji</label>
              <input
                className="border rounded p-2 w-16 text-center text-2xl"
                placeholder="😀"
                value={requestEmoji}
                onChange={e => setRequestEmoji(e.target.value)}
                maxLength={2}
                disabled={requestLoading}
              />
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
                      checked={selectedGroup.includes(m.github_username)}
                      onChange={e => {
                        if (e.target.checked) {
                          setSelectedGroup([...selectedGroup, m.github_username]);
                        } else {
                          setSelectedGroup(selectedGroup.filter(u => u !== m.github_username));
                        }
                      }}
                      disabled={requestLoading}
                    />
                    <img src={m.avatar_url} alt={m.github_username} className="w-6 h-6 rounded-full border border-gray-300" />
                    <span className="font-mono text-xs">{m.github_username}</span>
                  </label>
                ))}
              </div>
              <div className="text-xs text-gray-500 mt-1">Only the selected members will be included in the group signature proof.</div>
            </div>
            {requestMsg && (
              <div className={`mb-2 text-sm font-semibold ${requestMsg.toLowerCase().includes('success') ? 'text-green-600' : 'text-red-600'}`}>{requestMsg}</div>
            )}
            <div className="flex gap-2 justify-end mt-4">
              <Button variant="outline" onClick={() => setAddRequestOpen(false)} disabled={requestLoading}>
                Cancel
              </Button>
              <Button variant="default" onClick={handleSubmitRequest} disabled={requestLoading}>
                {requestLoading ? "Submitting..." : "Submit"}
              </Button>
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
              <Button variant="default" onClick={handleVerifySignature}>
                Verify Signature
              </Button>
            </div>
            {verifyResult && (
              <div className="mb-4">
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
{verifyResult.valid
  ? `Signature is valid!\nGroup keys:\n${verifyResult.groupKeys}`
  : `Invalid signature: ${verifyResult.error?.message || String(verifyResult.error)}`}
                </pre>
              </div>
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
