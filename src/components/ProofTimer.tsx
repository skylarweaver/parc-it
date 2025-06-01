import React from "react";

function ProofTimer({ loading }: { loading: boolean }) {
  const [elapsed, setElapsed] = React.useState(0);
  React.useEffect(() => {
    if (!loading) {
      setElapsed(0);
      return;
    }
    let elapsedMs = 0;
    const interval = setInterval(() => {
      elapsedMs += 1000;
      setElapsed(Math.floor(elapsedMs / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [loading]);
  if (!loading) return null;
  return (
    <div className="w-full text-center text-xs font-mono text-gray-400 mt-1 mb-2" style={{userSelect:'none'}}>
      {elapsed} / ~500 seconds
    </div>
  );
}

export default ProofTimer; 