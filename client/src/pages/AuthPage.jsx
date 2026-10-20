import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import '../Auth.css';

// Steps: 'email' → 'otp' → 'username' (only for new users)
export default function AuthPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [otpDigits, setOtpDigits] = useState(['', '', '', '', '', '']);
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [resendTimer, setResendTimer] = useState(0);
  const [pendingEmail, setPendingEmail] = useState('');
  const otpRefs = useRef([]);

  // Step 1: Send OTP
  async function handleSendOTP(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await api.post('/auth/send-otp', { email });
      setStep('otp');

      // Start 60s resend cooldown
      setResendTimer(60);
      const timer = setInterval(() => {
        setResendTimer(t => {
          if (t <= 1) {
            clearInterval(timer);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to send OTP. Please try again.');
    }
    setLoading(false);
  }

  // OTP input handling (auto-advance)
  function handleOtpChange(index, value) {
    if (!/^\d*$/.test(value)) return;
    const digits = [...otpDigits];
    digits[index] = value.slice(-1);
    setOtpDigits(digits);
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }

  function handleOtpKeyDown(index, e) {
    if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }

  function handleOtpPaste(e) {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtpDigits(pasted.split(''));
    }
  }

  // Step 2: Verify OTP
  async function handleVerifyOTP(e) {
    e.preventDefault();
    const otp = otpDigits.join('');
    if (otp.length < 6) return setError('Please enter all 6 digits.');
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/verify-otp', { email, otp });
      if (res.data.newUser) {
        setPendingEmail(email);
        setStep('username');
      } else {
        localStorage.setItem('chathouse_token', res.data.token);
        localStorage.setItem('chathouse_user', JSON.stringify(res.data.user));
        navigate('/');
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid OTP. Please try again.');
    }
    setLoading(false);
  }

  // Step 3: Set Username
  async function handleSetUsername(e) {
    e.preventDefault();
    if (!username.trim()) return setError('Please enter a username.');
    setError('');
    setLoading(true);

    try {
      const res = await api.post('/auth/create-user', {
        email: pendingEmail,
        username
      });
      localStorage.setItem('chathouse_token', res.data.token);
      localStorage.setItem('chathouse_user', JSON.stringify(res.data.user));
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create account. Please try again.');
    }
    setLoading(false);
  }

  const stepIndex = { email: 0, otp: 1, username: 2 }[step];

  return (
    <div className="auth-page">
      <div className="auth-card">
        {/* Brand */}
        <div className="auth-brand">
          <div className="auth-brand-icon">C</div>
          <span className="auth-brand-name">ChatHouse</span>
        </div>

        {/* Step dots */}
        <div className="auth-steps">
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className={`step-dot ${i === stepIndex ? 'active' : i < stepIndex ? 'done' : ''}`}
            />
          ))}
        </div>

        {/* Email Step */}
        {step === 'email' && (
          <form className="auth-form" onSubmit={handleSendOTP}>
            <div>
              <h1 className="auth-title">Sign in to ChatHouse</h1>
              <p className="auth-subtitle">Enter your email to receive a one-time code.</p>
            </div>
            <div className="auth-input-group">
              <label className="auth-label" htmlFor="email">Email address</label>
              <input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
            {error && <p className="error-text">{error}</p>}
            <button
              id="send-otp-btn"
              type="submit"
              className="btn-primary auth-btn"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : 'Continue with Email'}
            </button>
          </form>
        )}

        {/* OTP Step */}
        {step === 'otp' && (
          <form className="auth-form" onSubmit={handleVerifyOTP}>
            <div>
              <h2 className="auth-title">Check your email</h2>
              <p className="auth-subtitle">
                We sent a 6-digit code to{' '}
                <span className="auth-highlight">{email}</span>
              </p>
            </div>
            <div>
              <label className="auth-label">Verification code</label>
              <div className="otp-inputs" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, i) => (
                  <input
                    key={i}
                    id={`otp-${i}`}
                    className="otp-input"
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={e => handleOtpChange(i, e.target.value)}
                    onKeyDown={e => handleOtpKeyDown(i, e)}
                    ref={el => otpRefs.current[i] = el}
                    autoFocus={i === 0}
                  />
                ))}
              </div>
            </div>
            {error && <p className="error-text">{error}</p>}
            <button
              id="verify-otp-btn"
              type="submit"
              className="btn-primary auth-btn"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : 'Verify Code'}
            </button>
            <p className="auth-resend">
              Didn't receive it?{' '}
              <button
                type="button"
                disabled={resendTimer > 0}
                onClick={handleSendOTP}
              >
                {resendTimer > 0 ? `Resend in ${resendTimer}s` : 'Resend code'}
              </button>
            </p>
            <button
              type="button"
              className="btn-ghost"
              style={{ textAlign: 'center', color: 'var(--muted)', fontSize: '13px' }}
              onClick={() => {
                setStep('email');
                setOtpDigits(['', '', '', '', '', '']);
                setError('');
              }}
            >
              ← Back to email
            </button>
          </form>
        )}

        {/* Username Step */}
        {step === 'username' && (
          <form className="auth-form" onSubmit={handleSetUsername}>
            <div>
              <h2 className="auth-title">Create your account</h2>
              <p className="auth-subtitle">Choose a username for your ChatHouse profile.</p>
            </div>
            <div className="auth-input-group">
              <label className="auth-label" htmlFor="username">Username</label>
              <div className="input-with-prefix">
                <span className="input-prefix">@</span>
                <input
                  id="username"
                  type="text"
                  placeholder="shivansh"
                  value={username}
                  onChange={e => setUsername(e.target.value.toLowerCase())}
                  autoFocus
                  minLength={3}
                  maxLength={20}
                />
              </div>
              <p className="auth-hint">3–20 characters. Letters, numbers, underscores only.</p>
            </div>
            {error && <p className="error-text">{error}</p>}
            <button
              id="create-account-btn"
              type="submit"
              className="btn-primary auth-btn"
              disabled={loading}
            >
              {loading ? <span className="spinner" /> : 'Create Account'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}