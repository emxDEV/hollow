import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  MessageSquare,
  Bot,
  Send,
  HelpCircle,
  ShieldCheck,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  Sparkles,
  Zap,
  Mail
} from 'lucide-react';

export default function SupportView({ addToast, onScrollChange }) {
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'assistant',
      text: 'Hello Emanuel! I am your Hollow Trading Copilot. Ask me anything about your evaluations, funded rules, risk sizing, or platform setups.'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [openFaq, setOpenFaq] = useState(null);

  const faqs = [
    {
      q: 'How does the EOD trailing drawdown work?',
      a: 'The End-Of-Day drawdown only updates after market close at 5:00 PM EST. Intraday equity peaks during the trading day do not trail your drawdown until the day ends.'
    },
    {
      q: 'When am I eligible for my first payout?',
      a: 'After completing 5 active trading days with positive profit and meeting the buffer requirement for your plan tier.'
    },
    {
      q: 'Can I trade during high-impact news?',
      a: 'Yes, news trading is allowed across all Pro and Flex evaluation accounts without contract limits.'
    },
    {
      q: 'How do I link TradeSea or Tradovate credentials?',
      a: 'Navigate to Profile > Trading credentials, enter your API token, and trades will sync directly into your Hollow journal.'
    }
  ];

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!inputText.trim()) return;

    const userMsg = { id: Date.now(), sender: 'user', text: inputText };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    setTimeout(() => {
      let replyText = "I've analyzed your question. Based on your current 50K Pro evaluation parameters, your max contract size is 4 Minis and your EOD buffer is safe. Maintain strict risk discipline!";
      if (inputText.toLowerCase().includes('payout')) {
        replyText = "Your next payout window opens on August 15. You currently have $4,200 in eligible buffer.";
      } else if (inputText.toLowerCase().includes('rule') || inputText.toLowerCase().includes('drawdown')) {
        replyText = "Remember that daily loss limit is optional, but EOD trailing stops trailing once you reach your starting balance + $100.";
      }

      setMessages(prev => [...prev, { id: Date.now() + 1, sender: 'assistant', text: replyText }]);
    }, 600);
  };

  return (
    <div
      onScroll={(e) => onScrollChange && onScrollChange(e.target.scrollTop)}
      style={{
        height: '100%',
        width: '100%',
        overflowY: 'auto',
        overflowX: 'hidden',
        WebkitOverflowScrolling: 'touch',
        background: '#000000',
        color: '#ffffff',
        padding: 'calc(var(--safe-top) + 16px) 16px calc(var(--safe-bottom) + 88px) 16px',
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
        fontFamily: "var(--font, 'Inter', -apple-system, sans-serif)",
      }}
    >
      {/* Header */}
      <div>
        <h1 style={{
          fontSize: '28px',
          fontWeight: 800,
          letterSpacing: '-0.03em',
          margin: '0 0 2px 0',
          color: '#ffffff',
        }}>
          Support & AI
        </h1>
        <div style={{ fontSize: '13px', color: 'rgba(255, 255, 255, 0.45)', fontWeight: 400 }}>
          Cognitive assistant & 24/7 helpdesk
        </div>
      </div>

      {/* System Status Banner */}
      <div style={{
        background: '#09090b',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{
            width: '8px',
            height: '8px',
            borderRadius: '50%',
            background: '#30d158',
            boxShadow: '0 0 8px #30d158',
          }} />
          <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>All Systems Operational</span>
        </div>
        <span style={{ fontSize: '11px', color: '#b86eff', fontWeight: 700 }}>99.99% Uptime</span>
      </div>

      {/* AI Trader Copilot Chat Box */}
      <div style={{
        background: '#09090b',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '20px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        boxShadow: '0 10px 30px rgba(0, 0, 0, 0.5)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.06)', paddingBottom: '10px' }}>
          <div style={{
            width: '28px',
            height: '28px',
            borderRadius: '8px',
            background: 'rgba(184, 110, 255, 0.15)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#b86eff',
          }}>
            <Sparkles size={16} />
          </div>
          <span style={{ fontSize: '14px', fontWeight: 800, color: '#ffffff' }}>Hollow Cognitive AI</span>
        </div>

        {/* Message Thread */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
          {messages.map(m => (
            <div
              key={m.id}
              style={{
                alignSelf: m.sender === 'user' ? 'flex-end' : 'flex-start',
                background: m.sender === 'user' ? '#b86eff' : '#16161a',
                color: m.sender === 'user' ? '#000000' : '#ffffff',
                fontWeight: m.sender === 'user' ? 700 : 400,
                fontSize: '13px',
                padding: '10px 14px',
                borderRadius: m.sender === 'user' ? '16px 16px 2px 16px' : '16px 16px 16px 2px',
                maxWidth: '85%',
                lineHeight: 1.4,
                border: m.sender === 'user' ? 'none' : '1px solid rgba(255, 255, 255, 0.06)',
              }}
            >
              {m.text}
            </div>
          ))}
        </div>

        {/* Chat Input */}
        <form onSubmit={handleSendMessage} style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
          <input
            value={inputText}
            onChange={e => setInputText(e.target.value)}
            placeholder="Ask AI about rules, risk, or edge..."
            style={{
              flex: 1,
              background: '#16161a',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '12px',
              padding: '10px 14px',
              color: '#fff',
              fontSize: '13px',
              outline: 'none',
            }}
          />
          <button
            type="submit"
            style={{
              background: '#b86eff',
              border: 'none',
              borderRadius: '12px',
              width: '40px',
              height: '40px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#000',
              flexShrink: 0,
            }}
          >
            <Send size={16} />
          </button>
        </form>
      </div>

      {/* Frequently Asked Questions */}
      <div>
        <div style={{
          fontSize: '11px',
          fontWeight: 800,
          letterSpacing: '0.08em',
          color: 'rgba(255, 255, 255, 0.45)',
          textTransform: 'uppercase',
          marginBottom: '10px',
          paddingLeft: '2px',
        }}>
          FREQUENTLY ASKED QUESTIONS
        </div>

        <div style={{
          background: '#09090b',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '20px',
          overflow: 'hidden',
        }}>
          {faqs.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div
                key={idx}
                style={{
                  borderBottom: idx < faqs.length - 1 ? '1px solid rgba(255, 255, 255, 0.05)' : 'none',
                }}
              >
                <div
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '14px 18px',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '14px', fontWeight: 600, color: '#ffffff' }}>{faq.q}</span>
                  <ChevronDown
                    size={16}
                    color="rgba(255, 255, 255, 0.4)"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
                  />
                </div>
                {isOpen && (
                  <div style={{ padding: '0 18px 14px', fontSize: '13px', color: 'rgba(255, 255, 255, 0.65)', lineHeight: 1.4 }}>
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Contact Support Direct */}
      <div style={{
        background: '#09090b',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        borderRadius: '16px',
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Mail size={20} color="#b86eff" />
          <div>
            <div style={{ fontSize: '14px', fontWeight: 700, color: '#ffffff' }}>Direct Priority Helpdesk</div>
            <div style={{ fontSize: '12px', color: 'rgba(255, 255, 255, 0.45)' }}>support@hollow.trade</div>
          </div>
        </div>
        <button
          onClick={() => {
            window.location.href = 'mailto:support@hollow.trade';
            addToast('Opening email client...', 'info');
          }}
          style={{
            background: 'rgba(184, 110, 255, 0.15)',
            border: '1px solid rgba(184, 110, 255, 0.3)',
            borderRadius: '10px',
            padding: '8px 12px',
            color: '#d8b4fe',
            fontSize: '12px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          Send Ticket
        </button>
      </div>
    </div>
  );
}
