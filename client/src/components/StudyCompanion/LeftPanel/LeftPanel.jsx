import { memo } from "react";
import GoalSection from "./GoalSection";
import TimeCommitment from "./TimeCommitment";
import StudyCalendar from "./StudyCalendar";

function LeftPanel({ 
  studyData, 
  selectedDate, 
  onDateChange, 
  onUpdate 
}) {
  return (
    <aside className="study-companion-panel left-panel" role="complementary" aria-label="Goals and planning">
      <header className="panel-header">
        <h2>Goals & Planning</h2>
      </header>
      <div className="panel-content">
        {/* Goal Section - Ultimate goal and short-term actions */}
        <section aria-labelledby="goal-section-heading">
          <GoalSection
            ultimateGoal={studyData.ultimateGoal}
            shortTermActions={studyData.shortTermActions}
            onUpdate={onUpdate}
          />
        </section>
        
        {/* Time Commitment - Estimated time and daily commitment */}
        <section aria-labelledby="time-commitment-heading">
          <TimeCommitment
            estimatedTime={studyData.estimatedTime}
            dailyCommitment={studyData.dailyCommitment}
            onUpdate={onUpdate}
          />
        </section>
        
        {/* Study Calendar - Monthly calendar with study hours */}
        <section aria-labelledby="calendar-section-heading">
          <StudyCalendar
            selectedDate={selectedDate}
            onDateChange={onDateChange}
            studySessions={studyData.studySessions}
            dailyCommitment={studyData.dailyCommitment}
          />
        </section>
      </div>
    </aside>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(LeftPanel);
