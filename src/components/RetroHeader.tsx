import React from "react";

interface RetroHeaderProps {
  loggedIn: boolean;
  loading?: boolean;
  setLoginOpen: (open: boolean) => void;
  setLoggedIn: (loggedIn: boolean) => void;
  setUserPubKey: (pubKey: string | null) => void;
  setIsAdmin: (isAdmin: boolean) => void;
}

export default function RetroHeader({
  loggedIn,
  loading = false,
  setLoginOpen,
  setLoggedIn,
  setUserPubKey,
  setIsAdmin
}: RetroHeaderProps) {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      background: '#000080',
      color: 'white',
      padding: '4px 100px',
      borderTopLeftRadius: 2,
      borderTopRightRadius: 2,
      borderBottom: '2px solid #fff',
      fontFamily: 'Arial Black, Impact, sans-serif',
      fontSize: 20,
      letterSpacing: 1,
      position: 'relative',
      userSelect: 'none',
      minHeight: 32,
    }}>
      {/* App icon (floppy disk emoji or SVG) */}
      <span style={{fontSize: 22, marginRight: 8}}>💾</span>
      <span style={{flex: 1, display: 'flex', alignItems: 'center'}}>
        <span className="retro-title">Parc-It ✨</span>
        <span style={{
          fontFamily: 'Tahoma, Courier New, monospace',
          fontSize: 14,
          fontWeight: 'normal',
          marginLeft: 18,
          color: '#fff',
          opacity: 0.85,
          letterSpacing: 0.5,
          textShadow: '1px 1px 0 #222',
        }}>
          Anonymous Office Request Board for 0xPARC
        </span>
      </span>
      {/* Login/Logout UI */}
      <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
        {!loggedIn ? (
          <button
            className="retro-btn"
            onClick={() => setLoginOpen(true)}
            disabled={loading}
            style={{ minWidth: 160, marginLeft: 12 }}
          >
            {loading ? "Logging in..." : "Login with Parc-It Key"}
          </button>
        ) : (
          <>
            <span style={{
              fontFamily: 'monospace',
              fontSize: 13,
              background: '#fff',
              color: '#000080',
              padding: '2px 10px',
              borderRadius: 3,
              border: '1px solid #888',
              marginRight: 8,
            }}>You are logged in</span>
            <button
              className="retro-btn"
              onClick={() => {
                setLoggedIn(false);
                setUserPubKey(null);
                setIsAdmin(false);
                localStorage.removeItem('parcItKey');
                localStorage.removeItem('parcItPubKey');
              }}
              style={{ minWidth: 80 }}
            >
              Logout
            </button>
          </>
        )}
      </div>
    </div>
  );
}
