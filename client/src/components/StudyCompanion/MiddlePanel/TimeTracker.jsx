import { useState, useEffect, useRef, memo, useCallback, useMemo } from "react";
import useApi from "../../../api/useApi";

function TimeTracker({ onSessionRecorded }) {
  const api = useApi();
  
  // Mode: 'timer' or 'stopwatch'
  const [mode, setMode] = useState('timer');
  const [isRunning, setIsRunning] = useState(false);
  const [time, setTime] = useState(0); // seconds
  const [sessionStartTime, setSessionStartTime] = useState(null);
  
  // Timer settings
  const [timerDuration, setTimerDuration] = useState({ hours: 0, minutes: 25, seconds: 0 });
  
  // Refs for interval
  const intervalRef = useRef(null);

  // Calculate total seconds from timer duration
  const getTotalSeconds = (duration) => {
    return duration.hours * 3600 + duration.minutes * 60 + duration.seconds;
  };

  // Format time as HH:MM:SS
  const formatTime = (totalSeconds) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  // Handle start button
  const handleStart = () => {
    const startTime = new Date();
    setSessionStartTime(startTime);
    setIsRunning(true);
    
    if (mode === 'timer' && time === 0) {
      // Initialize timer with set duration
      setTime(getTotalSeconds(timerDuration));
    }
  };

  // Handle pause button
  const handlePause = () => {
    setIsRunning(false);
  };

  // Handle stop button - records session
  const handleStop = async () => {
    setIsRunning(false);
    
    if (sessionStartTime) {
      const endTime = new Date();
      const duration = Math.floor((endTime - sessionStartTime) / 1000); // seconds
      
      try {
        // Record session to database
        await api.recordStudySession({
          startTime: sessionStartTime.toISOString(),
          endTime: endTime.toISOString(),
          duration: duration,
          mode: mode,
          date: sessionStartTime.toISOString().split('T')[0] // YYYY-MM-DD
        });
        
        // Notify parent to refresh data
        if (onSessionRecorded) {
          onSessionRecorded();
        }
      } catch (err) {
        console.error("Failed to record study session:", err);
      }
    }
    
    // Reset state
    setSessionStartTime(null);
    setTime(0);
  };

  // Timer/Stopwatch interval effect
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setTime(prevTime => {
          if (mode === 'timer') {
            // Countdown
            const newTime = prevTime - 1;
            if (newTime <= 0) {
              // Timer completed
              setIsRunning(false);
              playNotificationSound();
              return 0;
            }
            return newTime;
          } else {
            // Stopwatch - count up
            return prevTime + 1;
          }
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isRunning, mode]);

  // Handle mode change
  const handleModeChange = (newMode) => {
    if (isRunning) return; // Don't allow mode change while running
    setMode(newMode);
    setTime(0);
    setSessionStartTime(null);
  };

  // Handle timer duration change
  const handleDurationChange = (field, value) => {
    const numValue = parseInt(value) || 0;
    setTimerDuration(prev => ({
      ...prev,
      [field]: Math.max(0, numValue)
    }));
  };

  // Calculate progress percentage for circular indicator
  const getProgress = () => {
    if (mode === 'timer') {
      const total = getTotalSeconds(timerDuration);
      if (total === 0) return 0;
      return ((total - time) / total) * 100;
    }
    // For stopwatch, no progress indicator needed
    return 0;
  };

  // Play notification sound using Web Audio API
  const playNotificationSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window).webkitAudioContext;
      const audioContext = new AudioContextClass();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // Frequency in Hz
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (err) {
      console.error("Failed to play notification sound:", err);
    }
  };

  return (
    <div className="time-tracker">
      {/* Mode Toggle */}
      <div className="mode-toggle" role="tablist" aria-label="Timer mode selection">
        <button
          className={mode === 'timer' ? 'active' : ''}
          onClick={() => handleModeChange('timer')}
          disabled={isRunning}
          role="tab"
          aria-selected={mode === 'timer'}
          aria-controls="timer-panel"
          aria-label="Timer mode"
        >
          Timer
        </button>
        <button
          className={mode === 'stopwatch' ? 'active' : ''}
          onClick={() => handleModeChange('stopwatch')}
          disabled={isRunning}
          role="tab"
          aria-selected={mode === 'stopwatch'}
          aria-controls="stopwatch-panel"
          aria-label="Stopwatch mode"
        >
          Stopwatch
        </button>
      </div>

      {/* Timer Settings (only show when timer mode and not running) */}
      {mode === 'timer' && !isRunning && time === 0 && (
        <div className="timer-settings" role="group" aria-label="Timer duration settings">
          <h3>Set Duration</h3>
          <div className="timer-settings-inputs">
            <div className="time-input-wrapper">
              <input
                type="number"
                className="time-input"
                value={timerDuration.hours}
                onChange={(e) => handleDurationChange('hours', e.target.value)}
                min="0"
                max="23"
                aria-label="Hours"
              />
              <span className="time-unit" aria-hidden="true">h</span>
            </div>
            <div className="time-input-wrapper">
              <input
                type="number"
                className="time-input"
                value={timerDuration.minutes}
                onChange={(e) => handleDurationChange('minutes', e.target.value)}
                min="0"
                max="59"
                aria-label="Minutes"
              />
              <span className="time-unit" aria-hidden="true">m</span>
            </div>
            <div className="time-input-wrapper">
              <input
                type="number"
                className="time-input"
                value={timerDuration.seconds}
                onChange={(e) => handleDurationChange('seconds', e.target.value)}
                min="0"
                max="59"
                aria-label="Seconds"
              />
              <span className="time-unit" aria-hidden="true">s</span>
            </div>
          </div>
        </div>
      )}

      {/* Timer Display with Circular Progress */}
      <div className="timer-display" role="timer" aria-live="polite" aria-atomic="true">
        {/* Circular Progress Indicator (only for timer mode) */}
        {mode === 'timer' && (
          <svg className="timer-circle" viewBox="0 0 100 100" aria-hidden="true">
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--border)"
              strokeWidth="4"
            />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="var(--accent)"
              strokeWidth="4"
              strokeDasharray={`${2 * Math.PI * 45}`}
              strokeDashoffset={`${2 * Math.PI * 45 * (1 - getProgress() / 100)}`}
              strokeLinecap="round"
              transform="rotate(-90 50 50)"
              style={{ transition: 'stroke-dashoffset 1s linear' }}
            />
          </svg>
        )}
        
        {/* Time Display */}
        <div className="timer-time" aria-label={`${mode === 'timer' ? 'Time remaining' : 'Elapsed time'}: ${formatTime(time)}`}>
          {formatTime(time)}
        </div>
      </div>

      {/* Controls */}
      <div className="timer-controls" role="group" aria-label="Timer controls">
        {!isRunning ? (
          <button 
            className="btn-primary" 
            onClick={handleStart}
            aria-label={`Start ${mode}`}
          >
            Start
          </button>
        ) : (
          <button 
            className="btn-secondary" 
            onClick={handlePause}
            aria-label={`Pause ${mode}`}
          >
            Pause
          </button>
        )}
        <button 
          className="btn-secondary" 
          onClick={handleStop}
          disabled={!sessionStartTime}
          aria-label={`Stop ${mode} and record session`}
        >
          Stop
        </button>
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(TimeTracker);
