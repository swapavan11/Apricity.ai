import { useState, useRef, useMemo, memo } from "react";
import useApi from "../../../api/useApi";
import LoadingSpinner from "../LoadingSpinner";

// Color palette for task blocks
const TASK_COLORS = [
  "#4facfe", // Blue
  "#00f2fe", // Cyan
  "#43e97b", // Green
  "#fa709a", // Pink
  "#fee140", // Yellow
  "#30cfd0", // Teal
  "#a8edea", // Light Blue
  "#fbc2eb", // Light Pink
];

export default function DayCalendar({ selectedDate, taskBlocks, onUpdate }) {
  const api = useApi();
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    startTime: "",
    endTime: "",
    color: TASK_COLORS[0],
    link: "",
  });
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const calendarRef = useRef(null);

  // Format date to YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  // Get tasks for selected date (memoized)
  const todaysTasks = useMemo(() => {
    return taskBlocks.filter(
      (task) => task.date === formatDate(selectedDate)
    );
  }, [taskBlocks, selectedDate]);

  // Generate 24-hour time slots (memoized - static data)
  const timeSlots = useMemo(() => {
    return Array.from({ length: 24 }, (_, i) => {
      const hour = String(i).padStart(2, "0");
      return `${hour}:00`;
    });
  }, []);

  // Convert time string to minutes
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(":").map(Number);
    return hours * 60 + minutes;
  };

  // Convert minutes to time string
  const minutesToTime = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
  };

  // Check if two tasks overlap
  const tasksOverlap = (task1, task2) => {
    const start1 = timeToMinutes(task1.startTime);
    const end1 = timeToMinutes(task1.endTime);
    const start2 = timeToMinutes(task2.startTime);
    const end2 = timeToMinutes(task2.endTime);
    return start1 < end2 && start2 < end1;
  };

  // Calculate layout for overlapping tasks
  const calculateTaskLayout = (tasks) => {
    const sorted = [...tasks].sort(
      (a, b) => timeToMinutes(a.startTime) - timeToMinutes(b.startTime)
    );

    const groups = [];
    sorted.forEach((task) => {
      const overlapping = groups.find((group) =>
        group.some((t) => tasksOverlap(t, task))
      );

      if (overlapping) {
        overlapping.push(task);
      } else {
        groups.push([task]);
      }
    });

    return groups.flatMap((group) =>
      group.map((task, index) => ({
        ...task,
        width: `${100 / group.length}%`,
        left: `${(100 / group.length) * index}%`,
      }))
    );
  };

  // Calculate task layout (memoized for performance)
  const layoutedTasks = useMemo(() => {
    return calculateTaskLayout(todaysTasks);
  }, [todaysTasks]);

  // Handle time slot click
  const handleSlotClick = (timeStr) => {
    const startMinutes = timeToMinutes(timeStr);
    const endMinutes = startMinutes + 60; // Default 1 hour duration

    setNewTask({
      title: "",
      startTime: timeStr,
      endTime: minutesToTime(endMinutes),
      color: TASK_COLORS[0],
      link: "",
    });
    setIsCreating(true);
  };

  // Handle task creation
  const handleCreateTask = async () => {
    if (!newTask.title.trim()) {
      alert("Please enter a task title");
      return;
    }

    if (timeToMinutes(newTask.startTime) >= timeToMinutes(newTask.endTime)) {
      alert("End time must be after start time");
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.createTaskBlock({
        date: formatDate(selectedDate),
        startTime: newTask.startTime,
        endTime: newTask.endTime,
        title: newTask.title,
        color: newTask.color,
        link: newTask.link || undefined,
      });

      if (response.success) {
        // Update parent state
        onUpdate("taskBlocks", [...taskBlocks, response.taskBlock]);
        setIsCreating(false);
        setNewTask({
          title: "",
          startTime: "",
          endTime: "",
          color: TASK_COLORS[0],
          link: "",
        });
      }
    } catch (error) {
      console.error("Failed to create task:", error);
      alert("Failed to create task. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle task drag start
  const handleDragStart = (e, task) => {
    setDraggedTask(task);
    const rect = e.target.getBoundingClientRect();
    setDragOffset(e.clientY - rect.top);
    e.dataTransfer.effectAllowed = "move";
    // Add dragging class for visual feedback
    e.target.classList.add('dragging');
  };

  // Handle drag over
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  // Handle drop
  const handleDrop = async (e) => {
    e.preventDefault();
    if (!draggedTask || !calendarRef.current) return;

    // Remove dragging class
    const draggingElements = document.querySelectorAll('.task-block.dragging');
    draggingElements.forEach(el => el.classList.remove('dragging'));

    const calendarRect = calendarRef.current.getBoundingClientRect();
    const relativeY = e.clientY - calendarRect.top - dragOffset;
    const slotHeight = 60; // Height of each time slot in pixels
    const newStartMinutes = Math.max(
      0,
      Math.floor((relativeY / slotHeight) * 60)
    );

    const duration =
      timeToMinutes(draggedTask.endTime) -
      timeToMinutes(draggedTask.startTime);
    const newEndMinutes = Math.min(24 * 60, newStartMinutes + duration);

    const newStartTime = minutesToTime(newStartMinutes);
    const newEndTime = minutesToTime(newEndMinutes);

    setIsLoading(true);
    try {
      await api.updateTaskBlock(draggedTask._id || draggedTask.id, {
        startTime: newStartTime,
        endTime: newEndTime,
      });

      // Update parent state
      const updatedTasks = taskBlocks.map((t) =>
        (t._id || t.id) === (draggedTask._id || draggedTask.id)
          ? { ...t, startTime: newStartTime, endTime: newEndTime }
          : t
      );
      onUpdate("taskBlocks", updatedTasks);
    } catch (error) {
      console.error("Failed to update task:", error);
      alert("Failed to reschedule task. Please try again.");
    } finally {
      setIsLoading(false);
    }

    setDraggedTask(null);
  };

  // Handle task delete
  const handleDeleteTask = async (taskId) => {
    if (!confirm("Delete this task?")) return;

    setIsLoading(true);
    try {
      await api.deleteTaskBlock(taskId);
      const updatedTasks = taskBlocks.filter(
        (t) => (t._id || t.id) !== taskId
      );
      onUpdate("taskBlocks", updatedTasks);
    } catch (error) {
      console.error("Failed to delete task:", error);
      alert("Failed to delete task. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Handle drag end (cleanup)
  const handleDragEnd = (e) => {
    e.target.classList.remove('dragging');
  };

  // Render task block
  const renderTaskBlock = (task) => {
    const startMinutes = timeToMinutes(task.startTime);
    const endMinutes = timeToMinutes(task.endTime);
    const duration = endMinutes - startMinutes;
    const top = (startMinutes / 60) * 60; // 60px per hour
    const height = (duration / 60) * 60;

    return (
      <div
        key={task._id || task.id}
        className="task-block"
        draggable
        onDragStart={(e) => handleDragStart(e, task)}
        onDragEnd={handleDragEnd}
        role="listitem"
        aria-label={`${task.title}, ${task.startTime} to ${task.endTime}`}
        style={{
          top: `${top}px`,
          height: `${height}px`,
          width: task.width,
          left: task.left,
          backgroundColor: task.color,
          borderLeftColor: task.color,
          opacity: 0.9,
        }}
        title={`${task.title}\n${task.startTime} - ${task.endTime}`}
      >
        <div className="task-block-title">{task.title}</div>
        <div className="task-block-time" aria-hidden="true">
          {task.startTime} - {task.endTime}
        </div>
        {task.link && (
          <a
            href={task.link}
            target="_blank"
            rel="noopener noreferrer"
            className="task-block-link"
            onClick={(e) => e.stopPropagation()}
            aria-label={`Open link for ${task.title}`}
          >
            🔗
          </a>
        )}
        <button
          className="task-block-delete"
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteTask(task._id || task.id);
          }}
          aria-label={`Delete ${task.title}`}
          style={{
            position: "absolute",
            bottom: "4px",
            right: "4px",
            background: "rgba(0,0,0,0.5)",
            color: "white",
            border: "none",
            borderRadius: "4px",
            padding: "2px 6px",
            fontSize: "11px",
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>
    );
  };

  return (
    <div className="day-calendar">
      <header className="day-calendar-header">
        <h3 id="day-calendar-heading">
          {selectedDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
          })}
        </h3>
      </header>

      <div
        className="day-calendar-grid"
        ref={calendarRef}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        role="application"
        aria-label="Day calendar with time slots"
      >
        {timeSlots.map((time) => (
          <div key={time} className="time-slot" role="row">
            <div className="time-label" role="rowheader">{time}</div>
            <div
              className="time-slot-content"
              onClick={() => handleSlotClick(time)}
              role="button"
              tabIndex={0}
              aria-label={`Create task at ${time}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSlotClick(time);
                }
              }}
            />
          </div>
        ))}

        {/* Render task blocks */}
        <div style={{ position: "absolute", top: 0, left: 60, right: 0 }} role="list" aria-label="Scheduled tasks">
          {layoutedTasks.map(renderTaskBlock)}
        </div>
      </div>

      {/* Task Creation Modal */}
      {isCreating && (
        <div 
          className="modal-overlay" 
          onClick={() => setIsCreating(false)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setIsCreating(false);
            }
          }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-title"
        >
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3 id="modal-title">New Task</h3>

            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="task-title-input" style={{ display: "block", marginBottom: "8px" }}>
                Task Title
              </label>
              <input
                id="task-title-input"
                type="text"
                value={newTask.title}
                onChange={(e) =>
                  setNewTask({ ...newTask, title: e.target.value })
                }
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleCreateTask();
                  }
                }}
                placeholder="Enter task title"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "var(--input-bg)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
                autoFocus
                aria-required="true"
              />
            </div>

            <div
              style={{
                display: "flex",
                gap: "12px",
                marginBottom: "16px",
              }}
            >
              <div style={{ flex: 1 }}>
                <label htmlFor="task-start-time" style={{ display: "block", marginBottom: "8px" }}>
                  Start Time
                </label>
                <input
                  id="task-start-time"
                  type="time"
                  value={newTask.startTime}
                  onChange={(e) =>
                    setNewTask({ ...newTask, startTime: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--input-bg)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                  aria-required="true"
                />
              </div>

              <div style={{ flex: 1 }}>
                <label htmlFor="task-end-time" style={{ display: "block", marginBottom: "8px" }}>
                  End Time
                </label>
                <input
                  id="task-end-time"
                  type="time"
                  value={newTask.endTime}
                  onChange={(e) =>
                    setNewTask({ ...newTask, endTime: e.target.value })
                  }
                  style={{
                    width: "100%",
                    padding: "8px 12px",
                    background: "var(--input-bg)",
                    color: "var(--text)",
                    border: "1px solid var(--border)",
                    borderRadius: "8px",
                    fontSize: "14px",
                  }}
                  aria-required="true"
                />
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label id="color-picker-label" style={{ display: "block", marginBottom: "8px" }}>
                Color
              </label>
              <div
                role="radiogroup"
                aria-labelledby="color-picker-label"
                style={{
                  display: "flex",
                  gap: "8px",
                  flexWrap: "wrap",
                }}
              >
                {TASK_COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => setNewTask({ ...newTask, color })}
                    role="radio"
                    aria-checked={newTask.color === color}
                    aria-label={`Color ${color}`}
                    style={{
                      width: "40px",
                      height: "40px",
                      background: color,
                      border:
                        newTask.color === color
                          ? "3px solid var(--accent)"
                          : "1px solid var(--border)",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.2s ease",
                    }}
                    title={color}
                  />
                ))}
              </div>
            </div>

            <div style={{ marginBottom: "16px" }}>
              <label htmlFor="task-link-input" style={{ display: "block", marginBottom: "8px" }}>
                Link (Optional)
              </label>
              <input
                id="task-link-input"
                type="url"
                value={newTask.link}
                onChange={(e) =>
                  setNewTask({ ...newTask, link: e.target.value })
                }
                placeholder="https://example.com"
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  background: "var(--input-bg)",
                  color: "var(--text)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  fontSize: "14px",
                }}
                aria-describedby="link-help"
              />
              <span id="link-help" style={{ fontSize: "12px", color: "var(--muted)", display: "block", marginTop: "4px" }}>
                Add a URL to access related resources
              </span>
            </div>

            <div className="modal-actions">
              <button
                className="btn-secondary btn-sm"
                onClick={() => setIsCreating(false)}
                disabled={isLoading}
                aria-label="Cancel task creation"
              >
                Cancel
              </button>
              <button
                className="btn-primary btn-sm"
                onClick={handleCreateTask}
                disabled={isLoading}
                aria-label="Create task"
              >
                {isLoading ? <LoadingSpinner size="small" inline /> : 'Create Task'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
