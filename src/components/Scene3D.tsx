import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Box } from '@react-three/drei';
import { useLoadingStore } from '../store/useLoadingStore';

function Container() {
  const container = useLoadingStore((state) => state.container);
  const { length, width, height } = container.dimensions;

  return (
    <group>
      <Box
        args={[length, height, width]}
        position={[length / 2, height / 2, width / 2]}
      >
        <meshStandardMaterial
          color="#3b82f6"
          transparent
          opacity={0.1}
          wireframe
        />
      </Box>

      <Grid
        args={[length, width]}
        position={[length / 2, 0, width / 2]}
        cellSize={0.5}
        cellThickness={0.5}
        cellColor="#6b7280"
        sectionSize={1}
        sectionThickness={1}
        sectionColor="#9ca3af"
      />
    </group>
  );
}

function PlacedItems() {
  const loadingResult = useLoadingStore((state) => state.loadingResult);

  if (!loadingResult || loadingResult.placedItems.length === 0) {
    return null;
  }

  return (
    <group>
      {loadingResult.placedItems.map((placedItem) => {
        const { length, width, height } = placedItem.dimensions;
        const { x, y, z } = placedItem.position;

        return (
          <Box
            key={placedItem.itemId}
            args={[length, height, width]}
            position={[x + length / 2, y + height / 2, z + width / 2]}
            rotation={[0, (placedItem.rotation * Math.PI) / 180, 0]}
          >
            <meshStandardMaterial
              color={placedItem.item.color || '#10b981'}
              transparent
              opacity={0.8}
            />
          </Box>
        );
      })}
    </group>
  );
}

export function Scene3D() {
  return (
    <div className="w-full h-full">
      <Canvas
        camera={{
          position: [15, 10, 15],
          fov: 50,
        }}
        style={{ background: '#0f172a' }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <pointLight position={[-10, -10, -5]} intensity={0.5} />

        <Container />
        <PlacedItems />

        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          minDistance={5}
          maxDistance={50}
        />
      </Canvas>
    </div>
  );
}
