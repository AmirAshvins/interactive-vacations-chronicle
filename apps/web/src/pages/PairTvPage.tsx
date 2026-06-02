import { useEffect, useState } from 'react';
import { Link, Navigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { gqlRequest } from '../lib/graphql/client';
import { CLAIM_TV_SESSION, ME } from '../lib/graphql/operations';
import { savePhonePairHint } from '../lib/tvSessionStorage';

export default function PairTvPage() {
  const { user, ready, accessToken, lastTravelogueId } = useAuth();
  const [searchParams] = useSearchParams();
  const codeParam = (searchParams.get('code') ?? '').trim().toUpperCase();

  const [code, setCode] = useState(codeParam);
  const [travelogueId, setTravelogueId] = useState(lastTravelogueId ?? '');
  const [travelogues, setTravelogues] = useState<{ id: string; name: string }[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!accessToken) return;
    void gqlRequest<{
      me: { travelogues: { id: string; name: string }[] };
    }>(ME, {}, accessToken).then((data) => {
      setTravelogues(data.me.travelogues);
      if (!travelogueId && data.me.travelogues[0]) {
        setTravelogueId(data.me.travelogues[0].id);
      }
    });
  }, [accessToken, travelogueId]);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-[#f5f0e8]">
        <p className="text-xs uppercase tracking-[0.3em] opacity-50">Loading…</p>
      </div>
    );
  }

  if (!user || !accessToken) {
    return <Navigate to={`/login?redirect=${encodeURIComponent('/pair' + (codeParam ? `?code=${codeParam}` : ''))}`} replace />;
  }

  const handleClaim = async () => {
    if (!code.trim() || !travelogueId) return;
    setSubmitting(true);
    setError(null);
    setMessage(null);
    try {
      const data = await gqlRequest<{
        claimTvSession: { displayLabel?: string | null; travelogueId: string | null };
      }>(
        CLAIM_TV_SESSION,
        { code: code.trim().toUpperCase(), travelogueId },
        accessToken,
      );
      const label = data.claimTvSession.displayLabel ?? 'TV';
      savePhonePairHint({
        travelogueId,
        displayLabel: label,
        pairedAt: new Date().toISOString(),
      });
      setMessage(`${label} is now showing this travelogue.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Pairing failed');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-full flex-col items-center justify-center bg-[#f5f0e8] px-6 py-12 text-[#2c2416]">
      <div className="w-full max-w-md rounded-2xl border border-[#2c2416]/10 bg-white/80 p-8 shadow-sm">
        <h1 className="text-xl font-light tracking-wide">Connect a TV</h1>
        <p className="mt-2 text-sm opacity-70">
          Enter the code shown on your TV. Your phone stays the full editor — the TV follows live.
        </p>

        <label className="mt-6 block text-xs uppercase tracking-widest opacity-50">Pairing code</label>
        <input
          className="mt-1 w-full rounded-lg border border-[#2c2416]/20 bg-white px-3 py-2 font-mono text-lg tracking-widest"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="ABC12XY"
          maxLength={8}
        />

        <label className="mt-4 block text-xs uppercase tracking-widest opacity-50">Travelogue on TV</label>
        <select
          className="mt-1 w-full rounded-lg border border-[#2c2416]/20 bg-white px-3 py-2 text-sm"
          value={travelogueId}
          onChange={(e) => setTravelogueId(e.target.value)}
        >
          {travelogues.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>

        {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
        {message ? <p className="mt-4 text-sm text-emerald-800">{message}</p> : null}

        <button
          type="button"
          disabled={submitting || !code.trim() || !travelogueId}
          className="mt-6 w-full rounded-lg bg-[#2c2416] py-2.5 text-sm font-medium text-[#f5f0e8] disabled:opacity-40"
          onClick={() => void handleClaim()}
        >
          {submitting ? 'Connecting…' : 'Connect TV'}
        </button>

        <div className="mt-6 flex justify-between text-sm">
          <Link to="/travelogues" className="opacity-70 hover:opacity-100">
            Travelogues
          </Link>
          {travelogueId ? (
            <Link to={`/t/${travelogueId}`} className="opacity-70 hover:opacity-100">
              Open chronicle
            </Link>
          ) : null}
        </div>
      </div>
    </div>
  );
}
