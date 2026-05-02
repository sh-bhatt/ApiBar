import { LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'

interface SparklineData {
  value: number
}

interface SparklineChartProps {
  data: number[]
  color?: string
  height?: number
}

export function SparklineChart({ data, color = '#6C63FF', height = 40 }: SparklineChartProps) {
  // Convert simple array to chart data format
  const chartData = data.map((value, index) => ({
    value,
    index
  }))

  return (
    <div style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height={height}>
        <LineChart data={chartData} margin={{ top: 2, right: 2, bottom: 2, left: 2 }}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            strokeWidth={2}
            dot={false}
            animationDuration={1000}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
