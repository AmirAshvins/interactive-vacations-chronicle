import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import AuthFormLayout, { AuthLink } from '../components/auth/AuthFormLayout';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const { signIn, user, ready, lastTravelogueId } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (ready && user) {
    const dest = lastTravelogueId ? `/t/${lastTravelogueId}` : '/travelogues';
    return <Navigate to={dest} replace />;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await signIn(email, password);
      navigate(lastTravelogueId ? `/t/${lastTravelogueId}` : '/travelogues', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sign in failed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthFormLayout
      title="Interactive Vacations Chronicle"
      subtitle="Sign in to sync your travelogues across devices."
      footer={
        <>
          No account? <AuthLink to="/signup">Create one</AuthLink>
          {' · '}
          <AuthLink to="/guest">Continue offline</AuthLink>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[#5c4f3a]/80">Email</span>
          <input
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="rounded-lg border border-[#d4c4a8]/80 bg-white/80 px-3 py-2 text-[#2c2416] outline-none focus:border-[#8b7355]"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-[#5c4f3a]/80">Password</span>
          <input
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border border-[#d4c4a8]/80 bg-white/80 px-3 py-2 text-[#2c2416] outline-none focus:border-[#8b7355]"
          />
        </label>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <button
          type="submit"
          disabled={submitting}
          className="mt-2 rounded-lg bg-[#4a3f32] px-4 py-2.5 text-sm font-medium text-[#faf6ef] transition hover:bg-[#3a3228] disabled:opacity-50"
        >
          {submitting ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </AuthFormLayout>
  );
}
