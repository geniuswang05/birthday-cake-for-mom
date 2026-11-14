import { useCursor, useTexture } from "@react-three/drei";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  BackSide,
  CanvasTexture,
  DoubleSide,
  Group,
  RepeatWrapping,
  SRGBColorSpace,
  Texture,
} from "three";

export type FilmPhoto = { thumb: string; full: string };

type FilmRingProps = {
  photos: ReadonlyArray<FilmPhoto>;
  // how many times the photo list is repeated around the ring
  repeats?: number;
  radius?: number;
  baseY?: number;
  photoHeight?: number;
  // radians per second (0 = still)
  spinSpeed?: number;
  paused?: boolean;
  // only lay the film along part of the circle (radians); default = full ring
  arcStart?: number;
  arcLength?: number;
  // photo currently shown big, highlighted on the strip
  selected?: number | null;
  onSelect: (index: number) => void;
};

const HOLE_BAND_RATIO = 0.16; // sprocket band height relative to photo height

// Dark film base with a row of sprocket holes top and bottom, drawn once to a canvas.
function useFilmBaseTexture(repeatCount: number) {
  return useMemo(() => {
    const w = 64;
    const h = 256;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#17110d";
    ctx.fillRect(0, 0, w, h);
    const band = h * (HOLE_BAND_RATIO / (1 + 2 * HOLE_BAND_RATIO));
    ctx.fillStyle = "#f3e6d2";
    const holeW = w * 0.42;
    const holeH = band * 0.5;
    const r = holeH * 0.3;
    for (const y of [band / 2 - holeH / 2, h - band / 2 - holeH / 2]) {
      const x = (w - holeW) / 2;
      ctx.beginPath();
      ctx.roundRect(x, y, holeW, holeH, r);
      ctx.fill();
    }
    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    tex.wrapS = RepeatWrapping;
    tex.repeat.set(repeatCount, 1);
    tex.anisotropy = 4;
    return tex;
  }, [repeatCount]);
}

// Crop a photo texture to the given aspect ("cover"). Clones so each cell can crop independently.
function coverTexture(source: Texture, cellAspect: number) {
  const tex = source.clone();
  tex.colorSpace = SRGBColorSpace;
  const img = source.image as { width: number; height: number };
  const photoAspect = img.width / img.height;
  if (photoAspect > cellAspect) {
    const rx = cellAspect / photoAspect;
    tex.repeat.set(rx, 1);
    tex.offset.set((1 - rx) / 2, 0);
  } else {
    const ry = photoAspect / cellAspect;
    tex.repeat.set(1, ry);
    tex.offset.set(0, (1 - ry) / 2);
  }
  tex.needsUpdate = true;
  return tex;
}

type Cell = {
  photoIndex: number;
  thetaStart: number;
  thetaLength: number;
  texture: Texture;
  // mirrored copy so the photo also reads correctly from inside the ring
  innerTexture: Texture;
};

