import { useState, useEffect, useCallback } from "react";
import useApi from "../../api/useApi";
import LeftPanel from "./LeftPanel/LeftPanel";
import TimeTracker from "./MiddlePanel/TimeTracker";
import RightPanel from "./RightPanel/RightPanel";
import { sanitizeStudyData, verifyDataStructure, logDataOperation } from "./utils/dataVerification";
import "./styles/StudyCompanion.css";

// Debounce utility function
const debounce = (func, delay) => {
  let timeoutId;
  return (...args) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), delay);
  };
};

export default function StudyCompanion() {
  const api = useApi();
  
  // Global state for all study companion data
  const [studyData, setStudyData] = useState({
    ultimateGoal: '',
    shortTermActions: [],
    estimatedTime: { hours: 0, minutes: 0 },
    dailyCommitment: { hours: 0, minutes: 0 },
    studySessions: [],
    taskBlocks: [],
    todos: []
  });
  
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [operationLoading, setOperationLoading] = useState(false);
  const [savingState, setSavingState] = useState(null); // 'saving', 'saved', 'error', null
  
  // Helper to parse error messages
  const getErrorMessage = useCallback((err) => {
    if (err.message) {
      // Check for network errors
      if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
        return 'Network error. Please check your connection.';
      }
      // Check for authentication errors
      if (err.message.includes('401') || err.message.includes('Unauthorized')) {
        return 'Session expired. Please log in again.';
      }
      // Check for server errors
      if (err.message.includes('500') || err.message.includes('Internal Server Error')) {
        return 'Server error. Please try again later.';
      }
      return err.message;
    }
    return 'An unexpected error occurred';
  }, []);

  // Fetch all study companion data on mount
  const fetchStudyData = useCallback(async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.getStudyCompanion();
      
      if (response.success && response.data) {
        // Verify and sanitize data structure
        const verification = verifyDataStructure(response.data);
        
        if (!verification.valid) {
          console.warn('Data structure validation warnings:', verification.errors);
          logDataOperation('fetchStudyData', { errors: verification.errors }, false);
        }
        
        // Sanitize data to ensure consistency
        const sanitizedData = sanitizeStudyData(response.data);
        setStudyData(sanitizedData);
        
        logDataOperation('fetchStudyData', sanitizedData, true);
      }
    } catch (err) {
      console.error("Failed to fetch study data:", err);
      const errorMessage = getErrorMessage(err);
      
      // Retry once on network errors
      if (retryCount === 0 && errorMessage.includes('Network error')) {
        console.log('Retrying fetch...');
        setTimeout(() => fetchStudyData(1), 1000);
        return;
      }
      
      setError(`Failed to load study companion data: ${errorMessage}`);
      logDataOperation('fetchStudyData', { error: errorMessage }, false);
    } finally {
      setLoading(false);
    }
  }, [api, getErrorMessage]);

  // Load data on mount
  useEffect(() => {
    fetchStudyData();
  }, [fetchStudyData]);

  // Debounced update function for auto-save with rollback
  const debouncedUpdate = useCallback(
    debounce(async (field, value, previousValue, apiMethod) => {
      setSavingState('saving');
      try {
        // Call the appropriate API method
        if (apiMethod) {
          await apiMethod();
        }
        setSavingState('saved');
        // Clear saved indicator after 2 seconds
        setTimeout(() => setSavingState(null), 2000);
      } catch (err) {
        console.error("Failed to update study data:", err);
        const errorMessage = getErrorMessage(err);
        setError(`${errorMessage}. Reverting...`);
        setSavingState('error');
        
        // Rollback to previous value
        setStudyData(prev => ({
          ...prev,
          [field]: previousValue
        }));
        
        // Clear error and saving state after 4 seconds
        setTimeout(() => {
          setError(null);
          setSavingState(null);
        }, 4000);
      }
    }, 500),
    [getErrorMessage]
  );

  /**
   * Update study data with optimistic update and rollback on failure
   * 
   * This function implements optimistic UI updates with automatic rollback:
   * 1. Immediately updates the UI with the new value (optimistic update)
   * 2. Debounces the API call to reduce server load
   * 3. Automatically rolls back to previous value if API call fails
   * 4. Shows saving/saved/error indicators to user
   * 
   * @param {string} field - The field name in studyData to update
   * @param {any} value - The new value for the field
   * @param {Function} apiMethod - Optional API method to call for saving
   * 
   * Usage example:
   *   updateStudyData('ultimateGoal', 'New goal text', () => api.updateGoal('New goal text'))
   */
  const updateStudyData = useCallback((field, value, apiMethod) => {
    setStudyData(prev => {
      const previousValue = prev[field];
      // Optimistically update UI
      const newState = {
        ...prev,
        [field]: value
      };
      // Trigger debounced save with rollback capability
      debouncedUpdate(field, value, previousValue, apiMethod);
      return newState;
    });
  }, [debouncedUpdate]);

  /**
   * Optimistic update with immediate API call and rollback
   * 
   * This function is for operations that need immediate feedback (not debounced):
   * 1. Immediately applies optimistic update to UI
   * 2. Executes API call without debouncing
   * 3. Shows loading overlay during operation
   * 4. Automatically rolls back on failure with error message
   * 5. Syncs with server response if available
   * 
   * @param {Function} updateFn - Async function that performs the API call
   * @param {Function} optimisticUpdate - Function that takes prev state and returns new state
   * @param {Object} rollbackData - Optional previous state to rollback to (defaults to current state)
   * @returns {Promise} - Resolves with API response or rejects with error
   * 
   * Usage example:
   *   await updateWithOptimism(
   *     () => api.createAction(text, deadline),
   *     (prev) => ({ ...prev, shortTermActions: [...prev.shortTermActions, newAction] }),
   *     studyData
   *   )
   */
  const updateWithOptimism = useCallback(async (updateFn, optimisticUpdate, rollbackData) => {
    setOperationLoading(true);
    setError(null);
    
    // Store the previous state for rollback
    const previousState = rollbackData || studyData;
    
    // Apply optimistic update
    if (optimisticUpdate) {
      setStudyData(prev => optimisticUpdate(prev));
    }
    
    try {
      // Execute the API call
      const result = await updateFn();
      
      // If the API returns updated data, use it to sync state
      if (result && result.data) {
        setStudyData(prev => ({
          ...prev,
          ...result.data
        }));
      }
      
      return result;
    } catch (err) {
      console.error("Operation failed:", err);
      const errorMessage = getErrorMessage(err);
      setError(errorMessage);
      
      // Rollback to previous state
      setStudyData(previousState);
      
      // Clear error after 4 seconds
      setTimeout(() => setError(null), 4000);
      
      throw err; // Re-throw for component-level handling
    } finally {
      setOperationLoading(false);
    }
  }, [studyData, getErrorMessage]);

  // Handle date change for day calendar
  const handleDateChange = useCallback((date) => {
    setSelectedDate(date);
  }, []);

  // Handle session recorded - refresh data to update calendar
  const handleSessionRecorded = useCallback(() => {
    fetchStudyData();
  }, [fetchStudyData]);

  // Loading state (initial load only)
  if (loading) {
    return (
      <div className="study-companion-loading">
        <div className="loading-spinner"></div>
        <div>Loading Study Companion...</div>
      </div>
    );
  }

  return (
    <main className="study-companion" role="main" aria-label="Study Companion">
      {/* Global error banner */}
      {error && (
        <div className="study-companion-error-banner" role="alert" aria-live="assertive">
          <span className="error-icon" aria-hidden="true">⚠️</span>
          <span className="error-text">{error}</span>
        </div>
      )}
      
      {/* Saving indicator */}
      {savingState && (
        <div className={`study-companion-save-indicator ${savingState}`} role="status" aria-live="polite">
          {savingState === 'saving' && (
            <>
              <span className="save-spinner" aria-hidden="true"></span>
              <span>Saving...</span>
            </>
          )}
          {savingState === 'saved' && (
            <>
              <span className="save-icon" aria-hidden="true">✓</span>
              <span>Saved</span>
            </>
          )}
          {savingState === 'error' && (
            <>
              <span className="save-icon" aria-hidden="true">✗</span>
              <span>Save failed</span>
            </>
          )}
        </div>
      )}
      
      <div className="study-companion-grid" role="region" aria-label="Study companion workspace">
        {/* Left Panel (30%) */}
        <LeftPanel
          studyData={studyData}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          onUpdate={updateStudyData}
          updateWithOptimism={updateWithOptimism}
          operationLoading={operationLoading}
          api={api}
        />

        {/* Middle Panel (40%) */}
        <section className="study-companion-panel middle-panel" aria-label="Time tracker">
          <TimeTracker 
            onSessionRecorded={handleSessionRecorded}
            updateWithOptimism={updateWithOptimism}
            operationLoading={operationLoading}
          />
        </section>

        {/* Right Panel (30%) */}
        <RightPanel
          selectedDate={selectedDate}
          taskBlocks={studyData.taskBlocks}
          todos={studyData.todos}
          onUpdate={updateStudyData}
          updateWithOptimism={updateWithOptimism}
          operationLoading={operationLoading}
          api={api}
        />
      </div>
      
      {/* Operation loading overlay */}
      {operationLoading && (
        <div className="study-companion-operation-overlay" role="progressbar" aria-label="Loading" aria-busy="true">
          <div className="loading-spinner" aria-hidden="true"></div>
        </div>
      )}
    </main>
  );
}
