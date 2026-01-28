import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, ThreeEvent } from '@react-three/fiber';
import { OrbitControls, Text, Billboard } from '@react-three/drei';
import * as THREE from 'three';
import { CellData, GridMatrix } from '../types';

interface Grid3DViewProps {
  gridData: GridMatrix;
  axisConfig: { x: number; y: number; z: number };
  onCellClick: (id: string) => void;
  selectedCellId: string | null;
  xAxisName: string;
  yAxisName: string;
  zAxisName: string;
}

interface CellBoxProps {
  cell: CellData;
  position: [number, number, number];
  size: number;
  selected: boolean;
  onClick: () => void;
}

// Individual cell as a 3D box with image texture
const CellBox: React.FC<CellBoxProps> = ({ cell, position, size, selected, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const [texture, setTexture] = useState<THREE.Texture | null>(null);
  
  // Load texture from base64 image when available
  useEffect(() => {
    if (cell.imageUrl) {
      const loader = new THREE.TextureLoader();
      loader.load(
        cell.imageUrl,
        (loadedTexture) => {
          loadedTexture.colorSpace = THREE.SRGBColorSpace;
          loadedTexture.needsUpdate = true;
          setTexture(loadedTexture);
        },
        undefined,
        (error) => {
          console.error('Error loading texture:', error);
        }
      );
    } else {
      setTexture(null);
    }
    
    // Cleanup
    return () => {
      if (texture) {
        texture.dispose();
      }
    };
  }, [cell.imageUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  // Slight hover animation
  useFrame(() => {
    if (meshRef.current) {
      const targetScale = hovered ? 1.1 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  // Color based on status
  const getColor = () => {
    if (selected) return '#60a5fa'; // bright blue
    if (hovered) return '#818cf8'; // bright indigo
    switch (cell.status) {
      case 'success': return '#34d399'; // bright green
      case 'loading': return '#fbbf24'; // bright amber
      case 'queued': return '#a78bfa'; // bright purple
      case 'error': return '#f87171'; // bright red
      default: return '#6b7280'; // lighter gray for better visibility
    }
  };

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        setHovered(true);
        document.body.style.cursor = 'pointer';
      }}
      onPointerOut={() => {
        setHovered(false);
        document.body.style.cursor = 'auto';
      }}
    >
      <boxGeometry args={[size * 0.9, size * 0.9, size * 0.9]} />
      {texture ? (
        <meshBasicMaterial map={texture} toneMapped={false} />
      ) : (
        <meshStandardMaterial 
          color={getColor()} 
          transparent 
          opacity={cell.status === 'idle' ? 0.6 : 0.9}
          roughness={0.5}
          metalness={0.1}
        />
      )}
      {/* Selection outline */}
      {selected && (
        <lineSegments>
          <edgesGeometry args={[new THREE.BoxGeometry(size * 0.95, size * 0.95, size * 0.95)]} />
          <lineBasicMaterial color="#ffffff" linewidth={2} />
        </lineSegments>
      )}
    </mesh>
  );
};

// Axis label component
const AxisLabel: React.FC<{ 
  text: string; 
  position: [number, number, number]; 
  color: string;
  fontSize?: number;
}> = ({ text, position, color, fontSize = 0.3 }) => (
  <Billboard position={position}>
    <Text
      fontSize={fontSize}
      color={color}
      anchorX="center"
      anchorY="middle"
      outlineWidth={0.02}
      outlineColor="#000000"
    >
      {text}
    </Text>
  </Billboard>
);

// Grid lines helper - positioned at origin
const GridLines: React.FC<{ size: number }> = ({ size }) => {
  return (
    <gridHelper 
      args={[size, size, '#4b5563', '#2d3748']} 
      position={[0, -size/2 - 0.1, 0]}
    />
  );
};

// Main 3D scene content
const Scene: React.FC<Grid3DViewProps> = ({ 
  gridData, 
  axisConfig, 
  onCellClick, 
  selectedCellId,
  xAxisName,
  yAxisName,
  zAxisName 
}) => {
  const cellSize = 1;
  const spacing = 1.2;
  
  // Calculate center offset to center the grid
  const offsetX = (axisConfig.x - 1) * spacing / 2;
  const offsetY = (axisConfig.y - 1) * spacing / 2;
  const offsetZ = (axisConfig.z - 1) * spacing / 2;

  const cells = useMemo(() => {
    return Object.values(gridData).map(cell => ({
      ...cell,
      position: [
        cell.coord.x * spacing - offsetX,
        cell.coord.y * spacing - offsetY,
        cell.coord.z * spacing - offsetZ
      ] as [number, number, number]
    }));
  }, [gridData, spacing, offsetX, offsetY, offsetZ]);

  const maxExtent = Math.max(axisConfig.x, axisConfig.y, axisConfig.z) * spacing;

  return (
    <>
      {/* Lighting - brighter for better visibility */}
      <ambientLight intensity={0.8} />
      <directionalLight position={[10, 10, 5]} intensity={1.2} />
      <directionalLight position={[-5, 5, -5]} intensity={0.5} />
      <pointLight position={[0, 5, 0]} intensity={0.5} />
      
      {/* Grid floor */}
      <GridLines size={maxExtent + 2} />
      
      {/* Cells */}
      {cells.map(cell => (
        <CellBox
          key={cell.id}
          cell={cell}
          position={cell.position}
          size={cellSize}
          selected={selectedCellId === cell.id}
          onClick={() => onCellClick(cell.id)}
        />
      ))}
      
      {/* Axis labels - positioned clearly outside the grid */}
      <AxisLabel 
        text="X: Style"
        position={[offsetX + 1.5, -offsetY - 0.8, -offsetZ - 0.5]}
        color="#60a5fa"
        fontSize={0.25}
      />
      <AxisLabel 
        text="Y: Energy"
        position={[-offsetX - 0.8, offsetY + 1.2, -offsetZ - 0.5]}
        color="#34d399"
        fontSize={0.25}
      />
      <AxisLabel 
        text="Z: Physical"
        position={[-offsetX - 0.8, -offsetY - 0.8, offsetZ + 1.5]}
        color="#a78bfa"
        fontSize={0.25}
      />
      
      {/* Axis lines with arrows */}
      <arrowHelper args={[
        new THREE.Vector3(1, 0, 0), // direction
        new THREE.Vector3(-offsetX - 0.7, -offsetY - 0.7, -offsetZ - 0.7), // origin
        maxExtent + 1, // length
        0x60a5fa, // color (blue for X)
        0.3, // head length
        0.15 // head width
      ]} />
      <arrowHelper args={[
        new THREE.Vector3(0, 1, 0), // direction
        new THREE.Vector3(-offsetX - 0.7, -offsetY - 0.7, -offsetZ - 0.7), // origin
        maxExtent + 1, // length
        0x34d399, // color (green for Y)
        0.3,
        0.15
      ]} />
      <arrowHelper args={[
        new THREE.Vector3(0, 0, 1), // direction
        new THREE.Vector3(-offsetX - 0.7, -offsetY - 0.7, -offsetZ - 0.7), // origin
        maxExtent + 1, // length
        0xa78bfa, // color (purple for Z)
        0.3,
        0.15
      ]} />
      
      {/* Camera controls */}
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={2}
        maxDistance={20}
        autoRotate={false}
        makeDefault
      />
    </>
  );
};

export const Grid3DView: React.FC<Grid3DViewProps> = (props) => {
  return (
    <div className="w-full h-full bg-gray-900">
      <Canvas
        camera={{ 
          position: [6, 4, 8], 
          fov: 45,
          near: 0.1,
          far: 100
        }}
        gl={{ antialias: true }}
      >
        <Scene {...props} />
      </Canvas>
      
      {/* Controls overlay */}
      <div className="absolute bottom-4 left-4 text-xs text-gray-500 bg-gray-900/80 px-3 py-2 rounded-lg border border-gray-700">
        <div>🖱️ Drag to rotate • Scroll to zoom • Right-click to pan</div>
        <div className="mt-1">Click a cell to select it</div>
      </div>
      
      {/* Legend */}
      <div className="absolute top-4 right-4 text-xs bg-gray-900/80 px-3 py-2 rounded-lg border border-gray-700 space-y-1">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500"></div>
          <span className="text-gray-400">Generated</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-amber-500"></div>
          <span className="text-gray-400">Loading</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-purple-500"></div>
          <span className="text-gray-400">Queued</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-gray-600 opacity-50"></div>
          <span className="text-gray-400">Idle</span>
        </div>
      </div>
    </div>
  );
};
