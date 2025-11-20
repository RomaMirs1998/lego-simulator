// src/components/Brick.tsx
import React, { useMemo } from 'react'
import * as THREE from 'three'

// Standard-Dimensionen für Lego-Einheiten
const BRICK_HEIGHT = 1.2
const STUD_RADIUS = 0.3
const STUD_HEIGHT = 0.2

/**
 * Helfer-Funktion, die uns die Positionen der Noppen gibt
 */
function getStudPositions(type: string): [number, number, number][] {
  const y = BRICK_HEIGHT / 2 // Oben auf dem Stein
  switch (type) {
    case '1x1':
      return [[0, y, 0]]
    case '1x2':
      // [x, y, z]
      return [
        [0, y, -0.5],
        [0, y, 0.5],
      ]
    case '2x4':
      const studs_2x4: [number, number, number][] = []
      // 2 Reihen (x) und 4 Spalten (z)
      for (let x = -0.5; x <= 0.5; x += 1) {
        for (let z = -1.5; z <= 1.5; z += 1) {
          studs_2x4.push([x, y, z])
        }
      }
      return studs_2x4

    // NEU: Turntable hat 4 Noppen
    case 'turntable_2x2':
      const studs_2x2: [number, number, number][] = []
      for (let x = -0.5; x <= 0.5; x += 1) {
        for (let z = -0.5; z <= 0.5; z += 1) {
          studs_2x2.push([x, y, z])
        }
      }
      return studs_2x2

    default:
      return [[0, y, 0]]
  }
}

/**
 * Helfer-Funktion für die Basis-Geometrie
 */
const useBrickGeometry = (type: string): THREE.BoxGeometry => {
  return useMemo(() => {
    switch (type) {
      case '1x2':
        return new THREE.BoxGeometry(1, BRICK_HEIGHT, 2)
      case '2x4':
        return new THREE.BoxGeometry(2, BRICK_HEIGHT, 4)
      // NEU
      case 'turntable_2x2':
        return new THREE.BoxGeometry(2, BRICK_HEIGHT, 2)
      case '1x1':
      default:
        return new THREE.BoxGeometry(1, BRICK_HEIGHT, 1)
    }
  }, [type])
}

// Vordefinierte Geometrie für EINE Noppe (performant)
const studGeometry = new THREE.CylinderGeometry(
  STUD_RADIUS,
  STUD_RADIUS,
  STUD_HEIGHT,
  16,
)

// Typ-Definition für unsere Props (OHNE 'id')
interface BrickProps extends React.ComponentPropsWithoutRef<'group'> {
  position: [number, number, number]
  color: string
  type: string
  opacity?: number
  internalRotation?: number // NEU für Turntable
}

/**
 * Die Brick-Komponente
 */
export function Brick({
  position,
  color,
  type,
  opacity = 1,
  internalRotation = 0, // NEU
  ...props // 'props' ist jetzt 100% sicher
}: BrickProps) {
  const baseGeometry = useBrickGeometry(type)
  const studPositions = useMemo(() => getStudPositions(type), [type])

  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: color,
        transparent: opacity < 1,
        opacity: opacity,
        roughness: 0.5,
        metalness: 0.1,
      }),
    [color, opacity],
  )

  // ########################################################
  // NEU: Spezial-Rendering für Turntable
  // ########################################################
  if (type === 'turntable_2x2') {
    // Vereinfachte Darstellung: Eine Basis und eine drehbare Deckplatte
    const basePlateGeo = new THREE.BoxGeometry(2, BRICK_HEIGHT * 0.9, 2)
    const topPlateGeo = new THREE.BoxGeometry(2, BRICK_HEIGHT * 0.1, 2)

    return (
      <group position={position} {...props}>
        {/* 1. Die Basis (statisch) 
            (Muss klickbar sein, erhält userData vom Parent) */}
        <mesh
          geometry={basePlateGeo}
          material={material}
          position={[0, -BRICK_HEIGHT * 0.05, 0]} // Leicht nach unten
          castShadow
          receiveShadow
        />

        {/* 2. Die Top-Gruppe (drehbar) */}
        <group rotation={[0, internalRotation, 0]}>
          {/* Klickbares Mesh für die Oberseite */}
          <mesh
            geometry={topPlateGeo}
            material={material}
            position={[0, BRICK_HEIGHT * 0.45, 0]} // Leicht nach oben
            castShadow
            receiveShadow
          />
          {/* 3. Die Noppen (drehen sich mit) */}
          {studPositions.map((pos, index) => (
            <mesh
              key={index}
              geometry={studGeometry}
              // Position der Noppen angepasst an die dünne Top-Platte
              position={[pos[0], BRICK_HEIGHT * 0.5, pos[2]]}
              material={material}
              castShadow
              raycast={() => null} // Wichtig: Noppen nicht klicken
            />
          ))}
        </group>
      </group>
    )
  }
  // ########################################################
  // ENDE Spezial-Rendering
  // ########################################################

  // Standard-Rendering für alle anderen Steine
  return (
    <group position={position} {...props}>
      <mesh
        geometry={baseGeometry}
        material={material}
        castShadow
        receiveShadow
      />
      {studPositions.map((pos, index) => (
        <mesh
          key={index}
          geometry={studGeometry}
          material={material}
          position={pos}
          castShadow
          raycast={() => null}
        />
      ))}
    </group>
  )
}