import { useState, useMemo, memo } from "react";

function StudyCalendar({ 
  selectedDate, 
  onDateChange, 
  studySessions = [],
  dailyCommitment 
}) {
  // Current view month/year (can be different from selectedDate)
  const [viewDate, setViewDate] = useState(new Date(selectedDate));
  const [focusedDate, setFocusedDate] = useState(selectedDate);

  // Calculate study hours per day from study sessions
  const studyHoursByDate = useMemo(() => {
    const hoursByDate = {};
    
    studySessions.forEach(session => {
      const date = session.date; // YYYY-MM-DD format
      if (!hoursByDate[date]) {
        hoursByDate[date] = 0;
      }
      // duration is in seconds, convert to hours
      hoursByDate[date] += session.duration / 3600;
    });
    
    return hoursByDate;
  }, [studySessions]);

  // Calculate daily commitment in hours
  const dailyCommitmentHours = useMemo(() => {
    const hours = dailyCommitment?.hours || 0;
    const minutes = dailyCommitment?.minutes || 0;
    return hours + (minutes / 60);
  }, [dailyCommitment]);

  // Get calendar data for current view
  const calendarData = useMemo(() => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday
    
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();
    
    // Previous month days to show
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const prevMonthDays = firstDayOfWeek;
    
    // Next month days to show
    const totalCells = Math.ceil((daysInMonth + prevMonthDays) / 7) * 7;
    const nextMonthDays = totalCells - (daysInMonth + prevMonthDays);
    
    const days = [];
    
    // Previous month days
    for (let i = prevMonthDays - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i;
      const date = new Date(year, month - 1, day);
      days.push({
        day,
        date,
        isCurrentMonth: false,
        isPrevMonth: true
      });
    }
    
    // Current month days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      days.push({
        day,
        date,
        isCurrentMonth: true,
        isPrevMonth: false
      });
    }
    
    // Next month days
    for (let day = 1; day <= nextMonthDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        day,
        date,
        isCurrentMonth: false,
        isPrevMonth: false
      });
    }
    
    return days;
  }, [viewDate]);

  // Format date to YYYY-MM-DD for comparison
  const formatDateKey = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Check if date is today
  const isToday = (date) => {
    const today = new Date();
    return date.getDate() === today.getDate() &&
           date.getMonth() === today.getMonth() &&
           date.getFullYear() === today.getFullYear();
  };

  // Check if date is selected
  const isSelected = (date) => {
    return date.getDate() === selectedDate.getDate() &&
           date.getMonth() === selectedDate.getMonth() &&
           date.getFullYear() === selectedDate.getFullYear();
  };

  // Get study hours for a date
  const getStudyHours = (date) => {
    const dateKey = formatDateKey(date);
    return studyHoursByDate[dateKey] || 0;
  };

  // Get color class based on daily commitment achievement
  const getColorClass = (date, hours) => {
    if (hours === 0) return '';
    
    if (dailyCommitmentHours === 0) {
      return 'has-hours';
    }
    
    const percentage = hours / dailyCommitmentHours;
    
    if (percentage >= 1) {
      return 'goal-met';
    } else if (percentage >= 0.5) {
      return 'goal-partial';
    } else {
      return 'has-hours';
    }
  };

  // Navigate to previous month
  const goToPrevMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setViewDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Handle date click
  const handleDateClick = (date) => {
    onDateChange(date);
    setFocusedDate(date);
  };

  // Handle keyboard navigation
  const handleKeyDown = (e, date) => {
    let newDate = new Date(date);
    
    switch(e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleDateClick(date);
        break;
      case 'ArrowLeft':
        e.preventDefault();
        newDate.setDate(newDate.getDate() - 1);
        setFocusedDate(newDate);
        onDateChange(newDate);
        break;
      case 'ArrowRight':
        e.preventDefault();
        newDate.setDate(newDate.getDate() + 1);
        setFocusedDate(newDate);
        onDateChange(newDate);
        break;
      case 'ArrowUp':
        e.preventDefault();
        newDate.setDate(newDate.getDate() - 7);
        setFocusedDate(newDate);
        onDateChange(newDate);
        break;
      case 'ArrowDown':
        e.preventDefault();
        newDate.setDate(newDate.getDate() + 7);
        setFocusedDate(newDate);
        onDateChange(newDate);
        break;
      case 'Home':
        e.preventDefault();
        newDate = new Date(newDate.getFullYear(), newDate.getMonth(), 1);
        setFocusedDate(newDate);
        onDateChange(newDate);
        break;
      case 'End':
        e.preventDefault();
        newDate = new Date(newDate.getFullYear(), newDate.getMonth() + 1, 0);
        setFocusedDate(newDate);
        onDateChange(newDate);
        break;
      case 'PageUp':
        e.preventDefault();
        if (e.shiftKey) {
          // Previous year
          newDate.setFullYear(newDate.getFullYear() - 1);
        } else {
          // Previous month
          newDate.setMonth(newDate.getMonth() - 1);
        }
        setFocusedDate(newDate);
        setViewDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
        onDateChange(newDate);
        break;
      case 'PageDown':
        e.preventDefault();
        if (e.shiftKey) {
          // Next year
          newDate.setFullYear(newDate.getFullYear() + 1);
        } else {
          // Next month
          newDate.setMonth(newDate.getMonth() + 1);
        }
        setFocusedDate(newDate);
        setViewDate(new Date(newDate.getFullYear(), newDate.getMonth(), 1));
        onDateChange(newDate);
        break;
      default:
        break;
    }
  };

  // Format month/year for display
  const monthYearDisplay = useMemo(() => {
    const options = { month: 'long', year: 'numeric' };
    return viewDate.toLocaleDateString('en-US', options);
  }, [viewDate]);

  return (
    <div className="study-section study-calendar">
      <div className="calendar-header">
        <h3 id="calendar-month-year" aria-live="polite">{monthYearDisplay}</h3>
        <div className="calendar-nav" role="group" aria-label="Calendar navigation">
          <button 
            className="btn-icon" 
            onClick={goToPrevMonth}
            aria-label="Previous month"
            title="Previous month"
          >
            ◀
          </button>
          <button 
            className="btn-icon" 
            onClick={goToNextMonth}
            aria-label="Next month"
            title="Next month"
          >
            ▶
          </button>
        </div>
      </div>

      <div className="calendar-grid" role="grid" aria-labelledby="calendar-month-year">
        {/* Day headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="calendar-day-header" role="columnheader">
            {day}
          </div>
        ))}

        {/* Calendar days */}
        {calendarData.map((dayData, index) => {
          const hours = getStudyHours(dayData.date);
          const colorClass = getColorClass(dayData.date, hours);
          const isFocused = focusedDate && 
            dayData.date.getDate() === focusedDate.getDate() &&
            dayData.date.getMonth() === focusedDate.getMonth() &&
            dayData.date.getFullYear() === focusedDate.getFullYear();
          
          return (
            <div
              key={index}
              className={`calendar-day 
                ${!dayData.isCurrentMonth ? 'other-month' : ''} 
                ${isToday(dayData.date) ? 'current' : ''} 
                ${isSelected(dayData.date) ? 'selected' : ''}
                ${colorClass}
              `}
              onClick={() => handleDateClick(dayData.date)}
              role="button"
              tabIndex={isFocused ? 0 : -1}
              aria-label={`${dayData.date.toLocaleDateString()}, ${hours > 0 ? `${hours.toFixed(1)} hours studied` : 'no study hours'}`}
              aria-current={isToday(dayData.date) ? 'date' : undefined}
              onKeyDown={(e) => handleKeyDown(e, dayData.date)}
            >
              <span className="calendar-day-number" aria-hidden="true">{dayData.day}</span>
              {hours > 0 && (
                <span className="study-hours-label" aria-hidden="true">
                  {hours.toFixed(1)}h
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(StudyCalendar);
