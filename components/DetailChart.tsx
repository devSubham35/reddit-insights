"use client";

import { TrendPoint } from "@/typescript/type";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";

interface DetailChartProps {
  data?: TrendPoint[];
}

export default function DetailChart({ data }: DetailChartProps) {
  // Transform data for display with better labels
  const chartData = data && data.length > 0
    ? data.map((d, i) => ({
        ...d,
        label: i === data.length - 1 ? "Today" : `${data.length - 1 - i}d ago`,
      }))
    : [
        { time: "6d", value: 2, label: "6d ago" },
        { time: "5d", value: 4, label: "5d ago" },
        { time: "4d", value: 3, label: "4d ago" },
        { time: "3d", value: 5, label: "3d ago" },
        { time: "2d", value: 8, label: "2d ago" },
        { time: "1d", value: 25, label: "1d ago" },
        { time: "today", value: 50, label: "Today" },
      ];

  const values = chartData.map((d) => d.value);
  const maxValue = Math.max(...values, 10);
  const yMax = Math.ceil(maxValue / 15) * 15; // Round up to nearest 15

  return (
    <div style={{ height: 280 }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData} margin={{ top: 10, right: 20, left: 0, bottom: 10 }}>
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="#2a2d35"
            vertical={true}
            horizontal={true}
          />
          <XAxis
            dataKey="label"
            tick={{ fill: "#6b7280", fontSize: 12 }}
            axisLine={{ stroke: "#2a2d35" }}
            tickLine={false}
            dy={10}
          />
          <YAxis
            tick={{ fill: "#6b7280", fontSize: 12 }}
            axisLine={false}
            tickLine={false}
            domain={[0, yMax]}
            ticks={[0, Math.floor(yMax / 4), Math.floor(yMax / 2), Math.floor((yMax * 3) / 4), yMax]}
            dx={-10}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: "#1a1d24",
              border: "1px solid #333",
              borderRadius: "8px",
              padding: "8px 12px",
            }}
            labelStyle={{
              color: "#9ca3af",
              fontSize: "12px",
              marginBottom: "4px",
            }}
            itemStyle={{
              color: "#ff4d9d",
              fontSize: "14px",
              fontWeight: "bold",
            }}
            formatter={(value: number) => [`${value} mentions`, ""]}
          />
          <Line
            type="monotone"
            dataKey="value"
            stroke="#ff4d9d"
            strokeWidth={2}
            dot={{
              r: 4,
              fill: "#ff4d9d",
              stroke: "#ff4d9d",
              strokeWidth: 2,
            }}
            activeDot={{
              r: 6,
              fill: "#ff4d9d",
              stroke: "#fff",
              strokeWidth: 2,
            }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}