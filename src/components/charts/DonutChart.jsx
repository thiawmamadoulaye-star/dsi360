// DSI 360 — Graphique donut léger en SVG pur (aucune dépendance externe)
// Utilisé pour la répartition des risques cyber, statuts de tickets, etc.
import React from 'react'

/**
 * @param {Array<{label: string, value: number, color: string}>} data
 * @param {number} size - taille du SVG en px
 */
export default function DonutChart({ data = [], size = 140, centerLabel, centerValue }) {
  const total = data.reduce((s, d) => s + d.value, 0)
  const radius = size / 2 - 10
  const circumference = 2 * Math.PI * radius
  let cumulPct = 0

  return (
    <div className="flex items-center gap-4">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#eef0f7" strokeWidth={16} />
          {total > 0 && data.map((d, i) => {
            const pct = d.value / total
            const dash = pct * circumference
            const offset = cumulPct * circumference
            cumulPct += pct
            if (d.value === 0) return null
            return (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={d.color}
                strokeWidth={16}
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={-offset}
                strokeLinecap="butt"
              />
            )
          })}
        </g>
        {centerValue !== undefined && (
          <>
            <text x="50%" y="47%" textAnchor="middle" className="fill-navy-900" style={{ fontSize: size * 0.18, fontWeight: 700 }}>
              {centerValue}
            </text>
            {centerLabel && (
              <text x="50%" y="62%" textAnchor="middle" className="fill-gray-400" style={{ fontSize: size * 0.08 }}>
                {centerLabel}
              </text>
            )}
          </>
        )}
      </svg>
      <div className="space-y-1">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2 text-xs">
            <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: d.color }} />
            <span className="text-gray-600">{d.label}</span>
            <span className="font-semibold text-navy-900">{d.value}</span>
          </div>
        ))}
        {total === 0 && <p className="text-xs text-gray-400">Aucune donnée</p>}
      </div>
    </div>
  )
}
