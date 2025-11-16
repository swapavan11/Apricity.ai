import express from 'express';
import { authenticateToken } from '../middleware/auth.js';
import User from '../models/User.js';

const router = express.Router();

// Apply authentication middleware to all routes
router.use(authenticateToken);

// GET /api/study-companion - Fetch all study companion data
router.get('/', async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('studyCompanion');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize studyCompanion if it doesn't exist
    if (!user.studyCompanion) {
      user.studyCompanion = {};
      await user.save();
    }

    res.json({
      success: true,
      data: user.studyCompanion
    });
  } catch (error) {
    console.error('Error fetching study companion data:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch study companion data'
    });
  }
});

// PATCH /api/study-companion/goal - Update ultimate goal
router.patch('/goal', async (req, res) => {
  try {
    const { ultimateGoal } = req.body;

    if (typeof ultimateGoal !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Ultimate goal must be a string'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize studyCompanion if it doesn't exist
    if (!user.studyCompanion) {
      user.studyCompanion = {};
    }

    user.studyCompanion.ultimateGoal = ultimateGoal;
    await user.save();

    res.json({
      success: true
    });
  } catch (error) {
    console.error('Error updating ultimate goal:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update ultimate goal'
    });
  }
});

// POST /api/study-companion/actions - Create short-term action
router.post('/actions', async (req, res) => {
  try {
    const { text, deadline } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Action text is required and must be a string'
      });
    }

    if (!deadline) {
      return res.status(400).json({
        success: false,
        message: 'Deadline is required'
      });
    }

    const deadlineDate = new Date(deadline);
    if (isNaN(deadlineDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid deadline date'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize studyCompanion if it doesn't exist
    if (!user.studyCompanion) {
      user.studyCompanion = {};
    }

    if (!user.studyCompanion.shortTermActions) {
      user.studyCompanion.shortTermActions = [];
    }

    const newAction = {
      text,
      deadline: deadlineDate,
      createdAt: new Date()
    };

    user.studyCompanion.shortTermActions.push(newAction);
    await user.save();

    // Get the created action with its ID
    const createdAction = user.studyCompanion.shortTermActions[user.studyCompanion.shortTermActions.length - 1];

    res.json({
      success: true,
      action: {
        id: createdAction._id,
        text: createdAction.text,
        deadline: createdAction.deadline,
        createdAt: createdAction.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating short-term action:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create short-term action'
    });
  }
});

// PATCH /api/study-companion/actions/:id - Update short-term action
router.patch('/actions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, deadline } = req.body;

    if (text !== undefined && typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Action text must be a string'
      });
    }

    if (deadline !== undefined) {
      const deadlineDate = new Date(deadline);
      if (isNaN(deadlineDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid deadline date'
        });
      }
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.studyCompanion || !user.studyCompanion.shortTermActions) {
      return res.status(404).json({
        success: false,
        message: 'Action not found'
      });
    }

    const action = user.studyCompanion.shortTermActions.id(id);
    
    if (!action) {
      return res.status(404).json({
        success: false,
        message: 'Action not found'
      });
    }

    if (text !== undefined) {
      action.text = text;
    }
    if (deadline !== undefined) {
      action.deadline = new Date(deadline);
    }

    await user.save();

    res.json({
      success: true
    });
  } catch (error) {
    console.error('Error updating short-term action:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update short-term action'
    });
  }
});

// DELETE /api/study-companion/actions/:id - Delete short-term action
router.delete('/actions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.studyCompanion || !user.studyCompanion.shortTermActions) {
      return res.status(404).json({
        success: false,
        message: 'Action not found'
      });
    }

    const action = user.studyCompanion.shortTermActions.id(id);
    
    if (!action) {
      return res.status(404).json({
        success: false,
        message: 'Action not found'
      });
    }

    action.deleteOne();
    await user.save();

    res.json({
      success: true
    });
  } catch (error) {
    console.error('Error deleting short-term action:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete short-term action'
    });
  }
});

