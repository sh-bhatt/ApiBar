import type { LucideIcon } from 'lucide-react'
import { TrendingUp, TrendingDown } from 'lucide-react'
import { useState, useEffect } from 'react'

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: {
    value: number
    isUp: boolean
  }
  color?: 'primary' | 'secondary' | 'success' | 'warning' | 'error'
}

export function StatCard({ title, value, icon: Icon, trend, color = 'primary' }: StatCardProps) {
  const [displayValue, setDisplayValue] = useState(0)
  const [isAnimating, setIsAnimating] = useState(false)

  useEffect(() => {
    setIsAnimating(true)
    const targetValue = typeof value === 'number' ? value : parseFloat(value.toString()) || 0
    const duration = 1000
    const steps = 60
    const increment = targetValue / steps
    let current = 0

    const timer = setInterval(() => {
      current += increment
      if (current >= targetValue) {
        setDisplayValue(targetValue)
        setIsAnimating(false)
        clearInterval(timer)
      } else {
        setDisplayValue(current)
      }
    }, duration / steps)

    return () => clearInterval(timer)
  }, [value])

  const colorClasses = {
    primary: 'gradient-bg',
    secondary: 'bg-gradient-to-br from-blue-500 to-cyan-500',
    success: 'bg-gradient-to-br from-green-500 to-emerald-500',
    warning: 'bg-gradient-to-br from-yellow-500 to-orange-500',
    error: 'bg-gradient-to-br from-red-500 to-pink-500'
  }

  return (
    <div className="card p-6 hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <p className="text-sm font-medium text-gray-600 mb-1">{title}</p>
          <div className="flex items-baseline space-x-2">
            <h3 className={`text-2xl font-bold text-gray-900 ${isAnimating ? 'animate-pulse' : ''}`}>
              {typeof value === 'number' ? displayValue.toFixed(0) : value}
            </h3>
            {trend && (
              <div className={`flex items-center space-x-1 text-sm font-medium ${
                trend.isUp ? 'text-green-600' : 'text-red-600'
              }`}>
                {trend.isUp ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span>{Math.abs(trend.value)}%</span>
              </div>
            )}
          </div>
        </div>
        <div className={`w-12 h-12 ${colorClasses[color]} rounded-xl flex items-center justify-center text-white shadow-lg`}>
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  )
}
