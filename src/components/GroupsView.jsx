import React, { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/hollowDb';
import { showToast } from '../utils/toast';
import { PropFirmBadge } from './PropFirmBadge';
import { 
  Crown, 
  Users, 
  Plus, 
  X, 
  Search, 
  HelpCircle, 
  ChevronDown, 
  ChevronRight, 
  Info,
  Move
} from 'lucide-react';
import { useUIStore } from '../store/useUIStore';



// Memoized AccountCard for available accounts to improve rendering performance
const AccountCard = React.memo(function AccountCard({
  acc,
  isLeader,
  isFollower,
  existingGroup,
  draggedAccountId,
  onDragStart,
  onDragEnd,
  onSetLeader,
  onAddFollower,
  onRemove
}) {
  return (
    <div 
      draggable={!existingGroup}
      onDragStart={(e) => onDragStart(e, acc.id)}
      onDragEnd={onDragEnd}
      className={`hollow-account-card ${isLeader ? 'leader' : ''} ${isFollower ? 'follower' : ''} ${existingGroup ? 'disabled' : ''} ${draggedAccountId === acc.id ? 'dragging' : ''}`}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
        <PropFirmBadge firm={acc.propFirm} type={acc.type} size={28} logoSize={13} />
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <div style={{ 
            fontSize: '13px', 
            fontWeight: '700', 
            color: '#fff',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {acc.name}
          </div>
          <div style={{ fontSize: '10px', color: 'var(--colors-stone)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
            Bal: ${acc.balance ? acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        {existingGroup ? (
          <span style={{ 
            fontSize: '9px', 
            color: 'var(--colors-stone)', 
            background: 'rgba(255,255,255,0.02)', 
            border: '1px solid rgba(255,255,255,0.04)', 
            borderRadius: '6px', 
            padding: '2px 6px',
            textTransform: 'uppercase',
            fontWeight: '600'
          }}>
            In: {existingGroup}
          </span>
        ) : isLeader ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ 
              fontSize: '9px', 
              color: '#ffffff', 
              background: 'rgba(255, 255, 255, 0.08)', 
              border: '1px solid rgba(255, 255, 255, 0.2)', 
              borderRadius: '6px', 
              padding: '2px 6px',
              fontWeight: '700',
              textTransform: 'uppercase'
            }}>
              Leader
            </span>
            <button
              onClick={() => onRemove(acc.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--colors-loss)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Remove role"
            >
              <X size={12} />
            </button>
          </div>
        ) : isFollower ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ 
              fontSize: '9px', 
              color: '#8e8e93', 
              background: 'rgba(255, 255, 255, 0.04)', 
              border: '1px solid rgba(255, 255, 255, 0.12)', 
              borderRadius: '6px', 
              padding: '2px 6px',
              fontWeight: '700',
              textTransform: 'uppercase'
            }}>
              Follower
            </span>
            <button
              onClick={() => onRemove(acc.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--colors-loss)',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
              title="Remove role"
            >
              <X size={12} />
            </button>
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <button
              onClick={() => onSetLeader(acc.id)}
              style={{
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                color: '#ffffff',
                borderRadius: '6px',
                padding: '4px 6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.25)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255, 255, 255, 0.04)';
                e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.12)';
              }}
              title="Set as Group Leader"
            >
              <Crown size={11} fill="#ffffff" />
            </button>
            <button
              onClick={() => onAddFollower(acc.id)}
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                borderRadius: '6px',
                padding: '4px 6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)'}
              onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
              title="Assign as Follower"
            >
              <Plus size={11} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

export default function GroupsView() {
  const isMobile = useUIStore(state => state.isMobile);
  const accounts = useLiveQuery(() => db.accounts.toArray()) || [];
  const groups = useLiveQuery(() => db.groups.toArray()) || [];

  const [expandedGroups, setExpandedGroups] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState(null);

  // Toggle group accordion expansion
  const toggleExpand = (groupId) => {
    setExpandedGroups(prev => ({
      ...prev,
      [groupId]: !prev[groupId]
    }));
  };

  // Open modal for creating a new group
  const handleOpenCreateModal = () => {
    setEditingGroupId(null);
    setIsModalOpen(true);
  };

  // Open modal for editing an existing group
  const handleOpenEditModal = (group) => {
    setEditingGroupId(group.id);
    setIsModalOpen(true);
  };

  // Delete group
  const handleDeleteGroup = async (groupId, name) => {
    if (confirm(`Are you sure you want to delete group "${name}"?`)) {
      try {
        await db.groups.delete(groupId);
        console.log('Group deleted:', groupId);
      } catch (err) {
        console.error('Failed to delete group:', err);
      }
    }
  };

  // Find editing group details
  const editingGroup = useMemo(() => {
    if (!editingGroupId) return null;
    return groups.find(g => g.id === editingGroupId) || null;
  }, [groups, editingGroupId]);

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '24px',
      height: '100%',
      overflowY: 'auto',
      overflowX: 'hidden',
      padding: isMobile ? '0px 16px 80px 16px' : '0px 40px 36px 40px',
      boxSizing: 'border-box'
    }}>
      
      {/* Top spacer to ensure flush sticky header on scroll */}
      <div style={{ height: isMobile ? '12px' : '16px', flexShrink: 0 }} />
      
      {/* Unified Top Header Bar */}
      <div className="hollow-view-header">
        <div className="hollow-view-header-title-block">
          <h1>
            <Users size={28} color="#ffffff" /> copy trading groups.
          </h1>
          <p>
            Assign group leaders to mirror order entries, execution sizes, and close triggers directly onto followers in real-time.
          </p>
        </div>

        {/* Header Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            style={{
              background: 'rgba(255, 255, 255, 0.02)',
              border: '1px solid rgba(255,255,255,0.06)',
              color: 'var(--colors-mute)',
              borderRadius: '20px',
              padding: '8px 16px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
          >
            <HelpCircle size={14} /> How to manage groups
          </button>

          <button
            onClick={handleOpenCreateModal}
            style={{
              background: '#ffffff',
              border: 'none',
              color: '#000000',
              borderRadius: '20px',
              padding: '8px 18px',
              fontSize: '12px',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: 'none',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#e5e5e5'}
            onMouseLeave={(e) => e.currentTarget.style.background = '#ffffff'}
          >
            <Plus size={14} /> Create Group
          </button>
        </div>
      </div>

      {/* 3. Group Lists */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {groups.length === 0 ? (
          <div style={{
            padding: '48px',
            textAlign: 'center',
            background: 'rgba(255,255,255,0.01)',
            border: '1px dashed rgba(255,255,255,0.08)',
            borderRadius: '16px',
            color: 'var(--colors-stone)'
          }}>
            <Users size={36} style={{ marginBottom: '12px', color: 'var(--colors-primary)' }} />
            <p style={{ fontSize: '14px', fontWeight: '500' }}>No copy trading groups configured yet.</p>
            <p style={{ fontSize: '12px', color: 'var(--colors-mute)', marginTop: '4px' }}>Click "Create Group" above to bundle accounts for leader copy mirroring.</p>
          </div>
        ) : (
          groups.map(group => {
            const isExpanded = !!expandedGroups[group.id];
            
            // Gather details of accounts in the group
            const leaderAcc = accounts.find(a => a.id === group.leaderAccountId);
            const cleanFollowerIds = (group.followerAccountIds || []).map(fId => fId.split(':')[0]);
            const followerAccs = accounts.filter(a => cleanFollowerIds.includes(a.id));
            const allGroupAccs = [leaderAcc, ...followerAccs].filter(Boolean);
            const groupTotalBalance = allGroupAccs.reduce((sum, a) => sum + (a.balance || 0), 0);

            return (
              <div 
                key={group.id}
                style={{
                  background: '#0f0f11',
                  border: '1px solid #1c1c1e',
                  borderRadius: '16px',
                  overflow: 'hidden',
                  transition: 'border-color 0.2s'
                }}
              >
                {/* Accordion Row Header */}
                <div style={{
                  padding: '20px 24px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  cursor: 'pointer',
                  userSelect: 'none'
                }} onClick={() => toggleExpand(group.id)}>
                  
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <span style={{ color: 'var(--colors-mute)' }}>
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </span>
                    <div>
                      <h4 style={{ fontSize: '17px', fontWeight: '700', color: '#fff' }}>{group.name}</h4>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '12px', color: 'var(--colors-mute)' }}>
                          {allGroupAccs.length} accounts • Total Balance: 
                        </span>
                        <strong style={{ fontSize: '12px', color: 'var(--colors-gain)' }}>
                          ${groupTotalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </strong>
                        <span style={{ fontSize: '12px', color: 'var(--colors-mute)' }}>
                          • Leader:
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Crown size={12} color="#ffffff" fill="#ffffff" />
                          <span style={{ fontSize: '12px', color: '#ffffff', fontWeight: '600' }}>
                            {leaderAcc ? leaderAcc.name : 'None'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Actions buttons on the right side */}
                  <div 
                    style={{ display: 'flex', gap: '10px' }}
                    onClick={(e) => e.stopPropagation()} // Prevent toggling the accordion
                  >
                    <button
                      onClick={() => handleOpenEditModal(group)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #1c1c1e',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#ffffff',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = '#1c1c1e'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteGroup(group.id, group.name)}
                      style={{
                        background: 'transparent',
                        border: '1px solid #ff6b6b',
                        borderRadius: '8px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: '600',
                        color: '#ff8a8a',
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255, 107, 107, 0.1)'}
                      onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                    >
                      Delete
                    </button>
                  </div>

                </div>

                {/* Expanded Details List */}
                {isExpanded && (
                  <div style={{
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    background: 'rgba(0,0,0,0.15)',
                    padding: '16px 24px'
                  }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)', color: 'var(--colors-stone)', fontSize: '11px', textTransform: 'uppercase' }}>
                          <th style={{ padding: '8px 12px' }}>Account Name</th>
                          <th style={{ padding: '8px 12px' }}>Connection</th>
                          <th style={{ padding: '8px 12px' }}>Role</th>
                          <th style={{ padding: '8px 12px', textAlign: 'right' }}>Balance</th>
                        </tr>
                      </thead>
                      <tbody style={{ fontSize: '13px' }}>
                        {allGroupAccs.map((acc, index) => {
                          const isLeader = acc.id === group.leaderAccountId;
                          return (
                            <tr key={acc.id} style={{ borderBottom: index === allGroupAccs.length - 1 ? 'none' : '1px solid rgba(255,255,255,0.03)' }}>
                              <td style={{ padding: '12px', fontWeight: '600', color: '#fff' }}>
                                <div>{acc.name}</div>
                                <div style={{ fontSize: '10px', color: 'var(--colors-mute)', marginTop: '2px' }}>ID: {acc.id}</div>
                              </td>
                              <td style={{ padding: '12px' }}>
                                <PropFirmBadge firm={acc.propFirm} type={acc.type} size={26} logoSize={12} />
                              </td>
                              <td style={{ padding: '12px' }}>
                                {isLeader ? (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#ffffff', fontWeight: '700' }}>
                                    <Crown size={12} fill="#ffffff" /> Leader
                                  </div>
                                ) : (
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{ color: 'var(--colors-mute)' }}>Follower</span>
                                    {(() => {
                                      const fItem = (group.followerAccountIds || []).find(f => f.startsWith(acc.id + ':'));
                                      const mult = fItem ? parseFloat(fItem.split(':')[1]) : 1;
                                      return mult > 1 ? (
                                        <span style={{ 
                                          fontSize: '9px', 
                                          color: '#ff9500', 
                                          background: 'rgba(255, 149, 0, 0.1)', 
                                          border: '1px solid rgba(255, 149, 0, 0.2)', 
                                          borderRadius: '4px', 
                                          padding: '1px 5px',
                                          fontWeight: '700'
                                        }}>
                                          {mult}x mult
                                        </span>
                                      ) : null;
                                    })()}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#fff' }}>
                                ${acc.balance ? acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

              </div>
            );
          })
        )}
      </div>

      {/* 4. Optimized Overlay Manage Group Modal Dialog */}
      <ManageGroupModal
        key={editingGroupId || 'new'}
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingGroupId(null);
        }}
        group={editingGroup}
        accounts={accounts}
        groups={groups}
      />

    </div>
  );
}

// Dedicated Modal Subcomponent to isolate drag & drop state changes from main GroupsView
function ManageGroupModal({ isOpen, onClose, group, accounts, groups }) {
  const [shouldRender, setShouldRender] = useState(isOpen);
  const [animatingState, setAnimatingState] = useState('closed');

  // Modal configuration states
  const [groupName, setGroupName] = useState(group ? group.name : '');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFollowerIds, setSelectedFollowerIds] = useState(() => {
    if (!group || !group.followerAccountIds) return [];
    return group.followerAccountIds.map(f => f.split(':')[0]);
  });
  const [followerMultipliers, setFollowerMultipliers] = useState(() => {
    const mults = {};
    if (group && group.followerAccountIds) {
      group.followerAccountIds.forEach(f => {
        const parts = f.split(':');
        const accId = parts[0];
        const mult = parts[1] ? parseFloat(parts[1]) : 1;
        mults[accId] = isNaN(mult) ? 1 : mult;
      });
    }
    return mults;
  });
  const [leaderId, setLeaderId] = useState(group ? (group.leaderAccountId || '') : '');

  // ID of the account currently being dragged
  const [draggedAccountId, setDraggedAccountId] = useState(null);

  // Drag and drop states for UI highlights
  const [isDragOverLeader, setIsDragOverLeader] = useState(false);
  const [isDragOverFollowers, setIsDragOverFollowers] = useState(false);
  const [isDragOverLeftTable, setIsDragOverLeftTable] = useState(false);

  // Sync animation states with open/close lifecycle
  useEffect(() => {
    if (isOpen) {
      setShouldRender(true);
      setAnimatingState('entering');
      const timer = setTimeout(() => {
        setAnimatingState('open');
      }, 280);
      return () => clearTimeout(timer);
    } else if (shouldRender) {
      setAnimatingState('exiting');
      const timer = setTimeout(() => {
        setShouldRender(false);
        setAnimatingState('closed');
      }, 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  // Handle manual modal close triggers
  const handleClose = () => {
    onClose();
  };

  // Drag & drop event handlers
  const handleDragStart = (e, accId) => {
    e.dataTransfer.setData('text/plain', accId);
    e.dataTransfer.effectAllowed = 'move';
    setDraggedAccountId(accId);
  };

  const handleDragEnd = () => {
    setDraggedAccountId(null);
    setIsDragOverLeader(false);
    setIsDragOverFollowers(false);
    setIsDragOverLeftTable(false);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
  };

  const handleDropOnLeader = (e) => {
    e.preventDefault();
    setIsDragOverLeader(false);
    const accId = e.dataTransfer.getData('text/plain');
    if (!accId) return;

    if (leaderId === accId) return;

    const oldLeader = leaderId;
    setLeaderId(accId);

    // If it was in the followers list, remove it
    if (selectedFollowerIds.includes(accId)) {
      setSelectedFollowerIds(prev => {
        const filtered = prev.filter(id => id !== accId);
        return oldLeader ? [...filtered, oldLeader] : filtered;
      });
    } else if (oldLeader) {
      // If it's a completely new account, add the old leader to followers
      setSelectedFollowerIds(prev => [...prev, oldLeader]);
    }
  };

  const handleDropOnFollowers = (e) => {
    e.preventDefault();
    setIsDragOverFollowers(false);
    const accId = e.dataTransfer.getData('text/plain');
    if (!accId) return;

    // If it's already a follower, ignore
    if (selectedFollowerIds.includes(accId)) return;

    if (leaderId === accId) {
      // Dragged from Leader to Followers
      setLeaderId('');
      setSelectedFollowerIds(prev => [...prev, accId]);
    } else {
      // Dragged from Left Table to Followers
      setSelectedFollowerIds(prev => [...prev, accId]);
    }
  };

  const handleDropOnLeftTable = (e) => {
    e.preventDefault();
    setIsDragOverLeftTable(false);
    const accId = e.dataTransfer.getData('text/plain');
    if (!accId) return;

    // If it is in the group, remove it
    if (leaderId === accId) {
      setLeaderId('');
      if (selectedFollowerIds.length > 0) {
        // Promote first follower to leader automatically
        const [first, ...rest] = selectedFollowerIds;
        setLeaderId(first);
        setSelectedFollowerIds(rest);
      }
    } else if (selectedFollowerIds.includes(accId)) {
      setSelectedFollowerIds(prev => prev.filter(id => id !== accId));
    }
  };

  // Find which group an account already belongs to (excluding current group)
  const getExistingGroupName = (accId) => {
    const matchedGroup = groups.find(g => 
      g.id !== (group ? group.id : null) && 
      (g.leaderAccountId === accId || (g.followerAccountIds || []).map(f => f.split(':')[0]).includes(accId))
    );
    return matchedGroup ? matchedGroup.name : null;
  };

  // Helper check
  const isAccountSelected = (accId) => {
    return leaderId === accId || selectedFollowerIds.includes(accId);
  };

  // Filter accounts by search query
  const filteredAccounts = useMemo(() => {
    if (!searchQuery) return accounts;
    return accounts.filter(acc => 
      acc.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      acc.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (acc.propFirm || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [accounts, searchQuery]);

  // Toggle account selection in modal
  const handleToggleAccount = (accId) => {
    if (isAccountSelected(accId)) {
      // Unselect
      if (leaderId === accId) {
        if (selectedFollowerIds.length > 0) {
          // Promote first follower to leader
          const [first, ...rest] = selectedFollowerIds;
          setLeaderId(first);
          setSelectedFollowerIds(rest);
        } else {
          setLeaderId('');
        }
      } else {
        setSelectedFollowerIds(prev => prev.filter(id => id !== accId));
      }
    } else {
      // Select
      if (!leaderId) {
        setLeaderId(accId);
      } else {
        setSelectedFollowerIds(prev => [...prev, accId]);
      }
    }
  };

  // Promote a follower to leader
  const handlePromoteToLeader = (accId) => {
    if (leaderId) {
      const oldLeader = leaderId;
      setLeaderId(accId);
      setSelectedFollowerIds(prev => {
        const filtered = prev.filter(id => id !== accId);
        return [...filtered, oldLeader];
      });
    } else {
      setLeaderId(accId);
      setSelectedFollowerIds(prev => prev.filter(id => id !== accId));
    }
  };

  // Toggle Select All (batch state update optimization)
  const handleToggleSelectAll = () => {
    const selectable = filteredAccounts;
    const allSelected = selectable.every(acc => isAccountSelected(acc.id));
    
    if (allSelected) {
      // Clear selections for filtered accounts
      const idsToRemove = selectable.map(acc => acc.id);
      if (idsToRemove.includes(leaderId)) {
        setLeaderId('');
      }
      setSelectedFollowerIds(prev => prev.filter(id => !idsToRemove.includes(id)));
    } else {
      // Add all unselected filtered accounts in a single render cycle
      let newFollowers = [];
      let currentLeader = leaderId;
      
      selectable.forEach(acc => {
        if (currentLeader !== acc.id && !selectedFollowerIds.includes(acc.id)) {
          if (!currentLeader) {
            currentLeader = acc.id;
          } else {
            newFollowers.push(acc.id);
          }
        }
      });
      
      if (currentLeader !== leaderId) {
        setLeaderId(currentLeader);
      }
      if (newFollowers.length > 0) {
        setSelectedFollowerIds(prev => [...prev, ...newFollowers]);
      }
    }
  };

  // Save the group to Dexie
  const handleSaveGroup = async () => {
    if (!groupName.trim()) {
      showToast('Please enter a group name.', 'error');
      return;
    }
    if (!leaderId) {
      showToast('Please select at least one account to set as leader.', 'error');
      return;
    }

    const payload = {
      name: groupName.trim(),
      leaderAccountId: leaderId,
      followerAccountIds: selectedFollowerIds.map(fId => `${fId}:${followerMultipliers[fId] || 1}`)
    };

    try {
      if (group && group.id) {
        await db.groups.update(group.id, payload);
        console.log('Group updated:', group.id);
      } else {
        const generatedId = `group-${Date.now()}`;
        await db.groups.add({
          id: generatedId,
          ...payload
        });
        console.log('Group created:', generatedId);
      }
      handleClose();
    } catch (err) {
      console.error('Failed to save group:', err);
      showToast('Failed to save copy trading group.', 'error');
    }
  };

  if (!shouldRender) return null;

  return createPortal(
    <div 
      className={`hollow-modal-overlay ${animatingState}`}
      style={{
        background: 'rgba(0, 0, 0, 0.75)',
        WebkitBackdropFilter: undefined
      }}
      onClick={handleClose}
    >
      <div 
        className="hollow-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        
        {/* Modal Header */}
        <div style={{
          padding: '20px 32px',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Users size={20} color="var(--colors-primary)" />
            <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#fff' }}>
              {group ? 'Edit Group' : 'Create Group'}
            </h2>
          </div>
          <button 
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--colors-mute)',
              cursor: 'pointer',
              outline: 'none',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Step 1: Define Group Name - SLEEK BANNER */}
        <div style={{
          padding: '16px 32px',
          background: 'rgba(255, 255, 255, 0.02)',
          borderBottom: '1px solid rgba(255, 255, 255, 0.04)',
          display: 'flex',
          alignItems: 'center',
          gap: '24px',
          flexWrap: 'wrap'
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 1.2, minWidth: '240px' }}>
            <span style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '800', letterSpacing: '0.75px', textTransform: 'uppercase' }}>
              Step 1: Define Group Name
            </span>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value.slice(0, 16))}
              placeholder="Enter a descriptive name for your copy group..."
              className="hollow-glass-input"
              style={{
                padding: '10px 14px',
                fontSize: '13px',
                width: '100%',
                marginTop: '4px'
              }}
            />
          </div>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', flex: 0.8, minWidth: '300px' }}>
            <span style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: '800', letterSpacing: '0.75px', textTransform: 'uppercase' }}>
              Copy Trading Instructions
            </span>
            <p style={{ fontSize: '11px', color: 'var(--colors-on-dark-mute)', lineHeight: 1.4, marginTop: '2px' }}>
              Assign exactly 1 leader account. All follower accounts will duplicate leader executions in real-time.
            </p>
          </div>
        </div>

        {/* Step 2: Copy Flow Assignment - 3-COLUMN DASHBOARD */}
        <div style={{
          flex: 1,
          display: 'flex',
          overflow: 'hidden',
          padding: '20px 32px',
          gap: '20px'
        }}>
          
          {/* COLUMN 1: Pool (Available Accounts) */}
          <div className="hollow-modal-column" style={{ flex: 1.2 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: 'var(--colors-stone)', textTransform: 'uppercase', letterSpacing: '0.75px' }}>
                Available Accounts
              </span>
              <span style={{ fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '600' }} className="mono">
                {filteredAccounts.length} Pool
              </span>
            </div>

            {/* Search input and Select All */}
            <div style={{ display: 'flex', gap: '8px' }}>
              <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center' }}>
                <Search size={13} style={{ position: 'absolute', left: '10px', color: 'var(--colors-mute)' }} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search accounts..."
                  className="hollow-glass-input"
                  style={{
                    width: '100%',
                    padding: '6px 10px 6px 30px',
                    fontSize: '12px'
                  }}
                />
              </div>
              <button
                type="button"
                onClick={handleToggleSelectAll}
                style={{
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderRadius: '8px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  fontWeight: '600',
                  color: '#fff',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.02)'}
              >
                {filteredAccounts.every(acc => isAccountSelected(acc.id)) ? 'Deselect All' : 'Select All'}
              </button>
            </div>

            {/* Accounts cards list (Drag-drop target to remove selection) */}
            <div
              onDragOver={handleDragOver}
              onDrop={handleDropOnLeftTable}
              onDragEnter={() => setIsDragOverLeftTable(true)}
              onDragLeave={() => setIsDragOverLeftTable(false)}
              className={`hollow-menu-scrollbar hollow-drop-zone left-table-zone ${isDragOverLeftTable ? 'drag-over' : ''}`}
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
                border: '1px solid rgba(255,255,255,0.03)'
              }}
            >
              {filteredAccounts.map(acc => {
                const isLeader = leaderId === acc.id;
                const isFollower = selectedFollowerIds.includes(acc.id);
                const existingGroup = getExistingGroupName(acc.id);
                return (
                  <AccountCard
                    key={acc.id}
                    acc={acc}
                    isLeader={isLeader}
                    isFollower={isFollower}
                    existingGroup={existingGroup}
                    draggedAccountId={draggedAccountId}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                    onSetLeader={(id) => {
                      // Set as leader and remove from followers
                      setLeaderId(id);
                      setSelectedFollowerIds(prev => prev.filter(fId => fId !== id));
                      if (leaderId && leaderId !== id) {
                        // Swap previous leader to followers list
                        setSelectedFollowerIds(prev => [...prev, leaderId]);
                      }
                    }}
                    onAddFollower={(id) => {
                      // Add as follower, remove from leader if it was there
                      if (leaderId === id) setLeaderId('');
                      setSelectedFollowerIds(prev => [...prev, id]);
                    }}
                    onRemove={(id) => {
                      // Remove role
                      if (leaderId === id) {
                        setLeaderId('');
                      } else {
                        setSelectedFollowerIds(prev => prev.filter(fId => fId !== id));
                      }
                    }}
                  />
                );
              })}
            </div>
          </div>

          {/* COLUMN 2: Leader Account Slot (Golden Card) */}
          <div className="hollow-modal-column" style={{ flex: 0.9 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#ffffff', textTransform: 'lowercase', letterSpacing: '0.75px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Crown size={12} fill="#ffffff" /> group leader
              </span>
              <span style={{ fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '600' }} className="mono">
                {leaderId ? '1 Active' : '0 Active'}
              </span>
            </div>

            <div
              onDragOver={handleDragOver}
              onDrop={handleDropOnLeader}
              onDragEnter={() => setIsDragOverLeader(true)}
              onDragLeave={() => setIsDragOverLeader(false)}
              className={`hollow-drop-zone leader-zone ${isDragOverLeader ? 'drag-over' : ''} ${leaderId ? 'has-content' : ''}`}
            >
              {leaderId ? (
                (() => {
                  const leaderAcc = accounts.find(a => a.id === leaderId);
                  return (
                    <div 
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, leaderId)}
                      onDragEnd={handleDragEnd}
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'space-between',
                        padding: '12px 6px',
                        cursor: 'grab'
                      }}
                    >
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
                        <div style={{
                          width: '56px',
                          height: '56px',
                          borderRadius: '50%',
                          background: 'rgba(255, 255, 255, 0.08)',
                          border: '1px solid rgba(255, 255, 255, 0.2)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          color: '#ffffff',
                          boxShadow: 'none'
                        }}>
                          <Crown size={28} fill="#ffffff" />
                        </div>
                        
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '14px', fontWeight: '800', color: '#fff' }}>
                            {leaderAcc ? leaderAcc.name : leaderId}
                          </div>
                          <div style={{ fontSize: '10px', color: 'var(--colors-stone)', marginTop: '2px', fontFamily: 'var(--font-mono)' }}>
                            ID: {leaderId}
                          </div>
                        </div>
                        <PropFirmBadge firm={leaderAcc?.propFirm} type={leaderAcc?.type} size={26} logoSize={12} />
                      </div>

                      <div style={{ 
                        display: 'flex', 
                        flexDirection: 'column', 
                        gap: '12px', 
                        borderTop: '1px solid rgba(255,255,255,0.04)', 
                        paddingTop: '16px',
                        alignItems: 'center',
                        width: '100%'
                      }}>
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '9px', color: 'var(--colors-stone)', fontWeight: '700', letterSpacing: '0.5px' }}>LEADER BALANCE</div>
                          <div className="mono" style={{ fontSize: '20px', fontWeight: '800', color: '#fff', marginTop: '2px' }}>
                            ${leaderAcc?.balance ? leaderAcc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            setLeaderId('');
                            if (selectedFollowerIds.length > 0) {
                              // Auto-promote first follower
                              const [first, ...rest] = selectedFollowerIds;
                              setLeaderId(first);
                              setSelectedFollowerIds(rest);
                            }
                          }}
                          style={{
                            background: 'rgba(255, 107, 107, 0.08)',
                            border: '1px solid rgba(255, 107, 107, 0.15)',
                            color: 'var(--colors-loss)',
                            borderRadius: '8px',
                            padding: '6px 14px',
                            fontSize: '11px',
                            fontWeight: '600',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 107, 107, 0.18)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255, 107, 107, 0.08)'}
                        >
                          Remove Leader
                        </button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                  <Crown size={28} color="rgba(255, 255, 255, 0.15)" />
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.8)' }}>No Leader Assigned</span>
                  <p style={{ fontSize: '10px', color: 'var(--colors-stone)', lineHeight: 1.4, padding: '0 8px' }}>
                    Drag an account or click its crown icon to set as leader.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* COLUMN 3: Followers Slot (Cyan List) */}
          <div className="hollow-modal-column" style={{ flex: 1.1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', fontWeight: '800', color: '#ffffff', textTransform: 'lowercase', letterSpacing: '0.75px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Users size={12} color="#ffffff" /> followers
              </span>
              <span style={{ fontSize: '11px', color: 'var(--colors-stone)', fontWeight: '600' }} className="mono">
                {selectedFollowerIds.length} Active
              </span>
            </div>

            <div
              onDragOver={handleDragOver}
              onDrop={handleDropOnFollowers}
              onDragEnter={() => setIsDragOverFollowers(true)}
              onDragLeave={() => setIsDragOverFollowers(false)}
              className={`hollow-menu-scrollbar hollow-drop-zone followers-zone ${isDragOverFollowers ? 'drag-over' : ''} ${selectedFollowerIds.length > 0 ? 'has-content' : ''}`}
            >
              {selectedFollowerIds.length > 0 ? (
                selectedFollowerIds.map(fId => {
                  const followerAcc = accounts.find(a => a.id === fId);
                  return (
                    <div
                      key={fId}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, fId)}
                      onDragEnd={handleDragEnd}
                      className={`hollow-account-card follower ${draggedAccountId === fId ? 'dragging' : ''}`}
                      style={{ padding: '10px 12px' }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0, flex: 1 }}>
                        <PropFirmBadge firm={followerAcc?.propFirm} type={followerAcc?.type} size={26} logoSize={12} />
                        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                          <span style={{ 
                            fontSize: '12px', 
                            fontWeight: '700', 
                            color: '#fff',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {followerAcc?.name || fId}
                          </span>
                          <span style={{ fontSize: '9px', color: 'var(--colors-stone)', fontFamily: 'var(--font-mono)', marginTop: '2px' }}>
                            Bal: ${followerAcc?.balance ? followerAcc.balance.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '0.00'}
                          </span>
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginRight: '6px' }}>
                        <span style={{ fontSize: '9px', color: 'var(--colors-stone)', textTransform: 'uppercase' }}>Multiplier:</span>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={followerMultipliers[fId] || 1}
                          onChange={(e) => {
                            const val = parseInt(e.target.value);
                            setFollowerMultipliers(prev => ({
                              ...prev,
                              [fId]: Math.max(1, Math.min(100, isNaN(val) ? 1 : val))
                            }));
                          }}
                          style={{
                            width: '36px',
                            height: '20px',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            borderRadius: '4px',
                            color: '#fff',
                            fontSize: '10px',
                            textAlign: 'center',
                            outline: 'none'
                          }}
                        />
                        <span style={{ fontSize: '10px', color: 'var(--colors-stone)', fontWeight: 'bold' }}>x</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <button
                          type="button"
                          onClick={() => handlePromoteToLeader(fId)}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--colors-stone)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Promote to Leader"
                          onMouseEnter={e => e.currentTarget.style.color = '#ffffff'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--colors-stone)'}
                        >
                          <Crown size={12} fill="currentColor" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedFollowerIds(prev => prev.filter(id => id !== fId))}
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--colors-stone)',
                            cursor: 'pointer',
                            padding: '4px',
                            display: 'flex',
                            alignItems: 'center'
                          }}
                          title="Remove follower"
                          onMouseEnter={e => e.currentTarget.style.color = 'var(--colors-loss)'}
                          onMouseLeave={e => e.currentTarget.style.color = 'var(--colors-stone)'}
                        >
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', textAlign: 'center' }}>
                  <Users size={28} color="rgba(0, 240, 255, 0.25)" />
                  <span style={{ fontSize: '12px', fontWeight: '700', color: 'rgba(255,255,255,0.8)' }}>No Followers Assigned</span>
                  <p style={{ fontSize: '10px', color: 'var(--colors-stone)', lineHeight: 1.4, padding: '0 8px' }}>
                    Drag accounts or click their plus icon to set them as followers.
                  </p>
                </div>
              )}
            </div>
          </div>

        </div>

        {/* Modal Footer */}
        <div style={{
          padding: '16px 32px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(0,0,0,0.1)'
        }}>
          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: 'rgba(255,255,255,0.6)',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '13px',
              padding: '8px 16px',
              borderRadius: '8px',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#fff'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.6)'}
          >
            Cancel
          </button>

          <button
            onClick={handleSaveGroup}
            disabled={!groupName.trim() || !leaderId}
            style={{
              background: (!groupName.trim() || !leaderId) 
                ? 'rgba(255, 255, 255, 0.1)' 
                : '#ffffff',
              color: (!groupName.trim() || !leaderId) ? 'rgba(255,255,255,0.3)' : '#000000',
              border: 'none',
              borderRadius: '20px',
              padding: '8px 24px',
              fontWeight: '700',
              fontSize: '13px',
              cursor: (!groupName.trim() || !leaderId) ? 'not-allowed' : 'pointer',
              boxShadow: 'none'
            }}
          >
            {group ? 'Save Group' : 'Create Group'}
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
}
