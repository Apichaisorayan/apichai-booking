// Tab-specific session management
// Allows multiple tabs to have different logged-in users

// Generate unique tab ID
const generateTabId = (): string => {
  return `tab_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

// Get or create tab ID
const getTabId = (): string => {
  // Use sessionStorage for tab-specific ID
  let tabId = sessionStorage.getItem('tabId');
  if (!tabId) {
    tabId = generateTabId();
    sessionStorage.setItem('tabId', tabId);
  }
  return tabId;
};

// Storage keys with tab prefix
const getStorageKey = (key: string): string => {
  const tabId = getTabId();
  return `${tabId}_${key}`;
};

// Tab-specific storage wrapper
// Uses sessionStorage for true tab isolation (each tab has its own storage)
export const tabStorage = {
  getItem: (key: string): string | null => {
    return sessionStorage.getItem(key);
  },

  setItem: (key: string, value: string): void => {
    sessionStorage.setItem(key, value);
  },

  removeItem: (key: string): void => {
    sessionStorage.removeItem(key);
  },

  // Clean up old tab sessions (no longer needed with sessionStorage)
  cleanup: (): void => {
    // sessionStorage is automatically cleared when tab is closed
    // No cleanup needed
  },

  // Get current tab ID (for debugging)
  getTabId,
};
