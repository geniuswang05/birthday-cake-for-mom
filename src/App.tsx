import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Environment, OrbitControls } from "@react-three/drei";
import {
  Suspense,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { Group } from "three";
import { Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Candle } from "./models/candle";
import { Cake } from "./models/cake";
import { Table } from "./models/table";
import { Fireworks } from "./components/Fireworks";
import { BirthdayCard } from "./components/BirthdayCard";
import { FireworksOverlay } from "./components/FireworksOverlay";
import { GreetingCard } from "./components/GreetingCard";
import {
  TYPED_LINES,
  START_HINT,
  START_HINT_TOUCH,
  BLOW_HINT,
  BLOW_HINT_TOUCH,
  BLOW_BUTTON,
  CARD_DELAY_MS,
  BACKGROUND,
  BACKGROUNDS,
  FILM_PHOTOS,
  RING_HINT,
  TABLE_CARD_IMAGE,
} from "./config";
import { FilmRing } from "./components/FilmRing";
import { FeaturedPhoto } from "./components/FeaturedPhoto";
import { Balloons, Confetti, FilmCanister, FlowerVase, GiftBox } from "./components/Decorations";
import { PhotoViewer } from "./components/PhotoViewer";
import { PanoramaBackground } from "./components/PanoramaBackground";

const bg = BACKGROUNDS[BACKGROUND];

// phones / tablets: no keyboard, so hide the "press space" part of the hints
const IS_TOUCH =
  typeof window !== "undefined" && window.matchMedia?.("(pointer: coarse)").matches;

import "./App.css";

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

const lerp = (from: number, to: number, t: number) => from + (to - from) * t;

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

type AnimatedSceneProps = {
  isPlaying: boolean;
  onBackgroundFadeChange?: (opacity: number) => void;
  onEnvironmentProgressChange?: (progress: number) => void;
  candleLit: boolean;
  onAnimationComplete?: () => void;
  cards: ReadonlyArray<BirthdayCardConfig>;
  activeCardId: string | null;
  onToggleCard: (id: string) => void;
  onSelectPhoto: (index: number) => void;
  selectedPhoto: number | null;
};

const CAKE_START_Y = 10;
const CAKE_END_Y = 0;
const CAKE_DESCENT_DURATION = 3;

const TABLE_START_Z = 30;
const TABLE_END_Z = 0;
const TABLE_SLIDE_DURATION = 0.7;
const TABLE_SLIDE_START = CAKE_DESCENT_DURATION - TABLE_SLIDE_DURATION - 0.1;

const CANDLE_START_Y = 5;
const CANDLE_END_Y = 0;
const CANDLE_DROP_DURATION = 1.2;
const CANDLE_DROP_START =
  Math.max(CAKE_DESCENT_DURATION, TABLE_SLIDE_START + TABLE_SLIDE_DURATION) +
  1.0;

const totalAnimationTime = CANDLE_DROP_START + CANDLE_DROP_DURATION;

const ORBIT_TARGET = new Vector3(0, 0.3, 0);
const ORBIT_INITIAL_RADIUS = 4.4;
const ORBIT_INITIAL_HEIGHT = 1.9;
const ORBIT_INITIAL_AZIMUTH = Math.PI / 2;
const ORBIT_MIN_DISTANCE = 2;
const ORBIT_MAX_DISTANCE = 8;
const ORBIT_MIN_POLAR = Math.PI * 0;
const ORBIT_MAX_POLAR = Math.PI / 2;

const BACKGROUND_FADE_DURATION = 1;
const BACKGROUND_FADE_OFFSET = 0;
const BACKGROUND_FADE_END = Math.max(
  CANDLE_DROP_START - BACKGROUND_FADE_OFFSET,
  BACKGROUND_FADE_DURATION
);
const BACKGROUND_FADE_START = Math.max(
  BACKGROUND_FADE_END - BACKGROUND_FADE_DURATION,
  0
);

const TYPED_CHAR_DELAY = 140;
const POST_TYPING_SCENE_DELAY = 1000;
const CURSOR_BLINK_INTERVAL = 480;

// the film strip arc in front of the cake (angles around the cake; π/2 faces the camera)
const FILM_ARC_START = 0.3;
const FILM_ARC_LENGTH = 2.15;
const arcPoint = (r: number, theta: number): [number, number, number] => [
  r * Math.sin(theta),
  0,
  r * Math.cos(theta),
];

// spots on the table kept free of confetti: [x, z, radius]
const CONFETTI_AVOID: [number, number, number][] = [
  [-0.15, -2.65, 0.8],
  [-0.9, 2.2, 0.45],
  [-1.45, 2.65, 0.35],
  [-1.9, 1.8, 0.2],
  [-1.2, -2.0, 0.25],
];

type BirthdayCardConfig = {
  id: string;
  image: string;
  position: [number, number, number];
  rotation: [number, number, number];
};

const BIRTHDAY_CARDS: ReadonlyArray<BirthdayCardConfig> = [
  {
    id: "confetti",
    image: TABLE_CARD_IMAGE,
    position: [-0.15, 0.081, -2.65],
    rotation: [-Math.PI / 2 , 0, Math.PI / 3],
  }
];

function AnimatedScene({
  isPlaying,
  onBackgroundFadeChange,
  onEnvironmentProgressChange,
  candleLit,
  onAnimationComplete,
  cards,
  activeCardId,
  onToggleCard,
  onSelectPhoto,
  selectedPhoto,
}: AnimatedSceneProps) {
  const cakeGroup = useRef<Group>(null);
  const tableGroup = useRef<Group>(null);
  const candleGroup = useRef<Group>(null);
  const animationStartRef = useRef<number | null>(null);
  const hasPrimedRef = useRef(false);
  const hasCompletedRef = useRef(false);
  const completionNotifiedRef = useRef(false);
  const backgroundOpacityRef = useRef(1);
  const environmentProgressRef = useRef(0);

  useEffect(() => {
    onBackgroundFadeChange?.(backgroundOpacityRef.current);
    onEnvironmentProgressChange?.(environmentProgressRef.current);
  }, [onBackgroundFadeChange, onEnvironmentProgressChange]);

  const emitBackgroundOpacity = (value: number) => {
    const clamped = clamp(value, 0, 1);
    if (Math.abs(clamped - backgroundOpacityRef.current) > 0.005) {
      backgroundOpacityRef.current = clamped;
      onBackgroundFadeChange?.(clamped);
    }
  };

  const emitEnvironmentProgress = (value: number) => {
    const clamped = clamp(value, 0, 1);
    if (Math.abs(clamped - environmentProgressRef.current) > 0.005) {
      environmentProgressRef.current = clamped;
      onEnvironmentProgressChange?.(clamped);
    }
  };

  useFrame(({ clock }) => {
    const cake = cakeGroup.current;
    const table = tableGroup.current;
    const candle = candleGroup.current;

    if (!cake || !table || !candle) {
      return;
    }

    if (!hasPrimedRef.current) {
      cake.position.set(0, CAKE_START_Y, 0);
      cake.rotation.set(0, 0, 0);
      table.position.set(0, 0, TABLE_START_Z);
      table.rotation.set(0, 0, 0);
      candle.position.set(0, CANDLE_START_Y, 0);
      candle.visible = false;
      hasPrimedRef.current = true;
    }

    if (!isPlaying) {
      emitBackgroundOpacity(1);
      emitEnvironmentProgress(0);
      animationStartRef.current = null;
      hasCompletedRef.current = false;
      completionNotifiedRef.current = false;
      return;
    }

    if (hasCompletedRef.current) {
      emitBackgroundOpacity(0);
      emitEnvironmentProgress(1);
      if (!completionNotifiedRef.current) {
        completionNotifiedRef.current = true;
        onAnimationComplete?.();
      }
      return;
    }

    if (animationStartRef.current === null) {
      animationStartRef.current = clock.elapsedTime;
    }

    const elapsed = clock.elapsedTime - animationStartRef.current;
    const clampedElapsed = clamp(elapsed, 0, totalAnimationTime);

    const cakeProgress = clamp(clampedElapsed / CAKE_DESCENT_DURATION, 0, 1);
    const cakeEase = easeOutCubic(cakeProgress);
    cake.position.y = lerp(CAKE_START_Y, CAKE_END_Y, cakeEase);
    cake.position.x = 0;
    cake.position.z = 0;
    cake.rotation.y = cakeEase * Math.PI * 2;
    cake.rotation.x = 0;
    cake.rotation.z = 0;

    let tableZ = TABLE_START_Z;
    if (clampedElapsed >= TABLE_SLIDE_START) {
      const tableProgress = clamp(
        (clampedElapsed - TABLE_SLIDE_START) / TABLE_SLIDE_DURATION,
        0,
        1
      );
      const tableEase = easeOutCubic(tableProgress);
      tableZ = lerp(TABLE_START_Z, TABLE_END_Z, tableEase);
    }
    table.position.set(0, 0, tableZ);
    table.rotation.set(0, 0, 0);

    if (clampedElapsed >= CANDLE_DROP_START) {
      if (!candle.visible) {
        candle.visible = true;
      }
      const candleProgress = clamp(
        (clampedElapsed - CANDLE_DROP_START) / CANDLE_DROP_DURATION,
        0,
        1
      );
      const candleEase = easeOutCubic(candleProgress);
      candle.position.y = lerp(CANDLE_START_Y, CANDLE_END_Y, candleEase);
    } else {
      candle.visible = false;
      candle.position.set(0, CANDLE_START_Y, 0);
    }

    if (clampedElapsed < BACKGROUND_FADE_START) {
      emitBackgroundOpacity(1);
      emitEnvironmentProgress(0);
    } else {
      const fadeProgress = clamp(
        (clampedElapsed - BACKGROUND_FADE_START) / BACKGROUND_FADE_DURATION,
        0,
        1
      );
      const eased = easeOutCubic(fadeProgress);
      const backgroundOpacity = 1 - eased;
      emitBackgroundOpacity(backgroundOpacity);
      emitEnvironmentProgress(1 - backgroundOpacity);
    }

    const animationDone = clampedElapsed >= totalAnimationTime;
    if (animationDone) {
      cake.position.set(0, CAKE_END_Y, 0);
      cake.rotation.set(0, 0, 0);
      table.position.set(0, 0, TABLE_END_Z);
      candle.position.set(0, CANDLE_END_Y, 0);
      candle.visible = true;
      emitBackgroundOpacity(0);
      emitEnvironmentProgress(1);
      hasCompletedRef.current = true;
      if (!completionNotifiedRef.current) {
        completionNotifiedRef.current = true;
        onAnimationComplete?.();
      }
    }
  });

  return (
    <>
      <group ref={tableGroup}>
        <Table />
        {/* an upright strip of film standing on the table in an arc in front of the cake */}
        <FilmRing
          photos={FILM_PHOTOS}
          repeats={1}
          radius={2.05}
          photoHeight={0.46}
          spinSpeed={0}
          arcStart={FILM_ARC_START}
          arcLength={FILM_ARC_LENGTH}
          selected={selectedPhoto}
          onSelect={onSelectPhoto}
        />
        <FilmCanister position={arcPoint(2.12, FILM_ARC_START - 0.11)} />
        <FilmCanister
          position={arcPoint(2.12, FILM_ARC_START + FILM_ARC_LENGTH + 0.11)}
          color="#3d4250"
          band="#9aa3b5"
        />
        <GiftBox position={[-0.9, 0, 2.2]} size={0.46} rotationY={0.4} />
        <GiftBox position={[-1.45, 0, 2.65]} size={0.3} color="#8ecae6" ribbon="#ffffff" rotationY={-0.3} />
        <Balloons position={[-1.9, 0, 1.8]} />
        <FlowerVase position={[-1.2, 0, -2.0]} />
        <Confetti avoid={CONFETTI_AVOID} />
        {cards.map((card) => (
          <BirthdayCard
            key={card.id}
            id={card.id}
            image={card.image}
            tablePosition={card.position}
            tableRotation={card.rotation}
            isActive={activeCardId === card.id}
            onToggle={onToggleCard}
          />
        ))}
      </group>
      {/* the cake blocks taps, so a tap on it doesn't reach the film ring behind */}
      <group
        ref={cakeGroup}
        onPointerDown={(e) => e.stopPropagation()}
        onPointerUp={(e) => e.stopPropagation()}
      >
        <Cake />
      </group>
      <group ref={candleGroup}>
        <Candle isLit={candleLit} scale={0.25} position={[0, 1.1, 0]} />
      </group>
    </>
  );
}

function ConfiguredOrbitControls() {
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const camera = useThree((state) => state.camera);
  const aspect = useThree((state) => state.size.width / state.size.height);

  useEffect(() => {
    // on narrow (portrait phone) screens pull the camera back so the frames fit
    const radius = clamp((ORBIT_INITIAL_RADIUS * 0.7) / aspect, ORBIT_INITIAL_RADIUS, 6);
    const height = ORBIT_INITIAL_HEIGHT * (radius / ORBIT_INITIAL_RADIUS);
    const offset = new Vector3(
      Math.sin(ORBIT_INITIAL_AZIMUTH) * radius,
      height,
      Math.cos(ORBIT_INITIAL_AZIMUTH) * radius
    );
    const cameraPosition = ORBIT_TARGET.clone().add(offset);
    camera.position.copy(cameraPosition);
    camera.lookAt(ORBIT_TARGET);

    const controls = controlsRef.current;
    if (controls) {
      controls.target.copy(ORBIT_TARGET);
      controls.update();
    }
    // only re-frame when the screen shape really changes (e.g. phone rotated)
  }, [camera, aspect]);

  return (
    <OrbitControls
      ref={controlsRef}
      enableDamping
      dampingFactor={0.05}
      minDistance={ORBIT_MIN_DISTANCE}
      maxDistance={ORBIT_MAX_DISTANCE}
      minPolarAngle={ORBIT_MIN_POLAR}
      maxPolarAngle={ORBIT_MAX_POLAR}
    />
  );
}

type EnvironmentBackgroundControllerProps = {
  intensity: number;
};

function EnvironmentBackgroundController({
  intensity,
}: EnvironmentBackgroundControllerProps) {
  const scene = useThree((state) => state.scene);

  useEffect(() => {
    if ("backgroundIntensity" in scene) {
      // Cast required because older typings might not include backgroundIntensity yet.
      (scene as typeof scene & { backgroundIntensity: number }).backgroundIntensity =
        intensity;
    }
  }, [scene, intensity]);

  return null;
}


export default function App() {
  const [hasStarted, setHasStarted] = useState(false);
  const [backgroundOpacity, setBackgroundOpacity] = useState(1);
  const [environmentProgress, setEnvironmentProgress] = useState(0);
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  const [currentCharIndex, setCurrentCharIndex] = useState(0);
  const [sceneStarted, setSceneStarted] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [hasAnimationCompleted, setHasAnimationCompleted] = useState(false);
  const [isCandleLit, setIsCandleLit] = useState(true);
  const [fireworksActive, setFireworksActive] = useState(false);
  const [activeCardId, setActiveCardId] = useState<string | null>(null);
  const [viewerIndex, setViewerIndex] = useState<number | null>(null);
  const [featuredPhoto, setFeaturedPhoto] = useState<number | null>(null);
  const backgroundAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    const audio = new Audio("./music.mp3");
    audio.loop = true;
    audio.preload = "auto";
    backgroundAudioRef.current = audio;
    return () => {
      audio.pause();
      backgroundAudioRef.current = null;
    };
  }, []);

  const playBackgroundMusic = useCallback(() => {
    const audio = backgroundAudioRef.current;
    if (!audio) {
      return;
    }
    if (!audio.paused) {
      return;
    }
    audio.currentTime = 0;
    void audio.play().catch(() => {
      // ignore play errors (browser might block)
    });
  }, []);

  const typingComplete = currentLineIndex >= TYPED_LINES.length;
  const typedLines = useMemo(() => {
    if (TYPED_LINES.length === 0) {
      return [""];
    }

    return TYPED_LINES.map((line, index) => {
      if (typingComplete || index < currentLineIndex) {
        return line;
      }
      if (index === currentLineIndex) {
        return line.slice(0, Math.min(currentCharIndex, line.length));
      }
      return "";
    });
  }, [currentCharIndex, currentLineIndex, typingComplete]);

  const cursorLineIndex = typingComplete
    ? Math.max(typedLines.length - 1, 0)
    : currentLineIndex;
  const cursorTargetIndex = Math.max(
    Math.min(cursorLineIndex, typedLines.length - 1),
    0
  );

  useEffect(() => {
    if (!hasStarted) {
      setCurrentLineIndex(0);
      setCurrentCharIndex(0);
      setSceneStarted(false);
      setIsCandleLit(true);
      setFireworksActive(false);
      setHasAnimationCompleted(false);
      return;
    }

    if (typingComplete) {
      if (!sceneStarted) {
        const handle = window.setTimeout(() => {
          setSceneStarted(true);
        }, POST_TYPING_SCENE_DELAY);
        return () => window.clearTimeout(handle);
      }
      return;
    }

    const currentLine = TYPED_LINES[currentLineIndex] ?? "";
    const handle = window.setTimeout(() => {
      if (currentCharIndex < currentLine.length) {
        setCurrentCharIndex((prev) => prev + 1);
        return;
      }

      let nextLineIndex = currentLineIndex + 1;
      while (
        nextLineIndex < TYPED_LINES.length &&
        TYPED_LINES[nextLineIndex].length === 0
      ) {
        nextLineIndex += 1;
      }

      setCurrentLineIndex(nextLineIndex);
      setCurrentCharIndex(0);
    }, TYPED_CHAR_DELAY);

    return () => window.clearTimeout(handle);
  }, [
    hasStarted,
    currentCharIndex,
    currentLineIndex,
    typingComplete,
    sceneStarted,
  ]);

  useEffect(() => {
    const handle = window.setInterval(() => {
      setCursorVisible((prev) => !prev);
    }, CURSOR_BLINK_INTERVAL);
    return () => window.clearInterval(handle);
  }, []);

  const startShow = useCallback(() => {
    playBackgroundMusic();
    setHasStarted(true);
  }, [playBackgroundMusic]);

  const blowOutCandle = useCallback(() => {
    setIsCandleLit(false);
    setFireworksActive(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" && event.key !== " ") {
        return;
      }
      event.preventDefault();
      if (!hasStarted) {
        startShow();
        return;
      }
      if (hasAnimationCompleted && isCandleLit) {
        blowOutCandle();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [hasStarted, hasAnimationCompleted, isCandleLit, startShow, blowOutCandle]);

  // tap/click anywhere to start (so it also works on phones)
  useEffect(() => {
    if (hasStarted) return;
    const handlePointer = () => startShow();
    window.addEventListener("pointerup", handlePointer);
    return () => window.removeEventListener("pointerup", handlePointer);
  }, [hasStarted, startShow]);

  // pop the greeting card up a little after the fireworks start
  const [isGreetingOpen, setIsGreetingOpen] = useState(false);
  const [hasSeenGreeting, setHasSeenGreeting] = useState(false);
  useEffect(() => {
    if (!fireworksActive) return;
    const handle = window.setTimeout(() => {
      setIsGreetingOpen(true);
      setHasSeenGreeting(true);
    }, CARD_DELAY_MS);
    return () => window.clearTimeout(handle);
  }, [fireworksActive]);

  const handleCardToggle = useCallback((id: string) => {
    setActiveCardId((current) => (current === id ? null : id));
  }, []);

  const isScenePlaying = hasStarted && sceneStarted;

  return (
    <div className="App">
      <div
        className="background-overlay"
        style={{ opacity: backgroundOpacity }}
      >
        <div className="typed-text">
          {typedLines.map((line, index) => {
            const showCursor =
              cursorVisible &&
              index === cursorTargetIndex &&
              (!typingComplete || !sceneStarted);
            return (
              <span className="typed-line" key={`typed-line-${index}`}>
                {line || "\u00a0"}
                {showCursor && (
                  <span aria-hidden="true" className="typed-cursor">
                    _
                  </span>
                )}
              </span>
            );
          })}
        </div>
      </div>
      {!hasStarted && (
        <div className="hint-overlay">{IS_TOUCH ? START_HINT_TOUCH : START_HINT}</div>
      )}
      {hasAnimationCompleted && isCandleLit && (
        <div className="blow-controls">
          <button className="blow-button" onClick={blowOutCandle}>
            {BLOW_BUTTON}
          </button>
          <div className="blow-hint">{IS_TOUCH ? BLOW_HINT_TOUCH : BLOW_HINT}</div>
        </div>
      )}
      <FireworksOverlay isActive={fireworksActive} daytime={bg.daytime} />
      {hasAnimationCompleted && !isGreetingOpen && viewerIndex === null && featuredPhoto === null && (
        <div className="ring-hint">{RING_HINT}</div>
      )}
      <PhotoViewer
        photos={FILM_PHOTOS.map((p) => p.full)}
        index={viewerIndex}
        onChange={setViewerIndex}
      />
      <GreetingCard open={isGreetingOpen} onClose={() => setIsGreetingOpen(false)} />
      {hasSeenGreeting && !isGreetingOpen && (
        <button className="reopen-card" onClick={() => setIsGreetingOpen(true)}>
          💌 打开贺卡
        </button>
      )}
      <Canvas
        onPointerMissed={() => setFeaturedPhoto(null)}
        gl={{ alpha: true }}
        style={{ background: "transparent" }}
        onCreated={({ gl }) => {
          gl.setClearColor("#000000", 0);
        }}
      >
        <Suspense fallback={null}>
          <AnimatedScene
            isPlaying={isScenePlaying}
            candleLit={isCandleLit}
            onBackgroundFadeChange={setBackgroundOpacity}
            onEnvironmentProgressChange={setEnvironmentProgress}
            onAnimationComplete={() => setHasAnimationCompleted(true)}
            cards={BIRTHDAY_CARDS}
            activeCardId={activeCardId}
            onToggleCard={handleCardToggle}
            onSelectPhoto={setFeaturedPhoto}
            selectedPhoto={featuredPhoto}
          />
          <ambientLight intensity={(1 - environmentProgress) * 0.8} />
          <directionalLight
            intensity={bg.sunIntensity}
            position={[2, 10, 0]}
            color={bg.sunColor}
          />
          {bg.file.endsWith(".hdr") ? (
            <>
              <Environment
                files={[bg.file]}
                backgroundRotation={[0, bg.rotation, 0]}
                environmentRotation={[0, bg.rotation, 0]}
                background
                environmentIntensity={bg.environmentIntensity * environmentProgress}
                backgroundIntensity={bg.backgroundIntensity * environmentProgress}
              />
              <EnvironmentBackgroundController
                intensity={bg.backgroundIntensity * environmentProgress}
              />
            </>
          ) : (
            <PanoramaBackground
              file={bg.file}
              fileSmall={bg.fileSmall}
              rotation={bg.rotation}
              progress={environmentProgress}
              backgroundIntensity={bg.backgroundIntensity}
              environmentIntensity={bg.environmentIntensity}
            />
          )}
          <Fireworks isActive={fireworksActive} origin={[0, 10, 0]} />
          <ConfiguredOrbitControls />
        </Suspense>
        {/* loads its full-size photo on demand without pausing the rest of the scene */}
        <Suspense fallback={null}>
          {featuredPhoto !== null && (
            <FeaturedPhoto
              src={FILM_PHOTOS[featuredPhoto].full}
              position={[1.0, 2.0, 0]}
              size={1.75}
              onOpenFull={() => setViewerIndex(featuredPhoto)}
              onClose={() => setFeaturedPhoto(null)}
              closeLabel="收起照片"
            />
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
