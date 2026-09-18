import React from 'react';
import Link from 'next/link';

interface LogoProps {
  className?: string;
  showTagline?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const DocuNexaLogo: React.FC<LogoProps> = ({
  className = '',
  showTagline = false,
  size = 'md',
}) => {
  const iconSizes = {
    sm: 'w-7 h-7',
    md: 'w-9 h-9',
    lg: 'w-11 h-11',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <Link href="/" className={`inline-flex items-center gap-3 group select-none ${className}`}>
      {/* Brand Icon */}
      <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-tr from-brand-600 via-indigo-600 to-rose-500 p-0.5 shadow-md shadow-brand-500/20 transition-all duration-300 group-hover:shadow-brand-500/35 group-hover:scale-105 ${iconSizes[size]}`}>
        <div className="w-full h-full bg-white dark:bg-slate-900 rounded-[10px] flex items-center justify-center p-1.5">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-full h-full text-brand-600 dark:text-brand-400 transition-transform duration-300 group-hover:scale-110"
          >
            {/* Document sheet with smart layered fold */}
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            {/* Nexa precision node symbol inside */}
            <path d="M9 13h6" strokeWidth="2" />
            <path d="M9 17h3" strokeWidth="2" />
            <circle cx="15" cy="17" r="1" fill="currentColor" />
          </svg>
        </div>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col leading-none">
        <span className={`font-bold tracking-tight text-slate-900 dark:text-white ${textSizes[size]}`}>
          Docu<span className="text-brand-600 dark:text-brand-400">Nexa</span>
        </span>
        {showTagline && (
          <span className="text-[10px] font-medium tracking-wide text-slate-600 dark:text-slate-300 mt-0.5">
            Every PDF tool. One simple workspace.
          </span>
        )}
      </div>
    </Link>
  );
};
