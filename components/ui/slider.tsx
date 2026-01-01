"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value"> {
  value: number[];
  onValueChange: (value: number[]) => void;
}

export function Slider({
  className,
  value,
  onValueChange,
  ...props
}: SliderProps) {
  const [minValue = 0, maxValue = 0] = value;
  const isRange = value.length > 1;

  if (isRange) {
    const min = Number(props.min ?? 0);
    const max = Number(props.max ?? 100);
    const range = max - min;
    
    // Calculate percentages for the filled track
    const leftPercent = ((minValue - min) / range) * 100;
    const rightPercent = ((maxValue - min) / range) * 100;

    return (
      <div className={cn("relative h-6 flex items-center", className)}>
        {/* Background track */}
        <div className="absolute inset-x-0 h-2 bg-secondary rounded-full" />
        
        {/* Filled track between thumbs */}
        <div 
          className="absolute h-2 bg-primary rounded-full"
          style={{
            left: `${leftPercent}%`,
            right: `${100 - rightPercent}%`,
          }}
        />
        
        {/* Min thumb slider */}
        <input
          type="range"
          className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-md"
          style={{ zIndex: 5 }}
          value={minValue}
          onChange={(event) => {
            const next = Number(event.target.value);
            onValueChange([Math.min(next, maxValue), maxValue]);
          }}
          {...props}
        />
        
        {/* Max thumb slider */}
        <input
          type="range"
          className="absolute inset-0 w-full appearance-none bg-transparent pointer-events-none [&::-webkit-slider-thumb]:pointer-events-auto [&::-moz-range-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-background [&::-webkit-slider-thumb]:cursor-pointer [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:appearance-none [&::-moz-range-thumb]:w-5 [&::-moz-range-thumb]:h-5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-primary [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-background [&::-moz-range-thumb]:cursor-pointer [&::-moz-range-thumb]:shadow-md"
          style={{ zIndex: 6 }}
          value={maxValue}
          onChange={(event) => {
            const next = Number(event.target.value);
            onValueChange([minValue, Math.max(next, minValue)]);
          }}
          {...props}
        />
      </div>
    );
  }

  return (
    <input
      type="range"
      className={cn("w-full accent-primary", className)}
      value={value[0] ?? 0}
      onChange={(event) =>
        onValueChange([Number(event.target.value)])
      }
      {...props}
    />
  );
}
