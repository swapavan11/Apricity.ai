/**
 * Validation Utilities for Study Companion
 * 
 * Provides validation functions for form inputs with consistent error messages.
 */

/**
 * Validate time input (hours and minutes)
 * @param {number} hours - Hours value
 * @param {number} minutes - Minutes value
 * @returns {Object} - { isValid: boolean, error: string }
 */
export const validateTimeInput = (hours, minutes) => {
  // Check if values are numbers
  if (isNaN(hours) || isNaN(minutes)) {
    return {
      isValid: false,
      error: 'Please enter valid numbers for time'
    };
  }

  // Check for negative values
  if (hours < 0 || minutes < 0) {
    return {
      isValid: false,
      error: 'Time values cannot be negative'
    };
  }

  // Check minutes range
  if (minutes > 59) {
    return {
      isValid: false,
      error: 'Minutes must be between 0 and 59'
    };
  }

  // Check for unrealistic values (more than 24 hours per day)
  if (hours > 24) {
    return {
      isValid: false,
      error: 'Daily commitment cannot exceed 24 hours'
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate action text
 * @param {string} text - Action text
 * @returns {Object} - { isValid: boolean, error: string }
 */
export const validateActionText = (text) => {
  if (!text || text.trim().length === 0) {
    return {
      isValid: false,
      error: 'Action text cannot be empty'
    };
  }

  if (text.length > 200) {
    return {
      isValid: false,
      error: 'Action text must be less than 200 characters'
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate deadline date
 * @param {string} deadline - ISO date string
 * @returns {Object} - { isValid: boolean, error: string }
 */
export const validateDeadline = (deadline) => {
  if (!deadline) {
    return {
      isValid: false,
      error: 'Please select a deadline date'
    };
  }

  const deadlineDate = new Date(deadline);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (isNaN(deadlineDate.getTime())) {
    return {
      isValid: false,
      error: 'Invalid date format'
    };
  }

  // Allow today and future dates
  if (deadlineDate < today) {
    return {
      isValid: false,
      error: 'Deadline cannot be in the past'
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate task block
 * @param {Object} taskBlock - Task block object
 * @returns {Object} - { isValid: boolean, error: string }
 */
export const validateTaskBlock = (taskBlock) => {
  if (!taskBlock.title || taskBlock.title.trim().length === 0) {
    return {
      isValid: false,
      error: 'Task title cannot be empty'
    };
  }

  if (taskBlock.title.length > 100) {
    return {
      isValid: false,
      error: 'Task title must be less than 100 characters'
    };
  }

  if (!taskBlock.startTime || !taskBlock.endTime) {
    return {
      isValid: false,
      error: 'Please select start and end times'
    };
  }

  // Validate time format (HH:mm)
  const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
  if (!timeRegex.test(taskBlock.startTime) || !timeRegex.test(taskBlock.endTime)) {
    return {
      isValid: false,
      error: 'Invalid time format'
    };
  }

  // Check that end time is after start time
  const [startHour, startMin] = taskBlock.startTime.split(':').map(Number);
  const [endHour, endMin] = taskBlock.endTime.split(':').map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = endHour * 60 + endMin;

  if (endMinutes <= startMinutes) {
    return {
      isValid: false,
      error: 'End time must be after start time'
    };
  }

  // Validate link if provided
  if (taskBlock.link && taskBlock.link.trim().length > 0) {
    try {
      new URL(taskBlock.link);
    } catch (e) {
      return {
        isValid: false,
        error: 'Please enter a valid URL'
      };
    }
  }

  return { isValid: true, error: null };
};

/**
 * Validate todo text
 * @param {string} text - Todo text
 * @returns {Object} - { isValid: boolean, error: string }
 */
export const validateTodoText = (text) => {
  if (!text || text.trim().length === 0) {
    return {
      isValid: false,
      error: 'Todo text cannot be empty'
    };
  }

  if (text.length > 200) {
    return {
      isValid: false,
      error: 'Todo text must be less than 200 characters'
    };
  }

  return { isValid: true, error: null };
};

/**
 * Validate timer duration
 * @param {Object} duration - { hours, minutes, seconds }
 * @returns {Object} - { isValid: boolean, error: string }
 */
export const validateTimerDuration = (duration) => {
  const { hours, minutes, seconds } = duration;

  if (isNaN(hours) || isNaN(minutes) || isNaN(seconds)) {
    return {
      isValid: false,
      error: 'Please enter valid numbers'
    };
  }

  if (hours < 0 || minutes < 0 || seconds < 0) {
    return {
      isValid: false,
      error: 'Time values cannot be negative'
    };
  }

  if (minutes > 59 || seconds > 59) {
    return {
      isValid: false,
      error: 'Minutes and seconds must be between 0 and 59'
    };
  }

  const totalSeconds = hours * 3600 + minutes * 60 + seconds;
  if (totalSeconds === 0) {
    return {
      isValid: false,
      error: 'Timer duration must be greater than 0'
    };
  }

  if (totalSeconds > 86400) { // 24 hours
    return {
      isValid: false,
      error: 'Timer duration cannot exceed 24 hours'
    };
  }

  return { isValid: true, error: null };
};
