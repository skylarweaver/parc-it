import React, { RefObject, useState } from "react";
import { GroupMember } from "../types/models";
import { Button } from "./ui/button";
import EmojiPicker, { Theme, EmojiStyle, EmojiClickData } from 'emoji-picker-react';
import AnimatedEquation from "./AnimatedEquation";
import ProgressBar from "./ui/ProgressBar";
import ProofTimer from "./ProofTimer";

interface AddRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  requestEmoji: string;
  setRequestEmoji: (emoji: string) => void;
  requestDesc: string;
  setRequestDesc: (desc: string) => void;
  isDoxxed: boolean;
  setIsDoxxed: (doxxed: boolean) => void;
  selectedGroup: string[];
  setSelectedGroup: (group: string[]) => void;
  members: GroupMember[];
  userPubKey: string | null;
  loggedIn: boolean;
  requestMsg: string | null;
  requestLoading: boolean;
  submitRequest: () => void;
  showEmojiPicker: boolean;
  setShowEmojiPicker: (show: boolean) => void;
  emojiPickerRef: RefObject<HTMLDivElement>;
  requestSuccess: boolean;
  setRequestSuccess: (success: boolean) => void;
}

export function AddRequestModal({
  isOpen,
  onClose,
  requestEmoji,
  setRequestEmoji,
  requestDesc,
  setRequestDesc,
  isDoxxed,
  setIsDoxxed,
  selectedGroup,
  setSelectedGroup,
  members,
  userPubKey,
  loggedIn,
  requestMsg,
  requestLoading,
  submitRequest,
  showEmojiPicker,
  setShowEmojiPicker,
  emojiPickerRef,
  requestSuccess,
  setRequestSuccess,
}: AddRequestModalProps) {
  const [showGroupExpander, setShowGroupExpander] = useState(false);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white  shadow-lg p-6 w-full max-w-md border-2 border-gray-300">
        <h2 className="text-xl font-bold mb-4">New Office Idea</h2>
        {/* Toggle for Anonymous/Doxxed */}
        <div className="mb-4">
          <div className="flex items-center gap-4">
            <span className={`text-base font-semibold transition-colors duration-200 ${isDoxxed ? 'text-[#1a237e]' : 'text-gray-500'}`}>Doxxed</span>
            <button
              type="button"
              className={`relative w-12 h-7 rounded-full border-2 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-400
                ${!isDoxxed ? 'bg-blue-600 border-blue-700' : 'bg-gray-300 border-gray-400'}`}
              onClick={() => setIsDoxxed(!isDoxxed)}
              disabled={requestLoading}
              aria-pressed={!isDoxxed}
              aria-label="Toggle doxxed/anonymous"
              tabIndex={0}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-200
                  ${!isDoxxed ? 'translate-x-5' : 'translate-x-0'}`}
                style={{ boxShadow: '0 2px 6px rgba(0,0,0,0.10)' }}
              />
            </button>
            <span className={`text-base font-semibold transition-colors duration-200 ${!isDoxxed ? 'text-[#1a237e]' : 'text-gray-500'}`}>Anonymous</span>
          </div>
          <div className="mt-1">
            <span className="text-xs text-gray-500">{isDoxxed ? "Your username will be shown with this request." : "Your idea will be anonymous among the group you select below."}</span>
          </div>
        </div>
        {/* If doxxed, show preview of user info */}
        {isDoxxed && loggedIn && (
          <div className="mb-4 flex items-center gap-2 bg-gray-50 p-2 rounded border">
            <img
              src={members.find(m => m.public_key === userPubKey)?.avatar_url || ""}
              alt={members.find(m => m.public_key === userPubKey)?.github_username || ""}
              className="retro-avatar"
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
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
              readOnly
              disabled={requestLoading}
              aria-label="Pick an emoji"
            />
            {showEmojiPicker && (
              <div ref={emojiPickerRef} className="absolute z-50 top-12 left-0">
                <EmojiPicker
                  onEmojiClick={(emojiData: EmojiClickData) => {
                    setRequestEmoji(emojiData.emoji);
                    setShowEmojiPicker(false);
                  }}
                  theme={Theme.LIGHT}
                  width={300}
                  height={350}
                  previewConfig={{ showPreview: false }}
                  emojiStyle={EmojiStyle.NATIVE}
                  style={{ '--epr-emoji-size': '1.4em' } as React.CSSProperties}
                />
              </div>
            )}
          </div>
        </div>
        <div className="mb-4">
          <label className="block mb-1 font-semibold">Idea Description</label>
          <textarea
            className="border rounded p-2 w-full min-h-[80px]"
            placeholder="Describe your idea..."
            value={requestDesc}
            onChange={e => setRequestDesc(e.target.value)}
            disabled={requestLoading}
          />
        </div>
        {/*
        Group Members section is hidden in doxxed mode for now. Restore if needed.
        */}
        {!isDoxxed && (
          <div className="mb-4">
            <label className="block mb-1 font-semibold">Group Members</label>
            {!showGroupExpander && (
              <div className="text-xs text-gray-500 mb-2">Default: All group members will be included in the anonymous group signature unless you change this.</div>
            )}
            <button
              type="button"
              className="text-xs text-blue-700 mb-1 flex items-center gap-1 group"
              onClick={() => setShowGroupExpander(v => !v)}
              style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', outline: 'none' }}
            >
              <span className="underline">{showGroupExpander ? 'Hide group member selection' : 'Show group member selection'}</span>
              <span style={{ fontSize: '0.9em', display: 'inline-block', transition: 'transform 0.2s' }}>
                {showGroupExpander ? '▲' : '▼'}
              </span>
            </button>
            {showGroupExpander && (
              <div className="max-h-40 overflow-y-auto border rounded p-2 bg-gray-50">
                {[...(members || [])]
                  .sort((a, b) => {
                    if (a.public_key === userPubKey) return -1;
                    if (b.public_key === userPubKey) return 1;
                    return a.github_username.localeCompare(b.github_username);
                  })
                  .map((m) => (
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
                    <img src={m.avatar_url} alt={m.github_username} className="retro-avatar" />
                    <span className="font-mono text-xs">{m.github_username}</span>
                  </label>
                ))}
              </div>
            )}
            <div className="text-xs text-gray-500 mt-1">{showGroupExpander ? "Only the selected members will be included in the group signature proof." : null}</div>
          </div>
        )}
        {requestMsg && (
          <div className={`mb-2 text-sm font-semibold ${requestSuccess ? 'text-green-600 bg-green-50 border border-green-200 rounded px-2 py-1' : 'text-red-600'}`}>{
            requestSuccess ? 'Your idea has been submitted.' : requestMsg
          }</div>
        )}
        {/* Progress bar for signature generation */}
        {requestLoading && <AnimatedEquation loading={requestLoading} />}
        {requestLoading && <ProgressBar />}
        {requestLoading && <ProofTimer loading={requestLoading} />}
        <div className="flex gap-2 justify-end mt-4">
          <Button variant="outline" onClick={() => { setRequestSuccess(false); onClose(); }} disabled={requestLoading}>
            Close
          </Button>
          {requestSuccess ? null : (
            <Button variant="default" onClick={submitRequest} disabled={requestLoading}>
              {requestLoading ? "Generating Proof..." : "Submit"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
} 