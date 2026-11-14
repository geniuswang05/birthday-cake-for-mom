import { useFrame } from "@react-three/fiber";
import { useLayoutEffect, useMemo, useRef } from "react";
import { Color, Group, InstancedMesh, Object3D, Quaternion, Vector3 } from "three";

// Simple toy-like props built from basic shapes, to dress the table.

const TABLE_Y = 0.08;

type V3 = [number, number, number];

export function GiftBox({
  position,
  size = 0.42,
  color = "#f28aa5",
  ribbon = "#fff3c9",
  rotationY = 0,
}: {
  position: V3;
  size?: number;
  color?: string;
  ribbon?: string;
  rotationY?: number;
}) {
  const h = size * 0.8;
  const lidH = size * 0.18;
  const band = size * 0.16;
  return (
    <group position={[position[0], TABLE_Y, position[2]]} rotation={[0, rotationY, 0]}>
      {/* box */}
      <mesh position={[0, h / 2, 0]} castShadow>
        <boxGeometry args={[size, h, size]} />
        <meshStandardMaterial color={color} roughness={0.55} />
      </mesh>
      {/* lid */}
      <mesh position={[0, h + lidH / 2 - 0.01, 0]}>
        <boxGeometry args={[size * 1.08, lidH, size * 1.08]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>
      {/* ribbons */}
      <mesh position={[0, (h + lidH) / 2, 0]}>
        <boxGeometry args={[band, h + lidH + 0.004, size * 1.1]} />
        <meshStandardMaterial color={ribbon} roughness={0.35} />
      </mesh>
      <mesh position={[0, (h + lidH) / 2, 0]}>
        <boxGeometry args={[size * 1.1, h + lidH + 0.004, band]} />
        <meshStandardMaterial color={ribbon} roughness={0.35} />
      </mesh>
      {/* bow */}
      {[-1, 1].map((s) => (
        <mesh
          key={s}
          position={[s * size * 0.14, h + lidH + size * 0.08, 0]}
          rotation={[0, 0, s * 0.6]}
        >
          <torusGeometry args={[size * 0.13, size * 0.04, 10, 20]} />
          <meshStandardMaterial color={ribbon} roughness={0.35} />
        </mesh>
      ))}
    </group>
  );
}

function BalloonString({ from, to }: { from: V3; to: V3 }) {
  const { mid, len, quat } = useMemo(() => {
    const a = new Vector3(...from);
    const b = new Vector3(...to);
    const dir = b.clone().sub(a);
    const length = dir.length();
    const q = new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), dir.normalize());
    return { mid: a.add(b).multiplyScalar(0.5), len: length, quat: q };
  }, [from, to]);
  return (
    <mesh position={mid} quaternion={quat}>
      <cylinderGeometry args={[0.004, 0.004, len, 4]} />
      <meshStandardMaterial color="#f8f8f8" />
    </mesh>
  );
}

