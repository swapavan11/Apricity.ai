/**
 * SkeletonLoader Component
 * 
 * Displays skeleton screens during data loading for better UX.
 * Provides visual placeholders that match the actual content layout.
 * 
 * Props:
 *   - type: 'panel' | 'section' | 'action' | 'calendar' | 'task' | 'todo' - Type of skeleton
 *   - count: number - Number of skeleton items to render (default: 1)
 * 
 * Usage:
 *   <SkeletonLoader type="action" count={3} />
 */
export default function SkeletonLoader({ type = 'section', count = 1 }) {
  const renderSkeleton = () => {
    switch (type) {
      case 'panel':
        return <PanelSkeleton />;
      case 'section':
        return <SectionSkeleton />;
      case 'action':
        return <ActionSkeleton />;
      case 'calendar':
        return <CalendarSkeleton />;
      case 'task':
        return <TaskSkeleton />;
      case 'todo':
        return <TodoSkeleton />;
      default:
        return <SectionSkeleton />;
    }
  };

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <div key={index}>{renderSkeleton()}</div>
      ))}
    </>
  );
}

// Panel Skeleton - Full panel loading state
function PanelSkeleton() {
  return (
    <div className="skeleton-panel">
      <div className="skeleton skeleton-title"></div>
      <div className="skeleton skeleton-text"></div>
      <div className="skeleton skeleton-text short"></div>
      <div className="skeleton skeleton-section"></div>
      <div className="skeleton skeleton-section"></div>
    </div>
  );
}

// Section Skeleton - Generic section
function SectionSkeleton() {
  return (
    <div className="skeleton-section-wrapper">
      <div className="skeleton skeleton-title"></div>
      <div className="skeleton skeleton-text"></div>
      <div className="skeleton skeleton-text short"></div>
    </div>
  );
}

// Action Item Skeleton
function ActionSkeleton() {
  return (
    <div className="skeleton-action">
      <div className="skeleton-action-content">
        <div className="skeleton skeleton-text"></div>
        <div className="skeleton skeleton-text short"></div>
      </div>
      <div className="skeleton-action-buttons">
        <div className="skeleton skeleton-button"></div>
        <div className="skeleton skeleton-button"></div>
      </div>
    </div>
  );
}

// Calendar Skeleton
function CalendarSkeleton() {
  return (
    <div className="skeleton-calendar">
      <div className="skeleton-calendar-header">
        <div className="skeleton skeleton-button"></div>
        <div className="skeleton skeleton-title short"></div>
        <div className="skeleton skeleton-button"></div>
      </div>
      <div className="skeleton-calendar-grid">
        {Array.from({ length: 35 }).map((_, i) => (
          <div key={i} className="skeleton skeleton-calendar-day"></div>
        ))}
      </div>
    </div>
  );
}

// Task Block Skeleton
function TaskSkeleton() {
  return (
    <div className="skeleton-task">
      <div className="skeleton skeleton-text"></div>
      <div className="skeleton skeleton-text short"></div>
    </div>
  );
}

// Todo Item Skeleton
function TodoSkeleton() {
  return (
    <div className="skeleton-todo">
      <div className="skeleton skeleton-checkbox"></div>
      <div className="skeleton skeleton-text"></div>
      <div className="skeleton skeleton-button"></div>
    </div>
  );
}
