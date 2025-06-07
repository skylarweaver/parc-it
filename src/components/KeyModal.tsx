import React from "react";
import { GroupMember } from "../types/models";
import { Button } from "./ui/button";

interface KeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  member: GroupMember | null;
}

export function KeyModal({ isOpen, onClose, member }: KeyModalProps) {
  if (!isOpen || !member) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white  shadow-lg p-6 w-full max-w-md border-2 border-gray-300">
        <h2 className="text-xl font-bold mb-4">Public Key for {member.github_username}</h2>
        <div className="mb-2 font-mono text-xs break-all bg-gray-100 p-2 rounded border border-gray-200">
          {member.public_key}
        </div>
        <div className="flex gap-2 mb-4">
          <button
            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
            onClick={() => {
              navigator.clipboard.writeText(member.public_key);
            }}
          >
            Copy
          </button>
          <a
            className="px-2 py-1 bg-gray-300 rounded text-xs hover:bg-gray-400"
            href={`https://github.com/${member.github_username}.keys`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Verify on GitHub
          </a>
        </div>
        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
      </div>
    </div>
  );
} 