// Utility functions for managing transcription history

const STORAGE_KEY = 'transcription_history';

export const saveTranscription = (transcription = '') => {
  try {
    const history = getTranscriptionHistory();
    
    // Always create a new entry
    const newEntry = {
      id: Date.now(),
      text: transcription.trim(),
      timestamp: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };
    
    // Add new entry at the beginning of history
    history.unshift(newEntry);
    
    // Keep only the last 50 entries to prevent storage issues
    const trimmedHistory = history.slice(0, 50);
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmedHistory));
    return newEntry;
  } catch (error) {
    console.error('Error saving transcription:', error);
    // Return a default entry if there's an error
    return {
      id: Date.now(),
      text: '',
      timestamp: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };
  }
};

export const getTranscriptionHistory = () => {
  try {
    const history = localStorage.getItem(STORAGE_KEY);
    return history ? JSON.parse(history) : [];
  } catch (error) {
    console.error('Error getting transcription history:', error);
    return [];
  }
};

export const deleteTranscription = (id) => {
  try {
    const history = getTranscriptionHistory();
    const updatedHistory = history.filter(entry => entry.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    return updatedHistory;
  } catch (error) {
    console.error('Error deleting transcription:', error);
    return null;
  }
};

export const clearTranscriptionHistory = () => {
  try {
    localStorage.removeItem(STORAGE_KEY);
    return true;
  } catch (error) {
    console.error('Error clearing transcription history:', error);
    return false;
  }
};
