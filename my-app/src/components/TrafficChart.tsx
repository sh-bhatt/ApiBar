import React from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface TrafficData {
  label: string
  requests: number
}

interface TrafficChartProps {
  data: TrafficData[]
  children?: React.ReactNode
}

export function TrafficChart({ data, children }: TrafficChartProps) {
  const chartData = data

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Live Traffic</h3>
        <div className="text-sm text-gray-500">
          Last 24 hours
        </div>
      </div>
      
      {children}

      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData}>
            <defs>
              <linearGradient id="colorGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6C63FF" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="#6C63FF" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="label" 
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
            />
            <YAxis 
              stroke="#9ca3af"
              fontSize={12}
              tickLine={false}
            />
            <Tooltip 
              contentStyle={{
                backgroundColor: 'white',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              labelStyle={{ color: '#111827', fontWeight: 600 }}
              itemStyle={{ color: '#6C63FF' }}
            />
            <Area
              type="monotone"
              dataKey="requests"
              stroke="#6C63FF"
              strokeWidth={2}
              fill="url(#colorGradient)"
              animationDuration={1000}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="flex items-center space-x-2">
          <div className="w-3 h-3 bg-[#6C63FF] rounded-full"></div>
          <span className="text-gray-600">API Requests</span>
        </div>
        <div className="text-gray-500">
          Auto-refreshes every 30 seconds
        </div>
      </div>
    </div>
  )
}
