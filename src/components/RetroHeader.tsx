import React from "react";

interface RetroHeaderProps {
  loggedIn: boolean;
  loading?: boolean;
  setLoginOpen: (open: boolean) => void;
  setSignupOpen: (open: boolean) => void;
  setLoggedIn: (loggedIn: boolean) => void;
  setUserPubKey: (pubKey: string | null) => void;
  setIsAdmin: (isAdmin: boolean) => void;
}

export default function RetroHeader({
  loggedIn,
  loading = false,
  setLoginOpen,
  setSignupOpen,
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
          Anonymous Office Idea Board for 0xPARC
        </span>
      </span>
      {/* Login/Signup UI */}
      <div style={{display: 'flex', alignItems: 'center', gap: 8}}>
        {!loggedIn ? (
          <>
            <button
              className="retro-btn"
              onClick={() => setSignupOpen(true)}
              disabled={loading}
              style={{
                minWidth: 100,
                marginRight: 4,
                background: '#e0e0e0',
                color: '#222',
                fontWeight: 500,
                border: '1.5px solid #888',
                opacity: 0.85,
                boxShadow: 'none',
                fontSize: 15,
              }}
            >
              Sign Up
            </button>
            <button
              className="retro-btn"
              onClick={() => setLoginOpen(true)}
              disabled={loading}
              style={{
                minWidth: 120,
                fontWeight: 700,
                background: '#fff',
                color: '#000080',
                border: '2px solid #222',
                fontSize: 16,
              }}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </>
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
