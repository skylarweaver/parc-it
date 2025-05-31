"use client";
import React, { useState, useEffect } from "react";
import { createClient } from "@supabase/supabase-js";
import { Button } from "../../components/ui/button";
import { LoginModal } from "../../components/LoginModal";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function AdminPage() {
  const [loginOpen, setLoginOpen] = useState(false);
  const [loggedIn, setLoggedIn] = useState(false);
  const [userPubKey, setUserPubKey] = useState<string | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loginStatus, setLoginStatus] = useState<string | null>(null);

  // Requests state
  const [requests, setRequests] = useState<any[]>([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Members state
  const [members, setMembers] = useState<any[]>([]);
  const [memberLoading, setMemberLoading] = useState(false);
  const [addUsername, setAddUsername] = useState("");
  const [adminMsg, setAdminMsg] = useState<string | null>(null);

  // Admins state
  const [admins, setAdmins] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(false);
  const [addAdminUsername, setAddAdminUsername] = useState("");
  const [adminAdminMsg, setAdminAdminMsg] = useState<string | null>(null);

  // Fetch requests
  const fetchRequests = async () => {
    setRequestsLoading(true);
    try {
      const { data, error } = await supabase
        .from("office_requests")
        .select("id, emoji, description, created_at, deleted, group_members")
        .order("created_at", { ascending: false });
      if (error) {
        setRequests([]);
      } else {
        setRequests((data || []).filter((r: any) => !r.deleted));
      }
    } catch (e) {
      setRequests([]);
    }
    setRequestsLoading(false);
  };

  // Fetch members
  const fetchMembers = async () => {
    setMemberLoading(true);
    try {
      const { data, error } = await supabase
        .from("group_members")
        .select("id, github_username, avatar_url, public_key");
      if (error) {
        setMembers([]);
      } else {
        setMembers(data || []);
      }
    } catch (e) {
      setMembers([]);
    }
    setMemberLoading(false);
  };

  // Delete request
  const handleDeleteRequest = async (id: string) => {
    setDeleteLoading(true);
    try {
      await supabase.from("office_requests").update({ deleted: true }).eq("id", id);
      fetchRequests();
    } catch (e) {}
    setDeleteLoading(false);
  };

  // Add member
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
      const keysResp = await fetch(`/api/github-keys?username=${encodeURIComponent(username)}`);
      const keysData = await keysResp.json();
      if (!keysResp.ok) {
        setAdminMsg(keysData.error || "Failed to fetch keys for this user.");
        setMemberLoading(false);
        return;
      }
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
      } else {
        setAdminMsg("Member added successfully.");
        setAddUsername("");
        fetchMembers();
      }
    } catch (e) {
      setAdminMsg("Unexpected error adding member.");
    }
    setMemberLoading(false);
  };

  // Remove member
  const handleRemoveMember = async (id: string) => {
    setAdminMsg(null);
    setMemberLoading(true);
    try {
      await supabase.from("group_members").delete().eq("id", id);
      fetchMembers();
    } catch (e) {}
    setMemberLoading(false);
  };

  // Fetch admins
  const fetchAdmins = async () => {
    setAdminLoading(true);
    try {
      const { data, error } = await supabase
        .from("admins")
        .select("id, github_username, public_key");
      if (error) {
        setAdmins([]);
      } else {
        setAdmins(data || []);
      }
    } catch (e) {
      setAdmins([]);
    }
    setAdminLoading(false);
  };

  // Add admin
  const handleAddAdmin = async () => {
    setAdminAdminMsg(null);
    if (!addAdminUsername.trim()) {
      setAdminAdminMsg("Please enter a GitHub username.");
      return;
    }
    setAdminLoading(true);
    try {
      const username = addAdminUsername.trim();
      const keysResp = await fetch(`/api/github-keys?username=${encodeURIComponent(username)}`);
      const keysData = await keysResp.json();
      if (!keysResp.ok) {
        setAdminAdminMsg(keysData.error || "Failed to fetch keys for this user.");
        setAdminLoading(false);
        return;
      }
      const public_key = (keysData.keys || []).find((k: string) => k.startsWith("ssh-rsa ")) || "";
      if (!public_key) {
        setAdminAdminMsg("No ssh-rsa public key found for this GitHub user.");
        setAdminLoading(false);
        return;
      }
      // Prevent duplicate
      if (admins.some((a) => a.public_key === public_key)) {
        setAdminAdminMsg("This user is already an admin.");
        setAdminLoading(false);
        return;
      }
      const { error } = await supabase.from("admins").insert({
        github_username: username,
        public_key,
      });
      if (error) {
        setAdminAdminMsg("Failed to add admin: " + error.message);
      } else {
        setAdminAdminMsg("Admin added successfully.");
        setAddAdminUsername("");
        fetchAdmins();
      }
    } catch (e) {
      setAdminAdminMsg("Unexpected error adding admin.");
    }
    setAdminLoading(false);
  };

  // Remove admin
  const handleRemoveAdmin = async (id: string, public_key: string) => {
    setAdminAdminMsg(null);
    setAdminLoading(true);
    try {
      if (public_key === userPubKey) {
        setAdminAdminMsg("You cannot remove yourself as admin.");
        setAdminLoading(false);
        return;
      }
      await supabase.from("admins").delete().eq("id", id);
      fetchAdmins();
      setAdminAdminMsg("Admin removed successfully.");
    } catch (e) {
      setAdminAdminMsg("Unexpected error removing admin.");
    }
    setAdminLoading(false);
  };

  // Fetch data on mount for everyone
  useEffect(() => {
    fetchRequests();
    fetchMembers();
    fetchAdmins();
  }, []);

  const handleLogin = async (key: string, pubKey: string) => {
    setLoading(true);
    setLoginStatus(null);
    setIsAdmin(false);
    try {
      // Check admin status with backend
      const { data, error } = await supabase
        .from("admins")
        .select("id")
        .eq("public_key", pubKey)
        .maybeSingle();
      if (error) {
        setLoginStatus("Error checking admin status. Please try again later.");
        setLoggedIn(false);
        setUserPubKey(null);
        setLoading(false);
        return;
      }
      if (data) {
        setLoggedIn(true);
        setUserPubKey(pubKey);
        setIsAdmin(true);
        setLoginStatus("Admin login successful!");
        setLoginOpen(false);
      } else {
        setLoginStatus("You are not an admin. Access denied.");
        setLoggedIn(false);
        setUserPubKey(null);
        setIsAdmin(false);
      }
    } catch (e) {
      setLoginStatus("Unexpected error during login. Please try again.");
      setLoggedIn(false);
      setUserPubKey(null);
      setIsAdmin(false);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-200 font-sans flex flex-col items-center p-8">
      <header className="w-full flex items-center bg-[#1a237e] text-white px-4 py-2 border-b-4 border-gray-400 shadow-lg mb-8">
        <span className="font-bold text-xl mr-4">📝 Parc-It Admin Portal</span>
        <a href="/" className="ml-auto underline text-xs text-white hover:text-blue-200">&larr; Back to Home</a>
      </header>
      <div className="flex flex-col items-center mt-4 mb-8">
        <Button onClick={() => setLoginOpen(true)} className="mb-2">Login with Parc-It Key</Button>
        {loginStatus && <div className="text-red-600 mb-2">{loginStatus}</div>}
      </div>
      <div className="w-full max-w-3xl flex flex-col gap-8">
        {!isAdmin && (
          <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-800 p-4 mb-2 rounded">
            Admin login required to use these features. All actions are disabled until you log in as an admin.
          </div>
        )}
        <div className="bg-white border-2 border-gray-400 rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Office Requests</h2>
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
                  <Button
                    variant="destructive"
                    size="sm"
                    className={`ml-2 ${!isAdmin || deleteLoading ? 'opacity-60 grayscale cursor-not-allowed' : ''}`}
                    onClick={() => handleDeleteRequest(req.id)}
                    disabled={!isAdmin || deleteLoading}
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white border-2 border-gray-400 rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Group Members</h2>
          <div className="flex gap-2 mb-4">
            <input
              className={`border rounded p-2 flex-1 ${!isAdmin || memberLoading ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed' : ''}`}
              placeholder="GitHub username"
              value={addUsername}
              onChange={e => setAddUsername(e.target.value)}
              disabled={!isAdmin || memberLoading}
            />
            <Button
              onClick={handleAddMember}
              disabled={!isAdmin || memberLoading}
              className={`${!isAdmin || memberLoading ? 'opacity-60 grayscale cursor-not-allowed' : ''}`}
            >
              Add
            </Button>
          </div>
          {adminMsg && <div className={`mb-2 text-sm font-semibold ${adminMsg.toLowerCase().includes('success') ? 'text-green-600' : 'text-red-600'}`}>{adminMsg}</div>}
          {memberLoading ? (
            <div>Loading...</div>
          ) : (
            <ul className="space-y-2">
              {members.map((m) => (
                <li key={m.id} className="flex items-center gap-2 border-b pb-1">
                  <img src={m.avatar_url} alt={m.github_username} className="retro-avatar" />
                  <span className="flex-1">{m.github_username}</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveMember(m.id)}
                    disabled={!isAdmin || memberLoading}
                    className={`${!isAdmin || memberLoading ? 'opacity-60 grayscale cursor-not-allowed' : ''}`}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white border-2 border-gray-400 rounded-lg shadow p-6">
          <h2 className="text-2xl font-bold mb-4">Admins</h2>
          <div className="flex gap-2 mb-4">
            <input
              className={`border rounded p-2 flex-1 ${!isAdmin || adminLoading ? 'bg-gray-200 text-gray-500 border-gray-300 cursor-not-allowed' : ''}`}
              placeholder="GitHub username"
              value={addAdminUsername}
              onChange={e => setAddAdminUsername(e.target.value)}
              disabled={!isAdmin || adminLoading}
            />
            <Button
              onClick={handleAddAdmin}
              disabled={!isAdmin || adminLoading}
              className={`${!isAdmin || adminLoading ? 'opacity-60 grayscale cursor-not-allowed' : ''}`}
            >
              Add
            </Button>
          </div>
          {adminAdminMsg && <div className={`mb-2 text-sm font-semibold ${adminAdminMsg.toLowerCase().includes('success') ? 'text-green-600' : 'text-red-600'}`}>{adminAdminMsg}</div>}
          {adminLoading ? (
            <div>Loading...</div>
          ) : (
            <ul className="space-y-2">
              {admins.map((a) => (
                <li key={a.id} className="flex items-center gap-2 border-b pb-1">
                  <span className="font-mono text-xs bg-gray-100 rounded px-2 py-1">{a.github_username || 'N/A'}</span>
                  <span className="flex-1 truncate text-xs text-gray-700">{a.public_key.slice(0, 32)}...{a.public_key.slice(-16)}</span>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleRemoveAdmin(a.id, a.public_key)}
                    disabled={!isAdmin || adminLoading || a.public_key === userPubKey}
                    className={`${!isAdmin || adminLoading || a.public_key === userPubKey ? 'opacity-60 grayscale cursor-not-allowed' : ''}`}
                  >
                    Remove
                  </Button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
      <LoginModal
        isOpen={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLogin={handleLogin}
        groupPublicKeys={members.map(m => m.public_key).join('\n')}
        admin={true}
      />
    </div>
  );
} 