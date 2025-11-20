// src/store.ts
import { create } from 'zustand'

export const legoColors = {
  red: '#D90013',
  blue: '#0057A8',
  yellow: '#FDC400',
  green: '#20852A',
  white: '#FFFFFF',
  black: '#1B2A34',
  lightGray: '#A0A5A9',
  darkGray: '#6C6E68',
}

// BrickData um "internalRotation" erweitert
export interface BrickData {
  id: string
  position: [number, number, number]
  color: string
  type: string
  rotation: number // Die 90-Grad-Gitter-Rotation
  internalRotation?: number // Optional: Freie Rotation
}

// Tool erweitert
export type Tool = 'build' | 'delete' | 'rotate'

interface AppState {
  currentColor: string
  currentBrickType: string
  currentRotation: number
  bricks: BrickData[]
  tool: Tool

  setCurrentColor: (color: string) => void
  setCurrentBrickType: (type: string) => void
  addBrick: (brick: Omit<BrickData, 'id'>) => void
  removeBrick: (id: string) => void
  setTool: (tool: Tool) => void
  rotateCurrentBrick: () => void // Gitter-Rotation (90 Grad)
  setInternalRotation: (brickId: string, rotation: number) => void // Freie Rotation
}

export const useStore = create<AppState>((set) => ({
  // Standardwerte
  currentColor: legoColors.red,
  currentBrickType: '1x1',
  currentRotation: 0,
  bricks: [],
  tool: 'build',

  // Aktionen
  setCurrentColor: (color) => set({ currentColor: color }),
  setCurrentBrickType: (type) => set({ currentBrickType: type }),

  addBrick: (brick) =>
    set((state) => ({
      bricks: [
        ...state.bricks,
        { ...brick, id: Date.now().toString() },
      ],
    })),

  removeBrick: (id) =>
    set((state) => ({
      bricks: state.bricks.filter((b) => b.id !== id),
    })),

  setTool: (tool) => set({ tool: tool }),

  // 90-Grad-Gitter-Rotation für den Geister-Stein
  rotateCurrentBrick: () =>
    set((state) => ({
      currentRotation: (state.currentRotation + Math.PI / 2) % (Math.PI * 2),
    })),

  // Setzt die freie Rotation eines platzierten Steins (z.B. Turntable)
  setInternalRotation: (brickId, rotation) =>
    set((state) => ({
      bricks: state.bricks.map((brick) =>
        brick.id === brickId
          ? { ...brick, internalRotation: rotation }
          : brick,
      ),
    })),
}))