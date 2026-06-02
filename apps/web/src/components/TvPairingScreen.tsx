import { useEffect, useRef } from 'react';
import QRCode from 'qrcode';

export interface TvPairingSession {
  id: string;
  pairingCode: string;
  pairingUrl: string;
  expiresAt: string;
  displayLabel?: string | null;
}

interface TvPairingScreenProps {
  session: TvPairingSession;
  status: 'waiting' | 'claimed' | 'error';
  errorMessage?: string | null;
}

export default function TvPairingScreen({ session, status, errorMessage }: TvPairingScreenProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    void QRCode.toCanvas(canvas, session.pairingUrl, {
      width: 280,
      margin: 2,
      color: { dark: '#2c2416', light: '#f5f0e8' },
    });
  }, [session.pairingUrl]);

  return (
    <div className="flex h-full flex-col items-center justify-center bg-[#f5f0e8] px-8 text-[#2c2416]">
      <h1 className="mb-2 text-center text-2xl font-light tracking-wide">Pair this TV</h1>
      <p className="mb-8 max-w-md text-center text-sm opacity-70">
        On your phone or laptop, open the app while signed in and scan the code — or go to the URL
        below and enter the code.
      </p>

      <canvas ref={canvasRef} className="rounded-2xl border border-[#2c2416]/10 shadow-lg" />

      <p className="mt-6 font-mono text-4xl font-semibold tracking-[0.35em]">
        {session.pairingCode}
      </p>

      <p className="mt-4 max-w-lg break-all text-center text-xs opacity-60">{session.pairingUrl}</p>

      {status === 'waiting' ? (
        <p className="mt-8 animate-pulse text-xs uppercase tracking-[0.25em] opacity-50">
          Waiting for phone…
        </p>
      ) : null}

      {status === 'claimed' ? (
        <p className="mt-8 text-sm text-emerald-800">Connected — loading chronicle…</p>
      ) : null}

      {errorMessage ? (
        <p className="mt-6 rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-800">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
