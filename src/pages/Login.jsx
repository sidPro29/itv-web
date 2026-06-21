import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Auth.css';

export default function Login() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login, verify2FA } = useAuth();

  const from = location.state?.from || '/';

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      const res = await login(email, password);
      if (res && res.requires2FA) {
        setStep(2);
      } else {
        navigate(from, { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e) {
    e.preventDefault();
    try {
      setError('');
      setLoading(true);
      await verify2FA(email, code);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card glass-panel animate-fade-in">
        <h2>{step === 1 ? 'Welcome Back' : 'Security Verification'}</h2>
        <p className="auth-subtitle">
          {step === 1 ? 'Sign in to continue your cosmic journey' : `We've sent a code to ${email}`}
        </p>
        
        {error && <div className="auth-error">{error}</div>}
        
        {step === 1 ? (
          <form onSubmit={handleSubmit} className="auth-form">
            <div className="form-group">
              <label>Email Address</label>
              <input 
                type="email" 
                required 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="astronaut@example.com"
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            <button disabled={loading} type="submit" className="btn-primary auth-submit">
              {loading ? 'Verifying...' : 'Log In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="auth-form">
            <div className="form-group">
              <label>6-Digit Code</label>
              <input 
                type="text" 
                required 
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="123456"
                style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem' }}
              />
            </div>
            <button disabled={loading} type="submit" className="btn-primary auth-submit">
              {loading ? 'Verifying...' : 'Verify & Enter'}
            </button>
            <button 
              type="button" 
              className="btn-secondary auth-submit" 
              onClick={() => setStep(1)} 
              disabled={loading}
              style={{ marginTop: '10px' }}
            >
              Back
            </button>
          </form>
        )}
        
        {step === 1 && (
          <div className="auth-footer">
            <p>Don't have an account? <Link to="/signup">Sign Up</Link></p>
          </div>
        )}
      </div>
    </div>
  );
}
