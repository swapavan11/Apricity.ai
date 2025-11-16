import { memo } from "react";
import DayCalendar from "./DayCalendar";
import TodoList from "./TodoList";

function RightPanel({
  selectedDate,
  taskBlocks,
  todos,
  onUpdate,
}) {
  return (
    <aside className="study-companion-panel right-panel" role="complementary" aria-label="Schedule and tasks">
      <header className="panel-header">
        <h2>Schedule & Tasks</h2>
      </header>
      <div
        className="panel-content"
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          height: "calc(100% - 60px)",
        }}
      >
        {/* Day Calendar - takes most of the space */}
        <section style={{ flex: 1, minHeight: 0, overflow: "hidden" }} aria-labelledby="day-calendar-heading">
          <DayCalendar
            selectedDate={selectedDate}
            taskBlocks={taskBlocks}
            onUpdate={onUpdate}
          />
        </section>

        {/* Todo List - below the calendar */}
        <section style={{ flexShrink: 0 }} aria-labelledby="todo-list-heading">
          <TodoList todos={todos} onUpdate={onUpdate} />
        </section>
      </div>
    </aside>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(RightPanel);
