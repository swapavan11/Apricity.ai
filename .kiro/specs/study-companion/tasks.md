# Implementation Plan

- [x] 1. Extend User model with Study Companion schema





  - Add studyCompanion subdocument to User schema in server/src/models/User.js
  - Create nested schemas for shortTermActions, studySessions, taskBlocks, and todos
  - Add indexes for efficient querying on date fields
  - _Requirements: 2.1, 3.1, 4.1, 5.1, 6.1, 7.1, 10.1, 11.1, 12.1_

- [x] 2. Create backend API routes for Study Companion






- [-] 2.1 Create study companion routes file




  - Create server/src/routes/studyCompanion.js with Express router
  - Add authentication middleware to all routes



  - Set up base route structure for all endpoints
  - _Requirements: 12.1, 12.2, 12.3_

- [x] 2.2 Implement goal and action management endpoints



  - Implement GET /api/study-companion to fetch all data


  - Implement PATCH /api/study-companion/goal for ultimate goal updates
  - Implement POST /api/study-companion/actions to create short-term actions
  - Implement PATCH /api/study-companion/actions/:id to update actions
  - Implement DELETE /api/study-companion/actions/:id to delete actions
  - _Requirements: 2.2, 2.3, 2.5, 3.2, 3.3, 3.5, 3.6, 12.1, 12.2, 12.5_

- [x] 2.3 Implement time settings and session tracking endpoints




  - Implement PATCH /api/study-companion/time-settings for time commitments
  - Implement POST /api/study-companion/sessions to record study sessions
  - Implement GET /api/study-companion/sessions/aggregate for calendar data
  - _Requirements: 4.2, 4.3, 4.5, 6.6, 6.7, 6.8, 11.1, 11.2, 11.3, 11.4, 11.5, 12.5_

- [x] 2.4 Implement task block and todo endpoints







  - Implement POST /api/study-companion/task-blocks to create task blocks
  - Implement PATCH /api/study-companion/task-blocks/:id to update task blocks
  - Implement DELETE /api/study-companion/task-blocks/:id to delete task blocks
  - Implement POST /api/study-companion/todos to create todos
  - Implement PATCH /api/study-companion/todos/:id to update todos
  - Implement DELETE /api/study-companion/todos/:id to delete todos
  - _Requirements: 7.4, 7.5, 7.6, 7.8, 7.9, 10.5, 10.6, 10.8, 10.9, 12.5_


- [x] 2.5 Register study companion routes in main server






  - Import studyCompanion routes in server/src/index.js
  - Mount routes at /api/study-companion path
  - _Requirements: 12.1_


- [x] 3. Create frontend component structure




- [x] 3.1 Create main StudyCompanion container component






  - Create client/src/components/StudyCompanion/StudyCompanion.jsx
  - Set up state management for all study companion data
  - Implement fetchStudyData function to load data on mount
  - Implement debounced updateStudyData function for auto-save
  - Create three-panel grid layout (30%-40%-30%)




  - _Requirements: 1.1, 1.2, 1.3, 12.1, 12.3, 13.1_


- [x] 3.2 Create StudyCompanion CSS file





  - Create client/src/components/StudyCompanion/styles/StudyCompanion.css
  - Define grid layout for three panels
  - Add responsive styles and theme variables
  - Ensure compatibility with existing dark/light theme system
  - _Requirements: 13.1, 13.2, 13.3_














- [x] 3.3 Add Study Companion navigation link


  - Update client/src/ui/App.jsx to add "Study Companion" nav link
  - Add route for /study-companion path






  - Ensure navigation styling matches existing links
  - _Requirements: 1.1, 1.2_

- [x] 4. Implement Left Panel components




- [x] 4.1 Create GoalSection component








  - Create client/src/components/StudyCompanion/LeftPanel/GoalSection.jsx


  - Implement ultimate goal textarea with auto-resize
  - Implement short-term actions list with add/edit/delete functionality
  - Add date picker for action deadlines
  - Add visual indicators for approaching/overdue deadlines
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_












- [ ] 4.2 Create TimeCommitment component





  - Create client/src/components/StudyCompanion/LeftPanel/TimeCommitment.jsx
  - Add input fields for estimated time (hours/minutes)
  - Add input fields for daily commitment (hours/minutes)
  - Implement validation to prevent negative values
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_







- [ ] 4.3 Create StudyCalendar component


  - Create client/src/components/StudyCompanion/LeftPanel/StudyCalendar.jsx












  - Implement monthly calendar view with month/year navigation

  - Highlight current date



  - Display study hours label below each date


  - Implement date selection to update day calendar
  - Add color-coded indicators based on daily commitment achievement




  - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_






