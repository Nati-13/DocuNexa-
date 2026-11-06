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
    <Link href="/" aria-label="DocuNexa" className={`inline-flex items-center gap-3 group select-none ${className}`}>
      {/* Brand Icon */}
      <div className={`relative flex items-center justify-center rounded-md bg-brand text-brand-fg p-0.5 transition-all duration-300 group-hover:scale-105 ${iconSizes[size]}`}>
        <div className="w-full h-full bg-surface rounded-[10px] flex items-center justify-center p-1.5">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-full h-full text-brand transition-transform duration-300 group-hover:scale-110"
          >
            {/* Document sheet with smart layered fold */}
            <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
            <polyline points="14 2 14 8 20 8" />
            {/* Stylized geometric 'N' brand mark inside */}
            <path
              d="M 8.5 11.5 H 10.5 L 14.5 17.5 V 11.5 H 16.5 V 19.5 H 14.5 L 10.5 13.5 V 19.5 H 8.5 Z"
              fill="currentColor"
              stroke="none"
            />
          </svg>
        </div>
      </div>

      {/* Brand Text */}
      <div className="flex flex-col leading-none">
        <span className={`font-bold tracking-tight text-ink ${textSizes[size]}`}>
          Docu<span className="text-brand">Nexa</span>
        </span>
        {showTagline && (
          <span className="text-[10px] font-medium tracking-wide text-muted mt-0.5">
            Every PDF tool. One simple workspace.
          </span>
        )}
      </div>
    </Link>
  );
};
