import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Sparkles, AlertTriangle, ShieldCheck, TrendingUp } from 'lucide-react';
import { calculateTradePnL, calculateAccountStatistics } from '../utils/tradeMath';
import useUIStore from '../store/useUIStore';

export default function CognitiveAgentPanel({ trades, executions, selectedAccountId, accounts }) {
  const isMobile = useUIStore(state => state.isMobile);
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 'welcome',
      sender: 'agent',
      text: "Operator, I have loaded your ledger snapshot. Ask me to audit your stats, summarize behavioral leaks, or suggest playbook adjustments."
    }
  ]);
  const [inputText, setInputText] = useState('');
  const chatEndRef = useRef(null);

  const selectedAccount = accounts.find(a => a.id === selectedAccountId);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  // Processes local messages based on database context
  const processAgentResponse = (userQuery) => {
    const query = userQuery.toLowerCase();
    
    // Aggregate relevant stats
    const accountTrades = selectedAccountId === 'all' ? trades : trades.filter(t => t.accountId === selectedAccountId);
    const stats = calculateAccountStatistics(accountTrades, executions);
    const accountName = selectedAccountId === 'all' ? 'All Accounts' : (selectedAccount?.name || 'Unknown Account');
    const accountCapital = selectedAccountId === 'all' ? accounts.reduce((sum, acc) => sum + (acc.capital || acc.balance || 0), 0) : (selectedAccount?.capital || selectedAccount?.balance || 0);

    // Context analysis helpers
    const mistakeTrades = accountTrades.filter(t => t.mistakes && t.mistakes.length > 0);
    const totalMistakesCount = mistakeTrades.reduce((sum, t) => sum + t.mistakes.length, 0);

    // Standard responses based on calculations
    if (query.includes('mistake') || query.includes('leak') || query.includes('fomo')) {
      const leaks = {};
      accountTrades.forEach(t => {
        const tExecs = executions.filter(e => e.tradeId === t.id);
        const { netPnL } = calculateTradePnL(t, tExecs);
        (t.mistakes || []).forEach(m => {
          leaks[m] = (leaks[m] || 0) + netPnL;
        });
      });

      const leakageSummary = Object.entries(leaks)
        .map(([name, pnl]) => `• **${name}**: Net impact of ${pnl >= 0 ? '+' : ''}$${Math.round(pnl).toLocaleString()}`)
        .join('\n');

      return `### Behavioral Leaks Summary for **${accountName}**:\n` +
             `Out of ${accountTrades.length} trades, **${mistakeTrades.length}** contained behavioral errors.\n\n` +
             (leakageSummary || `*No mistakes logged yet. Perfect discipline!*`) +
             `\n\n**Advisor Recommendation**: Your biggest leakage stems from behavioral errors. Implement a **hard daily stop limit** on your broker API.`;
    }

    if (query.includes('winrate') || query.includes('stats') || query.includes('performance') || query.includes('balance')) {
      return `### Performance Audit - **${accountName}**:\n` +
             `• **Current Balance**: $${Math.round(accountCapital + stats.totalNetPnL).toLocaleString()} (Net PnL: ${stats.totalNetPnL >= 0 ? '+' : ''}$${Math.round(stats.totalNetPnL).toLocaleString()})\n` +
             `• **Win Rate**: **${stats.winRate.toFixed(1)}%**\n` +
             `• **Profit Factor**: **${stats.profitFactor.toFixed(2)}**\n` +
             `• **Avg Reward/Risk**: **${stats.avgRMultiple.toFixed(2)}R**\n\n` +
             `The profit factor indicates your sizing model is ${stats.profitFactor >= 2 ? 'highly healthy' : 'sub-optimal'}. Keep risk capped at **1.5%** per position.`;
    }

    if (query.includes('playbook') || query.includes('strategy')) {
      const strategies = {};
      accountTrades.forEach(t => {
        const tExecs = executions.filter(e => e.tradeId === t.id);
        const { netPnL } = calculateTradePnL(t, tExecs);
        const model = t.model || 'Unmapped';
        if (!strategies[model]) {
          strategies[model] = { wins: 0, total: 0, pnl: 0 };
        }
        strategies[model].total++;
        strategies[model].pnl += netPnL;
        if (netPnL > 0) strategies[model].wins++;
      });

      const strategySummary = Object.entries(strategies)
        .map(([name, data]) => `• **${name}**: ${data.pnl >= 0 ? '+' : ''}$${Math.round(data.pnl).toLocaleString()} (${Math.round((data.wins / data.total) * 100)}% WR, ${data.total} Trades)`)
        .join('\n');

      return `### Playbook Performance Review:\n` +
             (strategySummary || `*No strategies mapped to trades yet.*`) +
             `\n\n**Advisor Recommendation**: Double down on your setups that maintain a win rate above 60% and filter out models underperforming in session hours.`;
    }

    return `I am analyzing your **${accountName}** ledger records. I see you have logged **${accountTrades.length} trades** with a net PnL of **${stats.totalNetPnL >= 0 ? '+' : ''}$${Math.round(stats.totalNetPnL).toLocaleString()}**.\n\n` +
           `Feel free to ask:\n` +
           `• "Audit my performance"\n` +
           `• "Summarize behavioral leaks"\n` +
           `• "Review my playbook strategy models"`;
  };

  const handleSend = (textToSend = inputText) => {
    if (!textToSend.trim()) return;

    // Add user message
    const userMsg = { id: `user-${Date.now()}`, sender: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInputText('');

    // Generate response with realistic typewriter latency
    setTimeout(() => {
      const agentReplyText = processAgentResponse(textToSend);
      const agentMsg = { id: `agent-${Date.now()}`, sender: 'agent', text: agentReplyText };
      setMessages(prev => [...prev, agentMsg]);
    }, 450);
  };

  const quickPrompts = [
    "Audit my performance",
    "Summarize behavioral leaks",
    "Review playbook strategies"
  ];

  return (
    <>
      {/* Floating Trigger Icon */}
      <button
        style={{
          position: 'fixed',
          bottom: isMobile ? '16px' : '24px',
          right: isMobile ? '16px' : '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'var(--colors-primary)',
          color: '#020205',
          border: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          boxShadow: '0 8px 32px rgba(123, 160, 192, 0.4)',
          transition: 'transform 0.2s',
          zIndex: 150
        }}
        onClick={() => setIsOpen(!isOpen)}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.08)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}
      >
        {isOpen ? <X size={24} /> : <MessageSquare size={24} />}
      </button>

      {/* Expansion Chat Container */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: isMobile ? '80px' : '96px',
          right: isMobile ? '16px' : '24px',
          width: isMobile ? 'calc(100% - 32px)' : '380px',
          height: isMobile ? 'calc(100% - 112px)' : '480px',
          maxHeight: isMobile ? '450px' : 'none',
          background: 'rgba(18, 19, 22, 0.9)',
          border: '1px solid rgba(255, 255, 255, 0.15)',
          borderRadius: '16px',
          backdropFilter: 'blur(40px)',
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 150,
          overflow: 'hidden'
        }}>
          {/* Panel Header */}
          <div style={{
            padding: '16px',
            borderBottom: '1px solid var(--colors-hairline-dark)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(0,0,0,0.15)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Sparkles size={16} color="var(--colors-primary)" />
              <span style={{ fontFamily: 'var(--font-heading)', fontWeight: '700', fontSize: '14px', letterSpacing: '-0.01em', color: '#fff' }}>
                Hollow Cognitive Advisor
              </span>
            </div>
            <span style={{ fontSize: '9px', background: 'var(--colors-primary-dim)', color: 'var(--colors-primary)', border: '1px solid rgba(123, 160, 192, 0.2)', padding: '2px 5px', borderRadius: '4px', fontWeight: '600' }}>
              Gemini Sync
            </span>
          </div>

          {/* Messages list area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            {messages.map((msg) => {
              const isAgent = msg.sender === 'agent';
              return (
                <div
                  key={msg.id}
                  style={{
                    alignSelf: isAgent ? 'flex-start' : 'flex-end',
                    maxWidth: '85%',
                    background: isAgent ? 'rgba(255,255,255,0.03)' : 'var(--colors-primary-dim)',
                    border: isAgent ? '1px solid var(--colors-hairline-dark)' : '1px solid rgba(123, 160, 192, 0.3)',
                    color: isAgent ? 'var(--colors-on-dark)' : '#fff',
                    padding: '10px 14px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    lineHeight: '1.45',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {/* Basic markdown parsing support for bolding and lists */}
                  {msg.text.split('\n').map((line, idx) => {
                    let formatted = line;
                    
                    // Headers
                    if (formatted.startsWith('### ')) {
                      return <h4 key={idx} style={{ color: 'var(--colors-primary)', fontSize: '13px', margin: '8px 0 4px 0' }}>{formatted.replace('### ', '')}</h4>;
                    }
                    
                    // Lists
                    let isBullet = false;
                    if (formatted.startsWith('• ') || formatted.startsWith('* ')) {
                      isBullet = true;
                      formatted = formatted.substring(2);
                    }

                    // Bold text formatting
                    const parts = [];
                    let remaining = formatted;
                    let matchIndex = remaining.indexOf('**');
                    
                    while (matchIndex !== -1) {
                      if (matchIndex > 0) {
                        parts.push(remaining.substring(0, matchIndex));
                      }
                      remaining = remaining.substring(matchIndex + 2);
                      const endIdx = remaining.indexOf('**');
                      if (endIdx !== -1) {
                        parts.push(<strong key={parts.length} style={{ color: 'var(--colors-primary)' }}>{remaining.substring(0, endIdx)}</strong>);
                        remaining = remaining.substring(endIdx + 2);
                      } else {
                        parts.push('**' + remaining);
                        remaining = '';
                      }
                      matchIndex = remaining.indexOf('**');
                    }
                    if (remaining) parts.push(remaining);

                    return (
                      <div key={idx} style={{ marginLeft: isBullet ? '12px' : '0', textIndent: isBullet ? '-12px' : '0', marginBottom: '4px' }}>
                        {isBullet ? '• ' : ''}{parts.length > 0 ? parts : formatted}
                      </div>
                    );
                  })}
                </div>
              );
            })}
            <div ref={chatEndRef} />
          </div>

          {/* Quick recommendations chips */}
          <div style={{
            padding: '8px 12px',
            display: 'flex',
            gap: '8px',
            overflowX: 'auto',
            borderTop: '1px solid rgba(255,255,255,0.02)',
            background: 'rgba(0,0,0,0.1)'
          }}>
            {quickPrompts.map(prompt => (
              <button
                key={prompt}
                style={{
                  flexShrink: 0,
                  background: 'var(--colors-primary-dim)',
                  border: '1px solid rgba(123, 160, 192, 0.12)',
                  color: 'var(--colors-primary)',
                  fontSize: '10px',
                  padding: '4px 10px',
                  borderRadius: '100px',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
                onClick={() => handleSend(prompt)}
                onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(123, 160, 192, 0.15)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--colors-primary-dim)'}
              >
                {prompt}
              </button>
            ))}
          </div>

          {/* TextInput bar */}
          <div style={{
            padding: '12px',
            borderTop: '1px solid var(--colors-hairline-dark)',
            display: 'flex',
            gap: '8px',
            background: 'rgba(0,0,0,0.2)'
          }}>
            <input
              type="text"
              placeholder="Ask Advisor..."
              style={{
                flex: 1,
                background: 'rgba(0, 0, 0, 0.4)',
                border: '1px solid var(--colors-hairline-dark)',
                borderRadius: '8px',
                padding: '8px 12px',
                color: '#fff',
                fontSize: '12px',
                outline: 'none'
              }}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button
              className="btn-primary"
              style={{ padding: '8px', borderRadius: '8px' }}
              onClick={() => handleSend()}
            >
              <Send size={14} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
