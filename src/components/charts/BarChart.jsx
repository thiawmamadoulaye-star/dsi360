// DSI 360 — Graphique en barres léger en SVG pur (tendance tickets, budgets...)
import React from 'react'

/**
 * @param {Array<{label: string, value: number, value2?: number}>} data
 * @param {string} color
 * @param {string} color2 - couleur de la 2e série (optionnelle, ex: résolus vs créés)
 */
export default function BarChart({ data = [], height = 160, color = '#1c2450', color2 = '#c9a227', legend }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.value, d.value2 || 0)))

  return (
    <div>
      <div className="flex items-end gap-1.5" style={{ height }}>
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center justify-end gap-0.5" style={{ height: '100%' }}>
            <div className="w-full flex items-end justify-center gap-0.5" style={{ height: '100%' }}>
              <div
                className="w-full rounded-t"
                style={{ height: `${(d.value / max) * 100}%`, backgroundColor: color, minHeight: d.value > 0 ? 2 : 0 }}
                title={`${d.label} : ${d.value}`}
              />
              {d.value2 !== undefined && (
                <div
                  className="w-full rounded-t"
                  style={{ height: `${(d.value2 / max) * 100}%`, backgroundColor: color2, minHeight: d.value2 > 0 ? 2 : 0 }}
                  title={`${d.label} : ${d.value2}`}
                />
              )}
            </div>
            <span className="text-[10px] text-gray-400 mt-1 whitespace-nowrap">{d.label}</span>
          </div>
        ))}
        {data.length === 0 && <p className="text-xs text-gray-400 m-auto">Aucune donnée</p>}
      </div>
      {legend && (
        <div className="flex gap-4 mt-2 justify-center text-xs">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: color }} />{legend[0]}</span>
          {legend[1] && <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ backgroundColor: color2 }} />{legend[1]}</span>}
        </div>
      )}
    </div>
  )
}
