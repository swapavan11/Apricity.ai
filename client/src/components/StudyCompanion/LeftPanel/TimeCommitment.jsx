import { useState, useEffect, memo, useCallback } from "react";
import ErrorMessage from "../ErrorMessage";
import { validateTimeInput } from "../utils/validation";

function TimeCommitment({ estimatedTime, dailyCommitment, onUpdate }) {
  const [localEstimatedTime, setLocalEstimatedTime] = useState({
    hours: estimatedTime?.hours || 0,
    minutes: estimatedTime?.minutes || 0
  });
  
  const [localDailyCommitment, setLocalDailyCommitment] = useState({
    hours: dailyCommitment?.hours || 0,
    minutes: dailyCommitment?.minutes || 0
  });

  const [validationError, setValidationError] = useState(null);

  // Sync with parent props
  useEffect(() => {
    setLocalEstimatedTime({
      hours: estimatedTime?.hours || 0,
      minutes: estimatedTime?.minutes || 0
    });
  }, [estimatedTime]);

  useEffect(() => {
    setLocalDailyCommitment({
      hours: dailyCommitment?.hours || 0,
      minutes: dailyCommitment?.minutes || 0
    });
  }, [dailyCommitment]);

  // Handle estimated time changes
  const handleEstimatedHoursChange = (e) => {
    const value = Math.max(0, parseInt(e.target.value) || 0);
    const updated = { ...localEstimatedTime, hours: value };
    setLocalEstimatedTime(updated);
    onUpdate('estimatedTime', updated);
  };

  const handleEstimatedMinutesChange = (e) => {
    let value = Math.max(0, parseInt(e.target.value) || 0);
    // Ensure minutes are between 0-59
    value = Math.min(59, value);
    const updated = { ...localEstimatedTime, minutes: value };
    setLocalEstimatedTime(updated);
    onUpdate('estimatedTime', updated);
  };

  // Handle daily commitment changes
  const handleDailyHoursChange = (e) => {
    const value = Math.max(0, parseInt(e.target.value) || 0);
    const updated = { ...localDailyCommitment, hours: value };
    
    // Validate
    const validation = validateTimeInput(updated.hours, updated.minutes);
    if (!validation.isValid) {
      setValidationError(validation.error);
    } else {
      setValidationError(null);
    }
    
    setLocalDailyCommitment(updated);
    onUpdate('dailyCommitment', updated);
  };

  const handleDailyMinutesChange = (e) => {
    let value = Math.max(0, parseInt(e.target.value) || 0);
    // Ensure minutes are between 0-59
    value = Math.min(59, value);
    const updated = { ...localDailyCommitment, minutes: value };
    
    // Validate
    const validation = validateTimeInput(updated.hours, updated.minutes);
    if (!validation.isValid) {
      setValidationError(validation.error);
    } else {
      setValidationError(null);
    }
    
    setLocalDailyCommitment(updated);
    onUpdate('dailyCommitment', updated);
  };

  return (
    <div className="study-section time-commitment">
      <h3 id="time-commitment-heading">Time Settings</h3>

      {validationError && (
        <ErrorMessage 
          message={validationError} 
          type="warning"
          onDismiss={() => setValidationError(null)}
        />
      )}

      {/* Estimated Time for Long-term Goal */}
      <div className="time-input-section">
        <label htmlFor="estimated-hours" className="time-label">
          Estimated Time for Long-term Goal
        </label>
        <div className="time-input-group" role="group" aria-label="Estimated time for long-term goal">
          <div className="time-input-wrapper">
            <input
              id="estimated-hours"
              type="number"
              min="0"
              value={localEstimatedTime.hours}
              onChange={handleEstimatedHoursChange}
              aria-label="Estimated hours"
              className="time-input"
            />
            <span className="time-unit">hours</span>
          </div>
          <div className="time-input-wrapper">
            <input
              id="estimated-minutes"
              type="number"
              min="0"
              max="59"
              value={localEstimatedTime.minutes}
              onChange={handleEstimatedMinutesChange}
              aria-label="Estimated minutes"
              className="time-input"
            />
            <span className="time-unit">minutes</span>
          </div>
        </div>
      </div>

      {/* Daily Time Commitment */}
      <div className="time-input-section">
        <label htmlFor="daily-hours" className="time-label">
          Daily Time Commitment
        </label>
        <div className="time-input-group" role="group" aria-label="Daily time commitment">
          <div className="time-input-wrapper">
            <input
              id="daily-hours"
              type="number"
              min="0"
              value={localDailyCommitment.hours}
              onChange={handleDailyHoursChange}
              aria-label="Daily commitment hours"
              className="time-input"
            />
            <span className="time-unit">hours</span>
          </div>
          <div className="time-input-wrapper">
            <input
              id="daily-minutes"
              type="number"
              min="0"
              max="59"
              value={localDailyCommitment.minutes}
              onChange={handleDailyMinutesChange}
              aria-label="Daily commitment minutes"
              className="time-input"
            />
            <span className="time-unit">minutes</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(TimeCommitment);
