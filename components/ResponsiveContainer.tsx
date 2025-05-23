import React from 'react';

interface ResponsiveContainerProps {
  children: React.ReactNode;
  className?: string;
  as?: React.ElementType;
}

/**
 * A responsive container component that provides consistent spacing
 * and width constraints across different screen sizes
 */
const ResponsiveContainer: React.FC<ResponsiveContainerProps> = ({
  children,
  className = '',
  as: Component = 'div',
}) => {
  return (
    <Component
      className={`w-full px-4 sm:px-6 md:px-8 mx-auto max-w-7xl ${className}`}
    >
      {children}
    </Component>
  );
};

export default ResponsiveContainer;
