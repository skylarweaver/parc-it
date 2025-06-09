import React, { useState } from "react";
import { Button } from "./ui/button";
import { getDKGroupCheck } from "../helpers/plonky2/utils";

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (key: string, pubKey: string) => void;
  groupPublicKeys: string;
  admin?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin, groupPublicKeys, admin }) => {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");
  const [copied1, setCopied1] = useState(false);
  const [copied2, setCopied2] = useState(false);

  if (!isOpen) return null;

  const handleLogin = async () => {
    setError("");
    if (!groupPublicKeys || typeof groupPublicKeys !== 'string' || groupPublicKeys.length === 0) {
      setError("No group public keys are loaded. Please contact an admin.");
      return;
    }
    try {
      const result = await getDKGroupCheck(groupPublicKeys, key);
      const idx = result.user_public_key_index;
      const groupKeysArray = groupPublicKeys.split('\n');
      console.log({ groupPublicKeys, groupKeysArray, idx, result });
      if (idx === undefined || idx < 0 || idx >= groupKeysArray.length) {
        setError("Your Double Blind Key is recognized, but the associated public key could not be found in the group. Message an admin to add you to the group.");
        return;
      }
      const userPubKey = groupKeysArray[idx];
      onLogin(key, userPubKey);
    } catch (e) {
      setError("Error checking group membership: " + (e instanceof Error ? e.message : String(e)));
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="retro-modal w-full max-w-md relative">
        <div className="retro-modal-header">
          <span>Login with Double Blind Key</span>
          <button className="absolute top-2 right-3 text-xl" onClick={onClose} style={{ color: '#fff', background: 'none', border: 'none', fontWeight: 'bold', fontSize: 22, cursor: 'pointer', right: 12, top: 8 }}>&times;</button>
        </div>
        <div className="mb-4 text-sm text-gray-700">
          <p className="mb-2">
            <strong>How to get your Double Blind Key:</strong><br />
            You need to generate a special SSH signature using your SSH private key. Your SSH private key never leaves your machine.
          </p>
          <ol className="list-decimal list-inside mb-2">
            <li>Make sure you have a <strong>4096-bit RSA SSH keypair</strong> (e.g. <code>~/.ssh/id_rsa</code>). If you don&apos;t, generate one with:<br />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <pre className="bg-gray-300 rounded p-2 mt-1 text-xs overflow-x-auto" style={{ flex: 1 }}>ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""</pre>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Copy command"
                  style={{ minWidth: 32, minHeight: 32, padding: 0 }}
                  onClick={() => {
                    navigator.clipboard.writeText('ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""');
                    setCopied1(true);
                    setTimeout(() => setCopied1(false), 1200);
                  }}
                >
                  <svg width="1.2em" height="1.2em" viewBox="0 0 20 20" fill="none"><rect x="7" y="3" width="8" height="12" rx="2" stroke="#222" strokeWidth="1.5"/><rect x="5" y="5" width="8" height="12" rx="2" fill="#fff" stroke="#222" strokeWidth="1.5"/></svg>
                </Button>
                {copied1 && <span className="text-green-600 text-xs ml-1">Copied!</span>}
              </div>
            </li>
            <li className="mt-2"><b>Add your new public key to your GitHub account</b> (if you haven&apos;t already):<br />
              <ol className="list-decimal list-inside ml-4 mt-1 mb-1 text-xs">
                <li>Copy the contents of <code>~/.ssh/id_rsa.pub</code></li>
                <li>Go to <a href="https://github.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline text-blue-700">GitHub SSH keys settings</a></li>
                <li>Click <b>&quot;New SSH key&quot;</b>, paste your public key, and save</li>
              </ol>
              <span className="text-xs">This allows Parc-It to fetch your public key and include you as a 0xPARC member.</span>
            </li>
            <li className="mt-2"><b>Generate your Double Blind Key </b>(SSH signature) with:<br />
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <pre className="bg-gray-300 rounded p-2 mt-1 text-xs overflow-x-auto" style={{ flex: 1 }}>echo "E PLURIBUS UNUM; DO NOT SHARE" | ssh-keygen -Y sign -n double-blind.xyz -f ~/.ssh/id_rsa</pre>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Copy command"
                  style={{ minWidth: 32, minHeight: 32, padding: 0 }}
                  onClick={() => {
                    navigator.clipboard.writeText('echo "E PLURIBUS UNUM; DO NOT SHARE" | ssh-keygen -Y sign -n double-blind.xyz -f ~/.ssh/id_rsa');
                    setCopied2(true);
                    setTimeout(() => setCopied2(false), 1200);
                  }}
                >
                  <svg width="1.2em" height="1.2em" viewBox="0 0 20 20" fill="none"><rect x="7" y="3" width="8" height="12" rx="2" stroke="#222" strokeWidth="1.5"/><rect x="5" y="5" width="8" height="12" rx="2" fill="#fff" stroke="#222" strokeWidth="1.5"/></svg>
                </Button>
                {copied2 && <span className="text-green-600 text-xs ml-1">Copied!</span>}
              </div>
            </li>
            <li className="mt-2"><b>Copy the full output </b>(including the BEGIN/END lines) and paste it below.</li>
          </ol>
          {/* <p className="text-xs text-gray-500">For more details, see the <a href="https://github.com/doubleblind-xyz/double-blind" target="_blank" rel="noopener noreferrer" className="underline">double-blind documentation</a>.</p> */}
          {admin && (
            <div className="mt-4 text-red-600 font-semibold text-sm">
              Warning: If you log in as an admin, your SSH public key will be sent to the server for admin verification. For maximum privacy, allow time between performing admin actions and sending anonymous office requests.
            </div>
          )}
        </div>
        <textarea
          className="w-full border rounded p-2 mb-2 min-h-[100px] bg-white"
          placeholder="Paste your Double Blind Key (SSH signature) here"
          value={key}
          onChange={e => setKey(e.target.value)}
          style={{ backgroundColor: 'white' }}
        />
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <Button className="w-full" onClick={handleLogin}>
          Login
        </Button>
      </div>
    </div>
  );
}; 