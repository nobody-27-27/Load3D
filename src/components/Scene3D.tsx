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
        const { x, y, z } = placedItem.position;
        const hasPallet = placedItem.item.palletDimensions !== undefined;

        if (hasPallet) {
          const palletDims = placedItem.item.palletDimensions!;
          const itemDims = placedItem.item.dimensions ||
                          (placedItem.item.rollDimensions
                            ? {
                                length: placedItem.item.rollDimensions.diameter,
                                width: placedItem.item.rollDimensions.diameter,
                                height: placedItem.item.rollDimensions.length
                              }
                            : { length: 1, width: 1, height: 1 });

          return (
            <group key={placedItem.itemId}>
              <Box
                args={[palletDims.length, palletDims.height, palletDims.width]}
                position={[x + palletDims.length / 2, y + palletDims.height / 2, z + palletDims.width / 2]}
              >
                <meshStandardMaterial
                  color="#8B4513"
                  roughness={0.8}
                  metalness={0.2}
                />
              </Box>
              <Box
                args={[itemDims.length, itemDims.height, itemDims.width]}
                position={[
                  x + (palletDims.length / 2),
                  y + palletDims.height + itemDims.height / 2,
                  z + (palletDims.width / 2)
                ]}
              >
                <meshStandardMaterial
                  color={placedItem.item.color || '#10b981'}
                  transparent
                  opacity={0.8}
                />
              </Box>
            </group>
          );
        }

        const { length, width, height } = placedItem.dimensions;
        return (
          <Box
            key={placedItem.itemId}
            args={[length, height, width]}
            position={[x + length / 2, y + height / 2, z + width / 2]}
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
