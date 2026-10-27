import React, { useEffect, useRef, useCallback } from 'react';
import * as THREE from 'three';
import { CameraProperties, VideoColorProperties, ProjectionMode, StereoMode, OutputMode } from '../types/vr';
import { StereoVideoShader, LensDistortionShader, AnaglyphDuboisShader } from '../shaders/stereoShader';
import { StereoscopicTestPatternGenerator } from '../utils/testPatternGenerator';
import { ENVIRONMENT_PRESETS } from '../constants/presets';
import { vrAudio } from '../utils/audioManager';
import { telemetry } from '../utils/telemetryManager';

interface VRCanvasProps {
  videoElement: HTMLVideoElement | null;
  mediaUrl?: string;
  currentMediaId?: string;
  testPatternGenerator: StereoscopicTestPatternGenerator | null;
  isProcedural: boolean;
  stereoMode: StereoMode;
  projectionMode: ProjectionMode;
  outputMode: OutputMode;
  cameraProperties: CameraProperties;
  colorProperties: VideoColorProperties;
  onCanvasClick?: () => void;
  recenterTrigger: number;
  calibrateTrigger?: number;
  onCalibrationComplete?: (biasDegPerSec: number) => void;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onRecenterAction: () => void;
  onAdjustIPD: (delta: number) => void;
  onAdjustFOV: (delta: number) => void;
  onCycleProjection: () => void;
  onAdjustBrightness?: (delta: number) => void;
  onAdjustVolume?: (delta: number) => void;
  onSeekDelta?: (seconds: number) => void;
}