export function FilmRing({
  photos,
  repeats = 3,
  radius = 1.9,
  baseY = 0.085,
  photoHeight = 0.4,
  spinSpeed = 0.06,
  paused = false,
  arcStart = 0,
  arcLength = Math.PI * 2,
  selected = null,
  onSelect,
}: FilmRingProps) {
  const groupRef = useRef<Group>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  useCursor(hovered !== null, "pointer");

  // stable URL list so hover re-renders don't rebuild every texture
  const urls = useMemo(() => photos.map((p) => p.thumb), [photos]);
  const loaded = useTexture(urls);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const sources = useMemo(() => loaded, [urls]);

  const band = photoHeight * HOLE_BAND_RATIO;
  const stripHeight = photoHeight + 2 * band;
  const centerY = baseY + stripHeight / 2;
  // length of film available (whole ring, or just an arc of it)
  const circumference = radius * arcLength;
  const baseTexture = useFilmBaseTexture(Math.round(circumference / (stripHeight * 0.25)));

  const cells = useMemo<Cell[]>(() => {
    // photo widths keep each photo's own shape (landscape / portrait)
    const widths = sources.map((t) => {
      const img = t.image as { width: number; height: number };
      return photoHeight * (img.width / img.height);
    });
    const total = widths.reduce((a, b) => a + b, 0) * repeats;
    const count = sources.length * repeats;
    const gap = Math.max((circumference - total) / count, photoHeight * 0.08);
    const scale = Math.min(1, circumference / (total + gap * count));
    const list: Cell[] = [];
    let arc = 0;
    for (let r = 0; r < repeats; r++) {
      sources.forEach((src, i) => {
        const w = widths[i] * scale;
        const texture = coverTexture(src, w / photoHeight);
        const innerTexture = texture.clone();
        innerTexture.repeat.x = -texture.repeat.x;
        innerTexture.offset.x = texture.offset.x + texture.repeat.x;
        innerTexture.wrapS = RepeatWrapping;
        innerTexture.needsUpdate = true;
        list.push({
          photoIndex: i,
          thetaStart: arcStart + (arc + gap / 2) / radius,
          thetaLength: w / radius,
          texture,
          innerTexture,
        });
        arc += w + gap;
      });
    }
    return list;
  }, [sources, repeats, circumference, photoHeight, radius, arcStart]);

  useEffect(
    () => () =>
      cells.forEach((c) => {
        c.texture.dispose();
        c.innerTexture.dispose();
      }),
    [cells]
  );

  useFrame((_, delta) => {
    if (groupRef.current && !paused && hovered === null) {
      groupRef.current.rotation.y += spinSpeed * delta;
    }
  });

  // A "click" = press and release on the same photo without dragging.
  // (Handled by hand: r3f's onClick can drop the very first tap on touch screens.)
  const pressRef = useRef<{ index: number; x: number; y: number } | null>(null);
  // Which photo was hit. Taps on the film border / gaps pick the nearest photo,
  // so a slightly-off tap on a phone still opens something.
  const photoIndexOf = (e: ThreeEvent<PointerEvent>) => {
    const direct = e.object.userData.photoIndex as number | undefined;
    if (direct !== undefined) return direct;
    const group = groupRef.current;
    if (!group || cells.length === 0) return undefined;
    const local = group.worldToLocal(e.point.clone());
    const theta = (Math.atan2(local.x, local.z) + 2 * Math.PI) % (2 * Math.PI);
    let best = cells[0];
    let bestDist = Infinity;
    for (const c of cells) {
      const mid = c.thetaStart + c.thetaLength / 2;
      const d = Math.abs(((theta - mid + 3 * Math.PI) % (2 * Math.PI)) - Math.PI);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    return best.photoIndex;
  };

  const handlePointerDown = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const index = photoIndexOf(e);
    pressRef.current =
      index === undefined ? null : { index, x: e.nativeEvent.clientX, y: e.nativeEvent.clientY };
  };

  const handlePointerUp = (e: ThreeEvent<PointerEvent>) => {
    e.stopPropagation();
    const press = pressRef.current;
    pressRef.current = null;
    if (!press || photoIndexOf(e) !== press.index) return;
    const moved = Math.hypot(e.nativeEvent.clientX - press.x, e.nativeEvent.clientY - press.y);
    if (moved < 10) onSelect(press.index);
  };

  return (
    <group ref={groupRef} onPointerDown={handlePointerDown} onPointerUp={handlePointerUp}>
      {/* film base (both sides, so the back of the far side looks like film too) */}
      <mesh position={[0, centerY, 0]}>
        <cylinderGeometry
          args={[radius, radius, stripHeight, 160, 1, true, arcStart, arcLength]}
        />
        <meshStandardMaterial map={baseTexture} side={DoubleSide} roughness={0.6} />
      </mesh>
      {cells.map((cell, i) => (
        <mesh
          key={i}
          position={[0, centerY, 0]}
          userData={{ photoIndex: cell.photoIndex }}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHovered(i);
          }}
          onPointerOut={() => setHovered((h) => (h === i ? null : h))}
          scale={hovered === i || selected === cell.photoIndex ? [1.012, 1.08, 1.012] : 1}
        >
          <cylinderGeometry
            args={[
              radius + 0.004,
              radius + 0.004,
              photoHeight,
              24,
              1,
              true,
              cell.thetaStart,
              cell.thetaLength,
            ]}
          />
          {/* unlit, so photos keep their real colours whatever the scene lighting */}
          <meshBasicMaterial map={cell.texture} toneMapped={false} />
        </mesh>
      ))}
      {cells.map((cell, i) => (
        <mesh
          key={`inner-${i}`}
          position={[0, centerY, 0]}
          userData={{ photoIndex: cell.photoIndex }}
        >
          <cylinderGeometry
            args={[
              radius - 0.004,
              radius - 0.004,
              photoHeight,
              24,
              1,
              true,
              cell.thetaStart,
              cell.thetaLength,
            ]}
          />
          <meshBasicMaterial map={cell.innerTexture} side={BackSide} toneMapped={false} />
        </mesh>
      ))}
    </group>
  );
}
