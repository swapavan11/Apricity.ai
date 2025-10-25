# Quiz Enhancement Implementation Summary

## ✅ Completed Backend Changes

### 1. Enhanced Attempt Schema (`server/src/models/Document.js`)
- Added full question data storage in `QuestionResultSchema`:
  - `question`, `options`, `userAnswer`, `correctAnswer`, `explanation`
  - `marksObtained`, `totalMarks` for detailed scoring
- Added timer support in `AttemptSchema`:
  - `timeTaken`, `timeLimit`, `wasTimedOut`
- Added `suggestedTopics` array for topic-based recommendations
- Added `onewordAccuracy` for ONEWORD question type

### 2. Enhanced Scoring Route (`server/src/routes/quiz.js`)
- **Partial Marks System**:
  - MCQ: 1 mark (full credit only)
  - ONEWORD: 1 mark (full or 0.5 for partial)
  - SAQ: 2 marks (full, 1 for partial, or 0)
  - LAQ: 3 marks (full, 1.5 for partial, or 0)
  
- **Full Question Storage**: Stores complete question data with attempts
- **Topic-Based Suggestions**: Analyzes weak topics and suggests focus areas from PDF topics
- **Time Tracking**: Accepts `timeTaken`, `timeLimit`, `wasTimedOut` parameters

## 🚧 Frontend Changes Needed

### 1. Quiz Persistence (QuizSection.jsx)
- Use `sessionStorage` or parent state to persist quiz when switching tabs
- Save quiz state: `quiz`, `answers`, `score`, `startTime`
- Restore state when returning to quiz tab

### 2. Timer Feature
- Add state: `isTimedQuiz`, `timeLimit`, `timeRemaining`, `timerStarted`
- Add UI toggle: "Timed Quiz" vs "Untimed Quiz"
- Time limit input (minutes)
- Display countdown timer
- Auto-submit when time expires
- Send timing data to scoring API

### 3. Score Display Enhancements
- Show marks obtained / total marks
- Display suggested topics from API response
- Show "Focus on these topics" section

### 4. API Updates
- Update `scoreQuiz` call to include timing data
- Parse and display `suggestedTopics` from response

## 📋 TODO: Dashboard Enhancements

### 1. Attempt Modal (New Component)
- Create `AttemptModal.jsx` component
- Display:
  - All questions with user answers and correct answers
  - Marks obtained per question
  - Explanations for each question
  - Overall statistics
  - Suggested topics

### 2. Dashboard Sorting
- Sort documents by `attempts[attempts.length-1].createdAt` (last attempt)
- Show last quiz date on document cards

## 📝 Implementation Steps

### Step 1: Add Quiz Persistence & Timer (QuizSection.jsx)
```javascript
// Add new state
const [isTimedQuiz, setIsTimedQuiz] = useState(false);
const [timeLimit, setTimeLimit] = useState(30); // minutes
const [timeRemaining, setTimeRemaining] = useState(null);
const [quizStartTime, setQuizStartTime] = useState(null);
const timerRef = useRef(null);

// Persist quiz to sessionStorage when it changes
useEffect(() => {
  if (quiz) {
    sessionStorage.setItem('activeQuiz', JSON.stringify({
      quiz, answers, score, quizStartTime, isTimedQuiz, timeLimit
    }));
  }
}, [quiz, answers, score]);

// Restore quiz on mount
useEffect(() => {
  const saved = sessionStorage.getItem('activeQuiz');
  if (saved) {
    const data = JSON.parse(saved);
    setQuiz(data.quiz);
    setAnswers(data.answers || {});
    setScore(data.score);
    setQuizStartTime(data.quizStartTime);
    if (data.isTimedQuiz && data.timeLimit) {
      // Calculate remaining time
      const elapsed = Date.now() - new Date(data.quizStartTime).getTime();
      const remaining = (data.timeLimit * 60 * 1000) - elapsed;
      if (remaining > 0) {
        setTimeRemaining(remaining);
        setIsTimedQuiz(true);
        setTimeLimit(data.timeLimit);
      }
    }
  }
}, []);

// Timer countdown
useEffect(() => {
  if (isTimedQuiz && timeRemaining !== null && timeRemaining > 0) {
    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1000) {
          // Time's up - auto submit
          onScore(true); // Pass wasTimedOut flag
          return 0;
        }
        return prev - 1000;
      });
    }, 1000);
    return () => clearInterval(timerRef.current);
  }
}, [isTimedQuiz, timeRemaining]);
```

