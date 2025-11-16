import { useState, useEffect, useRef, memo, useCallback } from "react";
import useApi from "../../../api/useApi";
import ErrorMessage from "../ErrorMessage";
import { validateActionText, validateDeadline } from "../utils/validation";

function GoalSection({ ultimateGoal, shortTermActions, onUpdate }) {
  const api = useApi();
  const [localGoal, setLocalGoal] = useState(ultimateGoal || '');
  const [actions, setActions] = useState(shortTermActions || []);
  const [isAddingAction, setIsAddingAction] = useState(false);
  const [editingActionId, setEditingActionId] = useState(null);
  const [newActionText, setNewActionText] = useState('');
  const [newActionDeadline, setNewActionDeadline] = useState('');
  const [error, setError] = useState(null);
  const textareaRef = useRef(null);

  // Sync with parent props
  useEffect(() => {
    setLocalGoal(ultimateGoal || '');
  }, [ultimateGoal]);

  useEffect(() => {
    setActions(shortTermActions || []);
  }, [shortTermActions]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [localGoal]);

  // Handle ultimate goal change
  const handleGoalChange = (e) => {
    const value = e.target.value;
    setLocalGoal(value);
    onUpdate('ultimateGoal', value);
  };

  // Calculate deadline status
  const getDeadlineStatus = (deadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline);
    const daysUntil = Math.ceil((deadlineDate - now) / (1000 * 60 * 60 * 24));

    if (daysUntil < 0) {
      return { status: 'overdue', label: 'Overdue', className: 'overdue' };
    } else if (daysUntil <= 3) {
      return { status: 'approaching', label: `${daysUntil} day${daysUntil !== 1 ? 's' : ''} left`, className: 'approaching' };
    } else {
      return { status: 'normal', label: formatDate(deadlineDate), className: '' };
    }
  };

  // Format date for display
  const formatDate = (date) => {
    const d = new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Add new action
  const handleAddAction = async () => {
    // Validate action text
    const textValidation = validateActionText(newActionText);
    if (!textValidation.isValid) {
      setError(textValidation.error);
      return;
    }

    // Validate deadline
    const deadlineValidation = validateDeadline(newActionDeadline);
    if (!deadlineValidation.isValid) {
      setError(deadlineValidation.error);
      return;
    }

    try {
      setError(null);
      const response = await api.createAction(newActionText.trim(), newActionDeadline);
      
      if (response.success && response.action) {
        const updatedActions = [...actions, response.action];
        setActions(updatedActions);
        onUpdate('shortTermActions', updatedActions);
        
        // Reset form
        setNewActionText('');
        setNewActionDeadline('');
        setIsAddingAction(false);
      }
    } catch (err) {
      console.error('Failed to add action:', err);
      setError('Failed to add action. Please try again.');
    }
  };

  // Update action
  const handleUpdateAction = async (actionId, text, deadline) => {
    try {
      setError(null);
      const response = await api.updateAction(actionId, text, deadline);
      
      if (response.success) {
        const updatedActions = actions.map(action =>
          action.id === actionId || action._id === actionId
            ? { ...action, text, deadline }
            : action
        );
        setActions(updatedActions);
        onUpdate('shortTermActions', updatedActions);
        setEditingActionId(null);
      }
    } catch (err) {
      console.error('Failed to update action:', err);
      setError('Failed to update action. Please try again.');
    }
  };

  // Delete action
  const handleDeleteAction = async (actionId) => {
    try {
      setError(null);
      const response = await api.deleteAction(actionId);
      
      if (response.success) {
        const updatedActions = actions.filter(action => 
          action.id !== actionId && action._id !== actionId
        );
        setActions(updatedActions);
        onUpdate('shortTermActions', updatedActions);
      }
    } catch (err) {
      console.error('Failed to delete action:', err);
      setError('Failed to delete action. Please try again.');
    }
  };

  // Cancel add/edit
  const handleCancelAdd = () => {
    setIsAddingAction(false);
    setNewActionText('');
    setNewActionDeadline('');
    setError(null);
  };

  const handleCancelEdit = () => {
    setEditingActionId(null);
    setError(null);
  };

  return (
    <div className="study-section goal-section">
      {/* Ultimate Goal */}
      <div className="ultimate-goal">
        <label htmlFor="ultimate-goal-input">
          <h3 id="goal-section-heading">Ultimate Goal</h3>
        </label>
        <textarea
          id="ultimate-goal-input"
          ref={textareaRef}
          value={localGoal}
          onChange={handleGoalChange}
          placeholder="What's your long-term objective? (e.g., Complete CS degree with honors)"
          rows={3}
          aria-label="Ultimate goal"
        />
      </div>

      {/* Short-term Actions */}
      <div className="short-term-actions">
        <h3 id="actions-heading">Short-term Actions</h3>
        
        {error && (
          <ErrorMessage 
            message={error} 
            type="error"
            onDismiss={() => setError(null)}
          />
        )}

        <ul className="action-list" role="list" aria-labelledby="actions-heading">
          {actions.map((action) => {
            const actionId = action.id || action._id;
            const isEditing = editingActionId === actionId;
            const deadlineInfo = getDeadlineStatus(action.deadline);

            if (isEditing) {
              return (
                <ActionEditForm
                  key={actionId}
                  action={action}
                  onSave={(text, deadline) => handleUpdateAction(actionId, text, deadline)}
                  onCancel={handleCancelEdit}
                />
              );
            }

            return (
              <div
                key={actionId}
                className={`action-item ${deadlineInfo.className}`}
                role="listitem"
              >
                <div className="action-content">
                  <div className="action-text">{action.text}</div>
                  <div className={`action-deadline ${deadlineInfo.className}`}>
                    <span className="deadline-icon">📅</span>
                    <span className="deadline-label">{deadlineInfo.label}</span>
                  </div>
                </div>
                <div className="action-buttons">
                  <button
                    onClick={() => setEditingActionId(actionId)}
                    className="btn-icon"
                    aria-label="Edit action"
                    title="Edit"
                  >
                    ✏️
                  </button>
                  <button
                    onClick={() => handleDeleteAction(actionId)}
                    className="btn-icon btn-delete"
                    aria-label="Delete action"
                    title="Delete"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </ul>

        {/* Add Action Form */}
        {isAddingAction ? (
          <ActionEditForm
            onSave={(text, deadline) => {
              setNewActionText(text);
              setNewActionDeadline(deadline);
              handleAddAction();
            }}
            onCancel={handleCancelAdd}
            initialText={newActionText}
            initialDeadline={newActionDeadline}
          />
        ) : (
          <button
            onClick={() => setIsAddingAction(true)}
            className="btn-primary btn-add-action"
            aria-label="Add new action"
          >
            + Add Action
          </button>
        )}
      </div>
    </div>
  );
}

// Memoize to prevent unnecessary re-renders
export default memo(GoalSection);

// Action Edit Form Component (memoized)
const ActionEditForm = memo(function ActionEditForm({ action, onSave, onCancel, initialText = '', initialDeadline = '' }) {
  const [text, setText] = useState(action ? action.text : initialText);
  const [deadline, setDeadline] = useState(
    action ? new Date(action.deadline).toISOString().split('T')[0] : initialDeadline
  );
  const [validationError, setValidationError] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate text
    const textValidation = validateActionText(text);
    if (!textValidation.isValid) {
      setValidationError(textValidation.error);
      return;
    }

    // Validate deadline
    const deadlineValidation = validateDeadline(deadline);
    if (!deadlineValidation.isValid) {
      setValidationError(deadlineValidation.error);
      return;
    }

    setValidationError(null);
    onSave(text.trim(), deadline);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      onCancel();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="action-edit-form" onKeyDown={handleKeyDown}>
      {validationError && (
        <ErrorMessage 
          message={validationError} 
          type="error"
          onDismiss={() => setValidationError(null)}
        />
      )}
      <input
        type="text"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Action description"
        autoFocus
        required
        aria-label="Action text"
        className={validationError && !validateActionText(text).isValid ? 'input-error' : ''}
      />
      <input
        type="date"
        value={deadline}
        onChange={(e) => setDeadline(e.target.value)}
        required
        aria-label="Action deadline"
        className={validationError && !validateDeadline(deadline).isValid ? 'input-error' : ''}
      />
      <div className="action-form-buttons">
        <button type="submit" className="btn-primary btn-sm">
          Save
        </button>
        <button type="button" onClick={onCancel} className="btn-secondary btn-sm">
          Cancel
        </button>
      </div>
    </form>
  );
});
