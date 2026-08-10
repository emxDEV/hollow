import { create } from 'zustand';

export const useUIStore = create((set) => ({
  view: 'dashboard',
  sidebarCollapsed: false,
  isMobile: false,
  mobileSidebarOpen: false,
  toasts: [],
  selectedDate: new Date().toISOString().split('T')[0],
  dateSelectedByUser: false,
  journalTab: 'daily',
  isAddExecutionOpen: false,
  activeExecutionDraft: null,

  setView: (view) => set({ view }),
  setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
  setIsMobile: (isMobile) => set({ isMobile }),
  setMobileSidebarOpen: (mobileSidebarOpen) => set({ mobileSidebarOpen }),
  setSelectedDate: (selectedDate, selectedByUser = true) => set({ selectedDate, dateSelectedByUser: selectedByUser }),
  setJournalTab: (journalTab) => set({ journalTab }),
  setIsAddExecutionOpen: (isAddExecutionOpen) => set({ isAddExecutionOpen }),
  setActiveExecutionDraft: (activeExecutionDraft) => set({ activeExecutionDraft }),
  openEditExecution: (execution) => set({ activeExecutionDraft: execution, isAddExecutionOpen: true }),
  
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
