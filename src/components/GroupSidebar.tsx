import React from "react";
import { GroupMember, Admin } from "../types/models";

interface GroupSidebarProps {
  members: GroupMember[];
  admins: Admin[];
  setLoginOpen: (open: boolean) => void;
  handleOpenKeyModal: (member: GroupMember) => void;
}

export function GroupSidebar({ members, admins, setLoginOpen, handleOpenKeyModal }: GroupSidebarProps) {
  return (
    <aside className="w-64 mt-8 bg-gray-100 border-r border-gray-300 p-4 flex flex-col gap-4 shadow-lg"
      style={{ height: 'auto', minHeight: 'unset', alignSelf: 'flex-start' }}>
      <h3 className="font-bold text-blue-800 mb-2">0XPARC Group Members</h3>
      <ul className="overflow-y-auto space-y-2">
        {members
          .slice()
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
  );
} 