import React, { useState } from 'react';
import { supabase } from '../../db/supabaseClient';
import { Mail, Lock, AlertCircle, ArrowRight, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function MobileAuthView({ addToast }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter email and password.');
      return;
    }
    setErrorMsg('');
    setLoading(true);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });
        if (error) throw error;
        addToast('Signed in successfully.', 'success');
      } else {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password
        });
        if (error) throw error;
        
        if (data?.user && data.user.identities?.length === 0) {
          addToast('Email is already registered. Try logging in.', 'info');
        } else {
          addToast('Check email for confirmation link.', 'success');
        }
      }
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred.');
      addToast(err.message || 'Authentication failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      width: '100%',
      height: '100%',
      background: '#000000',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      padding: '24px',
      boxSizing: 'border-box',
      position: 'relative',
      fontFamily: 'var(--font)'
    }}>
      {/* Decorative top blur vignette */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '40%',
        background: 'radial-gradient(circle at 50% 0%, rgba(10, 132, 255, 0.15) 0%, rgba(0,0,0,0) 80%)',
        pointerEvents: 'none'
      }} />

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        style={{ width: '100%', zIndex: 1 }}
      >
        {/* Brand Logo Header */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '40px', gap: '8px' }}>
          <div style={{
            width: '42px',
            height: '42px',
            borderRadius: '50%',
            border: '2.5px solid #fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '4px'
          }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style={{ color: '#fff' }}>
              <path d="M12 2C12 7.52285 7.52285 12 2 12C7.52285 12 12 16.4771 12 22C12 16.4771 16.4771 12 22 12C16.4771 12 12 7.52285 12 2Z" />
            </svg>
          </div>
          <span style={{
            fontFamily: 'var(--font)',
            fontSize: '28px',
            fontWeight: '800',
            letterSpacing: '-0.03em',
            color: '#fff'
          }}>
            hollow.
          </span>
          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600' }}>
            {isLogin ? 'Sign in to continue' : 'Register a new account'}
          </span>
        </div>

        {/* Feedback alert banner */}
        <AnimatePresence>
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                background: 'rgba(255,69,58,0.12)',
                border: '1px solid rgba(255,69,58,0.2)',
                borderRadius: 12,
                padding: '12px 14px',
                color: '#ff453a',
                fontSize: 13,
                marginBottom: 20,
                lineHeight: 1.4
              }}
            >
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Form Fields */}
        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.02em' }}>EMAIL ADDRESS</label>
            <div style={{ position: 'relative' }}>
              <input
                type="email"
                required
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="you@domain.com"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  color: '#fff',
                  fontFamily: 'var(--font)',
                  fontSize: 15,
                  padding: '12px 14px 12px 38px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <Mail size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)' }} />
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.02em' }}>PASSWORD</label>
            <div style={{ position: 'relative' }}>
              <input
                type="password"
                required
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  background: 'rgba(255,255,255,0.03)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 12,
                  color: '#fff',
                  fontFamily: 'var(--font)',
                  fontSize: 15,
                  padding: '12px 14px 12px 38px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <Lock size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,0.25)' }} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              background: loading ? 'rgba(255,255,255,0.05)' : '#ffffff',
              border: 'none',
              borderRadius: 14,
              padding: '14px',
              color: loading ? 'rgba(255,255,255,0.2)' : '#000000',
              fontSize: 15,
              fontWeight: '700',
              fontFamily: 'var(--font)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 8,
              marginTop: '10px',
              outline: 'none',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(255,255,255,0.05)'
            }}
          >
            {loading ? 'Processing...' : (
              <>
                <span>{isLogin ? 'Sign In' : 'Register Account'}</span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Toggle Switch */}
        <div style={{ marginTop: '24px', textAlign: 'center' }}>
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setErrorMsg('');
            }}
            style={{
              background: 'none',
              border: 'none',
              color: 'rgba(255,255,255,0.4)',
              fontSize: 13,
              fontWeight: 500,
              cursor: 'pointer',
              outline: 'none'
            }}
          >
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
