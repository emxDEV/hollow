import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Target, ShieldAlert } from 'lucide-react';

export default function HollowGroupedSelect({
  value,
  onChange,
  presets = [],
  placeholder = '-- Custom / Select Preset --',
  style = {}
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedPreset = presets.find(p => p.id === value);
  const displayLabel = selectedPreset ? selectedPreset.name : placeholder;

  // Group presets by prop firm
  const groupedPresets = presets.reduce((groups, preset) => {
    const groupName = preset.propFirm || 'Other';
    if (!groups[groupName]) {
      groups[groupName] = [];
    }
    groups[groupName].push(preset);
    return groups;
  }, {});

  return (
    <div 
      ref={containerRef} 
      style={{ 
        position: 'relative', 
        display: 'inline-block',
        width: '100%',
        userSelect: 'none',
        zIndex: 1000,
        ...style 
      }}
    >
      {/* Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.03)',
          border: isOpen ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '12px 14px',
          fontSize: '13px',
          fontWeight: '600',
          color: selectedPreset ? '#fff' : 'rgba(255, 255, 255, 0.45)',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
          boxShadow: 'none'
        }}
        onMouseEnter={e => {
          if (!isOpen) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.15)';
          }
        }}
        onMouseLeave={e => {
          if (!isOpen) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
          }
        }}
      >
        <span style={{ 
          overflow: 'hidden', 
          textOverflow: 'ellipsis', 
          whiteSpace: 'nowrap',
          marginRight: '8px'
        }}>
          {displayLabel}
        </span>
        <ChevronDown 
          size={14} 
          style={{ 
            color: 'rgba(255,255,255,0.4)',
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.2s ease',
            flexShrink: 0
          }} 
        />
      </div>

      {/* Dropdown Options Box */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            width: '100%',
            maxHeight: '340px',
            overflowY: 'auto',
            background: '#0f0f11',
            border: '1px solid #1c1c1e',
            borderRadius: '16px',
            boxShadow: 'none',
            zIndex: 10001,
            padding: '6px',
            display: 'flex',
            flexDirection: 'column',
            gap: '6px',
            boxSizing: 'border-box'
          }}
          className="hollow-menu-scrollbar"
        >
          {/* Custom Select Option */}
          <div
            onClick={() => {
              onChange && onChange({ target: { value: 'custom' } });
              setIsOpen(false);
            }}
            style={{
              padding: '10px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: !selectedPreset ? '700' : '500',
              color: !selectedPreset ? '#fff' : 'rgba(255, 255, 255, 0.7)',
              background: !selectedPreset ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
            onMouseEnter={e => {
              if (selectedPreset) {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.color = '#fff';
              }
            }}
            onMouseLeave={e => {
              if (selectedPreset) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255, 255, 255, 0.7)';
              }
            }}
          >
            {placeholder}
          </div>

          {/* Grouped Options */}
          {Object.entries(groupedPresets).map(([firmName, firmPresets]) => (
            <div key={firmName} style={{ display: 'flex', flexDirection: 'column', gap: '3px' }}>
              {/* Optgroup Header */}
              <div style={{ 
                fontSize: '9px', 
                fontWeight: '800', 
                color: 'rgba(255, 255, 255, 0.35)', 
                textTransform: 'lowercase', 
                letterSpacing: '0.8px',
                padding: '6px 12px 2px 12px',
                borderTop: '1px solid rgba(255, 255, 255, 0.04)',
                marginTop: '4px'
              }}>
                {firmName}
              </div>

              {/* Preset Items */}
              {firmPresets.map((preset) => {
                const isCurrent = value === preset.id;
                return (
                  <div
                    key={preset.id}
                    onClick={() => {
                      onChange && onChange({ target: { value: preset.id } });
                      setIsOpen(false);
                    }}
                    style={{
                      padding: '8px 12px',
                      borderRadius: '10px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer',
                      background: isCurrent ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                      border: isCurrent ? '1px solid rgba(255, 255, 255, 0.15)' : '1px solid transparent',
                      transition: 'all 0.15s ease',
                      boxSizing: 'border-box'
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.background = isCurrent ? 'rgba(255, 255, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)';
                      if (!isCurrent) {
                        e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.08)';
                      }
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.background = isCurrent ? 'rgba(255, 255, 255, 0.08)' : 'transparent';
                      if (!isCurrent) {
                        e.currentTarget.style.borderColor = 'transparent';
                      }
                    }}
                  >
                    {/* Left: Preset Name */}
                    <span style={{ 
                      fontSize: '12px', 
                      fontWeight: isCurrent ? '700' : '600', 
                      color: '#fff' 
                    }}>
                      {preset.name}
                    </span>

                    {/* Right: Badges */}
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      {/* Target Pill */}
                      {preset.target > 0 && (
                        <div style={{
                          background: 'rgba(48, 209, 88, 0.08)',
                          border: '1px solid rgba(48, 209, 88, 0.2)',
                          color: '#30d158',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          fontSize: '9px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}>
                          <Target size={8} />
                          ${(preset.target).toLocaleString()}
                        </div>
                      )}

                      {/* Drawdown Pill */}
                      {preset.drawdownLimit > 0 && (
                        <div style={{
                          background: 'rgba(255, 69, 58, 0.08)',
                          border: '1px solid rgba(255, 69, 58, 0.2)',
                          color: '#ff453a',
                          padding: '2px 6px',
                          borderRadius: '6px',
                          fontSize: '9px',
                          fontWeight: '700',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '2px'
                        }}>
                          <ShieldAlert size={8} />
                          ${(preset.drawdownLimit).toLocaleString()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
