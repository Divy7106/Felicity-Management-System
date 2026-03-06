import React from 'react';

const Input = ({ 
  label, 
  type = 'text', 
  name, 
  value, 
  onChange, 
  placeholder, 
  required = false,
  error,
  className = '',
  containerClass = '',
  labelClass = '',
  iconShow = false,
  iconSVG = '',
  ...props
}) => {
  return (
    <div className={`${containerClass} mb-4`}>
      {label && (
        <label 
          htmlFor={name} 
          className={`flex items-center gap-2 text-md font-medium text-white mb-2 ${labelClass}`}
        >
          {iconShow && iconSVG && (
            <span dangerouslySetInnerHTML={{ __html: iconSVG }} className='w-5 h-5'/>
          )}
        <span>
        {label} {required && <span className="text-orange-500">*</span>}
        </span>
        </label>
      )}
      <input
        type={type}
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className={`w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 focus:border-transparent outline-none transition-all duration-200 ${
          error ? 'border-red-500 focus:ring-red-500' : ''
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default Input;
