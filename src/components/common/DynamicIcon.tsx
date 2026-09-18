import React from 'react';
import * as Icons from 'lucide-react';

interface DynamicIconProps {
  name: string;
  className?: string;
  size?: number;
}

export const DynamicIcon: React.FC<DynamicIconProps> = ({ name, className = '', size = 20 }) => {
  const LucideIcon = (Icons as Record<string, any>)[name] || Icons.FileText;
  return <LucideIcon size={size} className={className} />;
};
