import React, { useState } from 'react';
import { supabase } from '../db/supabaseClient';
import { Mail, Lock, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function AuthView({ initialMode = 'login', onResetComplete }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup' | 'forgot' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setInfoMsg('');

    if (mode === 'login' || mode === 'signup') {
      if (!email || !password) {
        setErrorMsg('Please enter both email and password.');
        return;
      }
    } else if (mode === 'forgot') {
      if (!email) {
        setErrorMsg('Please enter your email address.');
        return;
      }
    } else if (mode === 'reset') {
      if (!password || !confirmPassword) {
        setErrorMsg('Please fill in both password fields.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwords do not match.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Password must be at least 6 characters.');
        return;
      }
    }

    setLoading(true);

    try {
      if (mode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (error) throw error;
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password
        });
        if (error) throw error;
        
        if (data?.user && data.user.identities?.length === 0) {
          setInfoMsg('This email is already registered. Try logging in.');
        } else {
          setInfoMsg('Registration successful! Please check your email for confirmation (or try logging in directly).');
        }
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin
        });
        if (error) throw error;
        setInfoMsg('Reset link sent! Please check your email inbox.');
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.updateUser({
          password: password
        });
        if (error) throw error;
        setInfoMsg('Password updated successfully! Redirecting to login...');
        setTimeout(async () => {
          await supabase.auth.signOut();
          if (onResetComplete) onResetComplete();
          setMode('login');
          setPassword('');
          setConfirmPassword('');
          setInfoMsg('');
        }, 2500);
      }
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred during authentication.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      background: '#000000',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
      fontFamily: 'var(--font-body)'
    }}>
      {/* Decorative Premium Glow Background */}
      <div className="cloudy-backdrop" style={{ opacity: 0.85 }}>
        <div className="cloud-blur cloud-1" style={{ width: '400px', height: '400px', background: 'rgba(10, 132, 255, 0.15)' }} />
        <div className="cloud-blur cloud-2" style={{ width: '500px', height: '500px', background: 'rgba(191, 90, 242, 0.12)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        style={{
          width: '420px',
          background: 'rgba(15, 15, 17, 0.75)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '40px',
          boxShadow: '0 24px 64px rgba(0, 0, 0, 0.6), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(30px)',
          WebkitBackdropFilter: 'blur(30px)',
          zIndex: 10,
          display: 'flex',
          flexDirection: 'column',
          boxSizing: 'border-box'
        }}
      >
        {/* Brand Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px', gap: '8px' }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            border: '2.5px solid #fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '4px',
            boxShadow: '0 0 20px rgba(255,255,255,0.1)'
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#fff' }}>
              <path d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4771 12 22C12 16.4771 16.4771 12 22 12C16.4771 12 12 7.52285 12 2Z" />
            </svg>
          </div>
          <span style={{
            fontFamily: 'var(--font-logo)',
            fontSize: '28px',
            fontWeight: '900',
            letterSpacing: '1px',
            color: '#fff',
            textTransform: 'lowercase'
          }}>
            hollow.
          </span>
          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.45)', textTransform: 'uppercase', letterSpacing: '0.8px', fontWeight: '700' }}>
            {mode === 'login' && 'Sign In to Journal'}
            {mode === 'signup' && 'Create New Account'}
            {mode === 'forgot' && 'Reset Password'}
            {mode === 'reset' && 'Choose New Password'}
          </span>
        </div>

        {/* Feedback alerts */}
        <AnimatePresence mode="wait">
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255, 69, 58, 0.1)',
                border: '1px solid rgba(255, 69, 58, 0.25)',
                borderRadius: '12px',
                padding: '12px 14px',
                color: '#ff453a',
                fontSize: '12.5px',
                marginBottom: '20px',
                lineHeight: 1.4
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {infoMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(48, 209, 88, 0.1)',
                border: '1px solid rgba(48, 209, 88, 0.25)',
                borderRadius: '12px',
                padding: '12px 14px',
                color: '#30d158',
                fontSize: '12.5px',
                marginBottom: '20px',
                lineHeight: 1.4
              }}
            >
              <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
              <span>{infoMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Inputs */}
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          
          {(mode === 'login' || mode === 'signup' || mode === 'forgot') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--colors-stone)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                Email Address
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="you@domain.com"
                  className="hollow-input"
                  style={{
                    width: '100%',
                    paddingLeft: '38px',
                    boxSizing: 'border-box'
                  }}
                />
                <Mail size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              </div>
            </div>
          )}

          {(mode === 'login' || mode === 'signup') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--colors-stone)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  Password
                </label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMsg('');
                      setInfoMsg('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255, 255, 255, 0.4)',
                      fontSize: '10.5px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      padding: 0,
                      outline: 'none'
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#fff'}
                    onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
              <div style={{ position: 'relative' }}>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="hollow-input"
                  style={{
                    width: '100%',
                    paddingLeft: '38px',
                    boxSizing: 'border-box'
                  }}
                />
                <Lock size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
              </div>
            </div>
          )}

          {mode === 'reset' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--colors-stone)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  New Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="hollow-input"
                    style={{
                      width: '100%',
                      paddingLeft: '38px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <Lock size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: '700', color: 'var(--colors-stone)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  Confirm Password
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="hollow-input"
                    style={{
                      width: '100%',
                      paddingLeft: '38px',
                      boxSizing: 'border-box'
                    }}
                  />
                  <Lock size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                </div>
              </div>
            </>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? 'rgba(255, 255, 255, 0.05)' : '#ffffff',
              border: 'none',
              borderRadius: '12px',
              padding: '12px',
              color: loading ? 'rgba(255,255,255,0.2)' : '#000000',
              fontSize: '14px',
              fontWeight: '700',
              cursor: loading ? 'default' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              marginTop: '10px',
              transition: 'all 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              boxShadow: loading ? 'none' : '0 4px 16px rgba(255, 255, 255, 0.1)',
              outline: 'none'
            }}
          >
            {loading ? 'Processing...' : (
              <>
                <span>
                  {mode === 'login' && 'Sign In'}
                  {mode === 'signup' && 'Create Account'}
                  {mode === 'forgot' && 'Send Reset Link'}
                  {mode === 'reset' && 'Update Password'}
                </span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Footer Toggle Link */}
        <div style={{ marginTop: '28px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          {mode !== 'reset' ? (
            <button
              onClick={() => {
                if (mode === 'forgot') {
                  setMode('login');
                } else {
                  setMode(mode === 'login' ? 'signup' : 'login');
                }
                setErrorMsg('');
                setInfoMsg('');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.45)',
                fontSize: '12px',
                fontWeight: '500',
                cursor: 'pointer',
                textDecoration: 'none',
                transition: 'color 0.2s',
                outline: 'none'
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.45)'}
            >
              {mode === 'login' && "Don't have an account? Sign Up"}
              {mode === 'signup' && 'Already have an account? Sign In'}
              {mode === 'forgot' && 'Back to Sign In'}
            </button>
          ) : (
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                if (onResetComplete) onResetComplete();
                setMode('login');
              }}
              style={{
                background: 'none',
                border: 'none',
                color: 'rgba(255, 255, 255, 0.4)',
                fontSize: '11px',
                fontWeight: '500',
                cursor: 'pointer',
                outline: 'none'
              }}
              onMouseEnter={e => e.currentTarget.style.color = '#fff'}
              onMouseLeave={e => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.4)'}
            >
              Cancel & Back to Sign In
            </button>
          )}
        </div>

      </motion.div>
    </div>
  );
}
