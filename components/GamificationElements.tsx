import React, { useState, useEffect, useRef } from 'react';

interface ProgressBarProps {
  progress: number;
  color?: 'primary' | 'success' | 'warning' | 'danger' | 'accent';
  height?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
  animate?: boolean;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  color = 'primary',
  height = 'md',
  showLabel = false,
  animate = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const progressRef = useRef<HTMLDivElement>(null);

  // Map color to gradient classes
  const colorMap = {
    primary: 'from-primary-400 to-primary-600',
    success: 'from-success-400 to-success-600',
    warning: 'from-warning-400 to-warning-600',
    danger: 'from-danger-400 to-danger-600',
    accent: 'from-accent-400 to-accent-600',
  };

  // Map height to size classes
  const heightMap = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (progressRef.current) {
      observer.observe(progressRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div className="w-full">
      <div className={`progress-bar ${heightMap[height]} rounded-full overflow-hidden`} ref={progressRef}>
        <div
          className={`progress-bar-fill bg-gradient-to-r ${colorMap[color]} ${animate && isVisible ? 'animate' : ''}`}
          style={{
            width: `${progress}%`,
            '--progress-width': `${progress}%`,
          } as React.CSSProperties}
        ></div>
      </div>
      {showLabel && (
        <div className="mt-1 text-xs text-gray-600 dark:text-gray-400 text-right">
          {progress}%
        </div>
      )}
    </div>
  );
};

interface AchievementBadgeProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  unlocked: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const AchievementBadge: React.FC<AchievementBadgeProps> = ({
  icon,
  title,
  description,
  unlocked,
  size = 'md',
}) => {
  const sizeMap = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-20 h-20',
  };

  const iconSizeMap = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <div className="flex flex-col items-center">
      <div className={`achievement-badge ${unlocked ? 'unlocked' : ''} mb-2`}>
        <div className={`${sizeMap[size]} rounded-full flex items-center justify-center bg-gray-200 dark:bg-gray-700 inner-badge`}>
          <span className={`${iconSizeMap[size]} ${unlocked ? 'text-white' : 'text-gray-500 dark:text-gray-400'}`}>
            {icon}
          </span>
        </div>
        {unlocked && (
          <div className="absolute top-0 right-0 transform translate-x-1/4 -translate-y-1/4">
            <div className="bg-success-500 text-white rounded-full p-1 text-xs">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
        )}
      </div>
      <h4 className="font-medium text-sm text-center">{title}</h4>
      <p className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">{description}</p>
    </div>
  );
};

interface ConfettiProps {
  count?: number;
  colors?: string[];
}

export const Confetti: React.FC<ConfettiProps> = ({
  count = 50,
  colors = ['#3a7fff', '#ec4899', '#10b981', '#f59e0b', '#ef4444'],
}) => {
  const [confetti, setConfetti] = useState<React.ReactNode[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const newConfetti: React.ReactNode[] = [];
    
    for (let i = 0; i < count; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const size = Math.random() * 10 + 5;
      const left = Math.random() * 100;
      const delay = Math.random() * 3;
      const duration = Math.random() * 2 + 2;
      const rotation = Math.random() * 360;
      
      newConfetti.push(
        <div
          key={i}
          className="confetti"
          style={{
            backgroundColor: color,
            width: `${size}px`,
            height: `${size}px`,
            left: `${left}%`,
            animationDelay: `${delay}s`,
            animationDuration: `${duration}s`,
            transform: `rotate(${rotation}deg)`,
          }}
        />
      );
    }
    
    setConfetti(newConfetti);
    
    // Clean up after animation completes
    const timer = setTimeout(() => {
      setConfetti([]);
    }, 5000);
    
    return () => clearTimeout(timer);
  }, [count, colors]);

  return <div ref={containerRef} className="confetti-container">{confetti}</div>;
};

interface LevelBadgeProps {
  level: number;
  size?: 'sm' | 'md' | 'lg';
}

export const LevelBadge: React.FC<LevelBadgeProps> = ({ level, size = 'md' }) => {
  const sizeMap = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
  };

  return (
    <div className={`${sizeMap[size]} rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold shadow-glow`}>
      {level}
    </div>
  );
};

export default {
  ProgressBar,
  AchievementBadge,
  Confetti,
  LevelBadge,
};
