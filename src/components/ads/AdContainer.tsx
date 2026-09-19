import React from 'react';

interface AdContainerProps {
  children: React.ReactNode;
  className?: string;
}

export const AdContainer: React.FC<AdContainerProps> = ({ children, className = '' }) => {
  return (
    <div className={`w-full max-w-5xl mx-auto px-4 py-4 ${className}`}>
      {children}
    </div>
  );
};
