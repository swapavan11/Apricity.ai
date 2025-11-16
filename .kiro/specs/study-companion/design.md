# Design Document

## Overview

The Study Companion is a comprehensive productivity feature that integrates goal management, time tracking, calendar scheduling, and task management into a single cohesive interface. The system is designed to help students organize their study activities, track progress, and maintain focus on their academic goals.

The feature will be accessible from the main navigation bar and will present a three-panel layout optimized for desktop use. All data will be persisted to MongoDB and associated with the authenticated user's account, ensuring cross-device accessibility and data consistency.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      Navigation Bar                          │
│  Home | Learning Space | Dashboard | Study Companion         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Study Companion Page                       │
│  ┌──────────┬────────────────┬──────────────────────────┐  │
│  │  Left    │     Middle     │         Right            │  │
│  │  Panel   │     Panel      │         Panel            │  │
│  │  (30%)   │     (40%)      │         (30%)            │  │
│  │          │                │                          │  │
│  │ Goals &  │  Timer/        │  Day Calendar &          │  │
│  │ Calendar │  Stopwatch     │  To-Do List              │  │
│  └──────────┴────────────────┴──────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend API Layer                         │
│  /api/study-companion/*                                      │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                      MongoDB Database                        │
│  User Collection (with studyCompanion subdocument)           │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- React 18.3.1 with functional components and hooks
- React Router DOM 6.26.2 for navigation
- Axios 1.12.2 for API calls
- CSS with CSS variables for theming (matching existing dark/light theme system)

**Backend:**
- Express.js 4.19.2
- Mongoose 8.6.2 for MongoDB ODM
- JWT authentication (existing passport-jwt setup)
- Express-async-errors for error handling

**Database:**
- MongoDB with Mongoose schemas
- Embedded subdocuments for study companion data within User model

## Components and Interfaces

### Frontend Component Structure

```
StudyCompanion/
├── StudyCompanion.jsx          # Main container component
├── LeftPanel/
│   ├── GoalSection.jsx         # Ultimate goal and short-term actions
│   ├── TimeCommitment.jsx      # Time settings
│   └── StudyCalendar.jsx       # Monthly calendar with study hours
├── MiddlePanel/
│   └── TimeTracker.jsx         # Timer/Stopwatch with mode toggle
├── RightPanel/
│   ├── DayCalendar.jsx         # 24-hour scheduling view
│   └── TodoList.jsx            # Collapsible to-do list
└── styles/
    └── StudyCompanion.css      # Component-specific styles
```

### Component Specifications

#### 1. StudyCompanion.jsx (Main Container)

**Purpose:** Root component that manages global state and layout

**State Management:**
```javascript
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
```

**Key Functions:**
- `fetchStudyData()` - Load all study companion data on mount
- `updateStudyData(field, value)` - Debounced update function for auto-save
- `handleDateChange(date)` - Update selected date for day calendar

**Layout:**
```jsx
<div className="study-companion">
  <div className="study-companion-grid">
    <LeftPanel 
      goalData={studyData}
      onUpdate={updateStudyData}
      selectedDate={selectedDate}
      onDateChange={handleDateChange}
    />
    <MiddlePanel 
      onSessionStart={handleSessionStart}
      onSessionEnd={handleSessionEnd}
    />
    <RightPanel 
      selectedDate={selectedDate}
      taskBlocks={studyData.taskBlocks}
      todos={studyData.todos}
      onUpdate={updateStudyData}
    />
  </div>
</div>
```

#### 2. GoalSection.jsx

**Purpose:** Manage ultimate goal and short-term actions

**Props:**
- `ultimateGoal: string`
- `shortTermActions: Array<{id, text, deadline, createdAt}>`
- `onUpdate: (field, value) => void`

**Features:**
- Textarea for ultimate goal with auto-resize
- List of short-term actions with add/edit/delete capabilities
- Date picker for action deadlines
- Visual indicators for approaching/overdue deadlines

**UI Structure:**
```jsx
<div className="goal-section">
  <div className="ultimate-goal">
    <label>Ultimate Goal</label>
    <textarea 
      value={ultimateGoal}
      onChange={(e) => onUpdate('ultimateGoal', e.target.value)}
      placeholder="What's your long-term objective?"
    />
  </div>
  
  <div className="short-term-actions">
    <h3>Short-term Actions</h3>
    <div className="action-list">
      {shortTermActions.map(action => (
        <ActionItem key={action.id} action={action} onUpdate={onUpdate} />
      ))}
    </div>
    <button onClick={addAction}>+ Add Action</button>
  </div>
</div>
```

#### 3. TimeCommitment.jsx

**Purpose:** Set estimated time and daily commitment

**Props:**
- `estimatedTime: {hours, minutes}`
- `dailyCommitment: {hours, minutes}`
- `onUpdate: (field, value) => void`

**Features:**
- Number inputs for hours and minutes
- Validation to prevent negative values
- Visual feedback for realistic vs. unrealistic commitments

#### 4. StudyCalendar.jsx

**Purpose:** Display monthly calendar with study hours per day

**Props:**
- `selectedDate: Date`
- `onDateChange: (date) => void`
- `studyHours: Map<dateString, hours>` - Aggregated study hours per day

**Features:**
- Month/year navigation
- Highlight current date
- Display study hours label below each date
- Click to select date (updates day calendar)
- Color-coded indicators based on daily commitment achievement

**Data Flow:**
- Receives aggregated study hours from parent
- Parent calculates hours from studySessions array
- Updates selectedDate when user clicks a date

#### 5. TimeTracker.jsx

**Purpose:** Timer and stopwatch for tracking study sessions

**State:**
```javascript
const [mode, setMode] = useState('timer'); // 'timer' | 'stopwatch'
const [isRunning, setIsRunning] = useState(false);
const [time, setTime] = useState(0); // seconds
const [timerDuration, setTimerDuration] = useState({ hours: 0, minutes: 25, seconds: 0 });
const [sessionStartTime, setSessionStartTime] = useState(null);
```

**Features:**
- Toggle between timer and stopwatch modes
- Timer: countdown from set duration
- Stopwatch: count up from zero
- Start/Pause/Stop controls
- Visual progress indicator (circular progress bar)
- Audio notification when timer completes
- Automatic session recording to database

**Session Recording:**
```javascript
const handleStart = () => {
  const startTime = new Date();
  setSessionStartTime(startTime);
  setIsRunning(true);
  // Start interval for UI updates
};

const handleStop = async () => {
  const endTime = new Date();
  const duration = (endTime - sessionStartTime) / 1000; // seconds
  
  await onSessionEnd({
    startTime: sessionStartTime,
    endTime: endTime,
    duration: duration,
    mode: mode
  });
  
  setIsRunning(false);
  setSessionStartTime(null);
  // Reset timer/stopwatch
};
```

#### 6. DayCalendar.jsx

**Purpose:** 24-hour scheduling interface with drag-and-drop

**Props:**
- `selectedDate: Date`
- `taskBlocks: Array<TaskBlock>`
- `onUpdate: (field, value) => void`

**TaskBlock Interface:**
```typescript
interface TaskBlock {
  id: string;
  date: string; // ISO date string
  startTime: string; // "HH:mm"
  endTime: string; // "HH:mm"
  title: string;
  color: string; // hex color
  link?: string;
}
```

**Features:**
- Vertical time slots (00:00 - 23:59) with 15-minute granularity
- Click to create new task block
- Drag to reposition task blocks
- Resize handles for adjusting duration
- Color picker for task categorization
- Optional link attachment with icon indicator
- Handle overlapping tasks (side-by-side layout)

**Overlap Handling:**
```javascript
const calculateTaskLayout = (tasks) => {
  // Sort tasks by start time
  const sorted = [...tasks].sort((a, b) => 
    timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
  );
  
  // Group overlapping tasks
  const groups = [];
  sorted.forEach(task => {
    const overlapping = groups.find(group => 
      group.some(t => tasksOverlap(t, task))
    );
    
    if (overlapping) {
      overlapping.push(task);
    } else {
      groups.push([task]);
    }
  });
  
  // Calculate width and offset for each task
  return groups.flatMap(group => 
    group.map((task, index) => ({
      ...task,
      width: `${100 / group.length}%`,
      left: `${(100 / group.length) * index}%`
    }))
  );
};
```

**Task Creation Modal:**
```jsx
<Modal isOpen={isCreating} onClose={closeModal}>
  <h3>New Task</h3>
  <input 
    type="text" 
    placeholder="Task title"
    value={newTask.title}
    onChange={(e) => setNewTask({...newTask, title: e.target.value})}
  />
  <div className="time-inputs">
    <input type="time" value={newTask.startTime} onChange={...} />
    <input type="time" value={newTask.endTime} onChange={...} />
  </div>
  <ColorPicker 
    value={newTask.color}
    onChange={(color) => setNewTask({...newTask, color})}
  />
  <input 
    type="url" 
    placeholder="Optional link"
    value={newTask.link}
    onChange={(e) => setNewTask({...newTask, link: e.target.value})}
  />
  <button onClick={handleCreateTask}>Create</button>
</Modal>
```

#### 7. TodoList.jsx

**Purpose:** Collapsible task list for non-time-specific items

**Props:**
- `todos: Array<Todo>`
- `onUpdate: (field, value) => void`

**Todo Interface:**
```typescript
interface Todo {
  id: string;
  text: string;
  completed: boolean;
  createdAt: string;
}
```

**Features:**
- Collapsible section (minimized by default)
- Add new todos with Enter key
- Checkbox to mark complete
- Delete button for each todo
- Completed todos styled with strikethrough
- Optional: drag to reorder

**UI Structure:**
```jsx
<div className={`todo-list ${isExpanded ? 'expanded' : 'minimized'}`}>
  <div className="todo-header" onClick={() => setIsExpanded(!isExpanded)}>
    <h3>To-Do List ({todos.filter(t => !t.completed).length})</h3>
    <span className="toggle-icon">{isExpanded ? '▼' : '▲'}</span>
  </div>
  
  {isExpanded && (
    <div className="todo-content">
      <div className="todo-input">
        <input 
          type="text"
          placeholder="Add a new task..."
          value={newTodoText}
          onChange={(e) => setNewTodoText(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleAddTodo()}
        />
        <button onClick={handleAddTodo}>+</button>
      </div>
      
      <div className="todo-items">
        {todos.map(todo => (
          <TodoItem 
            key={todo.id}
            todo={todo}
            onToggle={() => handleToggle(todo.id)}
            onDelete={() => handleDelete(todo.id)}
          />
        ))}
      </div>
    </div>
  )}
</div>
```

### Backend API Endpoints

#### Base Route: `/api/study-companion`

All endpoints require authentication via JWT token.

**1. GET `/api/study-companion`**
- **Purpose:** Fetch all study companion data for authenticated user
- **Response:**
```json
{
  "success": true,
  "data": {
    "ultimateGoal": "Complete CS degree with honors",
    "shortTermActions": [
      {
        "id": "action_123",
        "text": "Finish data structures assignment",
        "deadline": "2025-11-20T00:00:00.000Z",
        "createdAt": "2025-11-15T10:00:00.000Z"
      }
    ],
    "estimatedTime": { "hours": 500, "minutes": 0 },
    "dailyCommitment": { "hours": 3, "minutes": 30 },
    "studySessions": [
      {
        "id": "session_456",
        "startTime": "2025-11-17T14:00:00.000Z",
        "endTime": "2025-11-17T16:30:00.000Z",
        "duration": 9000,
        "mode": "timer",
        "date": "2025-11-17"
      }
    ],
    "taskBlocks": [
      {
        "id": "task_789",
        "date": "2025-11-17",
        "startTime": "14:00",
        "endTime": "16:00",
        "title": "Study algorithms",
        "color": "#4facfe",
        "link": "https://example.com/algorithms"
      }
    ],
    "todos": [
      {
        "id": "todo_101",
        "text": "Review lecture notes",
        "completed": false,
        "createdAt": "2025-11-17T09:00:00.000Z"
      }
    ]
  }
}
```

**2. PATCH `/api/study-companion/goal`**
- **Purpose:** Update ultimate goal
- **Body:** `{ "ultimateGoal": "string" }`
- **Response:** `{ "success": true }`

**3. POST `/api/study-companion/actions`**
- **Purpose:** Add short-term action
- **Body:** `{ "text": "string", "deadline": "ISO date" }`
- **Response:** `{ "success": true, "action": {...} }`

**4. PATCH `/api/study-companion/actions/:id`**
- **Purpose:** Update short-term action
- **Body:** `{ "text": "string", "deadline": "ISO date" }`
- **Response:** `{ "success": true }`

**5. DELETE `/api/study-companion/actions/:id`**
- **Purpose:** Delete short-term action
- **Response:** `{ "success": true }`

**6. PATCH `/api/study-companion/time-settings`**
- **Purpose:** Update time commitments
- **Body:** 
```json
{
  "estimatedTime": { "hours": 500, "minutes": 0 },
  "dailyCommitment": { "hours": 3, "minutes": 30 }
}
```
- **Response:** `{ "success": true }`

**7. POST `/api/study-companion/sessions`**
- **Purpose:** Record study session
- **Body:**
```json
{
  "startTime": "ISO datetime",
  "endTime": "ISO datetime",
  "duration": 9000,
  "mode": "timer"
}
```
- **Response:** `{ "success": true, "session": {...} }`

**8. GET `/api/study-companion/sessions/aggregate`**
- **Purpose:** Get aggregated study hours per day for calendar
- **Query:** `?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD`
- **Response:**
```json
{
  "success": true,
  "data": {
    "2025-11-17": 2.5,
    "2025-11-16": 3.0,
    "2025-11-15": 1.5
  }
}
```

**9. POST `/api/study-companion/task-blocks`**
- **Purpose:** Create task block
- **Body:** `{ "date": "YYYY-MM-DD", "startTime": "HH:mm", "endTime": "HH:mm", "title": "string", "color": "#hex", "link": "url" }`
- **Response:** `{ "success": true, "taskBlock": {...} }`

**10. PATCH `/api/study-companion/task-blocks/:id`**
- **Purpose:** Update task block (for drag/resize)
- **Body:** `{ "startTime": "HH:mm", "endTime": "HH:mm", "title": "string", "color": "#hex", "link": "url" }`
- **Response:** `{ "success": true }`

**11. DELETE `/api/study-companion/task-blocks/:id`**
- **Purpose:** Delete task block
- **Response:** `{ "success": true }`

**12. POST `/api/study-companion/todos`**
- **Purpose:** Create todo item
- **Body:** `{ "text": "string" }`
- **Response:** `{ "success": true, "todo": {...} }`

**13. PATCH `/api/study-companion/todos/:id`**
- **Purpose:** Update todo (toggle completion or edit text)
- **Body:** `{ "text": "string", "completed": boolean }`
- **Response:** `{ "success": true }`

**14. DELETE `/api/study-companion/todos/:id`**
- **Purpose:** Delete todo item
- **Response:** `{ "success": true }`

## Data Models

### MongoDB Schema Extension

Extend the existing User model with a `studyCompanion` subdocument:

```javascript
// In server/src/models/User.js

const shortTermActionSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  deadline: {
    type: Date,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const studySessionSchema = new mongoose.Schema({
  startTime: {
    type: Date,
    required: true
  },
  endTime: {
    type: Date,
    required: true
  },
  duration: {
    type: Number, // seconds
    required: true
  },
  mode: {
    type: String,
    enum: ['timer', 'stopwatch'],
    required: true
  },
  date: {
    type: String, // YYYY-MM-DD format for easy querying
    required: true
  }
});

const taskBlockSchema = new mongoose.Schema({
  date: {
    type: String, // YYYY-MM-DD
    required: true
  },
  startTime: {
    type: String, // HH:mm
    required: true
  },
  endTime: {
    type: String, // HH:mm
    required: true
  },
  title: {
    type: String,
    required: true
  },
  color: {
    type: String,
    default: '#4facfe'
  },
  link: {
    type: String,
    default: null
  }
});

const todoSchema = new mongoose.Schema({
  text: {
    type: String,
    required: true
  },
  completed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const studyCompanionSchema = new mongoose.Schema({
  ultimateGoal: {
    type: String,
    default: ''
  },
  shortTermActions: [shortTermActionSchema],
  estimatedTime: {
    hours: {
      type: Number,
      default: 0,
      min: 0
    },
    minutes: {
      type: Number,
      default: 0,
      min: 0,
      max: 59
    }
  },
  dailyCommitment: {
    hours: {
      type: Number,
      default: 0,
      min: 0
    },
    minutes: {
      type: Number,
      default: 0,
      min: 0,
      max: 59
    }
  },
  studySessions: [studySessionSchema],
  taskBlocks: [taskBlockSchema],
  todos: [todoSchema]
});

// Add to userSchema
userSchema.add({
  studyCompanion: {
    type: studyCompanionSchema,
    default: () => ({})
  }
});
```

### Indexing Strategy

```javascript
// Add indexes for efficient querying
userSchema.index({ 'studyCompanion.studySessions.date': 1 });
userSchema.index({ 'studyCompanion.taskBlocks.date': 1 });
userSchema.index({ 'studyCompanion.shortTermActions.deadline': 1 });
```

## Error Handling

### Frontend Error Handling

**1. Network Errors:**
```javascript
const handleApiError = (error) => {
  if (error.response) {
    // Server responded with error status
    setErrorMsg(error.response.data.message || 'Server error occurred');
  } else if (error.request) {
    // Request made but no response
    setErrorMsg('Network error. Please check your connection.');
  } else {
    // Other errors
    setErrorMsg('An unexpected error occurred');
  }
};
```

**2. Validation Errors:**
- Display inline validation messages for form inputs
- Prevent submission of invalid data
- Highlight fields with errors

**3. Optimistic Updates with Rollback:**
```javascript
const updateWithOptimism = async (updateFn, rollbackData) => {
  try {
    await updateFn();
  } catch (error) {
    // Rollback to previous state
    setStudyData(rollbackData);
    handleApiError(error);
  }
};
```

### Backend Error Handling

**1. Validation Middleware:**
```javascript
const validateStudyCompanionUpdate = (req, res, next) => {
  // Validate request body
  const { error } = schema.validate(req.body);
  if (error) {
    return res.status(400).json({
      success: false,
      message: error.details[0].message
    });
  }
  next();
};
```

**2. Error Response Format:**
```javascript
{
  "success": false,
  "message": "Human-readable error message",
  "code": "ERROR_CODE", // Optional
  "details": {} // Optional additional context
}
```

**3. Database Error Handling:**
```javascript
try {
  await user.save();
} catch (error) {
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Invalid data provided'
    });
  }
  throw error; // Let express-async-errors handle it
}
```

## Testing Strategy

### Unit Tests

**Frontend Components:**
- Test each component in isolation with mock props
- Verify state updates and event handlers
- Test edge cases (empty states, maximum values, etc.)

**Backend Routes:**
- Test each endpoint with valid and invalid inputs
- Verify authentication requirements
- Test database operations with mock data

**Example Test Cases:**

```javascript
// TimeTracker.test.jsx
describe('TimeTracker', () => {
  it('should start timer and record session', async () => {
    const onSessionEnd = jest.fn();
    const { getByText } = render(<TimeTracker onSessionEnd={onSessionEnd} />);
    
    fireEvent.click(getByText('Start'));
    // Wait for some time
    await act(() => new Promise(resolve => setTimeout(resolve, 1000)));
    fireEvent.click(getByText('Stop'));
    
    expect(onSessionEnd).toHaveBeenCalledWith(
      expect.objectContaining({
        duration: expect.any(Number),
        mode: 'timer'
      })
    );
  });
});

// studyCompanion.routes.test.js
describe('POST /api/study-companion/sessions', () => {
  it('should create study session for authenticated user', async () => {
    const response = await request(app)
      .post('/api/study-companion/sessions')
      .set('Authorization', `Bearer ${validToken}`)
      .send({
        startTime: new Date().toISOString(),
        endTime: new Date().toISOString(),
        duration: 3600,
        mode: 'timer'
      });
    
    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
    expect(response.body.session).toHaveProperty('id');
  });
});
```

### Integration Tests

**End-to-End Workflows:**
1. User creates ultimate goal and short-term actions
2. User starts timer, completes session, verifies session recorded
3. User creates task blocks in day calendar, verifies persistence
4. User adds todos, marks complete, verifies state updates
5. User navigates calendar, verifies study hours display correctly

### Manual Testing Checklist

- [ ] Navigation to Study Companion from dashboard works
- [ ] All three panels render correctly with proper widths
- [ ] Ultimate goal saves and persists across sessions
- [ ] Short-term actions can be added, edited, and deleted
- [ ] Time commitments accept valid inputs and reject invalid ones
- [ ] Calendar displays current month and allows navigation
- [ ] Study hours labels appear on calendar dates
- [ ] Timer counts down correctly and triggers notification
- [ ] Stopwatch counts up correctly
- [ ] Study sessions are recorded with accurate timestamps
- [ ] Day calendar displays 24-hour time slots
- [ ] Task blocks can be created, edited, and deleted
- [ ] Task blocks can be dragged to reschedule
- [ ] Overlapping tasks display side-by-side
- [ ] Task colors can be customized
- [ ] Task links open in new tab when clicked
- [ ] To-do list expands and collapses smoothly
- [ ] Todos can be added, completed, and deleted
- [ ] All data persists after page refresh
- [ ] Error messages display appropriately for failed operations
- [ ] Loading states show during API calls
- [ ] Theme (dark/light) applies correctly to all components

## Performance Considerations

### Frontend Optimization

**1. Debouncing:**
```javascript
const debouncedUpdate = useCallback(
  debounce((field, value) => {
    api.updateStudyCompanion(field, value);
  }, 500),
  []
);
```

**2. Memoization:**
```javascript
const aggregatedHours = useMemo(() => {
  return studySessions.reduce((acc, session) => {
    const date = session.date;
    acc[date] = (acc[date] || 0) + (session.duration / 3600);
    return acc;
  }, {});
}, [studySessions]);
```

**3. Lazy Loading:**
- Load study sessions only for visible date range in calendar
- Paginate task blocks and todos if lists become very large

### Backend Optimization

**1. Query Optimization:**
```javascript
// Only fetch necessary fields
const user = await User.findById(userId)
  .select('studyCompanion')
  .lean();

// Filter sessions by date range
const sessions = user.studyCompanion.studySessions.filter(s => 
  s.date >= startDate && s.date <= endDate
);
```

**2. Aggregation Pipeline:**
```javascript
// Aggregate study hours efficiently
const aggregated = await User.aggregate([
  { $match: { _id: userId } },
  { $unwind: '$studyCompanion.studySessions' },
  { $group: {
    _id: '$studyCompanion.studySessions.date',
    totalHours: { $sum: { $divide: ['$studyCompanion.studySessions.duration', 3600] } }
  }}
]);
```

**3. Caching:**
- Cache aggregated study hours for frequently accessed date ranges
- Invalidate cache when new sessions are added

## Security Considerations

**1. Authentication:**
- All API endpoints require valid JWT token
- Verify user ownership of data before any operation

**2. Input Validation:**
- Sanitize all user inputs to prevent XSS
- Validate data types and ranges
- Limit string lengths to prevent abuse

**3. Rate Limiting:**
```javascript
const rateLimit = require('express-rate-limit');

const studyCompanionLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each user to 100 requests per windowMs
});

router.use('/api/study-companion', studyCompanionLimiter);
```

**4. Data Privacy:**
- Study companion data is private to each user
- No sharing or public access features
- Ensure proper authorization checks on all routes

## Accessibility

**1. Keyboard Navigation:**
- All interactive elements accessible via Tab key
- Enter key to submit forms
- Escape key to close modals
- Arrow keys for calendar navigation

**2. Screen Reader Support:**
- Semantic HTML elements (nav, main, section, etc.)
- ARIA labels for icon buttons
- ARIA live regions for dynamic content updates

**3. Visual Accessibility:**
- Sufficient color contrast (WCAG AA compliance)
- Focus indicators on all interactive elements
- Text alternatives for icons
- Responsive font sizes

**4. Reduced Motion:**
```css
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}
```

## Future Enhancements

**Phase 2 Features (Not in Current Scope):**
1. Analytics dashboard with charts and insights
2. Study streak tracking and gamification
3. Pomodoro technique integration
4. Study session notes and reflections
5. Export study data to CSV/PDF
6. Mobile responsive design
7. Push notifications for upcoming tasks
8. Integration with external calendars (Google Calendar, etc.)
9. Collaborative study sessions with friends
10. AI-powered study recommendations based on patterns
