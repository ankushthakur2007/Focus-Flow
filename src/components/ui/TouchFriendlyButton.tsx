import React from 'react';

interface TouchFriendlyButtonProps {
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  ariaLabel?: string;
  title?: string;
  children: React.ReactNode;
}

/**
 * A button component optimized for touch interactions on mobile devices
 * with larger touch targets and appropriate spacing
 */
const TouchFriendlyButton: React.FC<TouchFriendlyButtonProps> = ({
  onClick,
  className = '',
  disabled = false,
  type = 'button',
  ariaLabel,
  title,
  children,
}) => {
  // Base classes for touch-friendly buttons
  const baseClasses = 'min-h-[44px] min-w-[44px] p-3 flex items-center justify-center';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${className}`}
      aria-label={ariaLabel}
      title={title}
    >
      {children}
    </button>
  );
};

export default TouchFriendlyButton;
