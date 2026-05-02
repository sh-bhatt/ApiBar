import { useState, useEffect } from 'react'

interface ProgressIndicatorProps {
  title: string
  value: number
  maxValue: number
  color: 'primary' | 'success' | 'warning' | 'error'
  unit?: string
}

export function ProgressIndicator({ title, value, maxValue, color, unit = '%' }: ProgressIndicatorProps) {
  const [displayValue, setDisplayValue] = useState(0)
  
  const percentage = Math.min((value / maxValue) * 100, 100)

  useEffect(() => {
    const duration = 1500
    const steps = 60
    const increment = percentage / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= percentage) {
        setDisplayValue(percentage)
        clearInterval(timer)
      } else {
        setDisplayValue(current)
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [percentage])

  const colorClasses = {
    primary: {
      stroke: '#6C63FF',
      fill: 'rgba(108, 99, 255, 0.1)',
      text: 'text-[#6C63FF]'
    },
    success: {
      stroke: '#10b981',
      fill: 'rgba(16, 185, 129, 0.1)',
      text: 'text-green-600'
    },
    warning: {
      stroke: '#f59e0b',
      fill: 'rgba(245, 158, 11, 0.1)',
      text: 'text-yellow-600'
    },
    error: {
      stroke: '#ef4444',
      fill: 'rgba(239, 68, 68, 0.1)',
      text: 'text-red-600'
    }
  }

  const colors = colorClasses[color]
  const radius = 40
  const circumference = 2 * Math.PI * radius
  const strokeDashoffset = circumference - (displayValue / 100) * circumference

  return (
    <div className="card p-6 flex flex-col items-center">
      <div className="relative">
        <svg width={120} height={120} className="transform -rotate-90">
          <circle
            cx={60}
            cy={60}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={8}
            fill="none"
          />
          <circle
            cx={60}
            cy={60}
            r={radius}
            stroke={colors.stroke}
            strokeWidth={8}
            fill="none"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          {unit === 'ms' ? (
            <>
              <span className={`text-2xl font-bold ${colors.text}`}>
                {Math.round(value)}
              </span>
              <span className={`text-sm ${colors.text}`}>ms</span>
            </>
          ) : (
            <span className={`text-2xl font-bold ${colors.text}`}>
              {Math.round(displayValue)}%
            </span>
          )}
        </div>
      </div>
      <h4 className="mt-4 text-sm font-medium text-gray-900 text-center">{title}</h4>
      <p className="text-xs text-gray-500 text-center mt-1">
        {unit === 'ms' 
          ? 'Average response time' 
          : `${Math.round(value)}% of total requests`}
      </p>
    </div>
  )
}


