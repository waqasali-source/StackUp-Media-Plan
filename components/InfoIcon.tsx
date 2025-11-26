import React, { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';

interface InfoIconProps {
  text: string;
  size?: number;
}

export const InfoIcon: React.FC<InfoIconProps> = ({ text, size = 14 }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setPosition({
        top: rect.top - 8, // 8px margin above the icon
        left: rect.left + rect.width / 2, // Center horizontally
      });
      setIsVisible(true);
    }
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <>
      <div 
        ref={iconRef}
        className="inline-flex items-center ml-1.5 align-middle cursor-help text-blue-500 opacity-70 hover:opacity-100 transition-opacity"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Info size={size} />
      </div>
      {isVisible && createPortal(
        <div 
          className="fixed z-[9999] pointer-events-none w-64 p-2 bg-slate-800 text-white text-xs rounded shadow-lg text-center leading-relaxed"
          style={{
            top: position.top,
            left: position.left,
            transform: 'translate(-50%, -100%)'
          }}
        >
          {text}
          {/* Arrow pointing down */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800" />
        </div>,
        document.body
      )}
    </>
  );
};