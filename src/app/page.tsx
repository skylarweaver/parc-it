"use client";
import Image from "next/image";
import { Button } from "../components/ui/button";
import { LoginModal } from "../components/LoginModal";
import React, { useEffect } from "react";
import { createClient } from "@supabase/supabase-js";

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

  const handleLogin = async (key: string, pubKey: string) => {
    setLoading(true);
    setLoginStatus(null);
    setIsAdmin(false);
    try {
      const { data, error } = await supabase
        .from("group_members")
        .select("public_key")
        .eq("public_key", pubKey)
        .maybeSingle();
      console.log("Supabase group_members query result:", data, error);
      if (error) {
        setLoginStatus("Error checking group membership. Please try again later.");
        setLoggedIn(false);
        setUserPubKey(null);
        setLoading(false);
        return;
      }
      if (data && data.public_key === pubKey) {
        setLoggedIn(true);
        setUserPubKey(pubKey);
        // Query admins table for admin status
        const { data: adminData, error: adminError } = await supabase
          .from("admins")
          .select("id")
          .eq("public_key", pubKey)
          .maybeSingle();
        let isAdminNow = false;
        if (adminError) {
          console.error("Error checking admin status:", adminError);
          setIsAdmin(false);
        } else {
          isAdminNow = !!adminData;
          setIsAdmin(isAdminNow);
        }
        setLoginStatus(
          isAdminNow
            ? "Login successful! You are recognized as a group member and an Admin."
            : "Login successful! You are recognized as a group member."
        );
        setLoginOpen(false);
        localStorage.setItem("parcItKey", key);
        localStorage.setItem("parcItPubKey", pubKey);
        console.log("Login successful. User public key:", pubKey, "isAdmin:", isAdminNow);
      } else {
        setLoginStatus("Your key is valid, but you are not a recognized group member.");
        setLoggedIn(false);
        setUserPubKey(null);
        setIsAdmin(false);
        console.log("Key valid but not a group member:", pubKey);
      }
    } catch (e) {
      setLoginStatus("Unexpected error during login. Please try again.");
      setLoggedIn(false);
      setUserPubKey(null);
      setIsAdmin(false);
      console.error(e);
    }
    setLoading(false);
  };

  // Fetch group members when admin logs in
  useEffect(() => {
    if (isAdmin) {
      setMemberLoading(true);
      supabase
        .from("group_members")
        .select("id, github_username, avatar_url, public_key")
        .then(({ data, error }) => {
          if (error) {
            setAdminMsg("Failed to fetch group members.");
            setMembers([]);
            console.error(error);
          } else {
            setMembers(data || []);
            setAdminMsg(null);
            console.log("Fetched group members:", data);
          }
          setMemberLoading(false);
        });
    }
  }, [isAdmin]);

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

  // Add Request modal submit handler
  const handleSubmitRequest = async () => {
    setRequestMsg(null);
    if (!requestEmoji.trim() || !requestDesc.trim()) {
      setRequestMsg("Please enter an emoji and a description.");
      return;
    }
    setRequestLoading(true);
    try {
      const { error } = await supabase.from("office_requests").insert({
        emoji: requestEmoji.trim(),
        description: requestDesc.trim(),
        signature: { dummy: true }, // TODO: real signature later
        group_id: "00000000-0000-0000-0000-000000000000", // TODO: real group logic
        public_signal: "dummy-signal", // TODO: real signal
        posted_by: userPubKey,
        deleted: false,
        metadata: {},
      });
      if (error) {
        setRequestMsg("Failed to submit request: " + error.message);
      } else {
        setRequestMsg("Request submitted successfully!");
        setRequestEmoji("");
        setRequestDesc("");
        setTimeout(() => {
          setAddRequestOpen(false);
          setRequestMsg(null);
          // TODO: refresh feed
        }, 1000);
      }
    } catch (e) {
      setRequestMsg("Unexpected error submitting request.");
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
        .select("id, emoji, description, posted_by, created_at, deleted")
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

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-[32px] row-start-2 items-center sm:items-start">
        <Image
          className="dark:invert"
          src="/next.svg"
          alt="Next.js logo"
          width={180}
          height={38}
          priority
        />
        <ol className="list-inside list-decimal text-sm/6 text-center sm:text-left font-[family-name:var(--font-geist-mono)]">
          <li className="mb-2 tracking-[-.01em]">
            Get started by editing{" "}
            <code className="bg-black/[.05] dark:bg-white/[.06] px-1 py-0.5 rounded font-[family-name:var(--font-geist-mono)] font-semibold">
              src/app/page.tsx
            </code>
            .
          </li>
          <li className="tracking-[-.01em]">
            Save and see your changes instantly.
          </li>
        </ol>

        <div className="flex gap-4 items-center flex-col sm:flex-row">
          <a
            className="rounded-full border border-solid border-transparent transition-colors flex items-center justify-center bg-foreground text-background gap-2 hover:bg-[#383838] dark:hover:bg-[#ccc] font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 sm:w-auto"
            href="https://vercel.com/new?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              className="dark:invert"
              src="/vercel.svg"
              alt="Vercel logomark"
              width={20}
              height={20}
            />
            Deploy now
          </a>
          <a
            className="rounded-full border border-solid border-black/[.08] dark:border-white/[.145] transition-colors flex items-center justify-center hover:bg-[#f2f2f2] dark:hover:bg-[#1a1a1a] hover:border-transparent font-medium text-sm sm:text-base h-10 sm:h-12 px-4 sm:px-5 w-full sm:w-auto md:w-[158px]"
            href="https://nextjs.org/docs?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
            target="_blank"
            rel="noopener noreferrer"
          >
            Read our docs
          </a>
        </div>
        <div className="mt-8 flex flex-col gap-4 items-center">
          <Button variant="default" onClick={() => setLoginOpen(true)} disabled={loading}>
            {loggedIn ? "Logged in" : loading ? "Logging in..." : "Login with Parc-It Key"}
          </Button>
          <Button
            variant="default"
            disabled={!loggedIn}
            title={loggedIn ? "Submit a new office request" : "Log in to submit a request"}
            className={
              !loggedIn
                ? "opacity-50 cursor-not-allowed bg-gray-300 text-gray-500 border-gray-400"
                : "bg-blue-600 hover:bg-blue-700 text-white border-blue-700"
            }
            onClick={() => loggedIn && setAddRequestOpen(true)}
          >
            ➕ Add Request
          </Button>
        </div>
        {loginStatus && (
          <div className={`mt-4 text-${loggedIn ? "green" : "red"}-600 font-semibold`}>
            {loginStatus}
          </div>
        )}
        <LoginModal
          isOpen={loginOpen}
          onClose={() => setLoginOpen(false)}
          onLogin={handleLogin}
        />
        {isAdmin && (
          <div className="mt-8 p-4 border rounded bg-gray-50 w-full max-w-md">
            <h3 className="font-bold mb-2 text-blue-800">Admin Panel</h3>
            <div className="text-sm text-gray-700 mb-2">Manage group members below.</div>
            <div className="flex gap-2 mb-4">
              <input
                className="border rounded p-2 flex-1"
                placeholder="GitHub username"
                value={addUsername}
                onChange={e => setAddUsername(e.target.value)}
                disabled={memberLoading}
              />
              <Button onClick={handleAddMember} disabled={memberLoading}>
                Add
              </Button>
            </div>
            {adminMsg && (
              <div className={`mb-2 text-sm font-semibold ${adminMsg.toLowerCase().includes('success') ? 'text-green-600' : 'text-red-600'}`}>{adminMsg}</div>
            )}
            <div className="mb-2 font-semibold">Current Members:</div>
            {memberLoading ? (
              <div>Loading...</div>
            ) : (
              <ul className="space-y-2">
                {members.map((m) => (
                  <li key={m.id} className="flex items-center gap-2 border-b pb-1">
                    <img src={m.avatar_url} alt={m.github_username} className="w-6 h-6 rounded-full" />
                    <span className="flex-1">{m.github_username}</span>
                    <Button variant="destructive" size="sm" onClick={() => handleRemoveMember(m.id)} disabled={memberLoading}>
                      Remove
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {/* Add Request Modal */}
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
        {/* Request Feed */}
        <div className="w-full max-w-xl mt-10">
          <h2 className="text-lg font-bold mb-4">Office Requests</h2>
          {requestsLoading ? (
            <div>Loading requests...</div>
          ) : requests.length === 0 ? (
            <div className="text-gray-500">No requests yet.</div>
          ) : (
            <ul className="space-y-4">
              {requests.map((req) => (
                <li key={req.id} className="border rounded p-4 flex items-center gap-4 bg-white shadow-sm">
                  <span className="text-3xl w-10 text-center">{req.emoji}</span>
                  <span className="flex-1">{req.description}</span>
                  <span className="text-xs text-gray-400 ml-2">{req.posted_by ? req.posted_by.slice(0, 8) + "..." : "Anonymous"}</span>
                  <Button variant="outline" size="sm" className="ml-2" onClick={() => handleOpenVerify(req)}>Verify</Button>
                  {isAdmin && (
                    <Button variant="destructive" size="sm" className="ml-2" onClick={() => handleDeleteRequest(req.id)} disabled={deleteLoading}>Delete</Button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
        {/* Verify Modal */}
        {verifyModalOpen && verifyRequest && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
            <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md border-2 border-gray-300">
              <h2 className="text-xl font-bold mb-4">Verify Group Signature</h2>
              <div className="mb-2">Signature valid: <span className="text-green-600 font-semibold">Yes</span></div>
              <div className="mb-2">Public signal: <span className="font-mono">dummy-signal</span></div>
              <div className="mb-2">Merkle root: <span className="font-mono">dummy-root</span></div>
              <div className="mb-2">Circuit/proof ID: <span className="font-mono">dummy-circuit</span></div>
              <div className="mb-2">Time posted: <span className="font-mono">{verifyRequest.created_at}</span></div>
              <div className="flex gap-2 justify-end mt-4">
                <Button variant="outline" onClick={handleCloseVerify}>Close</Button>
                {isAdmin && (
                  <Button variant="destructive" onClick={() => handleDeleteRequest(verifyRequest.id)} disabled={deleteLoading}>
                    {deleteLoading ? "Deleting..." : "Delete"}
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}
      </main>
      <footer className="row-start-3 flex gap-[24px] flex-wrap items-center justify-center">
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org/learn?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/file.svg"
            alt="File icon"
            width={16}
            height={16}
          />
          Learn
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://vercel.com/templates?framework=next.js&utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/window.svg"
            alt="Window icon"
            width={16}
            height={16}
          />
          Examples
        </a>
        <a
          className="flex items-center gap-2 hover:underline hover:underline-offset-4"
          href="https://nextjs.org?utm_source=create-next-app&utm_medium=appdir-template-tw&utm_campaign=create-next-app"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Image
            aria-hidden
            src="/globe.svg"
            alt="Globe icon"
            width={16}
            height={16}
          />
          Go to nextjs.org →
        </a>
      </footer>
    </div>
  );
}
