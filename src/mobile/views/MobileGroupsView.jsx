import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../../db/hollowDb';
import { 
  Plus, Trash2, Users, ChevronLeft, ChevronRight, X, ChevronDown, ChevronUp, Save, CreditCard, ShieldAlert, Zap, Edit2
} from 'lucide-react';

export default function MobileGroupsView({ accounts, addToast, onBack }) {
  const groups = useLiveQuery(() => db.groups.toArray()) || [];
  
  const [showAddGroup, setShowAddGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [selectedFollowers, setSelectedFollowers] = useState([]);
  const [editingGroupId, setEditingGroupId] = useState(null);
  
  const [expandedGroups, setExpandedGroups] = useState({});

  const handleDeleteGroup = async (id) => {
    try {
      await db.groups.delete(id);
      addToast('Group deleted.', 'success');
    } catch (err) {
      addToast('Delete failed.', 'error');
    }
  };

  const getFollowerIndex = (accId) => {
    return selectedFollowers.findIndex(f => f === accId || f.startsWith(accId + ':'));
  };

  const isFollowerSelected = (accId) => {
    return getFollowerIndex(accId) !== -1;
  };

  const getMultiplierValue = (accId) => {
    const idx = getFollowerIndex(accId);
    if (idx === -1) return 1;
    const item = selectedFollowers[idx];
    if (item.includes(':')) {
      const mult = parseInt(item.split(':')[1]);
      return isNaN(mult) ? 1 : mult;
    }
    return 1;
  };

  const handleToggleFollower = (accId) => {
    const idx = getFollowerIndex(accId);
    setSelectedFollowers(prev => {
      if (idx !== -1) {
        return prev.filter((_, i) => i !== idx);
      } else {
        return [...prev, `${accId}:1`];
      }
    });
  };

  const handleUpdateMultiplier = (accId, delta) => {
    setSelectedFollowers(prev => prev.map(f => {
      if (f === accId || f.startsWith(accId + ':')) {
        const parts = f.split(':');
        const currentMult = parts[1] ? parseInt(parts[1]) : 1;
        const newMult = Math.max(1, Math.min(100, (isNaN(currentMult) ? 1 : currentMult) + delta));
        return `${accId}:${newMult}`;
      }
      return f;
    }));
  };

  const handleSetMultiplier = (accId, val) => {
    const cleanVal = Math.max(1, Math.min(100, isNaN(val) ? 1 : val));
    setSelectedFollowers(prev => prev.map(f => {
      if (f === accId || f.startsWith(accId + ':')) {
        return `${accId}:${cleanVal}`;
      }
      return f;
    }));
  };

  const openCreateGroup = () => {
    setGroupName('');
    setLeaderId('');
    setSelectedFollowers([]);
    setEditingGroupId(null);
    setShowAddGroup(true);
  };

  const openEditGroup = (g) => {
    setGroupName(g.name);
    setLeaderId(g.leaderAccountId);
    setSelectedFollowers(g.followerAccountIds || []);
    setEditingGroupId(g.id);
    setShowAddGroup(true);
  };

  const closeGroupSheet = () => {
    setShowAddGroup(false);
    setTimeout(() => {
      setGroupName('');
      setLeaderId('');
      setSelectedFollowers([]);
      setEditingGroupId(null);
    }, 300);
  };

  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      addToast('Please enter a group name.', 'error');
      return;
    }
    if (!leaderId) {
      addToast('Please select a leader account.', 'error');
      return;
    }

    try {
      const payload = {
        name: groupName.trim(),
        leaderAccountId: leaderId,
        followerAccountIds: selectedFollowers
      };

      if (editingGroupId) {
        await db.groups.update(editingGroupId, payload);
        addToast('Group updated.', 'success');
      } else {
        const newGroup = {
          id: `group-${Date.now()}`,
          ...payload
        };
        await db.groups.add(newGroup);
        addToast('Group created.', 'success');
      }
      closeGroupSheet();
    } catch (err) {
      addToast(editingGroupId ? 'Failed to update group.' : 'Failed to create group.', 'error');
    }
  };

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column', background: '#000' }}>
      {/* Header */}
      <div style={{ paddingTop: 'calc(var(--safe-top) + 8px)', paddingLeft: '16px', paddingRight: '16px', paddingBottom: 0, flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button onClick={onBack} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', padding: 4, display: 'flex', alignItems: 'center' }}>
              <ChevronLeft size={22} />
            </button>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: '#fff' }}>copy groups.</h1>
          </div>
          <button
            onClick={openCreateGroup}
            style={{
              background: '#fff',
              border: 'none',
              borderRadius: 10,
              padding: '8px 12px',
              fontSize: 13,
              fontWeight: 700,
              color: '#000',
              display: 'flex',
              alignItems: 'center',
              gap: 4
            }}
          >
            <Plus size={14} />
            Create
          </button>
        </div>
      </div>

      {/* List of groups */}
      <div className="scroll-area" style={{ flex: 1, padding: '0 16px 100px' }}>
        
        {/* Info Banner */}
        <div style={{
          background: 'rgba(10, 132, 255, 0.05)',
          border: '1px solid rgba(10, 132, 255, 0.15)',
          borderRadius: 16,
          padding: 14,
          display: 'flex',
          gap: 10,
          alignItems: 'flex-start',
          marginBottom: 16
        }}>
          <ShieldAlert size={18} color="#0a84ff" style={{ marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', lineHeight: 1.4 }}>
            Trade copier mirrors executions from the <strong>Leader</strong> account to all linked <strong>Follower</strong> accounts in real-time.
          </p>
        </div>

        {/* Groups Cards List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {groups.length > 0 ? (
            groups.map(g => {
              const expanded = !!expandedGroups[g.id];
              const leaderAcc = accounts.find(a => a.id === g.leaderAccountId);
              const followersCount = (g.followerAccountIds || []).length;
              
              return (
                <div 
                  key={g.id}
                  style={{
                    background: '#0f0f11',
                    border: '1px solid rgba(255,255,255,0.06)',
                    borderRadius: 16,
                    overflow: 'hidden'
                  }}
                >
                  <div 
                    onClick={() => setExpandedGroups(p => ({ ...p, [g.id]: !expanded }))}
                    style={{
                      padding: 14,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      cursor: 'pointer'
                    }}
                  >
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#fff', marginBottom: 4 }}>{g.name}</div>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Users size={12} />
                        Leader: {leaderAcc ? leaderAcc.name : 'Unknown'} · {followersCount} follower{followersCount !== 1 ? 's' : ''}
                      </div>
                    </div>
                    {expanded ? <ChevronUp size={16} color="rgba(255,255,255,0.4)" /> : <ChevronDown size={16} color="rgba(255,255,255,0.4)" />}
                  </div>

                  <AnimatePresence>
                    {expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)', overflow: 'hidden' }}
                      >
                        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
                          {/* Leader */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Leader Account</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'rgba(48,209,88,0.05)', borderRadius: 10, border: '1px solid rgba(48,209,88,0.1)' }}>
                              <CreditCard size={14} color="#30d158" />
                              <span style={{ fontSize: 13, fontWeight: 600, color: '#fff' }}>{leaderAcc ? leaderAcc.name : 'Unknown'}</span>
                            </div>
                          </div>

                          {/* Followers */}
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Follower Accounts</span>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                              {g.followerAccountIds && g.followerAccountIds.length > 0 ? (
                                g.followerAccountIds.map(fId => {
                                  const parts = fId.split(':');
                                  const actualId = parts[0];
                                  const mult = parts[1] ? parseFloat(parts[1]) : 1;
                                  const fAcc = accounts.find(a => a.id === actualId);
                                  return (
                                    <div key={fId} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: 8, background: 'rgba(255,255,255,0.02)', borderRadius: 10, border: '1px solid rgba(255,255,255,0.05)' }}>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <CreditCard size={14} color="rgba(255,255,255,0.4)" />
                                        <span style={{ fontSize: 13, color: '#fff' }}>{fAcc ? fAcc.name : 'Unknown'}</span>
                                      </div>
                                      {mult > 1 && (
                                        <span style={{ fontSize: 11, color: '#ff9500', fontWeight: 700, paddingRight: 4 }}>
                                          {mult}x mult
                                        </span>
                                      )}
                                    </div>
                                  );
                                })
                              ) : (
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>No followers mapped.</span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 4 }}>
                            <button
                              onClick={() => openEditGroup(g)}
                              style={{
                                background: 'rgba(255,255,255,0.06)',
                                border: '1px solid rgba(255,255,255,0.1)',
                                color: '#fff',
                                borderRadius: 8,
                                padding: '6px 12px',
                                fontSize: 11,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                cursor: 'pointer'
                              }}
                            >
                              <Edit2 size={12} />
                              Edit Group
                            </button>
                            <button
                              onClick={() => handleDeleteGroup(g.id)}
                              style={{
                                background: 'rgba(255,69,58,0.1)',
                                border: 'none',
                                color: '#ff453a',
                                borderRadius: 8,
                                padding: '6px 12px',
                                fontSize: 11,
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                cursor: 'pointer'
                              }}
                            >
                              <Trash2 size={12} />
                              Delete Group
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })
          ) : (
            <div style={{ padding: '40px 0', color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center' }}>
              No copy groups configured.
            </div>
          )}
        </div>
      </div>

      {/* Add Group Bottom Sheet */}
      <AnimatePresence>
        {showAddGroup && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeGroupSheet}
            className="bottom-sheet-overlay"
            style={{ zIndex: 1200 }}
          >
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 350, damping: 35 }}
              onClick={e => e.stopPropagation()}
              className="bottom-sheet"
              style={{ display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '90vh' }}
            >
              <div className="sheet-handle" />

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px' }}>
                <span style={{ fontSize: 17, fontWeight: 700 }}>{editingGroupId ? 'Edit Copy Group' : 'Create Copy Group'}</span>
                <button onClick={closeGroupSheet} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer' }}>
                  <X size={20} />
                </button>
              </div>

              <div className="scroll-area" style={{ flex: 1, padding: '0 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>
                {/* Group Name */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Group Name</label>
                  <input
                    type="text"
                    value={groupName}
                    onChange={e => setGroupName(e.target.value)}
                    placeholder="e.g. Apex Copier"
                    className="ios-input"
                  />
                </div>

                {/* Leader Selector */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Leader Account</label>
                  <select 
                    value={leaderId} 
                    onChange={e => {
                      setLeaderId(e.target.value);
                      // Remove leader from followers list if it's there
                      setSelectedFollowers(prev => prev.filter(id => id !== e.target.value));
                    }} 
                    className="ios-input"
                  >
                    <option value="">Select Account...</option>
                    {accounts.map(a => (
                      <option key={a.id} value={a.id}>{a.name} (${a.balance?.toLocaleString()})</option>
                    ))}
                  </select>
                </div>

                {/* Followers Multi-Select */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', display: 'block', marginBottom: 6, textTransform: 'uppercase' }}>Follower Accounts</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {accounts.filter(a => a.id !== leaderId).map(a => {
                      const selected = isFollowerSelected(a.id);
                      const mult = getMultiplierValue(a.id);
                      return (
                        <div
                          key={a.id}
                          onClick={() => handleToggleFollower(a.id)}
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 8,
                            padding: '12px 14px',
                            background: selected ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
                            borderRadius: 12,
                            border: '1px solid',
                            borderColor: selected ? '#fff' : 'rgba(255,255,255,0.06)',
                            cursor: 'pointer'
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                            <span style={{ fontSize: 13, fontWeight: 600 }}>{a.name}</span>
                            <div style={{
                              width: 20,
                              height: 20,
                              borderRadius: 6,
                              border: '2px solid rgba(255,255,255,0.2)',
                              background: selected ? '#fff' : 'transparent',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}>
                              {selected && <div style={{ width: 8, height: 8, borderRadius: 1.5, background: '#000' }} />}
                            </div>
                          </div>

                          {selected && (
                            <div 
                              onClick={e => e.stopPropagation()}
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 10,
                                borderTop: '1px solid rgba(255,255,255,0.08)',
                                paddingTop: 8,
                                marginTop: 2
                              }}
                            >
                              <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Multiplier:</span>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <button 
                                  onClick={() => handleUpdateMultiplier(a.id, -1)}
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 6,
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    color: '#fff',
                                    fontSize: 14,
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                  }}
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max="100"
                                  value={mult}
                                  onChange={e => handleSetMultiplier(a.id, parseInt(e.target.value))}
                                  style={{
                                    width: 44,
                                    height: 24,
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.15)',
                                    borderRadius: 6,
                                    color: '#fff',
                                    fontSize: 12,
                                    fontWeight: 700,
                                    textAlign: 'center',
                                    outline: 'none'
                                  }}
                                />
                                <button 
                                  onClick={() => handleUpdateMultiplier(a.id, 1)}
                                  style={{
                                    width: 24,
                                    height: 24,
                                    borderRadius: 6,
                                    background: 'rgba(255,255,255,0.1)',
                                    border: 'none',
                                    color: '#fff',
                                    fontSize: 14,
                                    fontWeight: 700,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    cursor: 'pointer'
                                  }}
                                >
                                  +
                                </button>
                                <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 600 }}>x</span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    {accounts.length <= 1 && (
                      <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>Need more than 1 account to configure copier.</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div style={{ padding: '0 20px 20px' }}>
                <button
                  onClick={handleSaveGroup}
                  disabled={!groupName.trim() || !leaderId}
                  style={{
                    width: '100%',
                    background: (groupName.trim() && leaderId) ? '#fff' : 'rgba(255,255,255,0.2)',
                    border: 'none',
                    borderRadius: 14,
                    padding: 15,
                    fontSize: 15,
                    fontWeight: 700,
                    color: (groupName.trim() && leaderId) ? '#000' : 'rgba(255,255,255,0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6
                  }}
                >
                  <Save size={16} />
                  {editingGroupId ? 'Save Changes' : 'Create Group'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
