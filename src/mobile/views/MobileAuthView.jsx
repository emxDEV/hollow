import React, { useState } from 'react';
import { supabase } from '../../db/supabaseClient';
import { Mail, Lock, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import HollowLogo from '../../components/HollowLogo';

export default function MobileAuthView({ addToast, initialMode = 'login', onResetComplete }) {
  const [mode, setMode] = useState(initialMode); // 'login' | 'signup' | 'forgot' | 'reset'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleAuth = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (mode === 'login' || mode === 'signup') {
      if (!email || !password) {
        setErrorMsg('Bitte E-Mail und Passwort eingeben.');
        return;
      }
    } else if (mode === 'forgot') {
      if (!email) {
        setErrorMsg('Bitte gib deine E-Mail-Adresse ein.');
        return;
      }
    } else if (mode === 'reset') {
      if (!password || !confirmPassword) {
        setErrorMsg('Bitte fülle beide Passwort-Felder aus.');
        return;
      }
      if (password !== confirmPassword) {
        setErrorMsg('Passwörter stimmen nicht überein.');
        return;
      }
      if (password.length < 6) {
        setErrorMsg('Das Passwort muss mindestens 6 Zeichen lang sein.');
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
        addToast('Erfolgreich angemeldet.', 'success');
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password
        });
        if (error) throw error;
        
        if (data?.user && data.user.identities?.length === 0) {
          addToast('E-Mail ist bereits registriert. Versuche dich anzumelden.', 'info');
        } else {
          addToast('Bitte überprüfe deine E-Mails auf den Bestätigungslink.', 'success');
        }
      } else if (mode === 'forgot') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin
        });
        if (error) throw error;
        addToast('Link zum Zurücksetzen an deine E-Mail gesendet.', 'success');
        setEmail('');
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.updateUser({
          password: password
        });
        if (error) throw error;
        addToast('Passwort erfolgreich aktualisiert!', 'success');
        setTimeout(async () => {
          await supabase.auth.signOut();
          if (onResetComplete) onResetComplete();
          setMode('login');
          setPassword('');
          setConfirmPassword('');
        }, 2000);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Ein Fehler ist aufgetreten.');
      addToast(err.message || 'Fehlgeschlagen.', 'error');
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
          <HollowLogo size={42} showText={true} color="#ffffff" style={{ marginBottom: '4px' }} />
          <span style={{ fontSize: '11px', color: 'rgba(255, 255, 255, 0.4)', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: '600' }}>
            {mode === 'login' && 'Melde dich an, um fortzufahren'}
            {mode === 'signup' && 'Erstelle ein neues Konto'}
            {mode === 'forgot' && 'Passwort zurücksetzen'}
            {mode === 'reset' && 'Neues Passwort wählen'}
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
          {(mode === 'login' || mode === 'signup' || mode === 'forgot') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.02em' }}>E-MAIL-ADRESSE</label>
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
          )}

          {(mode === 'login' || mode === 'signup') && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.02em' }}>PASSWORT</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setErrorMsg('');
                    }}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'rgba(255,255,255,0.35)',
                      fontSize: '11.5px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      padding: 0,
                      outline: 'none'
                    }}
                  >
                    Passwort vergessen?
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
          )}

          {mode === 'reset' && (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.02em' }}>NEUES PASSWORT</label>
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

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '600', color: 'rgba(255,255,255,0.4)', letterSpacing: '0.02em' }}>PASSWORT BESTÄTIGEN</label>
                <div style={{ position: 'relative' }}>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
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
            </>
          )}

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
            {loading ? 'Wird verarbeitet...' : (
              <>
                <span>
                  {mode === 'login' && 'Anmelden'}
                  {mode === 'signup' && 'Konto erstellen'}
                  {mode === 'forgot' && 'Link zum Zurücksetzen senden'}
                  {mode === 'reset' && 'Passwort aktualisieren'}
                </span>
                <ArrowRight size={14} />
              </>
            )}
          </button>
        </form>

        {/* Toggle Switch */}
        <div style={{ marginTop: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '12px', alignItems: 'center' }}>
          {mode !== 'reset' ? (
            <button
              onClick={() => {
                if (mode === 'forgot') {
                  setMode('login');
                } else {
                  setMode(mode === 'login' ? 'signup' : 'login');
                }
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
              {mode === 'login' && 'Noch kein Konto? Registrieren'}
              {mode === 'signup' && 'Bereits ein Konto? Anmelden'}
              {mode === 'forgot' && 'Zurück zur Anmeldung'}
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
                color: 'rgba(255,255,255,0.35)',
                fontSize: 12,
                fontWeight: 500,
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              Abbrechen & Zurück zur Anmeldung
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}
