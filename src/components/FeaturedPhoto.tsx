import { Billboard, Html, useCursor, useTexture } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useRef, useState } from "react";
import { Group, SRGBColorSpace } from "three";

type FeaturedPhotoProps = {
  src: string;
  position: [number, number, number];
  // longest side of the photo, in scene units
  size?: number;
  onOpenFull: () => void;
  onClose: () => void;
  closeLabel: string;
};

// A photo that rises up and floats above the cake, always facing the camera.
// Tap it to open it full screen; tap the × (or empty space) to put it back.
export function FeaturedPhoto({
  src,
  position,
  size = 1.7,
  onOpenFull,
  onClose,
  closeLabel,
}: FeaturedPhotoProps) {
  const texture = useTexture(src);
  texture.colorSpace = SRGBColorSpace;
  const img = texture.image as { width: number; height: number };
  const aspect = img.width / img.height;
  const w = aspect >= 1 ? size : size * aspect;
  const h = aspect >= 1 ? size / aspect : size;
  const border = size * 0.04;

  const group = useRef<Group>(null);
  const appear = useRef(0);
  const [hovered, setHovered] = useState(false);
  useCursor(hovered, "zoom-in");
  const press = useRef<{ x: number; y: number } | null>(null);

  // replay the rise-in animation whenever the photo changes
  useEffect(() => {
    appear.current = 0;
  }, [src]);

  useFrame(({ clock }, delta) => {
    const g = group.current;
    if (!g) return;
    appear.current = Math.min(1, appear.current + delta * 2.2);
    const t = 1 - Math.pow(1 - appear.current, 3);
    const bob = Math.sin(clock.elapsedTime * 1.2) * 0.03;
    g.scale.setScalar(0.2 + 0.8 * t);
    g.position.set(position[0], position[1] - 0.8 * (1 - t) + bob, position[2]);
  });

  const onDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    press.current = { x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
  };
  const onUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const p = press.current;
    press.current = null;
    if (p && Math.hypot(e.nativeEvent.clientX - p.x, e.nativeEvent.clientY - p.y) < 10) {
      onOpenFull();
    }
  };

  return (
    <group ref={group} position={position}>
      <Billboard>
        {/* white photo-print border */}
        <mesh position={[0, 0, -0.005]}>
          <planeGeometry args={[w + border * 2, h + border * 2]} />
          <meshBasicMaterial color="#ffffff" toneMapped={false} />
        </mesh>
        <mesh
          onPointerDown={onDown}
          onPointerUp={onUp}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(true);
          }}
          onPointerOut={() => setHovered(false)}
        >
          <planeGeometry args={[w, h]} />
          <meshBasicMaterial map={texture} toneMapped={false} />
        </mesh>
        <Html position={[w / 2 + border, h / 2 + border, 0]} center zIndexRange={[5, 0]}>
          <button
            className="featured-close"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label={closeLabel}
          >
            ×
          </button>
        </Html>
      </Billboard>
    </group>
  );
}
