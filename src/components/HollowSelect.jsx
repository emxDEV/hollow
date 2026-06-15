import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

export default function HollowSelect({
  value,
  onChange,
  options = [],
  placeholder = 'Select option',
  style = {},
  dropdownStyle = {},
  align = 'left'
}) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = options.find(opt => opt.value === value);
  const displayLabel = selectedOption ? selectedOption.label : placeholder;

  return (
    <div 
      ref={containerRef} 
      style={{ 
        position: 'relative', 
        display: 'inline-block',
        width: '100%',
        userSelect: 'none',
        ...style 
      }}
    >
      {/* Selector Trigger Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: 'rgba(255, 255, 255, 0.03)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '8px',
          padding: '8px 12px',
          fontSize: '13px',
          fontWeight: '600',
          color: '#fff',
          cursor: 'pointer',
          transition: 'all 0.2s cubic-bezier(0.25, 0.8, 0.25, 1)',
          boxShadow: 'none',
          borderColor: isOpen ? '#ffffff' : 'rgba(255, 255, 255, 0.08)'
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
            transition: 'transform 0.2s ease'
          }} 
        />
      </div>

      {/* Dropdown Options List */}
      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: align === 'left' ? 0 : 'auto',
            right: align === 'right' ? 0 : 'auto',
            width: '100%',
            minWidth: '160px',
            background: '#0f0f11',
            border: '1px solid #1c1c1e',
            borderRadius: '10px',
            boxShadow: 'none',
            zIndex: 100,
            overflow: 'hidden',
            padding: '4px',
            display: 'flex',
            flexDirection: 'column',
            gap: '2px',
            ...dropdownStyle
          }}
        >
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => {
                  onChange && onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: isSelected ? '700' : '500',
                  color: isSelected ? '#fff' : 'rgba(255, 255, 255, 0.8)',
                  background: isSelected ? 'rgba(255, 255, 255, 0.08)' : 'transparent',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
                onMouseEnter={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                    e.currentTarget.style.color = '#fff';
                  }
                }}
                onMouseLeave={e => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = 'rgba(255, 255, 255, 0.8)';
                  }
                }}
              >
                {opt.label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
