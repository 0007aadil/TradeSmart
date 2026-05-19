import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../lib/api.js';
import { useAuth } from '../lib/auth.jsx';

export default function Signup() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const { login } = useAuth();
  const nav = useNavigate();

  async function submit(e) {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      const data = await api('/auth/signup', { method: 'POST', body: { name, email, password } });
      login(data.token, data.user);
      nav('/dashboard');
    } catch (e) {
      setErr(e.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <Link to="/" className="auth-back" aria-label="Back to home">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6" /></svg>
          <span>Back to home</span>
        </Link>
        <h2>Create your account</h2>
        <div className="muted">Start with $100,000 in virtual cash.</div>
        {err && <div className="err">{err}</div>}
        <div className="field">
          <label>Name</label>
          <input value={name} onChange={(e) => setName(e.target.value)} required />
        </div>
        <div className="field">
          <label>Email</label>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div className="field">
          <label>Password</label>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
        </div>
        <button className="btn primary" style={{ width: '100%' }} disabled={busy}>
          {busy ? 'Creating...' : 'Sign Up'}
        </button>
        <div className="switch">
          Already have an account? <Link to="/login">Sign in</Link>
        </div>
      </form>
    </div>
  );
}