export const VRCanvas: React.FC<VRCanvasProps> = ({
  videoElement,
  mediaUrl,
  currentMediaId,
  testPatternGenerator,
  isProcedural,
  stereoMode,
  projectionMode,
  outputMode,
  cameraProperties,
  colorProperties,
  onCanvasClick,
  recenterTrigger,
  calibrateTrigger,
  onCalibrationComplete,
  isPlaying,
  onAdjustBrightness,
  onAdjustVolume,
  onAdjustFOV,
  onSeekDelta,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // LIVE MUTABLE REFS: Prevents stale closure bugs so all sub-menu slider controls update immediately!
  const cameraPropsRef = useRef<CameraProperties>(cameraProperties);
  cameraPropsRef.current = cameraProperties;

  const colorPropsRef = useRef<VideoColorProperties>(colorProperties);
  colorPropsRef.current = colorProperties;

  const projectionModeRef = useRef<ProjectionMode>(projectionMode);
  projectionModeRef.current = projectionMode;

  const outputModeRef = useRef<OutputMode>(outputMode);
  outputModeRef.current = outputMode;

  const stereoModeRef = useRef<StereoMode>(stereoMode);
  stereoModeRef.current = stereoMode;

  const onCalibrationCompleteRef = useRef(onCalibrationComplete);
  onCalibrationCompleteRef.current = onCalibrationComplete;

  const isPlayingRef = useRef<boolean>(isPlaying);
  isPlayingRef.current = isPlaying;

  const videoElementRef = useRef<HTMLVideoElement | null>(videoElement);
  videoElementRef.current = videoElement;

  const isProceduralRef = useRef<boolean>(isProcedural);
  isProceduralRef.current = isProcedural;

  const mediaUrlRef = useRef<string | undefined>(mediaUrl);
  mediaUrlRef.current = mediaUrl;

  // References for Three.js objects
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRigRef = useRef<THREE.Group | null>(null);
  const leftCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rightCameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const screenMeshRef = useRef<THREE.Mesh | null>(null);
  const screenMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const videoTextureRef = useRef<THREE.VideoTexture | null>(null);
  const proceduralTextureRef = useRef<THREE.CanvasTexture | null>(null);
  const ambientLightRef = useRef<THREE.PointLight | null>(null);
  const floorMeshRef = useRef<THREE.Mesh | null>(null);
  const particlesRef = useRef<THREE.Points | null>(null);

  // Render targets for Post-Processing & Anaglyph
  const leftTargetRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const rightTargetRef = useRef<THREE.WebGLRenderTarget | null>(null);
  const postCameraRef = useRef<THREE.OrthographicCamera | null>(null);
  const postSceneRef = useRef<THREE.Scene | null>(null);
  const distortionMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const anaglyphMaterialRef = useRef<THREE.ShaderMaterial | null>(null);
  const postQuadRef = useRef<THREE.Mesh | null>(null);

  // Interaction & Tracking state
  const isDraggingRef = useRef(false);
  const pointerStartRef = useRef({ x: 0, y: 0, time: 0 });
  const prevPointerRef = useRef({ x: 0, y: 0 });
  const dragDistanceRef = useRef(0);
  const userEulerRef = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const targetUserEulerRef = useRef(new THREE.Euler(0, 0, 0, 'YXZ'));
  const lastTapTimeRef = useRef<number>(0);

  // Multi-touch Gestures for Android (Pinch Zoom, Edge Swipes)
  const activeTouchModeRef = useRef<'look' | 'brightness' | 'volume' | 'pinch' | null>(null);
  const initialPinchDistRef = useRef<number | null>(null);

  // GYROSCOPE HEAD TRACKING, RAPID-MOTION STABILIZATION & HEADING CALIBRATION
  const rawDeviceQuaternionRef = useRef<THREE.Quaternion | null>(null);
  const headingOffsetQuatRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const smoothedRigQuaternionRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const hasAutoCalibratedRef = useRef<boolean>(false);
  const isShakingRef = useRef<boolean>(false);
  const shakeTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastFilteredQuatRef = useRef<THREE.Quaternion>(new THREE.Quaternion());
  const hasPrevQuatRef = useRef<boolean>(false);

  // Dynamic Anti-Drift Engine & Stationary Bias Cancellation Refs
  const sessionStartTimeRef = useRef<number>(performance.now());
  const lastRenderTimeRef = useRef<number>(0);
  const prevRawYawRef = useRef<number>(0);
  const prevYawRateRef = useRef<number>(0);
  const prevPitchAngleRef = useRef<number>(0);
  const prevRollAngleRef = useRef<number>(0);
  const stationaryDurationRef = useRef<number>(0);
  const isStationaryRef = useRef<boolean>(false);
  const gyroBiasYawRef = useRef<number>(0);
  const filteredYawRef = useRef<number>(0);
  const yawDriftAccumulatorRef = useRef<number>(0);
  const stationaryLockedYawRef = useRef<number>(0);
  const pitchOffsetRef = useRef<number>(0);
  const rollOffsetRef = useRef<number>(0);
  const centerGazeDwellRef = useRef<number>(0);
  const oscillationCorrectionRef = useRef<number>(0);

  // Rapid Oscillation Tracker (for vigorous head shake stabilization)
  const lastReversalTimeRef = useRef<number>(0);
  const oscillationCountRef = useRef<number>(0);
  const isOscillatingRef = useRef<boolean>(false);
  const lastExtremumYawRef = useRef<number>(0);
  const currentMidpointRef = useRef<number>(0);
  const lockedMidpointRef = useRef<number>(0);

  // Performance & FPS tracking
  const fpsFrameCountRef = useRef<number>(0);
  const fpsLastCalcTimeRef = useRef<number>(performance.now());

  // Calibrates playback heading & gaze so that the user's current facing direction
  // centers the video playback both horizontally (0, 0, -1) and vertically at eye level (0°)
  const calibrateHeadingToForward = useCallback((devQuat: THREE.Quaternion) => {
    // 1. Exact Swing-Twist decomposition around Y axis for horizontal yaw:
    const qy = devQuat.y;
    const qw = devQuat.w;
    const magSq = qy * qy + qw * qw;
    if (magSq > 1e-8) {
      const invMag = 1 / Math.sqrt(magSq);
      // Inverse of (0, qy*invMag, 0, qw*invMag) is (0, -qy*invMag, 0, qw*invMag)
      headingOffsetQuatRef.current.set(0, -qy * invMag, 0, qw * invMag);
    } else {
      headingOffsetQuatRef.current.identity();
    }

    // 2. Compute vertical pitch and roll offsets in the aligned coordinate frame
    // so the viewpoint centers directly at the screen wherever the user is looking:
    const alignedQuat = headingOffsetQuatRef.current.clone().multiply(devQuat);
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(alignedQuat);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(alignedQuat);
    pitchOffsetRef.current = Math.asin(Math.max(-1, Math.min(1, forward.y)));
    rollOffsetRef.current = Math.asin(Math.max(-1, Math.min(1, right.y)));
    prevPitchAngleRef.current = 0;
    prevRollAngleRef.current = 0;
  }, []);

  // Recenter handler: centers playback directly in front of the direction the user is facing (both H and V)
  const doRecenter = useCallback(() => {
    targetUserEulerRef.current.set(0, 0, 0);
    userEulerRef.current.set(0, 0, 0);
    yawDriftAccumulatorRef.current = 0;
    stationaryLockedYawRef.current = 0;
    prevRawYawRef.current = 0;
    filteredYawRef.current = 0;
    gyroBiasYawRef.current = 0;
    oscillationCorrectionRef.current = 0;
    oscillationCountRef.current = 0;
    isOscillatingRef.current = false;
    lockedMidpointRef.current = 0;
    currentMidpointRef.current = 0;
    stationaryDurationRef.current = 0.2;
    centerGazeDwellRef.current = 0;
    isStationaryRef.current = true;

    if (rawDeviceQuaternionRef.current) {
      calibrateHeadingToForward(rawDeviceQuaternionRef.current);
    } else {
      headingOffsetQuatRef.current.identity();
      pitchOffsetRef.current = 0;
      rollOffsetRef.current = 0;
      prevPitchAngleRef.current = 0;
      prevRollAngleRef.current = 0;
    }
    smoothedRigQuaternionRef.current.identity();
    if (cameraRigRef.current) {
      cameraRigRef.current.quaternion.identity();
    }

    const currentCount = (telemetry.getData().recenterCount || 0) + 1;
    telemetry.update({ recenterCount: currentCount });
    telemetry.log('recenter', `View recentered to user forward horizon (#${currentCount})`, {
      hasDeviceQuat: !!rawDeviceQuaternionRef.current,
      pitchOffsetDeg: THREE.MathUtils.radToDeg(pitchOffsetRef.current).toFixed(1),
      rollOffsetDeg: THREE.MathUtils.radToDeg(rollOffsetRef.current).toFixed(1),
    });
  }, [calibrateHeadingToForward]);

  // Manual / 1-Tap Hardware Gyroscope Calibrator:
  // Zeros residual sensor DC bias, aligns heading & pitch to forward horizon, and clears accumulated drift
  const doCalibrateSensors = useCallback(() => {
    targetUserEulerRef.current.set(0, 0, 0);
    userEulerRef.current.set(0, 0, 0);
    yawDriftAccumulatorRef.current = 0;
    stationaryLockedYawRef.current = 0;
    prevRawYawRef.current = 0;
    filteredYawRef.current = 0;
    const measuredBiasDeg = THREE.MathUtils.radToDeg(gyroBiasYawRef.current);
    gyroBiasYawRef.current = 0;
    stationaryDurationRef.current = 0.5; // Immediately enter stationary zero-creep lock
    isStationaryRef.current = true;
    oscillationCorrectionRef.current = 0;
    oscillationCountRef.current = 0;
    isOscillatingRef.current = false;
    lockedMidpointRef.current = 0;
    currentMidpointRef.current = 0;
    centerGazeDwellRef.current = 0;

    if (rawDeviceQuaternionRef.current) {
      calibrateHeadingToForward(rawDeviceQuaternionRef.current);
    } else {
      headingOffsetQuatRef.current.identity();
      pitchOffsetRef.current = 0;
      rollOffsetRef.current = 0;
      prevPitchAngleRef.current = 0;
      prevRollAngleRef.current = 0;
    }
    smoothedRigQuaternionRef.current.identity();
    if (cameraRigRef.current) {
      cameraRigRef.current.quaternion.identity();
    }

    const currentCount = (telemetry.getData().calibrationCount || 0) + 1;
    telemetry.update({
      calibrationCount: currentCount,
      gyroBiasYaw: 0,
      isStationary: true,
      motionMode: 'stationary',
    });
    telemetry.log('sensor', `Sensors calibrated & hardware bias zeroed (#${currentCount})`, {
      residualBias: `${measuredBiasDeg.toFixed(2)}°/s`,
      hasDeviceQuat: !!rawDeviceQuaternionRef.current,
      pitchOffsetDeg: THREE.MathUtils.radToDeg(pitchOffsetRef.current).toFixed(1),
    });

    if (onCalibrationCompleteRef.current) {
      onCalibrationCompleteRef.current(measuredBiasDeg);
    }
  }, [calibrateHeadingToForward]);

  const lastRecenterTriggerRef = useRef<number>(0);
  useEffect(() => {
    if (recenterTrigger && recenterTrigger > 0 && recenterTrigger !== lastRecenterTriggerRef.current) {
      lastRecenterTriggerRef.current = recenterTrigger;
      doRecenter();
    }
  }, [recenterTrigger, doRecenter]);

  const lastCalibrateTriggerRef = useRef<number>(0);
  useEffect(() => {
    if (calibrateTrigger && calibrateTrigger > 0 && calibrateTrigger !== lastCalibrateTriggerRef.current) {
      lastCalibrateTriggerRef.current = calibrateTrigger;
      doCalibrateSensors();
    }
  }, [calibrateTrigger, doCalibrateSensors]);

  // Handle Device Orientation & Motion (Rapid Shake & Drift Shield)
  useEffect(() => {
    if (!cameraProperties.headTracking) return;

    const _zee = new THREE.Vector3(0, 0, 1);
    const _euler = new THREE.Euler();
    const _q0 = new THREE.Quaternion();
    const _q1 = new THREE.Quaternion(-Math.SQRT1_2, 0, 0, Math.SQRT1_2); // -PI/2 around X axis

    let motionCount = 0;
    let motionLastHzTime = performance.now();
    let motionHz = 0;

    let orientCount = 0;
    let orientLastHzTime = performance.now();
    let orientHz = 0;

    // Detect rapid motion / violent shaking via accelerometer & gyro rotation rate
    const handleMotion = (e: DeviceMotionEvent) => {
      let isViolent = false;
      let accelMag: number | null = null;
      let rotMag: number | null = null;

      motionCount++;
      const now = performance.now();
      if (now - motionLastHzTime >= 1000) {
        motionHz = (motionCount * 1000) / (now - motionLastHzTime);
        motionCount = 0;
        motionLastHzTime = now;
      }

      if (e.acceleration) {
        const { x, y, z } = e.acceleration;
        if (x !== null && y !== null && z !== null) {
          const accelMagSq = x * x + y * y + z * z;
          accelMag = Math.sqrt(accelMagSq);
          // Accel > 6.0 m/s^2 means vigorous shaking / rapid motion
          if (accelMagSq > 36) isViolent = true;
        }
      }
      if (e.rotationRate) {
        const { alpha, beta, gamma } = e.rotationRate;
        if (alpha !== null && beta !== null && gamma !== null) {
          rotMag = Math.abs(alpha) + Math.abs(beta) + Math.abs(gamma);
          // Rotation rate > 300 deg/s means fast whipping / shaking
          if (rotMag > 300) isViolent = true;
        }
      }

      if (isViolent) {
        if (!isShakingRef.current) {
          telemetry.log('sensor', 'High-G device shake / rapid motion detected', {
            accel: accelMag ? `${accelMag.toFixed(1)} m/s²` : 'unknown',
            rotRate: rotMag ? `${rotMag.toFixed(0)} °/s` : 'unknown',
          });
        }
        isShakingRef.current = true;
        if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
        shakeTimeoutRef.current = setTimeout(() => {
          isShakingRef.current = false;
        }, 320);
      }

      telemetry.update({
        accelX: e.acceleration?.x ?? null,
        accelY: e.acceleration?.y ?? null,
        accelZ: e.acceleration?.z ?? null,
        accelMagnitude: accelMag,
        rotAlpha: e.rotationRate?.alpha ?? null,
        rotBeta: e.rotationRate?.beta ?? null,
        rotGamma: e.rotationRate?.gamma ?? null,
        rotSpeed: rotMag,
        motionHz,
        isShaking: isViolent || isShakingRef.current,
      });
    };

    const handleOrientation = (e: DeviceOrientationEvent) => {
      if (e.alpha === null || e.beta === null || e.gamma === null) return;
      const alpha = THREE.MathUtils.degToRad(e.alpha); // Z compass [0, 360]
      const beta = THREE.MathUtils.degToRad(e.beta);   // X pitch [-180, 180]
      const gamma = THREE.MathUtils.degToRad(e.gamma); // Y roll [-90, 90]

      orientCount++;
      const now = performance.now();
      if (now - orientLastHzTime >= 1000) {
        orientHz = (orientCount * 1000) / (now - orientLastHzTime);
        orientCount = 0;
        orientLastHzTime = now;
      }

      // Detect screen orientation (landscape angle on mobile is 90 or -90 deg)
      let screenAngle = 0;
      if (window.screen?.orientation?.angle !== undefined) {
        screenAngle = window.screen.orientation.angle;
      } else if (typeof window.orientation === 'number') {
        screenAngle = window.orientation;
      }
      const orient = THREE.MathUtils.degToRad(screenAngle);

      telemetry.update({
        alpha: e.alpha,
        beta: e.beta,
        gamma: e.gamma,
        absolute: e.absolute ?? null,
        orientationHz: orientHz,
        screenAngle,
        screenType: (window.screen?.orientation as ScreenOrientation | undefined)?.type ?? 'unknown',
      });

      // Official Three.js DeviceOrientation transformation
      _euler.set(beta, alpha, -gamma, 'YXZ');
      const devQuat = new THREE.Quaternion();
      devQuat.setFromEuler(_euler);
      devQuat.multiply(_q1); // Rotates camera from table-flat to forward horizon!
      devQuat.multiply(_q0.setFromAxisAngle(_zee, -orient)); // Landscape orientation compensation

      // Continuous shortest-path quaternion alignment (prevents double-cover sign inversion):
      // Preserves 100% of orientation frames even during rapid turns, eliminating dropped-frame drift:
      if (hasPrevQuatRef.current) {
        if (lastFilteredQuatRef.current.dot(devQuat) < 0) {
          devQuat.set(-devQuat.x, -devQuat.y, -devQuat.z, -devQuat.w);
        }
      }
      lastFilteredQuatRef.current.copy(devQuat);
      hasPrevQuatRef.current = true;

      rawDeviceQuaternionRef.current = devQuat;

      // Auto-calibrate on first orientation event
      if (!hasAutoCalibratedRef.current) {
        hasAutoCalibratedRef.current = true;
        calibrateHeadingToForward(devQuat);
        telemetry.log('system', 'Initial head tracking auto-calibrated to horizon', {
          alpha: e.alpha?.toFixed(1),
          beta: e.beta?.toFixed(1),
          gamma: e.gamma?.toFixed(1),
        });
      }
    };

    window.addEventListener('devicemotion', handleMotion);
    window.addEventListener('deviceorientation', handleOrientation);
    return () => {
      window.removeEventListener('devicemotion', handleMotion);
      window.removeEventListener('deviceorientation', handleOrientation);
      if (shakeTimeoutRef.current) clearTimeout(shakeTimeoutRef.current);
    };
  }, [cameraProperties.headTracking, calibrateHeadingToForward]);

  // Main Three.js Setup
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const width = container.clientWidth || window.innerWidth;
    const height = container.clientHeight || window.innerHeight;

    // 1. WebGL Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.autoClear = false;
    rendererRef.current = renderer;

    try {
      const gl = renderer.getContext();
      const debugExt = gl.getExtension('WEBGL_debug_renderer_info');
      const gpuRenderer = debugExt ? gl.getParameter(debugExt.UNMASKED_RENDERER_WEBGL) : 'Standard GPU';
      telemetry.log('webgl', `WebGL context initialized (${width}x${height}, DPR: ${window.devicePixelRatio})`, {
        gpu: gpuRenderer,
        maxTextureSize: gl.getParameter(gl.MAX_TEXTURE_SIZE),
      });
    } catch {
      // Ignore if unmasked renderer query is restricted
    }

    // 2. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020408);
    sceneRef.current = scene;

    // Floor Mesh (Solid dark floor, no wireframe grid!)
    const floorGeo = new THREE.PlaneGeometry(60, 60);
    const floorMat = new THREE.MeshBasicMaterial({
      color: 0x05070e,
      transparent: true,
      opacity: 0.35,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -2.2;
    floor.visible = false;
    scene.add(floor);
    floorMeshRef.current = floor;

    // Cosmic Particles for Theater ambiance
    const particleCount = 200;
    const particleGeo = new THREE.BufferGeometry();
    const particlePositions = new Float32Array(particleCount * 3);
    for (let i = 0; i < particleCount * 3; i += 3) {
      particlePositions[i] = (Math.random() - 0.5) * 50;
      particlePositions[i + 1] = Math.random() * 25 - 5;
      particlePositions[i + 2] = (Math.random() - 0.5) * 50;
    }
    particleGeo.setAttribute('position', new THREE.BufferAttribute(particlePositions, 3));
    const particleMat = new THREE.PointsMaterial({
      size: 0.15,
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.4,
    });
    const particles = new THREE.Points(particleGeo, particleMat);
    particles.visible = false;
    scene.add(particles);
    particlesRef.current = particles;

    // Ambient bounce light
    const pointLight = new THREE.PointLight(0x38bdf8, 0.4, 25);
    pointLight.position.set(0, 0, 0);
    scene.add(pointLight);
    ambientLightRef.current = pointLight;

    // 3. Camera Rig
    const cameraRig = new THREE.Group();
    scene.add(cameraRig);
    cameraRigRef.current = cameraRig;

    const initialCamProps = cameraPropsRef.current;
    const leftCamera = new THREE.PerspectiveCamera(initialCamProps.fov, (width / 2) / height, 0.1, 1000);
    const rightCamera = new THREE.PerspectiveCamera(initialCamProps.fov, (width / 2) / height, 0.1, 1000);
    cameraRig.add(leftCamera);
    cameraRig.add(rightCamera);
    leftCameraRef.current = leftCamera;
    rightCameraRef.current = rightCamera;

    // 4. Post-processing setup (Distortion & Anaglyph)
    const targetOptions = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
    };
    leftTargetRef.current = new THREE.WebGLRenderTarget(width, height, targetOptions);
    rightTargetRef.current = new THREE.WebGLRenderTarget(width, height, targetOptions);

    const postScene = new THREE.Scene();
    const postCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    postSceneRef.current = postScene;
    postCameraRef.current = postCamera;

    const distortionMat = new THREE.ShaderMaterial({
      vertexShader: LensDistortionShader.vertexShader,
      fragmentShader: LensDistortionShader.fragmentShader,
      uniforms: {
        tDiffuse: { value: null },
        uK1: { value: initialCamProps.barrelDistortionK1 },
        uK2: { value: initialCamProps.barrelDistortionK2 },
        uChromatic: { value: initialCamProps.chromaticAberration },
        uLensMask: { value: initialCamProps.lensMask },
        uMaskRadius: { value: initialCamProps.lensVignetteRadius },
      },
      depthTest: false,
      depthWrite: false,
    });
    distortionMaterialRef.current = distortionMat;

    let anaglyphTypeIndex = 0;
    const initialColorProps = colorPropsRef.current;
    if (initialColorProps.anaglyphType === 'colorcode') anaglyphTypeIndex = 1;
    else if (initialColorProps.anaglyphType === 'green-magenta') anaglyphTypeIndex = 2;
    else if (initialColorProps.anaglyphType === 'monochrome') anaglyphTypeIndex = 3;

    const anaglyphMat = new THREE.ShaderMaterial({
      vertexShader: AnaglyphDuboisShader.vertexShader,
      fragmentShader: AnaglyphDuboisShader.fragmentShader,
      uniforms: {
        tLeftEye: { value: null },
        tRightEye: { value: null },
        uAnaglyphType: { value: anaglyphTypeIndex },
      },
      depthTest: false,
      depthWrite: false,
    });
    anaglyphMaterialRef.current = anaglyphMat;

    const postQuad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), distortionMat);
    postScene.add(postQuad);
    postQuadRef.current = postQuad;

    // 5. Texture Init
    let initialTexture: THREE.Texture;
    if (isProcedural && testPatternGenerator) {
      const procTex = new THREE.CanvasTexture(testPatternGenerator.canvas);
      procTex.minFilter = THREE.LinearFilter;
      procTex.magFilter = THREE.LinearFilter;
      proceduralTextureRef.current = procTex;
      initialTexture = procTex;
    } else if (videoElement) {
      const vidTex = new THREE.VideoTexture(videoElement);
      vidTex.minFilter = THREE.LinearFilter;
      vidTex.magFilter = THREE.LinearFilter;
      vidTex.format = THREE.RGBAFormat;
      videoTextureRef.current = vidTex;
      initialTexture = vidTex;
    } else {
      const dummyCanvas = document.createElement('canvas');
      dummyCanvas.width = 16;
      dummyCanvas.height = 16;
      initialTexture = new THREE.CanvasTexture(dummyCanvas);
    }

    // Screen Material
    const initialStereo = stereoModeRef.current;
    const screenMat = new THREE.ShaderMaterial({
      vertexShader: StereoVideoShader.vertexShader,
      fragmentShader: StereoVideoShader.fragmentShader,
      uniforms: {
        map: { value: initialTexture },
        uStereoMode: { value: initialStereo === 'sbs' ? 1 : initialStereo === 'top-bottom' ? 2 : 0 },
        uEye: { value: 0 },
        uEyeSwap: { value: initialCamProps.eyeSwap },
        uVerticalOffset: { value: initialCamProps.verticalParallax },
        uBrightness: { value: initialColorProps.brightness },
        uContrast: { value: initialColorProps.contrast },
        uSaturation: { value: initialColorProps.saturation },
        uGamma: { value: initialColorProps.gamma },
      },
      side: THREE.DoubleSide,
    });
    screenMaterialRef.current = screenMat;

    // 6. Animation Render Loop (Using LIVE Refs to guarantee all sub-menu slider controls work!)
    let animationFrameId: number;

    const render = () => {
      const cam = cameraPropsRef.current;
      const proj = projectionModeRef.current;
      const out = outputModeRef.current;

      // Real-time FPS & FrameTime metering for Telemetry
      const renderNow = performance.now();
      fpsFrameCountRef.current++;
      if (renderNow - fpsLastCalcTimeRef.current >= 500) {
        const measuredFps = (fpsFrameCountRef.current * 1000) / (renderNow - fpsLastCalcTimeRef.current);
        const dpr = rendererRef.current?.getPixelRatio() || 1;
        telemetry.update({
          fps: measuredFps,
          frameTimeMs: 1000 / Math.max(1, measuredFps),
          viewportWidth: Math.round(canvas.width / dpr),
          viewportHeight: Math.round(canvas.height / dpr),
          pixelRatio: dpr,
        });
        fpsFrameCountRef.current = 0;
        fpsLastCalcTimeRef.current = renderNow;
      }

      // Update procedural texture if active and currently playing
      if (isProceduralRef.current && isPlayingRef.current && proceduralTextureRef.current) {
        proceduralTextureRef.current.needsUpdate = true;
      }

      // Live Video Texture Synchronization: guarantees video frames are uploaded to GPU
      const vElem = videoElementRef.current;
      if (!isProceduralRef.current && vElem) {
        // Ensure video texture exists and references the active HTMLVideoElement
        if (!videoTextureRef.current || videoTextureRef.current.image !== vElem) {
          if (videoTextureRef.current) {
            videoTextureRef.current.dispose();
          }
          const vidTex = new THREE.VideoTexture(vElem);
          vidTex.minFilter = THREE.LinearFilter;
          vidTex.magFilter = THREE.LinearFilter;
          vidTex.format = THREE.RGBAFormat;
          vidTex.generateMipmaps = false;
          videoTextureRef.current = vidTex;
          if (screenMaterialRef.current) {
            screenMaterialRef.current.uniforms.map.value = vidTex;
            screenMaterialRef.current.needsUpdate = true;
          }
        } else if (screenMaterialRef.current && screenMaterialRef.current.uniforms.map.value !== videoTextureRef.current) {
          screenMaterialRef.current.uniforms.map.value = videoTextureRef.current;
          screenMaterialRef.current.needsUpdate = true;
        }

        // Upload new video frame every render tick when data is available
        if (videoTextureRef.current && vElem.readyState >= 2) {
          videoTextureRef.current.needsUpdate = true;
        }
      }

      // Smooth touch/mouse pan damping
      userEulerRef.current.x += (targetUserEulerRef.current.x - userEulerRef.current.x) * 0.2;
      userEulerRef.current.y += (targetUserEulerRef.current.y - userEulerRef.current.y) * 0.2;

      // Update Screen Material & Distortion live uniforms so all sub-menu slider controls work in real time!
      const color = colorPropsRef.current;
      const sMat = screenMaterialRef.current;
      if (sMat) {
        if (sMat.uniforms.uBrightness) sMat.uniforms.uBrightness.value = color.brightness;
        if (sMat.uniforms.uContrast) sMat.uniforms.uContrast.value = color.contrast;
        if (sMat.uniforms.uSaturation) sMat.uniforms.uSaturation.value = color.saturation;
        if (sMat.uniforms.uGamma) sMat.uniforms.uGamma.value = color.gamma;
        if (sMat.uniforms.uStereoMode) {
          const sm = stereoModeRef.current;
          sMat.uniforms.uStereoMode.value = sm === 'sbs' ? 1 : sm === 'top-bottom' ? 2 : 0;
        }
        if (sMat.uniforms.uEyeSwap) sMat.uniforms.uEyeSwap.value = cam.eyeSwap;
        if (sMat.uniforms.uVerticalOffset) sMat.uniforms.uVerticalOffset.value = cam.verticalParallax;
      }

      if (distortionMaterialRef.current) {
        const dMat = distortionMaterialRef.current;
        if (dMat.uniforms.uK1) dMat.uniforms.uK1.value = cam.barrelDistortionK1;
        if (dMat.uniforms.uK2) dMat.uniforms.uK2.value = cam.barrelDistortionK2;
        if (dMat.uniforms.uChromatic) dMat.uniforms.uChromatic.value = cam.chromaticAberration;
        if (dMat.uniforms.uLensMask) dMat.uniforms.uLensMask.value = cam.lensMask;
        if (dMat.uniforms.uMaskRadius) dMat.uniforms.uMaskRadius.value = cam.lensVignetteRadius;
      }

      if (anaglyphMaterialRef.current) {
        let anaglyphTypeIndex = 0;
        if (color.anaglyphType === 'colorcode') anaglyphTypeIndex = 1;
        else if (color.anaglyphType === 'green-magenta') anaglyphTypeIndex = 2;
        else if (color.anaglyphType === 'monochrome') anaglyphTypeIndex = 3;
        if (anaglyphMaterialRef.current.uniforms.uAnaglyphType) {
          anaglyphMaterialRef.current.uniforms.uAnaglyphType.value = anaglyphTypeIndex;
        }
      }

      // CAMERA ORIENTATION & OSCILLATION ANTI-DRIFT ENGINE
      if (cameraRigRef.current) {
        const panQuat = new THREE.Quaternion().setFromEuler(userEulerRef.current);

        if (cam.headTracking && rawDeviceQuaternionRef.current) {
          const alignedDevQuat = headingOffsetQuatRef.current
            .clone()
            .multiply(rawDeviceQuaternionRef.current);

          // Mathematically exact Swing-Twist decomposition around World Vertical (Y axis):
          // alignedDevQuat = qYaw * qTilt
          // Isolates pure azimuthal rotation from pitch/roll tilt with zero Euler singularity,
          // eliminating gimbal lock and axis cross-contamination at extreme 90° look angles.
          const qy = alignedDevQuat.y;
          const qw = alignedDevQuat.w;
          const yawMagSq = qy * qy + qw * qw;
          let qYaw = new THREE.Quaternion(0, 0, 0, 1);
          let rawYaw = 0;

          if (yawMagSq > 1e-8) {
            const invYawMag = 1 / Math.sqrt(yawMagSq);
            qYaw.set(0, qy * invYawMag, 0, qw * invYawMag);
            rawYaw = 2 * Math.atan2(qYaw.y, qYaw.w);
            if (rawYaw > Math.PI) rawYaw -= 2 * Math.PI;
            if (rawYaw < -Math.PI) rawYaw += 2 * Math.PI;
          }

          const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(alignedDevQuat);
          const right = new THREE.Vector3(1, 0, 0).applyQuaternion(alignedDevQuat);

          // 2-Axis Viewpoint Centering (Horizontal + Vertical):
          // Subtract pitchOffsetRef and rollOffsetRef so the viewpoint sits dead center (0,0,-1)
          // at eye level wherever the user is looking upon Recenter/Calibration
          const rawPitchAngle = Math.asin(Math.max(-1, Math.min(1, forward.y)));
          const rawRollAngle = Math.asin(Math.max(-1, Math.min(1, right.y)));
          const pitchAngle = rawPitchAngle - pitchOffsetRef.current;
          const rollAngle = rawRollAngle - rollOffsetRef.current;

          // Real-time IMU rates and anti-drift sensor fusion
          const now = performance.now();
          const lastTime = lastRenderTimeRef.current || now;
          const dt = Math.max(0.001, Math.min(0.1, (now - lastTime) / 1000));
          lastRenderTimeRef.current = now;

          let deltaYaw = rawYaw - prevRawYawRef.current;
          if (deltaYaw > Math.PI) deltaYaw -= 2 * Math.PI;
          if (deltaYaw < -Math.PI) deltaYaw += 2 * Math.PI;
          prevRawYawRef.current = rawYaw;

          const yawRate = deltaYaw / dt; // rad/s

          let deltaPitch = pitchAngle - prevPitchAngleRef.current;
          prevPitchAngleRef.current = pitchAngle;
          const pitchRate = deltaPitch / dt;

          let deltaRoll = rollAngle - prevRollAngleRef.current;
          prevRollAngleRef.current = rollAngle;
          const rollRate = deltaRoll / dt;

          const angularSpeed = Math.hypot(yawRate, pitchRate, rollRate); // rad/s
          const angularSpeedDeg = THREE.MathUtils.radToDeg(angularSpeed); // deg/s
          const yawRateDeg = THREE.MathUtils.radToDeg(yawRate); // deg/s

          const driftStrength = cam.antiDriftStrength ?? 0.85;

          // 1. High-Dynamic Motion Velocity Discriminator:
          // Fast head turns have high angular velocity (> 45 deg/s or yawRate > 35 deg/s or violent shake)
          const isFastMotion = angularSpeedDeg > 45.0 || Math.abs(yawRateDeg) > 35.0 || isShakingRef.current;

          // 2. High-Precision Stationary Gyro Bias Estimator & Auto-Null Engine:
          // Calibrated for realistic human head fixation in Cardboard VR (micro-saccades, breathing, pulse tremor):
          // angular speed < 3.2 deg/s, yawRate < 2.5 deg/s
          const isSlowOrStill = angularSpeedDeg < 3.2 && Math.abs(yawRateDeg) < 2.5 && !isShakingRef.current;
          if (isSlowOrStill) {
            stationaryDurationRef.current += dt;
            if (stationaryDurationRef.current > 0.1) {
              if (!isStationaryRef.current) {
                isStationaryRef.current = true;
                // Snap stationary target yaw at the exact instant stillness begins
                stationaryLockedYawRef.current = rawYaw - yawDriftAccumulatorRef.current;
              }
              // Absorb pure sensor crawl into drift accumulator while head is still
              yawDriftAccumulatorRef.current += deltaYaw;
              const biasAlpha = Math.min(1.0, 4.0 * driftStrength * dt);
              gyroBiasYawRef.current += (yawRate - gyroBiasYawRef.current) * biasAlpha;
            }
          } else {
            stationaryDurationRef.current = 0;
            isStationaryRef.current = false;
          }

          const motionMode: 'stationary' | 'normal' | 'fast-motion' = isStationaryRef.current
            ? 'stationary'
            : isFastMotion
            ? 'fast-motion'
            : 'normal';

          // 3. Absolute Drift Compensation:
          // Never re-integrate open-loop deltas. Instead, subtract the accumulated stationary drift offset.
          // In stationary mode: rigidly lock yaw so zero creep occurs.
          // In motion mode: 1:1 angular fidelity so fast movements return to the exact same position!
          let activeYaw: number;
          if (isStationaryRef.current) {
            activeYaw = stationaryLockedYawRef.current;
          } else {
            activeYaw = rawYaw - yawDriftAccumulatorRef.current;
          }

          // Wrap neatly within [-PI, PI]
          while (activeYaw > Math.PI) activeYaw -= 2 * Math.PI;
          while (activeYaw < -Math.PI) activeYaw += 2 * Math.PI;
          filteredYawRef.current = activeYaw;

          // Continuous Center-Anchor Drift Damper:
          // Active in 'dual-axis' (default) and 'horizon-lock' modes.
          // When looking toward the screen (|activeYaw| < 1.15 rad / ~65°) and moving gently (speed < 8.0 deg/s):
          // Subliminally bleeds residual hardware drift at an optokinetically imperceptible rate (~0.25°/s).
          // This guarantees zero long-term horizontal drift while preserving full 360° intentional head turns!
          if (cam.gyroMode === 'horizon-lock' || cam.gyroMode === 'dual-axis') {
            if (Math.abs(activeYaw) < 1.15 && angularSpeedDeg < 8.0) {
              const pullMultiplier = cam.gyroMode === 'horizon-lock' ? 1.0 : 0.38;
              const pullFactor = Math.min(pullMultiplier * driftStrength * dt, 0.02);
              const pullAmount = activeYaw * pullFactor;
              yawDriftAccumulatorRef.current += pullAmount;
              activeYaw -= pullAmount;
              filteredYawRef.current = activeYaw;
            }
          }

          prevYawRateRef.current = yawRate;

          // Camera Locking & Axis Enable Checks
          const isCameraLocked = !!(cam.lockCamera || cam.gyroMode === 'camera-locked');
          const isYawEnabled = cam.enableHorizontalTracking !== false && cam.gyroMode !== 'zero-drift' && !isCameraLocked;
          const isPitchEnabled = cam.enableVerticalTracking !== false && !isCameraLocked;

          // Final Horizontal Yaw:
          let finalYaw = 0;
          if (isYawEnabled) {
            finalYaw = filteredYawRef.current;
          }

          // Final Vertical Pitch:
          let finalPitch = 0;
          if (isPitchEnabled) {
            finalPitch = pitchAngle * (cam.invertPitch ? -1 : 1);
          }

          // Final Roll Axis (Lock Camera Roll):
          // In 'dual-axis', 'camera-locked', 'zero-drift', 'horizon-lock', or when lockCameraRoll is true (default):
          // Roll is STRICTLY locked to 0 (plus manual headset rollOffset calibration),
          // keeping the horizon perfectly level and eliminating sideways tilt drift and stereoscopic eye-strain!
          const shouldLockRoll = cam.lockCameraRoll !== false || cam.gyroMode === 'dual-axis' || cam.gyroMode === 'camera-locked' || cam.gyroMode === 'zero-drift';
          const finalRoll = (shouldLockRoll ? 0 : rollAngle) + THREE.MathUtils.degToRad(cam.rollOffset);

          // Construct 3D target orientation:
          // 1. Horizontal Yaw (World vertical Y axis)
          const qYawFinal = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 1, 0),
            finalYaw + userEulerRef.current.y
          );

          // 2. Vertical Pitch (Camera local X axis)
          const qPitchFinal = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(1, 0, 0),
            finalPitch + userEulerRef.current.x
          );

          // 3. Roll (Camera local Z axis)
          const qRollFinal = new THREE.Quaternion().setFromAxisAngle(
            new THREE.Vector3(0, 0, 1),
            finalRoll
          );

          const targetQuat = new THREE.Quaternion()
            .copy(qYawFinal)
            .multiply(qPitchFinal)
            .multiply(qRollFinal);

          // Adaptive Slerp Responsiveness:
          // In fast motion, increase slerp factor (up to 0.75) so the camera immediately
          // tracks rapid head movements with zero phase lag and zero overshoot.
          // When slow or still, use user's configured smoothing (default 0.22).
          const baseSmoothing = Math.min(Math.max(cam.gyroSmoothing || 0.22, 0.08), 0.5);
          const adaptiveSmoothing = isFastMotion
            ? Math.min(0.75, baseSmoothing + Math.min(0.5, (angularSpeedDeg / 220) * 0.5))
            : baseSmoothing;
          smoothedRigQuaternionRef.current.slerp(targetQuat, adaptiveSmoothing);
          cameraRigRef.current.quaternion.copy(smoothedRigQuaternionRef.current);

          // Record Camera Position Relative to User & Head Movement
          const rigPos = cameraRigRef.current.position;
          const ipdHalfVal = cam.ipd / 2;
          const leftEyeRel = { x: -ipdHalfVal, y: 0, z: 0 };
          const rightEyeRel = { x: +ipdHalfVal, y: 0, z: 0 };

          const leftEyeWorldVec = new THREE.Vector3(-ipdHalfVal, 0, 0)
            .applyQuaternion(cameraRigRef.current.quaternion)
            .add(rigPos);
          const rightEyeWorldVec = new THREE.Vector3(+ipdHalfVal, 0, 0)
            .applyQuaternion(cameraRigRef.current.quaternion)
            .add(rigPos);

          const relYawDeg = THREE.MathUtils.radToDeg(finalYaw + userEulerRef.current.y);
          const relPitchDeg = THREE.MathUtils.radToDeg(finalPitch + userEulerRef.current.x);
          const relRollDeg = THREE.MathUtils.radToDeg(finalRoll);
          const pitchRateDeg = THREE.MathUtils.radToDeg(pitchRate);
          const rollRateDeg = THREE.MathUtils.radToDeg(rollRate);
          const speedDeg = THREE.MathUtils.radToDeg(angularSpeed);
          const biasDeg = THREE.MathUtils.radToDeg(gyroBiasYawRef.current);

          let headState: 'stationary' | 'moving' | 'fast-shake' | 'recentered' = 'moving';
          if (isShakingRef.current) {
            headState = 'fast-shake';
          } else if (isStationaryRef.current || speedDeg < 1.4) {
            headState = 'stationary';
          }

          telemetry.recordCameraPose({
            timestamp: Date.now(),
            timeFormatted: new Date().toLocaleTimeString('en-US', { hour12: false }) + '.' + Math.floor(Date.now() % 1000).toString().padStart(3, '0'),
            elapsedSec: (now - sessionStartTimeRef.current) / 1000,
            headPosition: { x: rigPos.x, y: rigPos.y, z: rigPos.z },
            leftEyeOffset: leftEyeRel,
            rightEyeOffset: rightEyeRel,
            leftEyeWorld: { x: leftEyeWorldVec.x, y: leftEyeWorldVec.y, z: leftEyeWorldVec.z },
            rightEyeWorld: { x: rightEyeWorldVec.x, y: rightEyeWorldVec.y, z: rightEyeWorldVec.z },
            relativeYaw: relYawDeg,
            relativePitch: relPitchDeg,
            relativeRoll: relRollDeg,
            yawRate: yawRateDeg,
            pitchRate: pitchRateDeg,
            rollRate: rollRateDeg,
            speed: speedDeg,
            driftCompensated: biasDeg,
            state: headState,
          });

          telemetry.update({
            cameraYaw: relYawDeg,
            cameraPitch: relPitchDeg,
            cameraRoll: relRollDeg,
            userPanYaw: THREE.MathUtils.radToDeg(userEulerRef.current.y),
            userPanPitch: THREE.MathUtils.radToDeg(userEulerRef.current.x),
            rawYaw: THREE.MathUtils.radToDeg(rawYaw),
            correctedYaw: THREE.MathUtils.radToDeg(finalYaw),
            yawRate: yawRateDeg,
            gyroBiasYaw: biasDeg,
            motionMode,
            isOscillating: false,
            oscillationCount: 0,
            oscillationCorrection: biasDeg,
            oscillationMidpoint: 0,
            lockedMidpoint: 0,
            isShaking: isShakingRef.current,
            isStationary: isStationaryRef.current,
            lockCameraRoll: shouldLockRoll,
            lockCamera: isCameraLocked,
            projectionMode: proj,
            stereoMode: stereoModeRef.current,
            outputMode: out,
            gyroMode: cam.gyroMode,
            gyroSmoothing: cam.gyroSmoothing,
            trackingSensitivity: cam.trackingSensitivity,
          });
        } else {
          // Pure interactive touch / mouse drag camera
          smoothedRigQuaternionRef.current.slerp(panQuat, 0.22);
          cameraRigRef.current.quaternion.copy(smoothedRigQuaternionRef.current);
          if (cam.rollOffset !== 0) {
            cameraRigRef.current.rotateZ(THREE.MathUtils.degToRad(cam.rollOffset));
          }
        }
      }

      // Update Camera positions & stereoscopic eye convergence from LIVE props
      const ipdHalf = cam.ipd / 2;
      const dist = cam.distance;
      const heightOffset = cam.height;
      const isTrueVR = proj === 'dome180' || proj === 'sphere360';

      // Position Camera Rig: in True VR head is at center (0,0,0); in Cinema head is at (0, height, dist)
      if (cameraRigRef.current) {
        if (isTrueVR) {
          cameraRigRef.current.position.set(0, 0, 0);
        } else {
          cameraRigRef.current.position.set(0, heightOffset, dist);
        }
      }

      if (leftCameraRef.current && rightCameraRef.current) {
        // 1. Virtual 3D space eye separation:
        leftCameraRef.current.position.set(-ipdHalf, 0, 0);
        rightCameraRef.current.position.set(ipdHalf, 0, 0);

        // 2. Physical screen lens-center separation (asymmetric frustum projection):
        // Standard baseline IPD is 64mm (0.064m).
        // Deviations from 64mm shift the optical centers on the phone display so each eye
        // aligns with the physical headset lenses, giving immediate, visible alignment.
        const ipdDeltaMm = (cam.ipd - 0.064) * 1000; // in mm: -19mm to +16mm
        const ipdFilmShift = ipdDeltaMm * 0.35; // film plane offset in mm

        let needsProjectionUpdate = false;
        if (leftCameraRef.current.fov !== cam.fov || rightCameraRef.current.fov !== cam.fov) {
          leftCameraRef.current.fov = cam.fov;
          rightCameraRef.current.fov = cam.fov;
          needsProjectionUpdate = true;
        }

        if (leftCameraRef.current.filmOffset !== -ipdFilmShift || rightCameraRef.current.filmOffset !== ipdFilmShift) {
          leftCameraRef.current.filmOffset = -ipdFilmShift;
          rightCameraRef.current.filmOffset = ipdFilmShift;
          needsProjectionUpdate = true;
        }

        if (needsProjectionUpdate) {
          leftCameraRef.current.updateProjectionMatrix();
          rightCameraRef.current.updateProjectionMatrix();
        }

        // 3. Stereoscopic convergence (toe-in angle):
        // Inward angle creates calibrated 3D depth pop-out on the virtual screen
        const toeInAngle = cam.stereoConvergenceAngle ?? 0.8;
        const toeInRad = THREE.MathUtils.degToRad(toeInAngle / 2);
        leftCameraRef.current.rotation.set(0, toeInRad, 0);
        rightCameraRef.current.rotation.set(0, -toeInRad, 0);
      }

      if (particlesRef.current && particlesRef.current.visible) {
        particlesRef.current.rotation.y += 0.0006;
      }

      const currentRenderer = rendererRef.current;
      const currentScene = sceneRef.current;
      const lCam = leftCameraRef.current;
      const rCam = rightCameraRef.current;
      const lTarget = leftTargetRef.current;
      const rTarget = rightTargetRef.current;

      if (!currentRenderer || !currentScene || !lCam || !rCam || !sMat) {
        animationFrameId = requestAnimationFrame(render);
        return;
      }

      const pixelRatio = currentRenderer.getPixelRatio();
      const fullW = canvas.width / pixelRatio;
      const fullH = canvas.height / pixelRatio;
      const halfW = Math.floor(fullW / 2);

      const hasDistortion =
        cam.barrelDistortionK1 !== 0 ||
        cam.barrelDistortionK2 !== 0 ||
        cam.lensMask;

      try {
        if (out === 'anaglyph') {
          if (lTarget && rTarget && postSceneRef.current && postCameraRef.current && anaglyphMaterialRef.current && postQuadRef.current) {
            sMat.uniforms.uEye.value = 0;
            currentRenderer.setRenderTarget(lTarget);
            currentRenderer.clear();
            currentRenderer.render(currentScene, lCam);

            sMat.uniforms.uEye.value = 1;
            currentRenderer.setRenderTarget(rTarget);
            currentRenderer.clear();
            currentRenderer.render(currentScene, rCam);

            currentRenderer.setRenderTarget(null);
            currentRenderer.setViewport(0, 0, fullW, fullH);
            currentRenderer.setScissor(0, 0, fullW, fullH);
            currentRenderer.setScissorTest(false);
            currentRenderer.clear();

            anaglyphMaterialRef.current.uniforms.tLeftEye.value = lTarget.texture;
            anaglyphMaterialRef.current.uniforms.tRightEye.value = rTarget.texture;
            postQuadRef.current.material = anaglyphMaterialRef.current;
            currentRenderer.render(postSceneRef.current, postCameraRef.current);
          }
        } else if (out === 'split') {
          currentRenderer.setScissorTest(true);

          if (hasDistortion && lTarget && rTarget && postSceneRef.current && postCameraRef.current && distortionMaterialRef.current && postQuadRef.current) {
            sMat.uniforms.uEye.value = 0;
            currentRenderer.setRenderTarget(lTarget);
            currentRenderer.clear();
            currentRenderer.render(currentScene, lCam);

            sMat.uniforms.uEye.value = 1;
            currentRenderer.setRenderTarget(rTarget);
            currentRenderer.clear();
            currentRenderer.render(currentScene, rCam);

            currentRenderer.setRenderTarget(null);
            postQuadRef.current.material = distortionMaterialRef.current;

            currentRenderer.setViewport(0, 0, halfW, fullH);
            currentRenderer.setScissor(0, 0, halfW, fullH);
            distortionMaterialRef.current.uniforms.tDiffuse.value = lTarget.texture;
            currentRenderer.render(postSceneRef.current, postCameraRef.current);

            currentRenderer.setViewport(halfW, 0, fullW - halfW, fullH);
            currentRenderer.setScissor(halfW, 0, fullW - halfW, fullH);
            distortionMaterialRef.current.uniforms.tDiffuse.value = rTarget.texture;
            currentRenderer.render(postSceneRef.current, postCameraRef.current);
          } else {
            currentRenderer.setRenderTarget(null);

            sMat.uniforms.uEye.value = 0;
            currentRenderer.setViewport(0, 0, halfW, fullH);
            currentRenderer.setScissor(0, 0, halfW, fullH);
            currentRenderer.clear();
            currentRenderer.render(currentScene, lCam);

            sMat.uniforms.uEye.value = 1;
            currentRenderer.setViewport(halfW, 0, fullW - halfW, fullH);
            currentRenderer.setScissor(halfW, 0, fullW - halfW, fullH);
            currentRenderer.clear();
            currentRenderer.render(currentScene, rCam);
          }
        } else {
          currentRenderer.setRenderTarget(null);
          currentRenderer.setScissorTest(false);
          currentRenderer.setViewport(0, 0, fullW, fullH);
          currentRenderer.clear();

          const selectedEye = out === 'single-right' ? 1 : 0;
          sMat.uniforms.uEye.value = selectedEye;
          currentRenderer.render(currentScene, selectedEye === 1 ? rCam : lCam);
        }
      } catch (renderError) {
        // Prevent CORS or WebGL frame errors from permanently killing the animation frame loop
        console.warn('WebGL render frame error (possibly CORS texture restriction):', renderError);
      }

      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);

    const handleResize = () => {
      if (!container || !rendererRef.current) return;
      const w = container.clientWidth || window.innerWidth;
      const h = container.clientHeight || window.innerHeight;
      const currentOutMode = outputModeRef.current;
      const aspect = (currentOutMode === 'split' ? w / 2 : w) / h;

      if (leftCameraRef.current) {
        leftCameraRef.current.aspect = aspect;
        leftCameraRef.current.updateProjectionMatrix();
      }
      if (rightCameraRef.current) {
        rightCameraRef.current.aspect = aspect;
        rightCameraRef.current.updateProjectionMatrix();
      }
      rendererRef.current.setSize(w, h);
      if (leftTargetRef.current) leftTargetRef.current.setSize(w, h);
      if (rightTargetRef.current) rightTargetRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      leftTargetRef.current?.dispose();
      rightTargetRef.current?.dispose();
    };
  }, []);

  // Update Environment Theme
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    const env = ENVIRONMENT_PRESETS.find((e) => e.id === colorProperties.environment) || ENVIRONMENT_PRESETS[0];
    const isDomeOrSphere = projectionMode === 'dome180' || projectionMode === 'sphere360';

    scene.background = new THREE.Color(isDomeOrSphere ? 0x000000 : env.floorColor);

    if (floorMeshRef.current) {
      const mat = floorMeshRef.current.material as THREE.MeshBasicMaterial;
      mat.color.setHex(env.floorColor);
      floorMeshRef.current.visible = !isDomeOrSphere && colorProperties.environment !== 'void';
    }

    if (particlesRef.current) {
      const pMat = particlesRef.current.material as THREE.PointsMaterial;
      pMat.color.setHex(env.glowTint);
      particlesRef.current.visible = !isDomeOrSphere && colorProperties.environment !== 'void';
    }

    if (ambientLightRef.current) {
      ambientLightRef.current.color.setHex(env.glowTint);
      ambientLightRef.current.intensity = isDomeOrSphere || colorProperties.environment === 'void' ? 0 : colorProperties.ambientGlow;
    }
  }, [colorProperties.environment, colorProperties.ambientGlow, projectionMode]);

  // Update Screen Geometry - TRUE VR 180 DOME & 360 SPHERE & SCALED CINEMA
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    if (screenMeshRef.current) {
      scene.remove(screenMeshRef.current);
      screenMeshRef.current.geometry.dispose();
      screenMeshRef.current = null;
    }

    let geometry: THREE.BufferGeometry;
    const { screenWidth, screenHeight, curvature, fov, distance, screenScale = 1.0 } = cameraProperties;
    const isTrueVR = projectionMode === 'dome180' || projectionMode === 'sphere360';

    if (projectionMode === 'fill') {
      // 100% DIRECT FULLSCREEN VIEWPORT FILL (Edge-to-Edge)
      const fillDist = distance;
      const fovRad = THREE.MathUtils.degToRad(fov);
      const fillH = 2 * fillDist * Math.tan(fovRad / 2) * 1.15 * screenScale;
      const fillW = fillH * (16 / 9) * 1.15;
      geometry = new THREE.PlaneGeometry(fillW, fillH, 32, 32);
    } else if (projectionMode === 'flat') {
      geometry = new THREE.PlaneGeometry(screenWidth * screenScale, screenHeight * screenScale, 32, 32);
    } else if (projectionMode === 'curved') {
      const radius = 4.0;
      const arcAngle = THREE.MathUtils.degToRad(curvature);
      geometry = new THREE.CylinderGeometry(
        radius,
        radius,
        screenHeight * screenScale,
        64,
        1,
        true,
        -arcAngle / 2 + Math.PI,
        arcAngle
      );
    } else if (projectionMode === 'dome180') {
      geometry = new THREE.SphereGeometry(60, 64, 32, -Math.PI, Math.PI, 0, Math.PI);
      geometry.scale(-1, 1, 1);
    } else {
      geometry = new THREE.SphereGeometry(60, 64, 32, Math.PI / 2, Math.PI * 2);
      geometry.scale(-1, 1, 1);
    }

    if (!screenMaterialRef.current) return;

    const mesh = new THREE.Mesh(geometry, screenMaterialRef.current);
    mesh.position.set(0, isTrueVR ? 0 : cameraProperties.height, 0);
    mesh.rotation.set(0, 0, 0);
    mesh.scale.set(1, 1, 1);

    if (floorMeshRef.current) {
      floorMeshRef.current.visible = !isTrueVR && colorProperties.environment !== 'void';
    }
    if (particlesRef.current) {
      particlesRef.current.visible = !isTrueVR && colorProperties.environment !== 'void';
    }

    scene.add(mesh);
    screenMeshRef.current = mesh;
  }, [
    projectionMode,
    cameraProperties.curvature,
    cameraProperties.screenWidth,
    cameraProperties.screenHeight,
    cameraProperties.height,
    cameraProperties.fov,
    cameraProperties.distance,
    cameraProperties.screenScale,
    colorProperties.environment,
  ]);

  // Update Texture Source whenever media source or playback changes
  useEffect(() => {
    if (!screenMaterialRef.current) return;

    if (isProcedural && testPatternGenerator) {
      if (!proceduralTextureRef.current) {
        proceduralTextureRef.current = new THREE.CanvasTexture(testPatternGenerator.canvas);
        proceduralTextureRef.current.minFilter = THREE.LinearFilter;
        proceduralTextureRef.current.magFilter = THREE.LinearFilter;
      }
      screenMaterialRef.current.uniforms.map.value = proceduralTextureRef.current;
      screenMaterialRef.current.needsUpdate = true;
    } else if (videoElement) {
      // Create or rebind VideoTexture
      if (!videoTextureRef.current || videoTextureRef.current.image !== videoElement) {
        if (videoTextureRef.current) {
          videoTextureRef.current.dispose();
        }
        const vidTex = new THREE.VideoTexture(videoElement);
        vidTex.minFilter = THREE.LinearFilter;
        vidTex.magFilter = THREE.LinearFilter;
        vidTex.format = THREE.RGBAFormat;
        vidTex.generateMipmaps = false;
        videoTextureRef.current = vidTex;
      }
      screenMaterialRef.current.uniforms.map.value = videoTextureRef.current;
      screenMaterialRef.current.needsUpdate = true;
      if (videoTextureRef.current) {
        videoTextureRef.current.needsUpdate = true;
      }
    } else {
      // Standby blank texture when idle
      const blankCanvas = document.createElement('canvas');
      blankCanvas.width = 16;
      blankCanvas.height = 16;
      const bCtx = blankCanvas.getContext('2d');
      if (bCtx) {
        bCtx.fillStyle = '#05070e';
        bCtx.fillRect(0, 0, 16, 16);
      }
      const blankTex = new THREE.CanvasTexture(blankCanvas);
      screenMaterialRef.current.uniforms.map.value = blankTex;
      screenMaterialRef.current.needsUpdate = true;
    }
  }, [mediaUrl, currentMediaId, isProcedural, testPatternGenerator, videoElement, isPlaying]);

  // Video element event listeners: Ensure WebGL uploads decoded video frames immediately
  useEffect(() => {
    if (!videoElement) return;

    const handleVideoReady = () => {
      if (videoTextureRef.current) {
        videoTextureRef.current.needsUpdate = true;
      }
      if (screenMaterialRef.current && videoTextureRef.current) {
        screenMaterialRef.current.uniforms.map.value = videoTextureRef.current;
        screenMaterialRef.current.needsUpdate = true;
      }
    };

    videoElement.addEventListener('loadeddata', handleVideoReady);
    videoElement.addEventListener('canplay', handleVideoReady);
    videoElement.addEventListener('playing', handleVideoReady);
    videoElement.addEventListener('play', handleVideoReady);
    videoElement.addEventListener('timeupdate', handleVideoReady);

    return () => {
      videoElement.removeEventListener('loadeddata', handleVideoReady);
      videoElement.removeEventListener('canplay', handleVideoReady);
      videoElement.removeEventListener('playing', handleVideoReady);
      videoElement.removeEventListener('play', handleVideoReady);
      videoElement.removeEventListener('timeupdate', handleVideoReady);
    };
  }, [videoElement]);

  // Update Shader Uniforms and Projection Matrices (Guarantees ALL sub-menu slider controls work in real time!)
  useEffect(() => {
    if (screenMaterialRef.current) {
      screenMaterialRef.current.uniforms.uStereoMode.value =
        stereoMode === 'sbs' ? 1 : stereoMode === 'top-bottom' ? 2 : 0;
      screenMaterialRef.current.uniforms.uEyeSwap.value = cameraProperties.eyeSwap;
      screenMaterialRef.current.uniforms.uVerticalOffset.value = cameraProperties.verticalParallax;
      screenMaterialRef.current.uniforms.uBrightness.value = colorProperties.brightness;
      screenMaterialRef.current.uniforms.uContrast.value = colorProperties.contrast;
      screenMaterialRef.current.uniforms.uSaturation.value = colorProperties.saturation;
      screenMaterialRef.current.uniforms.uGamma.value = colorProperties.gamma;
    }

    if (anaglyphMaterialRef.current) {
      let anaglyphTypeIndex = 0;
      if (colorProperties.anaglyphType === 'colorcode') anaglyphTypeIndex = 1;
      else if (colorProperties.anaglyphType === 'green-magenta') anaglyphTypeIndex = 2;
      else if (colorProperties.anaglyphType === 'monochrome') anaglyphTypeIndex = 3;
      anaglyphMaterialRef.current.uniforms.uAnaglyphType.value = anaglyphTypeIndex;
    }

    if (distortionMaterialRef.current) {
      distortionMaterialRef.current.uniforms.uK1.value = cameraProperties.barrelDistortionK1;
      distortionMaterialRef.current.uniforms.uK2.value = cameraProperties.barrelDistortionK2;
      distortionMaterialRef.current.uniforms.uChromatic.value = cameraProperties.chromaticAberration;
      distortionMaterialRef.current.uniforms.uLensMask.value = cameraProperties.lensMask;
      distortionMaterialRef.current.uniforms.uMaskRadius.value = cameraProperties.lensVignetteRadius;
    }

    if (leftCameraRef.current && rightCameraRef.current) {
      leftCameraRef.current.fov = cameraProperties.fov;
      rightCameraRef.current.fov = cameraProperties.fov;
      leftCameraRef.current.updateProjectionMatrix();
      rightCameraRef.current.updateProjectionMatrix();
    }
  }, [stereoMode, cameraProperties, colorProperties]);

  // Pointer & Multi-Touch Gestures for Android Experience
  const handlePointerDown = (e: React.PointerEvent) => {
    isDraggingRef.current = true;
    dragDistanceRef.current = 0;
    pointerStartRef.current = { x: e.clientX, y: e.clientY, time: performance.now() };
    prevPointerRef.current = { x: e.clientX, y: e.clientY };

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const relativeX = (e.clientX - rect.left) / rect.width;

    // Detect gesture zone on touch
    if (e.pointerType === 'touch') {
      if (relativeX < 0.28) {
        activeTouchModeRef.current = 'brightness';
      } else if (relativeX > 0.72) {
        activeTouchModeRef.current = 'volume';
      } else {
        activeTouchModeRef.current = 'look';
      }
    } else {
      activeTouchModeRef.current = 'look';
    }

    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - prevPointerRef.current.x;
    const dy = e.clientY - prevPointerRef.current.y;
    dragDistanceRef.current += Math.abs(dx) + Math.abs(dy);
    prevPointerRef.current = { x: e.clientX, y: e.clientY };

    // Android Gesture handling
    if (e.pointerType === 'touch') {
      if (activeTouchModeRef.current === 'brightness' && onAdjustBrightness && Math.abs(dy) > Math.abs(dx)) {
        onAdjustBrightness(-dy * 0.005);
        return;
      }
      if (activeTouchModeRef.current === 'volume' && onAdjustVolume && Math.abs(dy) > Math.abs(dx)) {
        onAdjustVolume(-dy * 0.005);
        return;
      }
    }

    // Default 360 / VR Lookaround Drag
    const sensitivity = 0.0025 * cameraPropsRef.current.trackingSensitivity;
    targetUserEulerRef.current.y += dx * sensitivity;
    targetUserEulerRef.current.x = Math.max(
      -Math.PI / 2.15,
      Math.min(Math.PI / 2.15, targetUserEulerRef.current.x - dy * sensitivity)
    );
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    isDraggingRef.current = false;
    activeTouchModeRef.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      // Ignored
    }
  };

  // Android Native Multi-touch handlers for Pinch-to-Zoom (FOV) and Two-Finger Swipe (Seek)
  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      activeTouchModeRef.current = 'pinch';
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      initialPinchDistRef.current = Math.hypot(dx, dy);
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && initialPinchDistRef.current !== null && onAdjustFOV) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const currentDist = Math.hypot(dx, dy);
      const delta = currentDist - initialPinchDistRef.current;

      if (Math.abs(delta) > 5) {
        // Pinching in (delta < 0) zooms in (decreases FOV); spreading (delta > 0) widens FOV
        onAdjustFOV(-delta * 0.08);
        initialPinchDistRef.current = currentDist;
      }
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (e.touches.length < 2) {
      initialPinchDistRef.current = null;
      activeTouchModeRef.current = null;
    }
  };

  // Cardboard tap / Double Tap to Recenter / Tap to Toggle HUD
  const handleCanvasTap = () => {
    // If user dragged to rotate camera or adjust volume/brightness, do not trigger tap toggle
    if (dragDistanceRef.current > 10) {
      return;
    }

    const now = performance.now();
    // Detect double-tap (< 300ms) to immediately recenter view forward
    if (now - lastTapTimeRef.current < 300) {
      vrAudio.playClickSound();
      telemetry.log('gesture', 'Screen double-tap gesture triggered Recenter');
      doRecenter();
      lastTapTimeRef.current = 0;
      return;
    }
    lastTapTimeRef.current = now;

    if (onCanvasClick) onCanvasClick();
  };

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full cursor-grab active:cursor-grabbing select-none overflow-hidden touch-none"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onClick={handleCanvasTap}
    >
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  );
};
