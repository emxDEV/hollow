import React, { useRef, useEffect } from 'react';

export default function DateStrip({ selectedDate, onDateChange, tradeDates = [] }) {
  const stripRef = useRef(null);
  const todayStr = selectedDate || new Date().toISOString().split('T')[0];
  const today = new Date(todayStr);

  // Build 7 days centered on today
  const days = [];
  const monday = new Date(today);
  const dayOfWeek = today.getDay();
  const diffToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  monday.setDate(today.getDate() + diffToMonday);

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    days.push(d);
  }

  const dayNames = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

  useEffect(() => {
    // Scroll active day into view
    if (stripRef.current) {
      const activeEl = stripRef.current.querySelector('[data-active="true"]');
      if (activeEl) {
        activeEl.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }
  }, [selectedDate]);

  return (
    <div
      ref={stripRef}
      style={{
        display: 'flex',
        gap: 0,
        overflowX: 'auto',
        scrollbarWidth: 'none',
        padding: '0 16px',
        msOverflowStyle: 'none'
      }}
    >
      {days.map((d, i) => {
        const dStr = d.toISOString().split('T')[0];
        const isActive = dStr === todayStr;
        const hasTrade = tradeDates.includes(dStr);
        const isFuture = d > new Date(new Date().toISOString().split('T')[0]);

        return (
          <button
            key={dStr}
            data-active={isActive}
            onClick={() => !isFuture && onDateChange(dStr)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: 44,
              padding: '8px 6px',
              borderRadius: 10,
              border: 'none',
              background: isActive ? '#ffffff' : 'transparent',
              cursor: isFuture ? 'default' : 'pointer',
              opacity: isFuture ? 0.35 : 1,
              transition: 'background 0.15s',
              WebkitTapHighlightColor: 'transparent',
              gap: 2
            }}
          >
            <span style={{
              fontSize: 11,
              fontWeight: 500,
              color: isActive ? '#000' : 'rgba(255,255,255,0.45)',
              fontFamily: 'var(--font)',
              marginBottom: 1
            }}>
              {dayNames[i]}
            </span>
            <span style={{
              fontSize: 19,
              fontWeight: 600,
              color: isActive ? '#000' : '#fff',
              fontFamily: 'var(--font)',
              lineHeight: 1
            }}>
              {d.getDate()}
            </span>
            <div style={{
              width: 4,
              height: 4,
              borderRadius: '50%',
              marginTop: 2,
              background: hasTrade
                ? (isActive ? '#000' : '#30d158')
                : 'transparent'
            }} />
          </button>
        );
      })}
    </div>
  );
}