// PATCH /api/study-companion/time-settings - Update time commitments
router.patch('/time-settings', async (req, res) => {
  try {
    const { estimatedTime, dailyCommitment } = req.body;

    // Validate estimatedTime if provided
    if (estimatedTime !== undefined) {
      if (typeof estimatedTime !== 'object' || estimatedTime === null) {
        return res.status(400).json({
          success: false,
          message: 'Estimated time must be an object'
        });
      }

      if (estimatedTime.hours !== undefined) {
        if (typeof estimatedTime.hours !== 'number' || estimatedTime.hours < 0) {
          return res.status(400).json({
            success: false,
            message: 'Estimated time hours must be a non-negative number'
          });
        }
      }

      if (estimatedTime.minutes !== undefined) {
        if (typeof estimatedTime.minutes !== 'number' || estimatedTime.minutes < 0 || estimatedTime.minutes > 59) {
          return res.status(400).json({
            success: false,
            message: 'Estimated time minutes must be a number between 0 and 59'
          });
        }
      }
    }

    // Validate dailyCommitment if provided
    if (dailyCommitment !== undefined) {
      if (typeof dailyCommitment !== 'object' || dailyCommitment === null) {
        return res.status(400).json({
          success: false,
          message: 'Daily commitment must be an object'
        });
      }

      if (dailyCommitment.hours !== undefined) {
        if (typeof dailyCommitment.hours !== 'number' || dailyCommitment.hours < 0) {
          return res.status(400).json({
            success: false,
            message: 'Daily commitment hours must be a non-negative number'
          });
        }
      }

      if (dailyCommitment.minutes !== undefined) {
        if (typeof dailyCommitment.minutes !== 'number' || dailyCommitment.minutes < 0 || dailyCommitment.minutes > 59) {
          return res.status(400).json({
            success: false,
            message: 'Daily commitment minutes must be a number between 0 and 59'
          });
        }
      }
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize studyCompanion if it doesn't exist
    if (!user.studyCompanion) {
      user.studyCompanion = {};
    }

    // Update estimatedTime if provided
    if (estimatedTime !== undefined) {
      if (!user.studyCompanion.estimatedTime) {
        user.studyCompanion.estimatedTime = { hours: 0, minutes: 0 };
      }
      if (estimatedTime.hours !== undefined) {
        user.studyCompanion.estimatedTime.hours = estimatedTime.hours;
      }
      if (estimatedTime.minutes !== undefined) {
        user.studyCompanion.estimatedTime.minutes = estimatedTime.minutes;
      }
    }

    // Update dailyCommitment if provided
    if (dailyCommitment !== undefined) {
      if (!user.studyCompanion.dailyCommitment) {
        user.studyCompanion.dailyCommitment = { hours: 0, minutes: 0 };
      }
      if (dailyCommitment.hours !== undefined) {
        user.studyCompanion.dailyCommitment.hours = dailyCommitment.hours;
      }
      if (dailyCommitment.minutes !== undefined) {
        user.studyCompanion.dailyCommitment.minutes = dailyCommitment.minutes;
      }
    }

    await user.save();

    res.json({
      success: true
    });
  } catch (error) {
    console.error('Error updating time settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update time settings'
    });
  }
});

// POST /api/study-companion/sessions - Record study session
router.post('/sessions', async (req, res) => {
  try {
    const { startTime, endTime, duration, mode } = req.body;

    // Validate required fields
    if (!startTime) {
      return res.status(400).json({
        success: false,
        message: 'Start time is required'
      });
    }

    if (!endTime) {
      return res.status(400).json({
        success: false,
        message: 'End time is required'
      });
    }

    if (duration === undefined || typeof duration !== 'number' || duration < 0) {
      return res.status(400).json({
        success: false,
        message: 'Duration must be a non-negative number'
      });
    }

    if (!mode || !['timer', 'stopwatch'].includes(mode)) {
      return res.status(400).json({
        success: false,
        message: 'Mode must be either "timer" or "stopwatch"'
      });
    }

    // Validate dates
    const startDate = new Date(startTime);
    const endDate = new Date(endTime);

    if (isNaN(startDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid start time'
      });
    }

    if (isNaN(endDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid end time'
      });
    }

    if (endDate < startDate) {
      return res.status(400).json({
        success: false,
        message: 'End time must be after start time'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize studyCompanion if it doesn't exist
    if (!user.studyCompanion) {
      user.studyCompanion = {};
    }

    if (!user.studyCompanion.studySessions) {
      user.studyCompanion.studySessions = [];
    }

    // Extract date in YYYY-MM-DD format from startTime
    const dateStr = startDate.toISOString().split('T')[0];

    const newSession = {
      startTime: startDate,
      endTime: endDate,
      duration,
      mode,
      date: dateStr
    };

    user.studyCompanion.studySessions.push(newSession);
    await user.save();

    // Get the created session with its ID
    const createdSession = user.studyCompanion.studySessions[user.studyCompanion.studySessions.length - 1];

    res.json({
      success: true,
      session: {
        id: createdSession._id,
        startTime: createdSession.startTime,
        endTime: createdSession.endTime,
        duration: createdSession.duration,
        mode: createdSession.mode,
        date: createdSession.date
      }
    });
  } catch (error) {
    console.error('Error recording study session:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record study session'
    });
  }
});

