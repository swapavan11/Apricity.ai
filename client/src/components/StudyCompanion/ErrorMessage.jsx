/**
 * ErrorMessage Component
 * 
 * Displays inline error messages with consistent styling.
 * Supports different severity levels and auto-dismiss functionality.
 * 
 * Props:
 *   - message: string - The error message to display
 *   - type: 'error' | 'warning' | 'info' - Message severity (default: 'error')
 *   - onDismiss: function - Optional callback when user dismisses the message
 *   - autoDismiss: number - Optional milliseconds before auto-dismissing
 * 
 * Usage:
 *   <ErrorMessage 
 *     message="Failed to save data" 
 *     type="error"
 *     onDismiss={() => setError(null)}
 *   />
 */
export default function ErrorMessage({ 
  message, 
  type = 'error', 
  onDismiss,
  autoDismiss 
}) {
  // Auto-dismiss after specified time
  if (autoDismiss && onDismiss) {
    setTimeout(() => {
      onDismiss();
    }, autoDismiss);
  }

  const getIcon = () => {
    switch (type) {
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      default:
        return '❌';
    }
  };

  const getClassName = () => {
    return `inline-message inline-message-${type}`;
  };

  if (!message) return null;

  return (
    <div className={getClassName()} role="alert">
      <span className="inline-message-icon">{getIcon()}</span>
      <span className="inline-message-text">{message}</span>
      {onDismiss && (
        <button 
          className="inline-message-dismiss"
          onClick={onDismiss}
          aria-label="Dismiss message"
        >
          ✕
        </button>
      )}
    </div>
  );
}
