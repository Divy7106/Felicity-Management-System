import React from 'react';

const Button = ({ 
  children, 
  type = 'button', 
  onClick, 
  disabled = false,
  variant = 'primary',
  className = '',
  fullWidth = false,
  isbaseStyles = true, 
  toolTip = "",
  props
}) => {
  const baseStyles = 'bg-stone-800';
  
  const variants = {
    primary: 'cursor-pointer text-lg text-white bg-orange-400 flex justify-center duration-150 items-center transition-all hover:text-black rounded-md active:bg-orange-500',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 focus:ring-gray-500',
    outline: 'bg-transparent border-2 border-blue-600 text-blue-600 hover:bg-blue-50 focus:ring-blue-500',
    success: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500',
    danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    custom: ''
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      title={toolTip}
      className={`${isbaseStyles ? baseStyles : ""} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${disabled ? 'opacity-60 cursor-not-allowed' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

export default Button;
