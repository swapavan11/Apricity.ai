import React, { useEffect, useState } from 'react';

export default function Toast({ message, type = 'info', duration = 3000, onClose }) {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsVisible(false);
      setTimeout(onClose, 300); // Wait for fade out animation
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return '#6ee7b7';
      case 'error': return '#ff7c7c';
      case 'warning': return '#ffa500';
      default: return '#7c9cff';
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        background: getBackgroundColor(),
        color: '#000',
        padding: '12px 20px',
        borderRadius: 8,
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontWeight: 600,
        fontSize: '0.95em',
        maxWidth: '400px',
        animation: 'slideInRight 0.3s ease-out',
        opacity: isVisible ? 1 : 0,
        transition: 'opacity 0.3s ease-out'
      }}
    >
      <span style={{ fontSize: '1.2em' }}>{getIcon()}</span>
      <span>{message}</span>
    </div>
  );
}
