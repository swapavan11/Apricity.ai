# Testing Quiz Topics Feature

## Current Changes Made:
1. ✅ Backend: Added `topics` field to Document model
2. ✅ Backend: Added `/api/quiz/topics` endpoint (returns cached or extracts)
3. ✅ Backend: Added `/api/quiz/parse-topics` endpoint (force re-parse)
4. ✅ Frontend: Added multi-select topic UI
5. ✅ Frontend: Added debug logging and state display

## How to Test:

### Step 1: Restart Servers
```bash
# Terminal 1 - Backend
cd server
npm run dev

# Terminal 2 - Frontend
cd client
npm run dev
```

### Step 2: Hard Refresh Browser
- Press `Ctrl+Shift+R` or `Ctrl+F5`
- Or open DevTools (F12) → Application → Clear storage

### Step 3: Test the Feature
1. **Go to Study page** and open **Quiz tab**
2. **Look at the debug line** (shows: selected, quizMode, topicList count)
3. **Select a specific PDF** from the top source selector (NOT "All PDFs")
4. **Check if "Select Topics from PDF" radio button is enabled**
   - Should show helper text "(Select a PDF first)" when disabled
5. **Click "Select Topics from PDF" radio button**
6. **You should see:**
   - Parse button appears
   - Console log: "Auto-fetching topics for PDF: {id}"
   - If topics exist in DB, they load automatically
   - If not, button shows "🔍 Parse PDF Topics"
7. **Click Parse button**
   - Button shows "⚡ Extracting Topics..." with animation
   - Console logs the process
   - Topics appear as checkboxes when done
8. **Select multiple topics** by clicking checkboxes
9. **Generate quiz** with selected topics

## Console Logs to Watch:
- `Auto-fetching topics for PDF: <id>`
- `Topics fetched: {topics: [...], cached: true/false}`
- `Parsing topics for PDF: <id>`
- `Parse result: {topics: [...], success: true}`
- `Topics set: [...]`

## Common Issues:

### Radio button stays disabled
- **Check debug line:** Is `selected` showing a PDF ID or "null"/"all"?
- **Fix:** Select a specific PDF from source selector

### Parse button doesn't appear
- **Check:** Is radio button enabled and selected?
- **Check console:** Any errors in fetch?
- **Check:** Is `quizMode` showing "select" in debug line?

### Topics don't load
- **Check console** for fetch errors
- **Check browser Network tab** - is `/api/quiz/topics` being called?
- **Check backend logs** - is route being hit?

### Parse button doesn't work
- **Check console** for "Parsing topics for PDF:"
- **Check backend** is running on correct port
- **Look for error alert** popup

## Backend Verification:
```bash
# Check if topics field exists in Document model
grep -n "topics" server/src/models/Document.js

# Check if routes are registered
grep -n "parse-topics" server/src/routes/quiz.js
```

## Current Debug Features:
- Debug info line showing state values
- Console logging for all fetch operations
- Alert popup for parse errors
- Helper text on disabled radio button