export function Balloons({ position }: { position: V3 }) {
  const balloons = useMemo(
    () => [
      { color: "#ff8fab", offset: [0, 2.35, 0] as V3, phase: 0 },
      { color: "#ffd166", offset: [0.38, 2.05, 0.22] as V3, phase: 1.7 },
      { color: "#8ecae6", offset: [-0.32, 2.15, -0.25] as V3, phase: 3.1 },
      { color: "#cdb4db", offset: [0.1, 1.85, -0.42] as V3, phase: 4.4 },
    ],
    []
  );
  const refs = useRef<(Group | null)[]>([]);
  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    refs.current.forEach((g, i) => {
      if (!g) return;
      const b = balloons[i];
      g.position.y = b.offset[1] + Math.sin(t * 0.9 + b.phase) * 0.05;
      g.rotation.z = Math.sin(t * 0.6 + b.phase) * 0.06;
    });
  });
  const base: V3 = [position[0], TABLE_Y, position[2]];
  return (
    <group position={base}>
      {/* weight */}
      <mesh position={[0, 0.06, 0]}>
        <cylinderGeometry args={[0.09, 0.11, 0.12, 20]} />
        <meshStandardMaterial color="#e9c46a" metalness={0.5} roughness={0.3} />
      </mesh>
      {balloons.map((b, i) => {
        const [x, y, z] = b.offset;
        return (
          <group key={i}>
            <BalloonString from={[0, 0.12, 0]} to={[x, y - 0.33, z]} />
            <group
              ref={(el) => {
                refs.current[i] = el;
              }}
              position={b.offset}
            >
              <mesh scale={[1, 1.18, 1]}>
                <sphereGeometry args={[0.26, 32, 24]} />
                <meshStandardMaterial
                  color={b.color}
                  roughness={0.18}
                  metalness={0.05}
                  emissive={b.color}
                  emissiveIntensity={0.08}
                />
              </mesh>
              <mesh position={[0, -0.32, 0]}>
                <coneGeometry args={[0.04, 0.06, 12]} />
                <meshStandardMaterial color={b.color} roughness={0.3} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
}

export function FlowerVase({ position }: { position: V3 }) {
  const flowers = useMemo(
    () => [
      { pos: [0, 0.78, 0] as V3, color: "#ff8fab" },
      { pos: [0.12, 0.7, 0.06] as V3, color: "#ffffff" },
      { pos: [-0.11, 0.72, -0.05] as V3, color: "#ffd166" },
      { pos: [0.03, 0.66, -0.13] as V3, color: "#ffb4a2" },
      { pos: [-0.06, 0.64, 0.12] as V3, color: "#cdb4db" },
    ],
    []
  );
  return (
    <group position={[position[0], TABLE_Y, position[2]]}>
      {/* vase */}
      <mesh position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.1, 0.15, 0.44, 32]} />
        <meshStandardMaterial color="#a8dadc" roughness={0.15} metalness={0.1} />
      </mesh>
      <mesh position={[0, 0.45, 0]}>
        <torusGeometry args={[0.1, 0.02, 10, 32]} />
        <meshStandardMaterial color="#a8dadc" roughness={0.15} />
      </mesh>
      {flowers.map((f, i) => (
        <group key={i}>
          {/* stem */}
          <mesh
            position={[f.pos[0] / 2, (f.pos[1] + 0.3) / 2, f.pos[2] / 2]}
            rotation={[f.pos[2] * 1.2, 0, -f.pos[0] * 1.2]}
          >
            <cylinderGeometry args={[0.008, 0.008, f.pos[1] - 0.25, 6]} />
            <meshStandardMaterial color="#6a994e" />
          </mesh>
          {/* petals */}
          <group position={f.pos}>
            {[0, 1, 2, 3, 4].map((p) => {
              const a = (p / 5) * Math.PI * 2;
              return (
                <mesh key={p} position={[Math.cos(a) * 0.045, 0, Math.sin(a) * 0.045]}>
                  <sphereGeometry args={[0.04, 12, 10]} />
                  <meshStandardMaterial color={f.color} roughness={0.5} />
                </mesh>
              );
            })}
            <mesh>
              <sphereGeometry args={[0.03, 12, 10]} />
              <meshStandardMaterial color="#f4a261" roughness={0.5} />
            </mesh>
          </group>
        </group>
      ))}
    </group>
  );
}

export function Confetti({
  count = 140,
  inner = 1.75,
  outer = 3.6,
  avoid = [],
}: {
  count?: number;
  inner?: number;
  outer?: number;
  // [x, z, radius] spots to keep clear (e.g. under the card or the film roll)
  avoid?: [number, number, number][];
}) {
  const ref = useRef<InstancedMesh>(null);
  const colors = useMemo(
    () => ["#ff8fab", "#ffd166", "#8ecae6", "#cdb4db", "#90be6d", "#f9844a"].map((c) => new Color(c)),
    []
  );
  useLayoutEffect(() => {
    const mesh = ref.current;
    if (!mesh) return;
    const dummy = new Object3D();
    let placed = 0;
    let guard = 0;
    while (placed < count && guard < count * 20) {
      guard++;
      const a = Math.random() * Math.PI * 2;
      const r = inner + Math.random() * (outer - inner);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      if (avoid.some(([ax, az, ar]) => Math.hypot(x - ax, z - az) < ar)) continue;
      dummy.position.set(x, TABLE_Y + 0.003, z);
      dummy.rotation.set(-Math.PI / 2, 0, Math.random() * Math.PI);
      const s = 0.6 + Math.random() * 0.8;
      dummy.scale.set(s, s, s);
      dummy.updateMatrix();
      mesh.setMatrixAt(placed, dummy.matrix);
      mesh.setColorAt(placed, colors[placed % colors.length]);
      placed++;
    }
    mesh.count = placed;
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [count, inner, outer, avoid, colors]);
  return (
    <instancedMesh ref={ref} args={[undefined, undefined, count]}>
      <planeGeometry args={[0.06, 0.035]} />
      <meshStandardMaterial roughness={0.6} side={2} />
    </instancedMesh>
  );
}

// An upright 35mm film canister (the film strip on the table comes out of it).
export function FilmCanister({
  position,
  color = "#d9492c",
  band = "#ffcc33",
  scale = 1,
}: {
  position: V3;
  color?: string;
  band?: string;
  scale?: number;
}) {
  const r = 0.17;
  const h = 0.62;
  return (
    <group position={[position[0], TABLE_Y, position[2]]} scale={scale}>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[r, r, h, 40]} />
        <meshStandardMaterial color={color} roughness={0.35} metalness={0.2} />
      </mesh>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[r + 0.002, r + 0.002, h * 0.42, 40]} />
        <meshStandardMaterial color={band} roughness={0.4} />
      </mesh>
      {[0.015, h - 0.015].map((y) => (
        <mesh key={y} position={[0, y, 0]}>
          <cylinderGeometry args={[r * 1.07, r * 1.07, 0.03, 40]} />
          <meshStandardMaterial color="#c9ccd1" metalness={0.85} roughness={0.25} />
        </mesh>
      ))}
      <mesh position={[0, h + 0.04, 0]}>
        <cylinderGeometry args={[0.05, 0.05, 0.08, 20]} />
        <meshStandardMaterial color="#2b2b2b" roughness={0.5} />
      </mesh>
    </group>
  );
}
