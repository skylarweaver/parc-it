import { useState, useCallback } from 'react';
import { verifySignature } from '../plonky2/utils';

export function useRequestVerification() {
  const [verifyResult, setVerifyResult] = useState<{
    valid: boolean;
    groupKeys?: string;
    nullifier?: string;
    error?: unknown;
  } | null>(null);
  const [verifyLoading, setVerifyLoading] = useState(false);

  const verifyRequestSignature = useCallback(async (message: string, signature: string) => {
    setVerifyResult(null);
    setVerifyLoading(true);
    if (!signature || typeof signature !== 'string' || signature.length < 10) {
      setVerifyResult({ valid: false, error: { message: 'No valid signature found for this request.' } });
      setVerifyLoading(false);
      return;
    }
    try {
      const result = await verifySignature(message, signature);
      let nullifier: string | undefined = undefined;
      if (result.nullifier) {
        if (typeof result.nullifier === 'string') {
          nullifier = result.nullifier;
        } else if (result.nullifier instanceof Uint8Array) {
          nullifier = Buffer.from(result.nullifier).toString('hex');
        }
      }
      setVerifyResult({ ...result, nullifier });
    } catch (e: unknown) {
      setVerifyResult({ valid: false, error: e });
    }
    setVerifyLoading(false);
  }, []);

  return { verifyResult, verifyLoading, verifyRequestSignature, setVerifyResult };
} 