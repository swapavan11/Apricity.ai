# PDF Topic Extraction - Enhanced Features

## ✨ New Features Implemented

### 1. **In-Depth Topic Parsing**
- Enhanced AI prompt for comprehensive topic extraction (15-25 topics)
- Analyzes up to 120 chunks (vs 60 before) for deeper coverage
- Extracts:
  - Main chapter/section titles
  - Key concepts and themes
  - Subject areas covered
  - Important subtopics

### 2. **Page Range Support for Large PDFs**
- **Auto-detection**: PDFs > 50 pages require page range specification
- **User Input**: Start and end page inputs appear when large PDF detected
- **Targeted Extraction**: Parse specific sections for focused topics
- **Better Performance**: Avoids overwhelming AI with too much content

### 3. **Manual Topic Addition**
- **Input Field**: Add custom topics not captured by AI
- **Persistent Storage**: Topics saved to MongoDB with PDF
- **Deduplicated**: Won't add duplicate topics
- **Enter Key Support**: Press Enter to add topic quickly

### 4. **PDF Context Preservation Across All Quiz Modes**
- **Auto Mode**: Uses currently selected PDF
- **Select Topics Mode**: Uses selected PDF with optional topic filtering
- **Custom Mode**: Uses selected PDF with custom instructions
- All modes now correctly pass `documentId` to backend

## 🔧 Backend Changes

### Routes (`server/src/routes/quiz.js`)

**1. Enhanced `/api/quiz/parse-topics` Endpoint:**
```javascript
POST /api/quiz/parse-topics
Body: { documentId, startPage?, endPage? }
Response: { topics, success, pageRange? } OR { requiresPageRange, totalPages, message }
```

- Accepts optional `startPage` and `endPage` parameters
- Returns `requiresPageRange: true` for PDFs > 50 pages
- Uses up to 120 chunks for analysis
- More detailed AI prompt for better topic extraction

**2. New `/api/quiz/add-topic` Endpoint:**
```javascript
POST /api/quiz/add-topic
Body: { documentId, topic }
Response: { topics, success }
```

- Adds custom topic to document's topic list
- Prevents duplicates
- Returns updated topic list

**3. Enhanced Quiz Generation:**
- Properly handles PDF context in all modes
- Logging for debugging document ID usage

## 🎨 Frontend Changes

### QuizSection Component (`client/src/components/Study/QuizSection.jsx`)

**New State Variables:**
- `showPageRange`: Controls page range input visibility
- `startPage` / `endPage`: Page range values
- `totalPages`: Total PDF pages (for validation)
- `customTopic`: Custom topic input value
- `addingTopic`: Loading state for topic addition

**New Features:**

1. **Page Range UI** (shows for large PDFs):
   ```
   📄 Large PDF Detected (150 pages)
   For better topic extraction, please specify a page range:
   [Start Page: 1] — [End Page: 50]
   ```

2. **Manual Topic Input** (below topic grid):
   ```
   ➕ Add Custom Topic
   [Input field] [+ Add button]
   Add topics that weren't automatically extracted
   ```

3. **Improved Parse Button**:
   - Shows page range in console logs
   - Handles large PDF detection
   - Passes page range to API

**PDF Context Guarantee:**
- All three quiz modes use `selected` as documentId
- Console logging confirms document ID in quiz generation

## 📋 API Methods (`client/src/api/useApi.js`)

**Updated:**
```javascript
parseTopics: async (documentId, startPage, endPage)
```

**Added:**
```javascript
addTopic: async (documentId, topic)
```

**Enhanced Logging:**
- `genQuiz` now logs input parameters
- Helps debug PDF context issues

## 🚀 How to Use

### Basic Flow:
1. **Select a PDF** from source selector
2. **Click "Select Topics from PDF"** radio button
3. **Click "Parse PDF Topics"** button
   - If PDF > 50 pages → Enter page range → Click parse again
   - If PDF ≤ 50 pages → Topics extracted immediately
4. **Select multiple topics** via checkboxes
5. **Add custom topic** if needed (optional)
6. **Generate quiz** with selected topics

### Large PDF Flow:
1. Select PDF (e.g., 150 pages)
2. Click "Parse PDF Topics"
3. Alert: "PDF is large. Please specify page range. Total pages: 150"
4. Page range inputs appear
5. Enter range (e.g., 1-50)
6. Click "Parse PDF Topics" again
7. Topics extracted from specified pages
8. Topics cached for future use

### Manual Topic Addition:
1. After topics are parsed
2. Type custom topic in input field (e.g., "Quantum Entanglement")
3. Click "+ Add" or press Enter
4. Topic appears in grid
5. Topic saved to MongoDB

## 🔍 Console Logs for Debugging

Monitor these logs in browser console:
- `Auto-fetching topics for PDF: <id>`
- `Parsing topics for PDF: <id> Pages: <start> - <end>`
- `Parse result: { topics: [...], requiresPageRange: ... }`
- `Topics set: [...]`
- `Topic added. Updated list: [...]`
- `[QuizSection] Generating quiz with documentId: <id>, topics: [...]`
- `[API] genQuiz called with: { documentId, ... }`

## ✅ Testing Checklist

- [ ] Small PDF (< 50 pages) parses without page range
- [ ] Large PDF (> 50 pages) prompts for page range
- [ ] Page range parsing works correctly
- [ ] Manual topic addition works
- [ ] Topics persist in MongoDB
- [ ] Multi-select topics works
- [ ] Quiz generated with selected topics
- [ ] Auto mode uses correct PDF
- [ ] Select mode uses correct PDF
- [ ] Custom mode uses correct PDF
- [ ] Topics cached (re-selecting PDF loads instantly)

## 🎯 Benefits

1. **Better Topic Coverage**: 15-25 detailed topics vs previous basic extraction
2. **Handles Large Documents**: Page range prevents AI overload
3. **User Flexibility**: Add custom topics for missing subjects
4. **Consistent PDF Context**: All quiz modes use same PDF reference
5. **Performance**: Caching prevents re-parsing
6. **User Experience**: Clear feedback and intuitive controls
