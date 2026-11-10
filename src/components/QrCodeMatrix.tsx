import React, { useMemo } from 'react';
import { generateQrMatrix } from '../lib/qrCode';

interface QrCodeMatrixProps {
  value: string;
  size?: number;
  label?: string;
  className?: string;
}

export const QrCodeMatrix: React.FC<QrCodeMatrixProps> = ({
  value,
  size = 168,
  label = 'QR Code',
  className = '',
}) => {
  const matrix = useMemo(() => generateQrMatrix(value || 'eduverse'), [value]);
  const moduleCount = matrix.length;
  const quietZone = 4;
  const viewBoxSize = moduleCount + quietZone * 2;

  return (
    <div
      className={`inline-flex items-center justify-center rounded-xl bg-white p-2 border border-slate-200 shadow-xs ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        className="w-full h-full"
        role="img"
        aria-label={label}
        shapeRendering="crispEdges"
      >
        <rect x={0} y={0} width={viewBoxSize} height={viewBoxSize} fill="#ffffff" />
        {matrix.map((row, r) =>
          row.map((dark, c) =>
            dark ? (
              <rect
                key={`${r}-${c}`}
                x={c + quietZone}
                y={r + quietZone}
                width={1}
                height={1}
                fill="#0f172a"
              />
            ) : null
          )
        )}
      </svg>
    </div>
  );
};