### Step 2: Update onGenQuiz
```javascript
const onGenQuiz = async () => {
  // ... existing code ...
  setQuiz(res);
  setAnswers({});
  setScore(null);
  
  // Start timer for timed quizzes
  if (isTimedQuiz) {
    setQuizStartTime(Date.now());
    setTimeRemaining(timeLimit * 60 * 1000);
  }
};
```

### Step 3: Update onScore
```javascript
const onScore = async (wasTimedOut = false) => {
  if (!quiz?.questions?.length) return;
  setLoadingScore(true);
  
  const timeTaken = quizStartTime ? Math.floor((Date.now() - quizStartTime) / 1000) : 0;
  
  try {
    const ordered = quiz.questions.map((q) => answers[q.id]);
    const payload = {
      documentId: selected === "all" ? null : selected,
      answers: ordered,
      questions: quiz.questions,
      timeTaken,
      timeLimit: isTimedQuiz ? timeLimit * 60 : null,
      wasTimedOut
    };
    const res = await api.scoreQuiz(payload);
    setScore(res);
    
    // Clear sessionStorage after successful submission
    sessionStorage.removeItem('activeQuiz');
    
    // ... existing code ...
  } finally {
    setLoadingScore(false);
  }
};
```

### Step 4: Add Timer UI
```jsx
{/* Timer toggle - before question counts */}
<div style={{ marginBottom: 20, textAlign: 'center' }}>
  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
    <input 
      type="checkbox" 
      checked={isTimedQuiz}
      onChange={(e) => setIsTimedQuiz(e.target.checked)}
    />
    <span>⏱️ Timed Quiz</span>
  </label>
  
  {isTimedQuiz && (
    <div style={{ marginTop: 12 }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
        <span>Time Limit (minutes):</span>
        <input 
          type="number"
          min={1}
          max={180}
          value={timeLimit}
          onChange={(e) => setTimeLimit(Number(e.target.value))}
          style={{ width: 80, textAlign: 'center' }}
        />
      </label>
    </div>
  )}
</div>

{/* Timer display during quiz */}
{quiz && isTimedQuiz && timeRemaining > 0 && (
  <div style={{ 
    position: 'sticky', 
    top: 0, 
    background: 'var(--panel)', 
    padding: 12, 
    textAlign: 'center',
    borderBottom: '2px solid var(--accent)',
    zIndex: 10
  }}>
    <span style={{ fontSize: '1.2em', fontWeight: 600 }}>
      ⏱️ Time Remaining: {Math.floor(timeRemaining / 60000)}:{String(Math.floor((timeRemaining % 60000) / 1000)).padStart(2, '0')}
    </span>
  </div>
)}
```

### Step 5: Update Score Display
```jsx
{score && score.analytics && (
  <>
    {/* Existing results display */}
    
    {/* Suggested Topics */}
    {score.analytics.suggestedTopics && score.analytics.suggestedTopics.length > 0 && (
      <div style={{ marginTop: 16, padding: 12, background: 'rgba(255, 200, 100, 0.1)', borderRadius: 8 }}>
        <div style={{ fontWeight: 600, marginBottom: 8, color: 'var(--accent)' }}>
          📚 Suggested Focus Topics:
        </div>
        <div style={{ fontSize: '0.9em' }}>
          {score.analytics.suggestedTopics.join(', ')}
        </div>
        <div style={{ fontSize: '0.8em', color: 'var(--muted)', marginTop: 6, fontStyle: 'italic' }}>
          Based on your performance, we recommend reviewing these topics from your PDF.
        </div>
      </div>
    )}
  </>
)}
```

## 🎯 Next Steps

1. **Implement frontend changes** in QuizSection.jsx
2. **Create AttemptModal component** for viewing past quizzes
3. **Update Dashboard** to sort by last attempt and add "View Quiz" buttons
4. **Test thoroughly**:
   - Timed quiz auto-submit
   - Quiz persistence across tab switches
   - Partial marks calculation
   - Suggested topics display
   - Attempt history viewing

## 📦 Benefits

- **No Lost Work**: Quiz persists when switching tabs
- **Time Management**: Timed quizzes with auto-submit
- **Better Feedback**: Partial marks and topic suggestions
- **Complete History**: View all past quiz attempts with full details
- **Improved Learning**: Focus suggestions based on performance
