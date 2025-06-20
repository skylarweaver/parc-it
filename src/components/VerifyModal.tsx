import React from "react";
import { OfficeRequest } from "../types/models";
import { Button } from "./ui/button";
import AnimatedEquation from "./AnimatedEquation";
import ProgressBar from "./ui/ProgressBar";
import ProofTimer from "./ProofTimer";
import { format } from 'date-fns';

interface VerifyModalProps {
  isOpen: boolean;
  onClose: () => void;
  request: OfficeRequest | null;
  loading: boolean;
  result: { valid: boolean; groupKeys?: string; error?: unknown; nullifier?: string | undefined } | null;
  onVerify: (message: string, signature: string) => void;
  members: { github_username: string; avatar_url: string }[];
  upvoters?: string[];
}

export function VerifyModal({
  isOpen,
  onClose,
  request,
  loading,
  result,
  onVerify,
  members,
  upvoters = [],
}: VerifyModalProps) {
  if (!isOpen || !request) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div
        className="bg-white shadow-lg p-6 w-full max-w-md border-2 border-gray-300"
        style={{ maxHeight: '80vh', overflowY: 'auto' }}
      >
        <h2 className="text-xl font-bold mb-4">View and Verify Idea</h2>
        {/* Show request info */}
        <div className="mb-2">
          <span className="font-bold">Emoji:</span> <span className="text-2xl">{request.emoji}</span>
        </div>
        <div className="mb-2">
          <span className="font-bold">Description:</span> {request.description}
        </div>
        <div className="mb-4">
          <span className="font-bold">Group Members:</span>
          <div style={{ maxHeight: '192px', overflowY: 'auto', borderRadius: 4, background: '#f8f8f8', border: '1px solid #eee', marginTop: 4 }}>
            <ul className="list-none ml-0 text-sm">
              {Array.isArray(request.group_members) && request.group_members.length > 0 ? (
                request.group_members.map((username: string, idx: number) => {
                  const member = members.find(m => m.github_username === username);
                  return (
                    <li key={idx} className="flex items-center gap-2 py-1">
                      <img
                        src={member ? member.avatar_url : `https://github.com/${username}.png`}
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
                  );
                })
              ) : (
                <li className="italic text-gray-500">No group members listed</li>
              )}
            </ul>
          </div>
        </div>
        {/* If doxxed, skip signature verification */}
        {request.doxxed_member_id ? (
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
                    if (request.signature) {
                      navigator.clipboard.writeText(request.signature);
                    }
                  }}
                  disabled={!request.signature || loading}
                >
                  Copy
                </button>
              </div>
              <pre className="font-mono bg-gray-100 rounded px-2 py-1 block whitespace-pre-wrap break-words max-w-full" style={{ minHeight: 40 }}>
                {loading
                  ? <span className="text-gray-400">Loading signature...</span>
                  : (typeof request.signature !== 'string' ? "N/A" : (() => {
                      const lines = request.signature.split('\n').filter(Boolean);
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
              <Button variant="default" onClick={() => onVerify(`${request.emoji ?? ''} ${request.description ?? ''}`, request.signature ?? '')} disabled={loading || !request.signature}>
                Verify Signature
              </Button>
            </div>
            {loading && <AnimatedEquation loading={loading} />}
            {loading && <ProgressBar />}
            {loading && <ProofTimer loading={loading} />}
            {result && (
              <div className={`mb-4 ${result.valid ? 'text-green-700 bg-green-50 border border-green-200 rounded' : ''}`}>
                <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
                  {result.valid
                    ? `Proof Generated ✅\nSignature is valid!\nGroup keys: (which you can manually compare above)\n${result.groupKeys}`
                    : String((() => {
                        let errorMsg = 'Unknown error';
                        if (result.error) {
                          if (typeof result.error === 'string') {
                            errorMsg = result.error;
                          } else if (typeof result.error === 'object' && 'message' in result.error && result.error.message) {
                            errorMsg = String(result.error.message);
                          } else {
                            errorMsg = JSON.stringify(result.error);
                          }
                        }
                        return `Invalid signature: ${errorMsg}`;
                      })())}
                </pre>
                {/* Nullifier display: only for upvotes (not regular group signatures) */}
                {result.valid && 'nullifier' in result && result.nullifier && (
                  <div className="mt-2 text-xs text-purple-700 bg-purple-50 border border-purple-200 rounded p-2">
                    <span className="font-bold">Nullifier:</span> {result.nullifier ?? '[No nullifier]'}
                    <br />
                    <span className="text-gray-500">(Nullifiers are only present for upvotes or actions requiring uniqueness. Regular group signatures do not include a nullifier.)</span>
                  </div>
                )}
              </div>
            )}
          </>
        )}
        {/* Upvotes section */}
        <div className="flex flex-col items-start mt-4 gap-2">
          {upvoters.length > 0 && (
            <div className="flex flex-wrap items-center gap-1 w-full justify-start border-t pt-2 mt-2">
              <span className="text-xs text-gray-600 mr-2">Upvoted by:</span>
              {upvoters.map((username) => {
                const member = members.find(m => m.github_username === username);
                const avatarUrl = member ? member.avatar_url : `https://github.com/${username}.png`;
                return (
                  <a
                    key={username}
                    href={`https://github.com/${username}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={username}
                    className="block"
                    style={{ lineHeight: 0 }}
                  >
                    <img
                      src={avatarUrl}
                      alt={`Avatar for ${username}`}
                      title={username}
                      className="retro-avatar"
                      style={{ width: 32, height: 32, borderRadius: 4, display: 'inline-block', marginRight: 2, objectFit: 'cover' }}
                    />
                  </a>
                );
              })}
            </div>
          )}
          <Button variant="outline" onClick={onClose}>Close</Button>
        </div>
        {request && (
          <div style={{ marginTop: 8, marginBottom: 8 }}>
            <span style={{ color: '#888', fontSize: '12px', fontStyle: 'italic' }}>
              Submitted: {format(new Date(request.created_at), 'PPP, p')}
            </span>
          </div>
        )}
      </div>
    </div>
  );
} 