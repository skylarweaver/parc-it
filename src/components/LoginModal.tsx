import React, { useState } from "react";
import { Button } from "./ui/button";
import { extractPublicKeyFromSignature, validateParcItKey } from "../helpers/parcItKey";

const EXPECTED_MESSAGE = 14447023197094784173331616578829287000074783130802912942914027114823662617007553911501158244718575362051758829289159984830457466395841150324770159971462582912755545324694933673046215187947905307019469n; // double-blind base message

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (key: string, pubKey: string) => void;
  admin?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({ isOpen, onClose, onLogin, admin }) => {
  const [key, setKey] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) return null;

  const handleLogin = () => {
    setError("");
    const pubKey = extractPublicKeyFromSignature(key);
    if (!pubKey || pubKey.startsWith("ERROR")) {
      setError("Could not extract a valid SSH public key from the signature.");
      return;
    }
    const valid = validateParcItKey(key, EXPECTED_MESSAGE);
    if (!valid) {
      setError("Signature is not valid for the expected message. Please check your Parc-It key.");
      return;
    }
    onLogin(key, pubKey);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative">
        <button className="absolute top-2 right-3 text-xl" onClick={onClose}>&times;</button>
        <h2 className="text-lg font-bold mb-4">Login with Parc-It Key</h2>
        <div className="mb-4 text-sm text-gray-700">
          <p className="mb-2">
            <strong>How to get your Parc-It Key:</strong><br />
            You need to generate a special SSH signature using your SSH private key. From this signature, we can derive your SSH public key. Your SSH private key never leaves your machine. Your SSH public key is stored client-side only.
          </p>
          <ol className="list-decimal list-inside mb-2">
            <li>Make sure you have an <strong>RSA SSH keypair</strong> (e.g. <code>~/.ssh/id_rsa</code>). If you don&apos;t, generate one with:<br />
              <pre className="bg-gray-100 rounded p-2 mt-1 text-xs overflow-x-auto">ssh-keygen -t rsa -b 4096 -f ~/.ssh/id_rsa -N ""</pre>
            </li>
            <li className="mt-2">Generate your Parc-It Key (SSH signature) with:<br />
              <pre className="bg-gray-100 rounded p-2 mt-1 text-xs overflow-x-auto">echo "E PLURIBUS UNUM; DO NOT SHARE" | ssh-keygen -Y sign -n double-blind.xyz -f ~/.ssh/id_rsa</pre>
            </li>
            <li className="mt-2">Copy the full output (including the BEGIN/END lines) and paste it below.</li>
          </ol>
          <p className="text-xs text-gray-500">For more details, see the <a href="https://github.com/doubleblind-xyz/double-blind" target="_blank" rel="noopener noreferrer" className="underline">double-blind documentation</a>.</p>
          {admin && (
            <div className="mt-4 text-red-600 font-semibold text-sm">
              Warning: If you log in as an admin, your SSH public key will be sent to the server for admin verification. For maximum privacy, allow time between performing admin actions and sending anonymous office requests.
            </div>
          )}
        </div>
        <textarea
          className="w-full border rounded p-2 mb-2 min-h-[100px]"
          placeholder="Paste your Parc-It key (SSH signature) here"
          value={key}
          onChange={e => setKey(e.target.value)}
        />
        {error && <div className="text-red-600 mb-2">{error}</div>}
        <Button className="w-full" onClick={handleLogin}>
          Login
        </Button>
      </div>
    </div>
  );
}; 