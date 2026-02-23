import React from 'react';

const CheckBox = ({ 
  label, 
  name, 
  checked, 
  onChange, 
  required = false,
  error,
  className = '',
  labelClass = '',
}) => {
  return (
    <div className="w-full mb-4">
      <div className="flex items-center">
        <input
          type="checkbox"
          id={name}
          name={name}
          checked={checked}
          onChange={onChange}
          required={required}
          className={`accent-orange-400 w-4 h-4 cursor-pointer ${error ? 'border-red-500' : ''} ${className}`}
        />
        {label && (
          <label 
            htmlFor={name} 
            className={`ml-2 text-sm font-medium cursor-pointer select-none ${labelClass}`}
          >
            {label} {required && <span className="text-red-500">*</span>}
          </label>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
};

export default CheckBox;
