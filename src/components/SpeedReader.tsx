import React from "react";

function SpeedReader({ script, loading }: { script: string, loading: boolean }) {
  const [index, setIndex] = React.useState(0);
  const [words, setWords] = React.useState<string[]>([]);
  const [wpm, setWpm] = React.useState(100);
  const [maxWpm, setMaxWpm] = React.useState(300);
  const [paused, setPaused] = React.useState(false);
  const [showControls, setShowControls] = React.useState(true);
  const rampUpTime = 10; // seconds to reach target speed
  const minWpm = 100;
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  const controlsTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

  // Split script into words, keeping section breaks and line breaks as tokens
  React.useEffect(() => {
    const tokens = script
      .replace(/\n/g, ' <br> ')
      .replace(/⸻/g, ' <section> ')
      .split(/\s+/)
      .filter(Boolean);
    setWords(tokens);
    setIndex(0);
    setWpm(minWpm);
    setMaxWpm(300);
    setPaused(false);
    setShowControls(true); // Controls are now always shown immediately
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
  }, [script, loading]);

  // Animate word display
  React.useEffect(() => {
    if (!loading || words.length === 0 || paused) {
      if (intervalRef.current) clearTimeout(intervalRef.current);
      return;
    }
    if (index >= words.length) return;
    // Calculate current wpm (ramp up)
    const rampProgress = Math.min(index / (words.length * (rampUpTime * minWpm / 60)), 1);
    // If maxWpm was increased, ramp up to new maxWpm immediately
    let currentWpm = Math.round(minWpm + (maxWpm - minWpm) * rampProgress);
    if (rampProgress >= 1 || maxWpm > 300) currentWpm = maxWpm;
    setWpm(currentWpm);
    // Determine delay
    let delay = 60000 / currentWpm;
    const word = words[index];
    if (word === '<br>') delay = 400;
    if (word === '<section>') delay = 900;
    if (/[.!?…]$/.test(word)) delay += 200;
    intervalRef.current = setTimeout(() => {
      setIndex(i => i + 1);
    }, delay);
    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current);
    };
  }, [index, words, loading, paused, maxWpm]);

  React.useEffect(() => {
    if (!loading) setIndex(0);
  }, [loading]);

  if (!loading || words.length === 0 || index >= words.length) return null;
  const word = words[index];
  const controls = showControls && (
    <div className="flex items-center justify-between w-full max-w-xs mx-auto mb-2" style={{ minHeight: 40 }}>
      {/* Pause/Play button on the left */}
      <button
        aria-label={paused ? 'Resume' : 'Pause'}
        onClick={() => {
          setPaused(p => !p);
        }}
        className="text-gray-600 hover:text-gray-900 text-lg px-2 py-1 rounded-full bg-gray-200 hover:bg-gray-300 shadow transition-all focus:outline-none"
        style={{ minWidth: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
      >
        {paused ? (
          // Play icon (right-facing triangle)
          <svg width="1.1em" height="1.1em" viewBox="0 0 20 20" fill="none"><polygon points="7,5 15,10 7,15" fill="currentColor"/></svg>
        ) : (
          // Pause icon (two vertical bars)
          <svg width="1.1em" height="1.1em" viewBox="0 0 20 20" fill="none"><rect x="6" y="5" width="2.5" height="10" rx="1" fill="currentColor"/><rect x="11.5" y="5" width="2.5" height="10" rx="1" fill="currentColor"/></svg>
        )}
      </button>
      {/* Word display in the center */}
      <div className="flex-1 flex justify-center items-center">
        {word === '<br>' ? (
          <div style={{height:32}}></div>
        ) : word === '<section>' ? (
          <div style={{height:32}}><span className="text-2xl text-gray-300">⸻</span></div>
        ) : (
          <div className="w-full text-center text-2xl font-mono text-gray-700 select-none" style={{minHeight:40, lineHeight:'40px'}}>
            {word}
          </div>
        )}
      </div>
      {/* Speed controls on the right, vertical layout */}
      <div className="flex flex-col items-center justify-center ml-2" style={{height: 40}}>
        <button
          aria-label="Speed up"
          onClick={() => {
            setMaxWpm(w => {
              const newWpm = w + 100;
              return newWpm;
            });
          }}
          className="text-blue-700 hover:text-white text-base px-2 py-1 rounded-full bg-blue-100 hover:bg-blue-500 shadow transition-all focus:outline-none mb-1"
          style={{ minWidth: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {/* Upward arrow icon */}
          <svg width="1em" height="1em" viewBox="0 0 20 20" fill="none"><path d="M10 16V4M10 4L6 8M10 4L14 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
        <button
          aria-label="Speed down"
          onClick={() => {
            setMaxWpm(w => {
              const newWpm = Math.max(100, w - 100);
              return newWpm;
            });
          }}
          className="text-blue-700 hover:text-white text-base px-2 py-1 rounded-full bg-blue-100 hover:bg-blue-500 shadow transition-all focus:outline-none mt-1"
          style={{ minWidth: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          {/* Downward arrow icon */}
          <svg width="1em" height="1em" viewBox="0 0 20 20" fill="none"><path d="M10 4V16M10 16L6 12M10 16L14 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        </button>
      </div>
    </div>
  );
  // Always render controls above the word display, even for breaks
  return (
    <div className="w-full flex flex-col items-center">
      {controls}
    </div>
  );
}

export default SpeedReader; 