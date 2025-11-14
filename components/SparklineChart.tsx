"use client";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";

export default function SparklineChart({ data }: { data: { time: string; value: number }[] }) {
  const chartData = data && data.length ? data : [
    { time: "6d", value: 0 },
    { time: "5d", value: 0 },
    { time: "4d", value: 0 },
    { time: "3d", value: 0 },
    { time: "2d", value: 0 },
    { time: "1d", value: 2 },
    { time: "today", value: 10 }
  ];

  return (
    <div className="bg-card p-4 rounded-2xl border border-neutral-800">
      <div className="text-sm text-neutral-300 mb-3">7-Day Mention Trend</div>
      <div style={{ height: 240 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="4 4" stroke="#262626 " />
            <XAxis dataKey="time" tick={{ fill: "#94a3b8" }} />
            <YAxis hide domain={[0, 'auto']} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#0f0f0f",   // tooltip background
                border: "1px solid #333",     // border
                borderRadius: "10px",         // rounded tooltip
                padding: "8px 12px",
              }}
              labelStyle={{
                color: "#e2e8f0",             // label text color
                fontSize: "12px",
              }}
              itemStyle={{
                color: "#ff53b7",             // value text color
                fontSize: "12px",
              }}
            />
            <Line type="monotone" dataKey="value" stroke="#ff53b7" strokeWidth={3} dot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
