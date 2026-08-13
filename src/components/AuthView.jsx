import React, { useState } from 'react';
import { supabase } from '../db/supabaseClient';
import { Mail, Lock, AlertCircle, ArrowRight, CheckCircle2, Shield, TrendingUp, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HollowLogo from './HollowLogo';

export default function AuthView({ initialMode = 'login', onResetComplete, onCancel }) {
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
      width: '100%',
      height: '100%',
      minHeight: '100dvh',
      background: '#070709',
      display: 'flex',
      overflow: 'hidden',
      fontFamily: 'var(--font-body, sans-serif)',
      position: 'relative'
    }}>
      {/* Decorative Blur Backdrops */}
      <div className="cloudy-backdrop" style={{ opacity: 0.6 }}>
        <div className="cloud-blur cloud-1" style={{ width: '450px', height: '450px', background: 'rgba(184, 110, 255, 0.15)' }} />
        <div className="cloud-blur cloud-2" style={{ width: '600px', height: '600px', background: 'rgba(100, 210, 255, 0.1)' }} />
      </div>

      {/* Left Column: Premium Pitch Screen (Hidden on mobile/tablet) */}
      <div className="auth-pitch-panel" style={{
        flex: 1.1,
        background: 'linear-gradient(145deg, #090810 0%, #0d0b14 100%)',
        borderRight: '1px solid rgba(255, 255, 255, 0.05)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        padding: '60px 80px',
        position: 'relative',
        zIndex: 5
      }}>
        {/* Glow behind logo */}
        <div style={{
          position: 'absolute',
          top: '30%',
          left: '10%',
          width: '320px',
          height: '320px',
          background: 'radial-gradient(circle, rgba(184, 110, 255, 0.1) 0%, rgba(0,0,0,0) 70%)',
          filter: 'blur(50px)',
          pointerEvents: 'none'
        }} />

        <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '40px' }}>
          <HollowLogo size={42} showText={true} textSize={24} />
        </div>

        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          style={{
            fontSize: '42px',
            fontWeight: '900',
            color: '#ffffff',
            lineHeight: '1.15',
            letterSpacing: '-0.03em',
            margin: 0,
            maxWidth: '520px'
          }}
        >
          Track like a <span style={{ background: 'linear-gradient(135deg, #b86eff 0%, #d8b4ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Professional</span>.
          <br />Audit your playbook edge.
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{
            fontSize: '15px',
            color: 'rgba(255, 255, 255, 0.5)',
            marginTop: '16px',
            lineHeight: '1.6',
            maxWidth: '460px',
            fontWeight: '400'
          }}
        >
          Elevate your daily trading discipline with execution ledgers, real-time analytics, PO3 timings tracking, and emotional psychology insights.
        </motion.p>

        {/* Dynamic Feature Stats Showcase */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '48px', maxWidth: '440px' }}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '16px 20px',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div style={{ background: 'rgba(184, 110, 255, 0.12)', padding: '10px', borderRadius: '12px', color: '#b86eff' }}>
              <TrendingUp size={20} />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>EDGE CONFIDENCE</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>73.2% Playbook Accuracy</div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
              borderRadius: '16px',
              padding: '16px 20px',
              backdropFilter: 'blur(10px)'
            }}
          >
            <div style={{ background: 'rgba(48, 209, 88, 0.12)', padding: '10px', borderRadius: '12px', color: '#30d158' }}>
              <Cpu size={20} />
            </div>
            <div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: '600' }}>SYSTEMATIC TRACKING</div>
              <div style={{ fontSize: '18px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>+142.5R Total Return logged</div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Right Column: Premium Auth Card Form */}
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        zIndex: 10
      }}>
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
          style={{
            width: '100%',
            maxWidth: '430px',
            background: 'rgba(9, 9, 11, 0.55)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '28px',
            padding: '44px 40px',
            boxShadow: '0 25px 50px rgba(0, 0, 0, 0.7), inset 0 1px 0 rgba(255, 255, 255, 0.08)',
            backdropFilter: 'blur(28px)',
            WebkitBackdropFilter: 'blur(28px)',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box'
          }}
        >
          {/* Logo on Mobile, Title on Desktop */}
          <div className="auth-form-logo" style={{ display: 'none', marginBottom: '24px', justifyContent: 'center' }}>
            <HollowLogo size={36} showText={true} />
          </div>

          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '24px', fontWeight: '800', color: '#fff', letterSpacing: '-0.02em', margin: 0 }}>
              {mode === 'login' && 'Welcome back'}
              {mode === 'signup' && 'Create account'}
              {mode === 'forgot' && 'Reset password'}
              {mode === 'reset' && 'Choose password'}
            </h2>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginTop: '6px' }}>
              {mode === 'login' && 'Enter your credentials to access your dashboard'}
              {mode === 'signup' && 'Get started with hollow and track your edge'}
              {mode === 'forgot' && 'Send a secure recovery link to your email'}
              {mode === 'reset' && 'Choose a secure, strong password'}
            </p>
          </div>

          {/* Feedback messages */}
          <AnimatePresence mode="wait">
            {errorMsg && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'rgba(255, 69, 58, 0.08)',
                  border: '1px solid rgba(255, 69, 58, 0.2)',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  color: '#ff453a',
                  fontSize: '12px',
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
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  background: 'rgba(48, 209, 88, 0.08)',
                  border: '1px solid rgba(48, 209, 88, 0.2)',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  color: '#30d158',
                  fontSize: '12px',
                  marginBottom: '20px',
                  lineHeight: 1.4
                }}
              >
                <CheckCircle2 size={16} style={{ flexShrink: 0 }} />
                <span>{infoMsg}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {(mode === 'login' || mode === 'signup' || mode === 'forgot') && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
                  Email Address
                </label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="name@domain.com"
                    className="hollow-input"
                    style={{
                      width: '100%',
                      paddingLeft: '40px',
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
                  <label style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
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
                        color: '#b86eff',
                        fontSize: '10.5px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        padding: 0,
                        outline: 'none'
                      }}
                    >
                      Forgot?
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
                      paddingLeft: '40px',
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
                  <label style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
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
                        paddingLeft: '40px',
                        boxSizing: 'border-box'
                      }}
                    />
                    <Lock size={14} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.3)' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <label style={{ fontSize: '10px', fontWeight: '700', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.8px', textTransform: 'uppercase' }}>
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
                        paddingLeft: '40px',
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
                background: loading ? 'rgba(255, 255, 255, 0.05)' : 'linear-gradient(135deg, #b86eff 0%, #8a30f6 100%)',
                border: 'none',
                borderRadius: '12px',
                padding: '13px',
                color: '#ffffff',
                fontSize: '14px',
                fontWeight: '700',
                cursor: loading ? 'default' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                marginTop: '10px',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(138, 48, 246, 0.35)',
                outline: 'none',
                transition: 'all 0.15s ease'
              }}
              onMouseEnter={e => { if(!loading) e.currentTarget.style.transform = 'translateY(-1px)'; }}
              onMouseLeave={e => { if(!loading) e.currentTarget.style.transform = 'none'; }}
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

          {/* Footer toggle link */}
          <div style={{ marginTop: '28px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '14px', alignItems: 'center' }}>
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

            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255, 255, 255, 0.3)',
                  fontSize: '11.5px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textDecoration: 'underline',
                  outline: 'none'
                }}
              >
                Continue in Offline Mode
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
