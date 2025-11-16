/**
 * LoadingSpinner Component
 * 
 * Reusable loading spinner with different sizes and optional text.
 * 
 * Props:
 *   - size: 'small' | 'medium' | 'large' - Spinner size (default: 'medium')
 *   - text: string - Optional loading text to display
 *   - inline: boolean - Display inline with text (default: false)
 * 
 * Usage:
 *   <LoadingSpinner size="small" text="Loading..." />
 *   <LoadingSpinner size="large" />
 */
export default function LoadingSpinner({ size = 'medium', text, inline = false }) {
  const getSizeClass = () => {
    switch (size) {
      case 'small':
        return 'loading-spinner-small';
      case 'large':
        return 'loading-spinner-large';
      default:
        return 'loading-spinner-medium';
    }
  };

  if (inline) {
    return (
      <span className="inline-loading">
        <span className={`loading-spinner ${getSizeClass()}`}></span>
        {text && <span>{text}</span>}
      </span>
    );
  }

  return (
    <div className="component-loading">
      <div className={`loading-spinner ${getSizeClass()}`}></div>
      {text && <div>{text}</div>}
    </div>
  );
}
