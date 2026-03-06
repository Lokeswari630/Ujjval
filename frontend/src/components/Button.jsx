import React from 'react';

const Button = ({
  children,
  variant = 'primary',
  className = '',
  type = 'button',
  ...props
}) => {
  const variants = {
    primary: 'bg-linear-to-r from-sky-600 to-cyan-500 text-white shadow-md shadow-sky-300/40 hover:from-sky-700 hover:to-cyan-600',
    secondary: 'bg-white text-sky-700 border border-sky-200 shadow-sm hover:bg-sky-50 hover:border-sky-300',
    ghost: 'bg-transparent text-sky-700 hover:bg-sky-50'
  };

  return (
    <button
      type={type}
      className={`inline-flex items-center justify-center rounded-lg px-5 py-2.5 text-sm font-semibold tracking-wide transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-sky-400/60 ${variants[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