// GET /api/study-companion/sessions/aggregate - Get aggregated study hours
router.get('/sessions/aggregate', async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Validate date range if provided
    let start = null;
    let end = null;

    if (startDate) {
      start = new Date(startDate);
      if (isNaN(start.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid start date'
        });
      }
    }

    if (endDate) {
      end = new Date(endDate);
      if (isNaN(end.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid end date'
        });
      }
    }

    if (start && end && end < start) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    const user = await User.findById(req.user.id).select('studyCompanion.studySessions');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize empty result if no sessions
    if (!user.studyCompanion || !user.studyCompanion.studySessions) {
      return res.json({
        success: true,
        data: {}
      });
    }

    // Filter sessions by date range if provided
    let sessions = user.studyCompanion.studySessions;

    if (start || end) {
      sessions = sessions.filter(session => {
        const sessionDate = new Date(session.date);
        if (start && sessionDate < start) return false;
        if (end && sessionDate > end) return false;
        return true;
      });
    }

    // Aggregate hours by date
    const aggregated = {};
    sessions.forEach(session => {
      const date = session.date;
      const hours = session.duration / 3600; // Convert seconds to hours
      
      if (aggregated[date]) {
        aggregated[date] += hours;
      } else {
        aggregated[date] = hours;
      }
    });

    // Round to 2 decimal places
    Object.keys(aggregated).forEach(date => {
      aggregated[date] = Math.round(aggregated[date] * 100) / 100;
    });

    res.json({
      success: true,
      data: aggregated
    });
  } catch (error) {
    console.error('Error aggregating study sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to aggregate study sessions'
    });
  }
});

// POST /api/study-companion/task-blocks - Create task block
router.post('/task-blocks', async (req, res) => {
  try {
    const { date, startTime, endTime, title, color, link } = req.body;

    // Validate required fields
    if (!date || typeof date !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Date is required and must be a string in YYYY-MM-DD format'
      });
    }

    if (!startTime || typeof startTime !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Start time is required and must be a string in HH:mm format'
      });
    }

    if (!endTime || typeof endTime !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'End time is required and must be a string in HH:mm format'
      });
    }

    if (!title || typeof title !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Title is required and must be a string'
      });
    }

    // Validate optional fields
    if (color !== undefined && typeof color !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Color must be a string'
      });
    }

    if (link !== undefined && link !== null && typeof link !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Link must be a string'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize studyCompanion if it doesn't exist
    if (!user.studyCompanion) {
      user.studyCompanion = {};
    }

    if (!user.studyCompanion.taskBlocks) {
      user.studyCompanion.taskBlocks = [];
    }

    const newTaskBlock = {
      date,
      startTime,
      endTime,
      title,
      color: color || '#4facfe',
      link: link || null
    };

    user.studyCompanion.taskBlocks.push(newTaskBlock);
    await user.save();

    // Get the created task block with its ID
    const createdTaskBlock = user.studyCompanion.taskBlocks[user.studyCompanion.taskBlocks.length - 1];

    res.json({
      success: true,
      taskBlock: {
        id: createdTaskBlock._id,
        date: createdTaskBlock.date,
        startTime: createdTaskBlock.startTime,
        endTime: createdTaskBlock.endTime,
        title: createdTaskBlock.title,
        color: createdTaskBlock.color,
        link: createdTaskBlock.link
      }
    });
  } catch (error) {
    console.error('Error creating task block:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create task block'
    });
  }
});

