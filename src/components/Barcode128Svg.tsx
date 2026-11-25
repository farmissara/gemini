import React, { useMemo } from 'react';
import { encodeCode128B } from '../lib/barcode128';

interface Barcode128SvgProps {
  value: string;
  height?: number;
  showValueText?: boolean;
  className?: string;
  label?: string;
}

export const Barcode128Svg: React.FC<Barcode128SvgProps> = ({
  value,
  height = 28,
  showValueText = true,
  className = '',
  label,
}) => {
  const encoded = useMemo(() => encodeCode128B(value), [value]);
  const quietZone = 8;
  const viewWidth = encoded.totalModules + quietZone * 2;

  return (
    <div
      className={`inline-flex flex-col items-center bg-white rounded px-1.5 py-1 border border-slate-200 ${className}`}
      aria-label={label || `Code 128 barcode for ${encoded.encodedText}`}
    >
      <svg
        viewBox={`0 0 ${viewWidth} ${height}`}
        className="w-full h-auto block"
        style={{ height }}
        role="img"
        aria-label={label || `Barcode ${encoded.encodedText}`}
        shapeRendering="crispEdges"
      >
        <rect x={0} y={0} width={viewWidth} height={height} fill="#ffffff" />
        {encoded.bars.map((bar, idx) => (
          <rect
            key={`${idx}-${bar.x}`}
            x={quietZone + bar.x}
            y={0}
            width={bar.width}
            height={height}
            fill="#09090b"
          />
        ))}
      </svg>
      {showValueText && (
        <span className="text-[8.5px] leading-none font-mono font-bold tracking-[0.14em] text-slate-900 mt-0.5 select-all">
          {encoded.encodedText}
        </span>
      )}
    </div>
  );
};
