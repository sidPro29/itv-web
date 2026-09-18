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
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Forgot Password state
  const [isForgotMode, setIsForgotMode] = useState(false);
  const [forgotStep, setForgotStep] = useState(1);
  const [resetEmail, setResetEmail] = useState('');
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const navigate = useNavigate();
  const location = useLocation();
  const { login, verify2FA } = useAuth();

  const from = location.state?.from || '/';

  async function handleSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      setSuccessMsg('');
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
      setSuccessMsg('');
      setLoading(true);
      await verify2FA(email, code);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.message || 'Verification failed. Please check the code.');
    } finally {
      setLoading(false);
    }
  }

  async function handleSendResetOTP(e) {
    e.preventDefault();
    try {
      setError('');
      setSuccessMsg('');
      setLoading(true);
      const response = await fetch((import.meta.env.VITE_API_URL || 'https://api.interplanetary.tv/api') + '/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.msg || 'Failed to send reset verification code');
      }
      setSuccessMsg(data.msg || 'Verification code sent to your email address.');
      setForgotStep(2);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPasswordSubmit(e) {
    e.preventDefault();
    try {
      setError('');
      setSuccessMsg('');
      setLoading(true);
      const response = await fetch((import.meta.env.VITE_API_URL || 'https://api.interplanetary.tv/api') + '/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: resetEmail, code: resetCode, newPassword })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.msg || 'Failed to reset password');
      }
      setSuccessMsg(data.msg || 'Password reset successfully! Please sign in.');
      setIsForgotMode(false);
      setEmail(resetEmail);
      setPassword('');
      setForgotStep(1);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card glass-panel animate-fade-in">
        <h2>
          {isForgotMode 
            ? (forgotStep === 1 ? 'Reset Password' : 'Verify Reset OTP')
            : (step === 1 ? 'Welcome Back' : 'Security Verification')}
        </h2>
        <p className="auth-subtitle">
          {isForgotMode 
            ? (forgotStep === 1 ? 'Enter your email to receive a 6-digit reset code' : `Enter code sent to ${resetEmail}`)
            : (step === 1 ? 'Sign in to continue your cosmic journey' : `We've sent a code to ${email}`)}
        </p>
        
        {error && <div className="auth-error">{error}</div>}
        {successMsg && <div className="auth-success" style={{ color: '#2ecc71', marginBottom: '15px', textAlign: 'center', fontSize: '0.9rem' }}>{successMsg}</div>}
        
        {isForgotMode ? (
          forgotStep === 1 ? (
            <form onSubmit={handleSendResetOTP} className="auth-form">
              <div className="form-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  required 
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  placeholder="astronaut@example.com"
                />
              </div>
              <button disabled={loading} type="submit" className="btn-primary auth-submit">
                {loading ? 'Sending Code...' : 'Send Reset Code'}
              </button>
              <button 
                type="button" 
                className="btn-secondary auth-submit" 
                onClick={() => { setIsForgotMode(false); setError(''); setSuccessMsg(''); }} 
                disabled={loading}
                style={{ marginTop: '10px' }}
              >
                Back to Login
              </button>
            </form>
          ) : (
            <form onSubmit={handleResetPasswordSubmit} className="auth-form">
              <div className="form-group">
                <label>6-Digit Verification Code</label>
                <input 
                  type="text" 
                  required 
                  maxLength={6}
                  value={resetCode}
                  onChange={(e) => setResetCode(e.target.value)}
                  placeholder="123456"
                  style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem' }}
                />
              </div>
              <div className="form-group">
                <label>New Password</label>
                <input 
                  type="password" 
                  required 
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                />
              </div>
              <button disabled={loading} type="submit" className="btn-primary auth-submit">
                {loading ? 'Setting New Password...' : 'Reset Password'}
              </button>
              <button 
                type="button" 
                className="btn-secondary auth-submit" 
                onClick={() => setForgotStep(1)} 
                disabled={loading}
                style={{ marginTop: '10px' }}
              >
                Back
              </button>
            </form>
          )
        ) : (
          step === 1 ? (
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
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <label>Password</label>
                  <button
                    type="button"
                    style={{ background: 'none', border: 'none', color: '#00d2ff', cursor: 'pointer', fontSize: '0.8rem', padding: 0 }}
                    onClick={() => { setIsForgotMode(true); setResetEmail(email); setError(''); setSuccessMsg(''); }}
                  >
                    Forgot Password?
                  </button>
                </div>
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
          )
        )}
        
        {step === 1 && !isForgotMode && (
          <div className="auth-footer">
            <p>Don't have an account? <Link to="/signup">Sign Up</Link></p>
          </div>
        )}
      </div>
    </div>
  );
}
