/**
 * Data Verification Utilities for Study Companion
 * 
 * These utilities help verify data persistence and consistency
 * across page refreshes and multiple sessions.
 */

/**
 * Verify that study data structure is valid
 * @param {Object} data - Study companion data
 * @returns {Object} - { valid: boolean, errors: string[] }
 */
export function verifyDataStructure(data) {
  const errors = [];

  if (!data || typeof data !== 'object') {
    errors.push('Data must be an object');
    return { valid: false, errors };
  }

  // Check ultimateGoal
  if (data.ultimateGoal !== undefined && typeof data.ultimateGoal !== 'string') {
    errors.push('ultimateGoal must be a string');
  }

  // Check shortTermActions
  if (data.shortTermActions !== undefined) {
    if (!Array.isArray(data.shortTermActions)) {
      errors.push('shortTermActions must be an array');
    } else {
      data.shortTermActions.forEach((action, index) => {
        if (!action.text || typeof action.text !== 'string') {
          errors.push(`shortTermActions[${index}].text is required and must be a string`);
        }
        if (!action.deadline) {
          errors.push(`shortTermActions[${index}].deadline is required`);
        }
      });
    }
  }

  // Check time settings
  if (data.estimatedTime !== undefined) {
    if (typeof data.estimatedTime !== 'object') {
      errors.push('estimatedTime must be an object');
    } else {
      if (typeof data.estimatedTime.hours !== 'number' || data.estimatedTime.hours < 0) {
        errors.push('estimatedTime.hours must be a non-negative number');
      }
      if (typeof data.estimatedTime.minutes !== 'number' || data.estimatedTime.minutes < 0 || data.estimatedTime.minutes > 59) {
        errors.push('estimatedTime.minutes must be a number between 0 and 59');
      }
    }
  }

  if (data.dailyCommitment !== undefined) {
    if (typeof data.dailyCommitment !== 'object') {
      errors.push('dailyCommitment must be an object');
    } else {
      if (typeof data.dailyCommitment.hours !== 'number' || data.dailyCommitment.hours < 0) {
        errors.push('dailyCommitment.hours must be a non-negative number');
      }
      if (typeof data.dailyCommitment.minutes !== 'number' || data.dailyCommitment.minutes < 0 || data.dailyCommitment.minutes > 59) {
        errors.push('dailyCommitment.minutes must be a number between 0 and 59');
      }
    }
  }

  // Check studySessions
  if (data.studySessions !== undefined) {
    if (!Array.isArray(data.studySessions)) {
      errors.push('studySessions must be an array');
    } else {
      data.studySessions.forEach((session, index) => {
        if (!session.startTime) {
          errors.push(`studySessions[${index}].startTime is required`);
        }
        if (!session.endTime) {
          errors.push(`studySessions[${index}].endTime is required`);
        }
        if (typeof session.duration !== 'number' || session.duration < 0) {
          errors.push(`studySessions[${index}].duration must be a non-negative number`);
        }
      });
    }
  }

  // Check taskBlocks
  if (data.taskBlocks !== undefined) {
    if (!Array.isArray(data.taskBlocks)) {
      errors.push('taskBlocks must be an array');
    } else {
      data.taskBlocks.forEach((task, index) => {
        if (!task.date) {
          errors.push(`taskBlocks[${index}].date is required`);
        }
        if (!task.startTime) {
          errors.push(`taskBlocks[${index}].startTime is required`);
        }
        if (!task.endTime) {
          errors.push(`taskBlocks[${index}].endTime is required`);
        }
        if (!task.title || typeof task.title !== 'string') {
          errors.push(`taskBlocks[${index}].title is required and must be a string`);
        }
      });
    }
  }

  // Check todos
  if (data.todos !== undefined) {
    if (!Array.isArray(data.todos)) {
      errors.push('todos must be an array');
    } else {
      data.todos.forEach((todo, index) => {
        if (!todo.text || typeof todo.text !== 'string') {
          errors.push(`todos[${index}].text is required and must be a string`);
        }
        if (typeof todo.completed !== 'boolean') {
          errors.push(`todos[${index}].completed must be a boolean`);
        }
      });
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Sanitize and normalize study data
 * @param {Object} data - Raw study companion data
 * @returns {Object} - Sanitized data
 */
export function sanitizeStudyData(data) {
  if (!data || typeof data !== 'object') {
    return getDefaultStudyData();
  }

  return {
    ultimateGoal: typeof data.ultimateGoal === 'string' ? data.ultimateGoal : '',
    shortTermActions: Array.isArray(data.shortTermActions) ? data.shortTermActions : [],
    estimatedTime: {
      hours: typeof data.estimatedTime?.hours === 'number' ? Math.max(0, data.estimatedTime.hours) : 0,
      minutes: typeof data.estimatedTime?.minutes === 'number' ? Math.max(0, Math.min(59, data.estimatedTime.minutes)) : 0
    },
    dailyCommitment: {
      hours: typeof data.dailyCommitment?.hours === 'number' ? Math.max(0, data.dailyCommitment.hours) : 0,
      minutes: typeof data.dailyCommitment?.minutes === 'number' ? Math.max(0, Math.min(59, data.dailyCommitment.minutes)) : 0
    },
    studySessions: Array.isArray(data.studySessions) ? data.studySessions : [],
    taskBlocks: Array.isArray(data.taskBlocks) ? data.taskBlocks : [],
    todos: Array.isArray(data.todos) ? data.todos : []
  };
}

/**
 * Get default study data structure
 * @returns {Object} - Default study data
 */
export function getDefaultStudyData() {
  return {
    ultimateGoal: '',
    shortTermActions: [],
    estimatedTime: { hours: 0, minutes: 0 },
    dailyCommitment: { hours: 0, minutes: 0 },
    studySessions: [],
    taskBlocks: [],
    todos: []
  };
}

/**
 * Compare two data objects to detect changes
 * @param {Object} oldData - Previous data
 * @param {Object} newData - New data
 * @returns {Object} - { hasChanges: boolean, changes: string[] }
 */
export function detectDataChanges(oldData, newData) {
  const changes = [];

  if (oldData.ultimateGoal !== newData.ultimateGoal) {
    changes.push('ultimateGoal');
  }

  if (JSON.stringify(oldData.shortTermActions) !== JSON.stringify(newData.shortTermActions)) {
    changes.push('shortTermActions');
  }

  if (JSON.stringify(oldData.estimatedTime) !== JSON.stringify(newData.estimatedTime)) {
    changes.push('estimatedTime');
  }

  if (JSON.stringify(oldData.dailyCommitment) !== JSON.stringify(newData.dailyCommitment)) {
    changes.push('dailyCommitment');
  }

  if (JSON.stringify(oldData.studySessions) !== JSON.stringify(newData.studySessions)) {
    changes.push('studySessions');
  }

  if (JSON.stringify(oldData.taskBlocks) !== JSON.stringify(newData.taskBlocks)) {
    changes.push('taskBlocks');
  }

  if (JSON.stringify(oldData.todos) !== JSON.stringify(newData.todos)) {
    changes.push('todos');
  }

  return {
    hasChanges: changes.length > 0,
    changes
  };
}

/**
 * Verify data persistence by comparing with server
 * @param {Function} fetchFn - Function to fetch data from server
 * @param {Object} localData - Local data to compare
 * @returns {Promise<Object>} - { consistent: boolean, differences: string[] }
 */
export async function verifyDataPersistence(fetchFn, localData) {
  try {
    const response = await fetchFn();
    
    if (!response.success || !response.data) {
      return {
        consistent: false,
        differences: ['Failed to fetch server data']
      };
    }

    const serverData = response.data;
    const { hasChanges, changes } = detectDataChanges(localData, serverData);

    return {
      consistent: !hasChanges,
      differences: changes
    };
  } catch (error) {
    return {
      consistent: false,
      differences: [`Error verifying persistence: ${error.message}`]
    };
  }
}

/**
 * Log data operation for debugging
 * @param {string} operation - Operation name
 * @param {Object} data - Data involved
 * @param {boolean} success - Whether operation succeeded
 */
export function logDataOperation(operation, data, success) {
  if (process.env.NODE_ENV === 'development') {
    const timestamp = new Date().toISOString();
    const status = success ? '✓' : '✗';
    console.log(`[${timestamp}] ${status} ${operation}:`, data);
  }
}
