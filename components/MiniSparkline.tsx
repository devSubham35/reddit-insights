"use client";

import { TrendPoint } from "@/typescript/type";

interface MiniSparklineProps {
  data?: TrendPoint[];
}

export default function MiniSparkline({ data }: MiniSparklineProps) {
  // Default data if none provided or empty
  const chartData = data && data.length > 0 ? data : [
    { time: "6d", value: 2 },
    { time: "5d", value: 3 },
    { time: "4d", value: 4 },
    { time: "3d", value: 5 },
    { time: "2d", value: 6 },
    { time: "1d", value: 8 },
    { time: "today", value: 10 }
  ];

  const values = chartData.map(d => d.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;

  const width = 80;
  const height = 28;
  const padding = 4;

  // Calculate points for the line
  const getX = (i: number) => padding + (i / Math.max(chartData.length - 1, 1)) * (width - padding * 2);
  const getY = (value: number) => height - padding - ((value - min) / range) * (height - padding * 2);

  // Create path for dashed line
  const pathD = chartData.map((d, i) => {
    const x = getX(i);
    const y = getY(d.value);
    return i === 0 ? `M ${x} ${y}` : `L ${x} ${y}`;
  }).join(" ");

  // Last point coordinates for the dot
  const lastIndex = chartData.length - 1;
  const lastX = getX(lastIndex);
  const lastY = getY(chartData[lastIndex].value);

  return (
    <svg width={width} height={height} className="overflow-visible">
      {/* Dashed line */}
      <path
        d={pathD}
        fill="none"
        stroke="#22c55e"
        strokeWidth="2"
        strokeDasharray="4 3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* End dot */}
      <circle
        cx={lastX}
        cy={lastY}
        r="4"
        fill="#22c55e"
      />
    </svg>
  );
}