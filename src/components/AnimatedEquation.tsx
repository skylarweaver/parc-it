import React from "react";

function AnimatedEquation({ loading }: { loading: boolean }) {
  const [equation, setEquation] = React.useState("");
  const [elapsed, setElapsed] = React.useState(0);
  const intervalRef = React.useRef<NodeJS.Timeout | null>(null);
  React.useEffect(() => {
    if (!loading) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      setElapsed(0);
      return;
    }
    const p = (2n ** 64n) - (2n ** 32n) + 1n;
    function randomBigInt(min: bigint, max: bigint) {
      const range = max - min;
      const rand = BigInt(Math.floor(Math.random() * Number(range)));
      return min + rand;
    }
    function fmt(n: bigint) {
      return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
    }
    function generateEquation() {
      const a = randomBigInt(10n ** 18n, 15n * 10n ** 18n);
      const b = randomBigInt(8n * 10n ** 18n, 12n * 10n ** 18n);
      const c = BigInt(Math.floor(Math.random() * 999) + 1);
      const d = (a * b + c) % p;
      return `${fmt(d)} = ${fmt(a)} × ${fmt(b)} + ${fmt(c)} (mod p)`;
    }
    setEquation(generateEquation());
    setElapsed(0);
    const interval = 50;
    intervalRef.current = setInterval(() => {
      setEquation(generateEquation());
      setElapsed(e => e + interval / 1000);
    }, interval);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [loading]);
  if (!loading) return null;
  return (
    <>
      <div className="w-full text-center text-xs font-mono text-gray-500 mb-1" style={{userSelect:'none'}}>
        {equation}
        <br />
        where Goldilocks prime p = 18,446,744,069,414,584,321
      </div>
    </>
  );
}

export default AnimatedEquation; 