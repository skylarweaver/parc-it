import React from "react";
import { OfficeRequest, GroupMember } from "../types/models";
import { Button } from "./ui/button";

interface RequestFeedProps {
  requests: OfficeRequest[];
  members: GroupMember[];
  upvoteCounts: { [requestId: string]: number };
  loggedIn: boolean;
  upvoteLoading: string | null;
  submitUpvote: (
    req: OfficeRequest,
    loggedIn: boolean,
    parcItKey: string | null,
    userPubKey: string | null,
    members: GroupMember[],
    fetchUpvoteCountsCallback: (ids: string[]) => void,
    allRequestIds: string[]
  ) => void;
  unUpvote: (
    req: OfficeRequest,
    loggedIn: boolean,
    parcItKey: string | null,
    userPubKey: string | null,
    members: GroupMember[],
    fetchUpvoteCountsCallback: (ids: string[]) => void,
    allRequestIds: string[]
  ) => void;
  handleOpenVerify: (req: OfficeRequest) => void;
  currentPage: number;
  pageSize: number;
  totalRequests: number;
  setCurrentPage: (page: number) => void;
  fetchRequests: (page: number, pageSize: number) => void;
  upvoteMsg: { [requestId: string]: string } | null;
  parcItKey: string | null;
  userPubKey: string | null;
  fetchUpvoteCounts: (ids: string[]) => void;
  upvotersByRequest: { [requestId: string]: string[] };
}

function RequestCard({ req, members, loggedIn, upvoteCounts, upvoteLoading, submitUpvote, unUpvote, handleOpenVerify, upvoteMsg, parcItKey, userPubKey, fetchUpvoteCounts, upvotersByRequest, allRequestIds }: {
  req: OfficeRequest;
  members: GroupMember[];
  loggedIn: boolean;
  upvoteCounts: { [requestId: string]: number };
  upvoteLoading: string | null;
  submitUpvote: (
    req: OfficeRequest,
    loggedIn: boolean,
    parcItKey: string | null,
    userPubKey: string | null,
    members: GroupMember[],
    fetchUpvoteCountsCallback: (ids: string[]) => void,
    allRequestIds: string[]
  ) => void;
  unUpvote: (
    req: OfficeRequest,
    loggedIn: boolean,
    parcItKey: string | null,
    userPubKey: string | null,
    members: GroupMember[],
    fetchUpvoteCountsCallback: (ids: string[]) => void,
    allRequestIds: string[]
  ) => void;
  handleOpenVerify: (req: OfficeRequest) => void;
  upvoteMsg: { [requestId: string]: string } | null;
  parcItKey: string | null;
  userPubKey: string | null;
  fetchUpvoteCounts: (ids: string[]) => void;
  upvotersByRequest: { [requestId: string]: string[] };
  allRequestIds: string[];
}) {
  const upvoterPubKeys = upvotersByRequest[req.id] || [];
  const upvoterMembers = upvoterPubKeys
    .map(pk => members.find(m => m.public_key === pk))
    .filter(Boolean) as GroupMember[];
  const isDoxxed = !!req.doxxed_member_id;
  const hasUpvoted = !!userPubKey && upvoterPubKeys.includes(userPubKey);
  return (
    <li key={req.id} className="border-2 border-gray-400  p-4 bg-white shadow-sm relative">
      <div className="flex items-center gap-4">
        <span className="text-3xl w-10 text-center">{req.emoji}</span>
        <span className="flex-1 flex items-center gap-2">
          <span className="retro-text">{req.description}</span>
          <span className={`retro-label flex items-center gap-1 ${isDoxxed ? 'doxxed' : 'anonymous'}`}>{isDoxxed ? (<><span>Doxxed</span><span title="Anyone can see the user that submitted this request." style={{cursor:'help'}}>ℹ️</span></>) : 'Anonymous'}</span>
        </span>
        <Button
          variant="default"
          size="sm"
          className="ml-2 retro-upvote-btn"
          onClick={() => hasUpvoted
            ? unUpvote(req, loggedIn, parcItKey, userPubKey, members, fetchUpvoteCounts, allRequestIds)
            : submitUpvote(req, loggedIn, parcItKey, userPubKey, members, fetchUpvoteCounts, allRequestIds)
          }
          disabled={!loggedIn || upvoteLoading === req.id}
        >
          {upvoteLoading === req.id
            ? (hasUpvoted ? "Un-upvoting..." : "Upvoting...")
            : (hasUpvoted ? "⬇ Un-upvote" : "⬆ Upvote")}
        </Button>
        {/* Upvote message area (success/error) */}
      </div>
      <div className="flex items-center justify-between mt-2">
        <Button variant="outline" size="sm" className="ml-2" onClick={() => handleOpenVerify(req)}>View Details</Button>
        <div className="flex flex-row-reverse items-center gap-2">
          <span className="retro-upvote-count ml-2 px-2 py-1 shadow border border-purple-300 font-mono text-xs" style={{ color: '#7c3aed', fontSize: '9px' }}>
            {upvoteCounts[req.id] || 0} {upvoteCounts[req.id] === 1 ? 'upvote' : 'upvotes'}
          </span>
          {upvoterMembers.slice(0, 5).map((m: GroupMember, idx: number) => (
            <img
              key={m.id}
              src={m.avatar_url}
              alt={m.github_username}
              title={m.github_username}
              className="retro-avatar -mr-2 last:mr-0"
              style={{ zIndex: 10 - idx }}
            />
          ))}
          {upvoterMembers.length > 5 && (
            <span className="mr-1 px-2 py-0.5 border border-gray-400 font-mono" style={{ fontSize: '10px', color: '#888', background: '#fff' }}>+{upvoterMembers.length - 5} more</span>
          )}
        </div>
      </div>
        {upvoteMsg && upvoteMsg[req.id] && (
          <span className="block mt-1 text-xs font-mono" style={{ color: upvoteMsg[req.id].toLowerCase().includes('success') || upvoteMsg[req.id].toLowerCase().includes('submitted') ? '#059669' : '#b91c1c' }}>
            {upvoteMsg[req.id]}
          </span>
        )}
    </li>
  );
}

export function RequestFeed({ requests, members, upvoteCounts, loggedIn, upvoteLoading, submitUpvote, unUpvote, handleOpenVerify, currentPage, pageSize, totalRequests, setCurrentPage, fetchRequests, upvoteMsg, parcItKey, userPubKey, fetchUpvoteCounts, upvotersByRequest }: RequestFeedProps) {
  const allRequestIds = requests.map(r => r.id);
  return (
    <div className="w-full max-w-xl mb-20">
      <div className="flex items-center justify-between mb-4">
        {/* Add Request button is handled in parent */}
      </div>
      {requests.length === 0 ? (
        <div className="text-gray-500">No requests yet.</div>
      ) : (
        <>
          <ul className="space-y-4">
            {requests.map((req) => (
              <RequestCard
                key={req.id}
                req={req}
                members={members}
                loggedIn={loggedIn}
                upvoteCounts={upvoteCounts}
                upvoteLoading={upvoteLoading}
                submitUpvote={submitUpvote}
                unUpvote={unUpvote}
                handleOpenVerify={handleOpenVerify}
                upvoteMsg={upvoteMsg}
                parcItKey={parcItKey}
                userPubKey={userPubKey}
                fetchUpvoteCounts={fetchUpvoteCounts}
                upvotersByRequest={upvotersByRequest}
                allRequestIds={allRequestIds}
              />
            ))}
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
  );
} 