// src/components/UI.tsx
import React from 'react'
import { useStore, legoColors, type Tool } from '../store'
import './UI.css'

// Helfer-Funktion, um den Namen der Farbe zu finden (optional, aber nett)
const getColorName = (hex: string) => {
  return (
    Object.keys(legoColors).find(
      (key) => legoColors[key as keyof typeof legoColors] === hex,
    ) || 'Custom'
  )
}

export function UI() {
  const {
    currentColor,
    currentBrickType,
    tool,
    setCurrentColor,
    setCurrentBrickType,
    setTool,
  } = useStore()

  return (
    <aside className="ui-container">
      {/* Sektion 1: Werkzeuge */}
      <div className="ui-section">
        <h3>Werkzeuge</h3>
        <div className="tool-selector">
          <button
            className={tool === 'build' ? 'selected' : ''}
            data-tool="build"
            onClick={() => setTool('build')}
          >
            Bauen
          </button>
          <button
            className={tool === 'delete' ? 'selected' : ''}
            data-tool="delete"
            onClick={() => setTool('delete')}
          >
            Löschen
          </button>
          <button
            className={tool === 'rotate' ? 'selected' : ''}
            data-tool="rotate"
            onClick={() => setTool('rotate')}
          >
            Drehen (Taste 'R')
          </button>
        </div>
      </div>

      {/* Sektion 2: Farbauswahl */}
      <div className="ui-section">
        <h3>Farbe</h3>
        <div className="color-palette">
          {Object.entries(legoColors).map(([name, hex]) => (
            <div
              key={name}
              title={name}
              className={`color-swatch ${
                currentColor === hex ? 'selected' : ''
              }`}
              onClick={() => setCurrentColor(hex)}
            >
              <div style={{ backgroundColor: hex }} />
            </div>
          ))}
        </div>
        <p style={{ marginTop: '10px', fontSize: '12px' }}>
          Aktuell: <strong>{getColorName(currentColor)}</strong>
        </p>
      </div>

      {/* Sektion 3: Steinauswahl */}
      <div className="ui-section">
        <h3>Steine</h3>
        <div className="brick-selector">
          <button
            className={currentBrickType === 'turntable_2x2' ? 'selected' : ''}
            onClick={() => setCurrentBrickType('turntable_2x2')}
          >
            2x2 Turntable
          </button>
          <button
            className={currentBrickType === '2x4' ? 'selected' : ''}
            onClick={() => setCurrentBrickType('2x4')}
          >
            2x4 Stein
          </button>
          <button
            className={currentBrickType === '1x2' ? 'selected' : ''}
            onClick={() => setCurrentBrickType('1x2')}
          >
            1x2 Stein
          </button>
          <button
            className={currentBrickType === '1x1' ? 'selected' : ''}
            onClick={() => setCurrentBrickType('1x1')}
          >
            1x1 Stein
          </button>
        </div>
      </div>
    </aside>
  )
}