import { useState, type FormEvent } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { LogOut, Map, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { gqlRequest } from '../lib/graphql/client';
import { CREATE_TRAVELOGUE, DELETE_TRAVELOGUE } from '../lib/graphql/operations';

export default function TravelogueListPage() {
  const { user, travelogues, accessToken, ready, signOut, refreshMe, setLastTravelogueId } =
    useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (ready && !user) {
    return <Navigate to="/login" replace />;
  }

  if (!ready) {
    return (
      <div className="flex min-h-full items-center justify-center bg-[#f5f0e8]">
        <p className="text-xs font-light uppercase tracking-[0.3em] opacity-50">Loading…</p>
      </div>
    );
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !name.trim()) return;
    setCreating(true);
    setError(null);
    try {
      const data = await gqlRequest<{
        createTravelogue: { id: string; name: string };
      }>(CREATE_TRAVELOGUE, { name: name.trim() }, accessToken);
      setName('');
      await refreshMe();
      setLastTravelogueId(data.createTravelogue.id);
      navigate(`/t/${data.createTravelogue.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create travelogue');
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: string, travelogueName: string) {
    if (!accessToken) return;
    if (!window.confirm(`Delete “${travelogueName}”? This cannot be undone.`)) return;
    try {
      await gqlRequest(DELETE_TRAVELOGUE, { id }, accessToken);
      await refreshMe();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete');
    }
  }

  return (
    <div className="min-h-full bg-[#f5f0e8] p-6 md:p-10">
      <div className="mx-auto max-w-2xl">
        <header className="mb-10 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl font-light text-[#2c2416]">Your travelogues</h1>
            <p className="mt-1 text-sm text-[#5c4f3a]/80">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => void signOut().then(() => navigate('/login'))}
            className="flex items-center gap-2 rounded-lg border border-[#d4c4a8]/80 px-3 py-2 text-sm text-[#5c4f3a] hover:bg-white/50"
          >
            <LogOut size={16} />
            Sign out
          </button>
        </header>

        <form onSubmit={handleCreate} className="mb-8 flex gap-2">
          <input
            type="text"
            placeholder="New chronicle name…"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 rounded-lg border border-[#d4c4a8]/80 bg-white/80 px-3 py-2 text-[#2c2416] outline-none focus:border-[#8b7355]"
          />
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="flex items-center gap-2 rounded-lg bg-[#4a3f32] px-4 py-2 text-sm font-medium text-[#faf6ef] disabled:opacity-50"
          >
            <Plus size={16} />
            Create
          </button>
        </form>

        {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}

        <ul className="flex flex-col gap-3">
          {travelogues.length === 0 ? (
            <li className="rounded-xl border border-dashed border-[#d4c4a8]/80 p-8 text-center text-sm text-[#5c4f3a]/70">
              No travelogues yet. Create one to start mapping your vacations.
            </li>
          ) : (
            travelogues.map((t) => (
              <li
                key={t.id}
                className="flex items-center justify-between gap-4 rounded-xl border border-[#d4c4a8]/60 bg-[#faf6ef]/90 p-4 shadow-sm"
              >
                <Link
                  to={`/t/${t.id}`}
                  onClick={() => setLastTravelogueId(t.id)}
                  className="flex min-w-0 flex-1 items-center gap-3"
                >
                  <Map size={20} className="shrink-0 text-[#8b7355]" />
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[#2c2416]">{t.name}</p>
                    <p className="text-xs text-[#5c4f3a]/70">
                      {t.tripCount} {t.tripCount === 1 ? 'trip' : 'trips'} · {t.role}
                    </p>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={() => void handleDelete(t.id, t.name)}
                  className="rounded-lg p-2 text-[#5c4f3a]/60 hover:bg-red-50 hover:text-red-700"
                  aria-label={`Delete ${t.name}`}
                >
                  <Trash2 size={18} />
                </button>
              </li>
            ))
          )}
        </ul>

        <p className="mt-8 text-center text-sm text-[#5c4f3a]/60">
          <Link to="/guest" className="underline-offset-2 hover:underline">
            Continue offline
          </Link>{' '}
          without an account (device only).
        </p>
      </div>
    </div>
  );
}
