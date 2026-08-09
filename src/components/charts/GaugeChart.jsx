// DSI 360 — Jauge semi-circulaire en SVG pur (maturité audit, consommation budget...)
import React from 'react'

export default function GaugeChart({ value = 0, max = 5, size = 160, label, couleurs }) {
  const pct = Math.max(0, Math.min(1, value / max))
  const radius = size / 2 - 12
  const circumference = Math.PI * radius // demi-cercle
  const dash = pct * circumference

  const palette = couleurs || [
    { seuil: 0.4, couleur: '#dc2626' },
    { seuil: 0.7, couleur: '#d97706' },
    { seuil: 1, couleur: '#16a34a' },
  ]
  const couleur = palette.find((p) => pct <= p.seuil)?.couleur || palette[palette.length - 1].couleur

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size / 2 + 20} viewBox={`0 0 ${size} ${size / 2 + 20}`}>
        <path
          d={`M 12 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 12} ${size / 2}`}
          fill="none" stroke="#eef0f7" strokeWidth={14} strokeLinecap="round"
        />
        <path
          d={`M 12 ${size / 2} A ${radius} ${radius} 0 0 1 ${size - 12} ${size / 2}`}
          fill="none" stroke={couleur} strokeWidth={14} strokeLinecap="round"
          strokeDasharray={`${dash} ${circumference}`}
        />
        <text x="50%" y={size / 2 - 6} textAnchor="middle" className="fill-navy-900" style={{ fontSize: 22, fontWeight: 700 }}>
          {value}
        </text>
        <text x="50%" y={size / 2 + 14} textAnchor="middle" className="fill-gray-400" style={{ fontSize: 11 }}>
          / {max}
        </text>
      </svg>
      {label && <p className="text-xs text-gray-500 -mt-1">{label}</p>}
    </div>
  )
}
