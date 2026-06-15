import { useUIStore } from '../store/useUIStore';

/**
 * Dispatches a notification to the Zustand UI store to show a beautiful glassmorphic toast.
 * @param {string} message The message text to display.
 * @param {'success' | 'error' | 'info'} type The type of notification.
 */
export function showToast(message, type = 'success') {
  useUIStore.getState().addToast(message, type);
}
