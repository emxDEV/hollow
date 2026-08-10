import React from 'react';
import { BookOpen, ClipboardCheck, ArrowRight } from 'lucide-react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db/hollowDb';
import HollowLogo from '../../components/HollowLogo';

export default function HomeView({ onOpenWeeklyReview, addToast }) {
  const todayStr = new Date().toISOString().split('T')[0];

  const todayJournal = useLiveQuery(async () => {
    return await db.dailyJournals.get(todayStr);
  }, [todayStr]);

  const displayName = localStorage.getItem('hollowDisplayName') || 'Trader';

  return (
    <div style={{
      height: '100%',
      width: '100%',
      overflowY: 'auto',
      background: '#09090b',
      color: '#ffffff',
      padding: '16px 16px 80px 16px',
      boxSizing: 'border-box'
    }}>
      {/* BRAND & HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <HollowLogo size={20} showText={true} color="#ffffff" />
        <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', background: '#1c1c1e', padding: '4px 10px', borderRadius: '12px' }}>
          {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </div>
      </div>

      {/* HERO GREETING */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.06) 0%, rgba(255, 255, 255, 0.02) 100%)',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h2 style={{ fontSize: '20px', fontWeight: '800', margin: '0 0 6px 0', letterSpacing: '-0.01em' }}>
          Welcome back, {displayName}
        </h2>
        <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
          Hollow Cognitive Ledger. Track your daily habits, executions, and weekly reviews.
        </p>
      </div>

      {/* QUICK STATS */}
      <div style={{ marginBottom: '20px' }}>
        <div style={{ background: '#0f0f11', border: '1px solid #1c1c1e', borderRadius: '16px', padding: '16px' }}>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>Daily Journal</div>
          <div style={{ fontSize: '18px', fontWeight: '700', color: todayJournal ? '#30d158' : '#ff9f0a' }}>
            {todayJournal ? 'Logged' : 'Pending'}
          </div>
        </div>
      </div>

      {/* NAVIGATION CARDS */}
      <h3 style={{ fontSize: '14px', fontWeight: '700', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', textTransform: 'lowercase' }}>
        modules.
      </h3>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div 
          onClick={onOpenWeeklyReview}
          style={{
            background: '#0f0f11',
            border: '1px solid #1c1c1e',
            borderRadius: '16px',
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(48,209,88,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#30d158' }}>
              <ClipboardCheck size={18} />
            </div>
            <div>
              <div style={{ fontSize: '15px', fontWeight: '700' }}>Weekly Review</div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>Synthesize weekly progress</div>
            </div>
          </div>
          <ArrowRight size={16} color="rgba(255,255,255,0.3)" />
        </div>
      </div>
    </div>
  );
}