// PATCH /api/study-companion/task-blocks/:id - Update task block
router.patch('/task-blocks/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { date, startTime, endTime, title, color, link } = req.body;

    // Validate optional fields if provided
    if (date !== undefined && typeof date !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Date must be a string in YYYY-MM-DD format'
      });
    }

    if (startTime !== undefined && typeof startTime !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Start time must be a string in HH:mm format'
      });
    }

    if (endTime !== undefined && typeof endTime !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'End time must be a string in HH:mm format'
      });
    }

    if (title !== undefined && typeof title !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Title must be a string'
      });
    }

    if (color !== undefined && typeof color !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Color must be a string'
      });
    }

    if (link !== undefined && link !== null && typeof link !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Link must be a string or null'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.studyCompanion || !user.studyCompanion.taskBlocks) {
      return res.status(404).json({
        success: false,
        message: 'Task block not found'
      });
    }

    const taskBlock = user.studyCompanion.taskBlocks.id(id);
    
    if (!taskBlock) {
      return res.status(404).json({
        success: false,
        message: 'Task block not found'
      });
    }

    // Update fields if provided
    if (date !== undefined) {
      taskBlock.date = date;
    }
    if (startTime !== undefined) {
      taskBlock.startTime = startTime;
    }
    if (endTime !== undefined) {
      taskBlock.endTime = endTime;
    }
    if (title !== undefined) {
      taskBlock.title = title;
    }
    if (color !== undefined) {
      taskBlock.color = color;
    }
    if (link !== undefined) {
      taskBlock.link = link;
    }

    await user.save();

    res.json({
      success: true
    });
  } catch (error) {
    console.error('Error updating task block:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update task block'
    });
  }
});

// DELETE /api/study-companion/task-blocks/:id - Delete task block
router.delete('/task-blocks/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.studyCompanion || !user.studyCompanion.taskBlocks) {
      return res.status(404).json({
        success: false,
        message: 'Task block not found'
      });
    }

    const taskBlock = user.studyCompanion.taskBlocks.id(id);
    
    if (!taskBlock) {
      return res.status(404).json({
        success: false,
        message: 'Task block not found'
      });
    }

    taskBlock.deleteOne();
    await user.save();

    res.json({
      success: true
    });
  } catch (error) {
    console.error('Error deleting task block:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete task block'
    });
  }
});

// POST /api/study-companion/todos - Create todo item
router.post('/todos', async (req, res) => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Todo text is required and must be a string'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Initialize studyCompanion if it doesn't exist
    if (!user.studyCompanion) {
      user.studyCompanion = {};
    }

    if (!user.studyCompanion.todos) {
      user.studyCompanion.todos = [];
    }

    const newTodo = {
      text,
      completed: false,
      createdAt: new Date()
    };

    user.studyCompanion.todos.push(newTodo);
    await user.save();

    // Get the created todo with its ID
    const createdTodo = user.studyCompanion.todos[user.studyCompanion.todos.length - 1];

    res.json({
      success: true,
      todo: {
        id: createdTodo._id,
        text: createdTodo.text,
        completed: createdTodo.completed,
        createdAt: createdTodo.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating todo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create todo'
    });
  }
});

// PATCH /api/study-companion/todos/:id - Update todo item
router.patch('/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, completed } = req.body;

    // Validate optional fields if provided
    if (text !== undefined && typeof text !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Todo text must be a string'
      });
    }

    if (completed !== undefined && typeof completed !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'Completed must be a boolean'
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.studyCompanion || !user.studyCompanion.todos) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    const todo = user.studyCompanion.todos.id(id);
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    // Update fields if provided
    if (text !== undefined) {
      todo.text = text;
    }
    if (completed !== undefined) {
      todo.completed = completed;
    }

    await user.save();

    res.json({
      success: true
    });
  } catch (error) {
    console.error('Error updating todo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update todo'
    });
  }
});

// DELETE /api/study-companion/todos/:id - Delete todo item
router.delete('/todos/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (!user.studyCompanion || !user.studyCompanion.todos) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    const todo = user.studyCompanion.todos.id(id);
    
    if (!todo) {
      return res.status(404).json({
        success: false,
        message: 'Todo not found'
      });
    }

    todo.deleteOne();
    await user.save();

    res.json({
      success: true
    });
  } catch (error) {
    console.error('Error deleting todo:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete todo'
    });
  }
});

export default router;
