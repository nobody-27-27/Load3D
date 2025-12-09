import { Canvas } from '@react-three/fiber';
import { OrbitControls, Grid, Box, Cylinder } from '@react-three/drei';
import { useLoadingStore } from '../store/useLoadingStore';
import type { IPlacedItem, ICargoItem } from '../core/types';

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

function RenderPlacedItem({ item: placedItem }: { item: IPlacedItem }) {
  const { x, y, z } = placedItem.position;
  const cargo = placedItem.item;
  const isRoll = cargo.type === 'roll';
  const color = cargo.color || '#10b981';

  // Handle Palletized Items
  if (cargo.palletDimensions) {
    const palletDims = cargo.palletDimensions!;
    const itemDims = placedItem.dimensions; 
    
    // Render simplified Pallet block for now (base)
    // You can enhance this to render pallet + roll separately if needed
    return (
      <Box 
        args={[itemDims.length, itemDims.height, itemDims.width]}
        position={[x + itemDims.length/2, y + itemDims.height/2, z + itemDims.width/2]}
      >
         <meshStandardMaterial color={color} transparent opacity={0.8} />
      </Box>
    );
  }

  // Render Cylinder (Roll)
  if (isRoll) {
    const orientation = placedItem.orientation || 'vertical';
    const dims = placedItem.dimensions;
    
    // Calculate visualization parameters
    let radius, heightVal, rotation: [number, number, number];
    
    if (orientation === 'vertical') {
      radius = dims.length / 2;
      heightVal = dims.height;
      rotation = [0, 0, 0];
    } else {
      // Horizontal
      // If dims.length > dims.width, likely X-aligned
      const isXAligned = dims.length > dims.width;
      radius = dims.height / 2; 
      heightVal = isXAligned ? dims.length : dims.width;
      
      rotation = isXAligned ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0];
    }

    // Position correction for Three.js centering
    const centerX = x + dims.length / 2;
    const centerY = y + dims.height / 2;
    const centerZ = z + dims.width / 2;

    return (
      <Cylinder
        args={[radius, radius, heightVal, 32]}
        position={[centerX, centerY, centerZ]}
        rotation={rotation}
      >
        <meshStandardMaterial color={color} roughness={0.5} />
      </Cylinder>
    );
  }

  // Render Standard Box
  const { length, width, height } = placedItem.dimensions;
  return (
    <Box
      args={[length, height, width]}
      position={[x + length / 2, y + height / 2, z + width / 2]}
    >
      <meshStandardMaterial
        color={color}
        transparent
        opacity={0.8}
      />
    </Box>
  );
}

function PlacedItems() {
  const loadingResult = useLoadingStore((state) => state.loadingResult);

  if (!loadingResult || loadingResult.placedItems.length === 0) {
    return null;
  }

  return (
    <group>
      {loadingResult.placedItems.map((placedItem) => (
        <RenderPlacedItem key={placedItem.itemId} item={placedItem} />
      ))}
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
