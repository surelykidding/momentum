
import React, { useState, useEffect } from 'react';

interface PureDOMSliderProps {
  id?: string;
  name?: string;
  min: number;
  max: number;
  initialValue: number;
  step?: number;
  onValueChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
  showValue?: boolean;
  valueFormatter?: (value: number) => string;
  debounceMs?: number;
}

export const PureDOMSlider: React.FC<PureDOMSliderProps> = ({
  id,
  name,
  min,
  max,
  initialValue,
  step = 1,
  onValueChange,
  className = '',
  disabled = false,
  showValue = true,
  valueFormatter = (v) => `${v}`,
}) => {
  const [value, setValue] = useState(initialValue);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = Number(event.target.value);
    setValue(newValue);
    onValueChange(newValue);
  };

  return (
    <div className={`relative flex items-center space-x-3 ${className}`}>
        <input
            type="range"
            id={id}
            name={name}
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={handleChange}
            disabled={disabled}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-600"
        />
        {showValue && (
            <div className="min-w-[60px] text-right">
                <span className={`slider-value font-mono font-semibold ${disabled ? 'text-gray-400' : 'text-primary-500'}`}>
                    {valueFormatter(value)}
                </span>
            </div>
        )}
    </div>
  );
};
