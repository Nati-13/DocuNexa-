'use client';

import React, { useEffect, useState } from 'react';

export const ScrollProgress: React.FC = () => {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const scrollHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (scrollHeight > 200) {
        const currentProgress = Math.min(1, Math.max(0, window.scrollY / scrollHeight));
        setProgress(currentProgress);
      } else {
        setProgress(0);
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (progress <= 0) return null;

  return (
    <div
      aria-hidden="true"
      className="fixed top-16 left-0 right-0 h-0.5 z-40 bg-transparent pointer-events-none"
    >
      <div
        className="h-full bg-brand origin-left transition-transform duration-75 ease-out motion-reduce:hidden"
        style={{ transform: `scaleX(${progress})` }}
      />
    </div>
  );
};
