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
        setError("Your Parc-It key is recognized, but the associated public key could not be found in the group.");
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
          <span>Login with Parc-It Key</span>
          <button className="absolute top-2 right-3 text-xl" onClick={onClose} style={{ color: '#fff', background: 'none', border: 'none', fontWeight: 'bold', fontSize: 22, cursor: 'pointer', right: 12, top: 8 }}>&times;</button>
        </div>
        <div className="mb-4 text-sm text-gray-700">
          <p className="mb-2">
            <strong>How to get your Parc-It Key:</strong><br />
            You need to generate a special SSH signature using your SSH private key. Your SSH private key never leaves your machine. Your SSH public key is stored client-side only.
          </p>
          <ol className="list-decimal list-inside mb-2">
            <li>Make sure you have an <strong>RSA SSH keypair</strong> (e.g. <code>~/.ssh/id_rsa</code>). If you don&apos;t, generate one with:<br />
              <pre className="bg-gray-300 rounded p-2 mt-1 text-xs overflow-x-auto">ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""</pre>
            </li>
            <li className="mt-2"><b>Add your new public key to your GitHub account</b> (if you haven&apos;t already):<br />
              <ol className="list-decimal list-inside ml-4 mt-1 mb-1 text-xs">
                <li>Copy the contents of <code>~/.ssh/id_rsa.pub</code></li>
                <li>Go to <a href="https://github.com/settings/keys" target="_blank" rel="noopener noreferrer" className="underline text-blue-700">GitHub SSH keys settings</a></li>
                <li>Click <b>"New SSH key"</b>, paste your public key, and save</li>
              </ol>
              <span className="text-xs">This allows the app to fetch your public key and include you as a group member.</span>
            </li>
            <li className="mt-2"><b>Generate your Parc-It Key </b>(SSH signature) with:<br />
              <pre className="bg-gray-300 rounded p-2 mt-1 text-xs overflow-x-auto">echo "E PLURIBUS UNUM; DO NOT SHARE" | ssh-keygen -Y sign -n double-blind.xyz -f ~/.ssh/id_rsa</pre>
            </li>
            <li className="mt-2"><b>Copy the full output </b>(including the BEGIN/END lines) and paste it below.</li>
          </ol>
          <p className="text-xs text-gray-500">For more details, see the <a href="https://github.com/doubleblind-xyz/double-blind" target="_blank" rel="noopener noreferrer" className="underline">double-blind documentation</a>.</p>
          {admin && (
            <div className="mt-4 text-red-600 font-semibold text-sm">
              Warning: If you log in as an admin, your SSH public key will be sent to the server for admin verification. For maximum privacy, allow time between performing admin actions and sending anonymous office requests.
            </div>
          )}
        </div>
        <textarea
          className="w-full border rounded p-2 mb-2 min-h-[100px] bg-white"
          placeholder="Paste your Parc-It key (SSH signature) here"
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