- [ ] 4.4 Create LeftPanel container component

  - Create client/src/components/StudyCompanion/LeftPanel/LeftPanel.jsx
  - Integrate GoalSection, TimeCommitment, and StudyCalendar components
  - Manage data flow between child components and parent
  - _Requirements: 1.3, 13.1_

- [ ] 5. Implement Middle Panel component

- [ ] 5.1 Create TimeTracker component

  - Create client/src/components/StudyCompanion/MiddlePanel/TimeTracker.jsx
  - Implement mode toggle between timer and stopwatch
  - Create timer mode with countdown functionality
  - Create stopwatch mode with count-up functionality
  - Add start/pause/stop controls
  - Implement circular progress indicator
  - Add audio notification for timer completion
  - Implement session recording on start/stop
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 6.8, 11.1, 11.2, 11.3, 11.4_

- [ ] 6. Implement Right Panel components

- [ ] 6.1 Create DayCalendar component

  - Create client/src/components/StudyCompanion/RightPanel/DayCalendar.jsx
  - Render 24-hour vertical time slots with 15-minute granularity
  - Implement click-to-create task block functionality
  - Create task creation modal with title, time, color, and link inputs
  - Implement drag-and-drop for rescheduling task blocks
  - Implement overlap detection and side-by-side layout for overlapping tasks
  - Add color picker for task categorization
  - Display clickable link icon for tasks with links
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6, 7.7, 7.8, 7.9, 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4_

- [ ] 6.2 Create TodoList component

  - Create client/src/components/StudyCompanion/RightPanel/TodoList.jsx
  - Implement collapsible section (minimized by default)
  - Add input field for creating new todos
  - Implement Enter key to add todo
  - Add checkbox for marking todos complete
  - Add delete button for each todo
  - Style completed todos with strikethrough
  - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7, 10.8, 10.9_

- [ ] 6.3 Create RightPanel container component

  - Create client/src/components/StudyCompanion/RightPanel/RightPanel.jsx
  - Integrate DayCalendar and TodoList components
  - Manage layout with TodoList below DayCalendar
  - _Requirements: 1.3, 13.1_

- [ ] 7. Implement API integration layer

- [ ] 7.1 Add Study Companion API methods to useApi hook


  - Update client/src/api/useApi.js with all study companion endpoints
  - Add methods for goal, actions, time settings, sessions, task blocks, and todos
  - Implement proper error handling and token management
  - _Requirements: 12.1, 12.3, 12.5_

- [ ] 7.2 Implement optimistic updates with rollback

  - Add optimistic update logic in StudyCompanion.jsx
  - Implement rollback mechanism for failed API calls
  - Add loading states for async operations
  - _Requirements: 12.4, 12.5, 13.4, 13.5_

- [ ] 8. Add error handling and loading states

- [ ] 8.1 Implement frontend error handling
  - Add error message display component
  - Implement inline validation for form inputs
  - Add error boundaries for component failures
  - _Requirements: 13.5_

- [ ] 8.2 Add loading indicators
  - Add loading spinner for initial data fetch
  - Add loading states for individual operations
  - Implement skeleton screens for better UX
  - _Requirements: 13.4_

- [x] 9. Implement accessibility features



- [x] 9.1 Add keyboard navigation support

  - Ensure all interactive elements are keyboard accessible
  - Add Tab navigation through components
  - Implement Enter key for form submissions
  - Add Escape key to close modals
  - Add arrow key navigation for calendar
  - _Requirements: 13.3_


- [x] 9.2 Add ARIA labels and semantic HTML

  - Use semantic HTML elements throughout
  - Add ARIA labels for icon buttons
  - Implement ARIA live regions for dynamic updates
  - Ensure screen reader compatibility
  - _Requirements: 13.3_


- [x] 9.3 Ensure visual accessibility

  - Verify color contrast meets WCAG AA standards
  - Add focus indicators to all interactive elements
  - Provide text alternatives for icons
  - Implement reduced motion support
  - _Requirements: 13.3_
-

- [x] 10. Polish and final integration




- [x] 10.1 Add smooth transitions and animations


  - Implement smooth expand/collapse for todo list
  - Add fade-in animations for modals
  - Add drag feedback for task blocks
  - Ensure animations respect prefers-reduced-motion
  - _Requirements: 13.2, 13.3_

- [x] 10.2 Implement data persistence verification


  - Test that all data persists across page refreshes
  - Verify data consistency across multiple sessions
  - Test concurrent session handling
  - _Requirements: 12.1, 12.2, 12.3, 12.4_

- [x] 10.3 Add responsive design adjustments


  - Ensure layout works on different screen sizes
  - Add mobile-friendly touch interactions
  - Test on various browsers
  - _Requirements: 13.1_



- [ ] 10.4 Performance optimization
  - Implement debouncing for auto-save operations
  - Add memoization for expensive calculations
  - Optimize re-renders with React.memo where appropriate
  - _Requirements: 12.5_
