import { useState, useEffect, forwardRef } from 'react';
import type { ButtonHTMLAttributes } from 'react';

interface RippleItem {
  x: number;
  y: number;
  size: number;
  key: number;
}

interface RippleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  rippleColor?: string;
  duration?: number;
}

const RippleButton = forwardRef<HTMLButtonElement, RippleButtonProps>(
  ({ rippleColor = '#ffffff', duration = 600, className = '', children, onClick, style, ...props }, ref) => {
    const [ripples, setRipples] = useState<RippleItem[]>([]);

    useEffect(() => {
      if (!ripples.length) return;
      const t = setTimeout(() => setRipples(p => p.slice(1)), duration);
      return () => clearTimeout(t);
    }, [ripples, duration]);

    function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
      const rect = e.currentTarget.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height);
      setRipples(p => [...p, {
        x: e.clientX - rect.left - size / 2,
        y: e.clientY - rect.top  - size / 2,
        size,
        key: Date.now(),
      }]);
      onClick?.(e);
    }

    return (
      <button
        ref={ref}
        className={`relative overflow-hidden ${className}`}
        onClick={handleClick}
        style={{ '--duration': `${duration}ms`, ...style } as React.CSSProperties}
        {...props}
      >
        {ripples.map(r => (
          <span
            key={r.key}
            className="absolute rounded-full pointer-events-none animate-rippling"
            style={{
              left: r.x,
              top: r.y,
              width: r.size,
              height: r.size,
              backgroundColor: rippleColor,
            }}
          />
        ))}
        {children}
      </button>
    );
  }
);

RippleButton.displayName = 'RippleButton';
export { RippleButton };
