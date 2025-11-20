// src/App.tsx
import { useState, useEffect } from 'react'
import { Canvas, type ThreeEvent } from '@react-three/fiber'
import { OrbitControls, Grid } from '@react-three/drei'
import * as THREE from 'three'
import './App.css'
import { UI } from './components/UI'
import { useStore, type BrickData } from './store'
import { Brick } from './components/Brick'

const BRICK_HEIGHT = 1.2
const epsilon = 0.01

/**
 * Berücksichtigt die 90-Grad-Gitter-Drehung.
 */
function getBrickDimensions(
  type: string,
  rotation: number,
): [number, number, number] {
  let w: number, h: number, l: number
  h = BRICK_HEIGHT
  switch (type) {
    case '1x2':
      ;[w, l] = [1, 2]
      break
    case '2x4':
      ;[w, l] = [2, 4]
      break
    case 'turntable_2x2':
      ;[w, l] = [2, 2]
      break
    case '1x1':
    default:
      ;[w, l] = [1, 1]
  }
  if (Math.abs((rotation % Math.PI) - Math.PI / 2) < epsilon) {
    return [l, h, w]
  }
  return [w, h, l]
}

/**
 * Die 3D-Szene
 */
function Szene() {
  const {
    bricks,
    addBrick,
    removeBrick,
    tool,
    currentColor,
    currentBrickType,
    currentRotation,
    rotateCurrentBrick,
    setInternalRotation,
  } = useStore()

  const [cursorPos, setCursorPos] = useState<[number, number, number] | null>(null)
  const [isCursorValid, setIsCursorValid] = useState(true)
  const [hoveredBrickId, setHoveredBrickId] = useState<string | null>(null)

  // Tastatur-Listener für 'R'-Taste (Bauen & Drehen)
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'r' || event.key === 'R') {
        event.preventDefault()

        if (tool === 'build') {
          rotateCurrentBrick()
        } else if (tool === 'rotate' && hoveredBrickId) {
          const brick = bricks.find((b) => b.id === hoveredBrickId)
          if (brick && brick.type === 'turntable_2x2') {
            const newRotation = (brick.internalRotation || 0) + Math.PI / 12 // 15 Grad
            setInternalRotation(hoveredBrickId, newRotation)
          }
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [tool, hoveredBrickId, bricks, rotateCurrentBrick, setInternalRotation])



  /**
   * Findet den übergeordneten Brick (die Gruppe) und seine Daten,
   * egal wie tief das getroffene Mesh verschachtelt ist.
   */
 // src/App.tsx (Ausschnitt)

  /**
   * Findet den übergeordneten Brick (die Gruppe) und seine Daten
   * über Rekursion.
   */
  const findParentBrick = (
    currentObject: THREE.Object3D | null // Beginnt mit dem getroffenen Objekt
  ): { brick: BrickData | null; group: THREE.Group | null } => {
    
    // 1. Basis-Fall (Abbruchbedingung):
    // Wenn wir am Ende der Szene angekommen sind (currentObject ist null)
    if (!currentObject) {
      return { brick: null, group: null }
    }

    // 2. Erfolgs-Fall:
    // Wenn das aktuelle Objekt die ID in userData hat
    if (currentObject.userData?.id) {
      const brick = bricks.find(b => b.id === currentObject.userData.id)
      return { brick: brick || null, group: currentObject as THREE.Group }
    }

    // 3. Rekursiver Fall:
    // Nichts gefunden? Rufe dieselbe Funktion für das Parent-Objekt auf.
    return findParentBrick(currentObject.parent)
  }

  // Validierungs-Logik (Prüft Kollisionen im Gitter)
  const isPositionValid = (newBrick: {
    position: [number, number, number]
    type: string
    rotation: number
  }): boolean => {

    const [newW, newH, newL] = getBrickDimensions(
      newBrick.type,
      newBrick.rotation,
    )
    const newMin = {
      x: newBrick.position[0] - newW / 2 + epsilon,
      y: newBrick.position[1] - newH / 2 + epsilon,
      z: newBrick.position[2] - newL / 2 + epsilon,
    }
    const newMax = {
      x: newBrick.position[0] + newW / 2 - epsilon,
      y: newBrick.position[1] + newH / 2 - epsilon,
      z: newBrick.position[2] + newL / 2 - epsilon,
    }
    let isSupported = false
    if (Math.abs(newMin.y - epsilon) < epsilon) {
      isSupported = true
    }
    for (const existing of bricks) {
      const [existW, existH, existL] = getBrickDimensions(
        existing.type,
        existing.rotation,
      )
      const existMin = {
        x: existing.position[0] - existW / 2,
        y: existing.position[1] - existH / 2,
        z: existing.position[2] - existL / 2,
      }
      const existMax = {
        x: existing.position[0] + existW / 2,
        y: existing.position[1] + existH / 2,
        z: existing.position[2] + existL / 2,
      }
      const overlapsX = newMin.x < existMax.x && newMax.x > existMin.x
      const overlapsY = newMin.y < existMax.y && newMax.y > existMin.y
      const overlapsZ = newMin.z < existMax.z && newMax.z > existMin.z
      if (overlapsX && overlapsY && overlapsZ) {
        return false
      }
      if (!isSupported) {
        const isExactlyOnTop = Math.abs(newMin.y - existMax.y) < 0.02
        const overlapsXZ =
          newMin.x < existMax.x &&
          newMax.x > existMin.x &&
          newMin.z < existMax.z &&
          newMax.z > existMin.z
        if (isExactlyOnTop && overlapsXZ) {
          isSupported = true
        }
      }
    }
    return isSupported
  }

  // Snapping-Logik (Kompromiss-Lösung)
  const getSnappedPosition = (
    point: THREE.Vector3,
    baseY: number,
    parentBrick: BrickData | null,
  ): [number, number, number] | null => {
    const [width, height, length] = getBrickDimensions(
      currentBrickType,
      currentRotation,
    )
    
    // Globales Snapping
    let snappedX = Math.floor(point.x) + width / 2
    let snappedZ = Math.floor(point.z) + length / 2
    const snappedY = baseY + height / 2

    // Kompromiss: Wenn auf Turntable, zentriere den Stein
    if (parentBrick && parentBrick.type === 'turntable_2x2') {
      return [parentBrick.position[0], snappedY, parentBrick.position[2]]
    }

    return [snappedX, snappedY, snappedZ]
  }


  // Handler für BODEN (Mausbewegung)
  const handleFloorMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    setHoveredBrickId(null)
    if (tool !== 'build') {
      setCursorPos(null)
      return
    }
    const newPos = getSnappedPosition(event.point, 0, null)
    if (
      newPos &&
      (!cursorPos ||
        newPos[0] !== cursorPos[0] ||
        newPos[1] !== cursorPos[1] ||
        newPos[2] !== cursorPos[2])
    ) {
      setCursorPos(newPos)
      setIsCursorValid(
        isPositionValid({
          position: newPos,
          type: currentBrickType,
          rotation: currentRotation,
        }),
      )
    }
  }

  // Handler für ANDERE STEINE (Mausbewegung) - KORRIGIERT
  const handleBrickMove = (event: ThreeEvent<PointerEvent>) => {
    event.stopPropagation()
    
    // KORREKTUR: Robuste Eltern-Suche
    const { brick: parentBrick, group: parentGroup } = findParentBrick(event.object)
    setHoveredBrickId(parentBrick?.id || null)

    if (tool !== 'build') {
      setCursorPos(null)
      return
    }
    if (!event.face || !event.face.normal || !parentBrick || !parentGroup || event.face.normal.y < 0.9) {
      setCursorPos(null)
      setIsCursorValid(false)
      return
    }
    
    // KORREKTUR: Nutze die Y-Position der gefundenen Gruppe
    const baseY = parentGroup.position.y + BRICK_HEIGHT / 2
    const newPos = getSnappedPosition(event.point, baseY, parentBrick)

    if (
      newPos &&
      (!cursorPos ||
        newPos[0] !== cursorPos[0] ||
        newPos[1] !== cursorPos[1] ||
        newPos[2] !== cursorPos[2])
    ) {
      setCursorPos(newPos)
      
      // Kompromiss für Turntable
      if (parentBrick.type === 'turntable_2x2') {
        setIsCursorValid(true)
      } else {
        setIsCursorValid(
          isPositionValid({
            position: newPos,
            type: currentBrickType,
            rotation: currentRotation,
          }),
        )
      }
    }
  }

  // Klick-Handler für STEIN - KORRIGIERT
  const handleBrickClick = (event: ThreeEvent<MouseEvent>) => {
    event.stopPropagation()
    
    // KORREKTUR: Robuste Eltern-Suche
    const { brick: parentBrick } = findParentBrick(event.object)

    if (tool === 'build' && cursorPos && isCursorValid) {
      let finalRotation = currentRotation
      let finalInternalRotation = undefined
      
      if (parentBrick && parentBrick.type === 'turntable_2x2') {
          finalRotation = 0 
          finalInternalRotation = parentBrick.internalRotation
      }
      
      addBrick({
        position: cursorPos,
        color: currentColor,
        type: currentBrickType,
        rotation: finalRotation,
        internalRotation: finalInternalRotation,
      })
      setCursorPos(null)
      
    } else if (tool === 'delete') {
      
      if (parentBrick) {
        removeBrick(parentBrick.id)
      }
      setCursorPos(null)
    }
  }

  // Klick-Handler für BODEN
  const handleFloorClick = (event: ThreeEvent<MouseEvent>) => {
    
    event.stopPropagation()
    if (tool === 'build' && cursorPos && isCursorValid) {
      addBrick({
        position: cursorPos,
        color: currentColor,
        type: currentBrickType,
        rotation: currentRotation,
      })
      setCursorPos(null)
    }
  }

  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight
        position={[10, 10, 5]}
        intensity={1.5}
        shadow-mapSize={[2048, 2048]}
        castShadow
      />

      {bricks.map((brick) => (
        <Brick
          key={brick.id}
          position={brick.position}
          color={brick.color}
          type={brick.type}
          rotation={[0, brick.rotation, 0]}
          internalRotation={brick.internalRotation || 0}
          // WICHTIG: Die userData muss an die Gruppe
          userData={{ type: brick.type, id: brick.id }}
          onPointerMove={handleBrickMove}
          onPointerLeave={() => {
            setCursorPos(null)
            setIsCursorValid(false)
            setHoveredBrickId(null)
          }}
          onClick={handleBrickClick}
        />
      ))}

      {tool === 'build' && cursorPos && (
        <Brick
          position={cursorPos}
          color={isCursorValid ? currentColor : '#ff0000'}
          type={currentBrickType}
          rotation={[0, currentRotation, 0]}
          opacity={isCursorValid ? 0.5 : 0.25}
          raycast={() => null}
        />
      )}

      {/* Die Bodenplatte */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        receiveShadow
        userData={{ type: 'floor' }}
        onPointerMove={handleFloorMove}
        onPointerLeave={() => {
          setCursorPos(null)
          setIsCursorValid(false)
          setHoveredBrickId(null)
        }}
        onClick={handleFloorClick}
      >
        <planeGeometry args={[100, 100]} />
        <meshStandardMaterial color="#444444" />
      </mesh>

      <OrbitControls />
      <Grid
        position={[0, 0.01, 0]}
        infiniteGrid
        sectionSize={1}
        fadeDistance={50}
      />
    </>
  )
}

/**
 * Die Haupt-App-Komponente
 */
export default function App() {
  return (
    <>
      <UI />
      <Canvas
        shadows
        camera={{ position: [8, 8, 8], fov: 35 }}
      >
        <Szene />
      </Canvas>
    </>
  )
}