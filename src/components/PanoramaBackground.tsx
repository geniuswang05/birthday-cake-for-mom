import { useLoader, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { EquirectangularReflectionMapping, SRGBColorSpace, TextureLoader } from "three";

type PanoramaBackgroundProps = {
  file: string;
  // smaller copy for phones / GPUs that can't hold the big one
  fileSmall?: string;
  rotation: number;
  // 0 → hidden (black intro), 1 → fully visible
  progress: number;
  backgroundIntensity: number;
  environmentIntensity: number;
};

// Uses a plain 2:1 (equirectangular) JPG/PNG as the 360° background and as
// image-based lighting for the scene.
export function PanoramaBackground({
  file,
  fileSmall,
  rotation,
  progress,
  backgroundIntensity,
  environmentIntensity,
}: PanoramaBackgroundProps) {
  const gl = useThree((state) => state.gl);
  // An 8K panorama needs ~130MB of GPU memory; phones (and WeChat's browser)
  // often can't hold it and the page dies, so they get the 4K copy.
  const useSmall =
    !!fileSmall &&
    (gl.capabilities.maxTextureSize < 8192 ||
      (typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches));
  const texture = useLoader(TextureLoader, useSmall ? fileSmall : file);
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    texture.mapping = EquirectangularReflectionMapping;
    texture.colorSpace = SRGBColorSpace;
    texture.needsUpdate = true;
    scene.background = texture;
    scene.environment = texture;
    return () => {
      scene.background = null;
      scene.environment = null;
    };
  }, [scene, texture]);

  useEffect(() => {
    scene.backgroundRotation.set(0, rotation, 0);
    scene.environmentRotation.set(0, rotation, 0);
  }, [scene, rotation]);

  useEffect(() => {
    scene.backgroundIntensity = backgroundIntensity * progress;
    scene.environmentIntensity = environmentIntensity * progress;
  }, [scene, progress, backgroundIntensity, environmentIntensity]);

  return null;
}
