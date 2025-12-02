
import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children?: React.ReactNode;
  className?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = "", ...props }) => (
  <div className={`bg-white rounded-xl shadow-sm border border-slate-200 w-full max-w-full ${className}`} {...props}>
    {children}
  </div>
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  children?: React.ReactNode;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  type?: "button" | "submit" | "reset";
  disabled?: boolean;
  title?: string;
  // FIX: Explicitly add 'form' attribute to ButtonProps to fix type error.
  form?: string;
}

export const Button = ({ 
  children, variant = 'primary', size = 'md', className = "", ...props 
}: ButtonProps) => {
  const baseClass = "rounded-lg font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed";
  
  const sizes = {
    sm: "px-3 py-1.5 text-sm",
    md: "px-4 py-2",
    lg: "px-6 py-3 text-lg"
  };

  const variants = {
    primary: "bg-gradient-to-r from-red-700 to-red-600 text-white hover:shadow-lg hover:from-red-800 hover:to-red-700 border border-red-800",
    secondary: "bg-slate-100 text-slate-700 hover:bg-slate-200",
    danger: "bg-red-500 text-white hover:bg-red-600",
    outline: "border border-slate-300 text-slate-700 hover:bg-slate-50"
  };

  return (
    <button className={`${baseClass} ${sizes[size]} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export interface BadgeProps {
  children?: React.ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger';
  className?: string;
}

export const Badge = ({ children, variant = 'default', className = "" }: BadgeProps) => {
  const variants = {
    default: "bg-slate-100 text-slate-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-red-100 text-red-800"
  };
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${variants[variant]} ${className}`}>
      {children}
    </span>
  );
};

export const Input = ({ label, labelClassName, className = "", ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label?: string, labelClassName?: string }) => (
  <div className="space-y-1">
    {label && <label className={`text-sm font-medium ${labelClassName || 'text-slate-700'}`}>{label}</label>}
    <input 
      className={`w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all placeholder:text-slate-400 ${className}`}
      {...props} 
    />
  </div>
);

export const Select = ({ label, labelClassName, className = "", children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label?: string, labelClassName?: string }) => (
  <div className="space-y-1">
    {label && <label className={`text-sm font-medium ${labelClassName || 'text-slate-700'}`}>{label}</label>}
    <select 
      className={`w-full px-3 py-2 border border-slate-300 bg-white text-slate-900 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-all ${className}`}
      {...props} 
    >
      {children}
    </select>
  </div>
);

// Custom Drone Icon
export const DroneIcon = ({ className = "w-6 h-6", ...props }: React.SVGProps<SVGSVGElement>) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className} 
    {...props}
  >
    <path d="M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0" />
    <path d="M12 12v-4" />
    <path d="M12 12v4" />
    <path d="M4.5 9m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0" />
    <path d="M19.5 9m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0" />
    <path d="M4.5 15m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0" />
    <path d="M19.5 15m-2.5 0a2.5 2.5 0 1 0 5 0a2.5 2.5 0 1 0 -5 0" />
    <path d="M7 9l3 3" />
    <path d="M17 9l-3 3" />
    <path d="M7 15l3 -3" />
    <path d="M17 15l-3 -3" />
  </svg>
);
