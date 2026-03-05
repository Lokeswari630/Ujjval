import React from 'react';

const Button = ({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}) => {
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700',
    secondary: 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50',
    ghost: 'bg-transparent text-blue-700 hover:bg-blue-50'
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
