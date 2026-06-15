import { create } from 'zustand';

export const useUIStore = create((set) => ({
  view: 'dashboard',
  selectedAccountId: 'all',
  activeTradeId: null,
  sidebarCollapsed: false,
  isAddTradeOpen: false,
  isMobile: false,
  mobileSidebarOpen: false,
  toasts: [],
  selectedDate: new Date().toISOString().split('T')[0],
  journalTab: 'daily',

  setView: (view) => set({ view }),
  setSelectedAccountId: (selectedAccountId) => set({ selectedAccountId }),
  setActiveTradeId: (activeTradeId) => set({ activeTradeId }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setIsAddTradeOpen: (isAddTradeOpen) => set({ isAddTradeOpen }),
  setIsMobile: (isMobile) => set({ isMobile }),
  setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
  setSelectedDate: (selectedDate) => set({ selectedDate }),
  setJournalTab: (journalTab) => set({ journalTab }),
  
  addToast: (message, type = 'success') => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    set((state) => ({
      toasts: [...state.toasts, { id, message, type }]
    }));
    
    // Auto-remove toast after 3.7 seconds
    setTimeout(() => {
      set((state) => ({
        toasts: state.toasts.filter((t) => t.id !== id)
      }));
    }, 3700);
  },
  
  removeToast: (id) => set((state) => ({
    toasts: state.toasts.filter((t) => t.id !== id)
  }))
}));

export default useUIStore;
