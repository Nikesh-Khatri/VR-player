import { ProjectionMode, StereoMode, OutputMode, GyroMode } from './vr';

export interface CameraRelativePose {
  timestamp: number;
  timeFormatted: string;
  elapsedSec: number;
  headPosition: { x: number; y: number; z: number };
  leftEyeOffset: { x: number; y: number; z: number };
  rightEyeOffset: { x: number; y: number; z: number };
  leftEyeWorld: { x: number; y: number; z: number };
  rightEyeWorld: { x: number; y: number; z: number };
  relativeYaw: number;
  relativePitch: number;
  relativeRoll: number;
  yawRate: number;
  pitchRate: number;
  rollRate: number;
  speed: number;
  driftCompensated: number;
  state: 'stationary' | 'moving' | 'fast-shake' | 'recentered';
}

export interface DebugLogEntry {
  id: string;
  time: string;
  timestamp: number;
  category: 'camera-pose' | 'sensor' | 'recenter' | 'oscillation' | 'mode' | 'gesture' | 'system' | 'media' | 'webgl';
  message: string;
  data?: Record<string, unknown>;
}

export interface BenchmarkData {
  isRunning: boolean;
  startedAt: number;
  durationSec: number;
  elapsedSec: number;
  peakRotSpeed: number;
  peakAccel: number;
  oscillationCycles: number;
  initialYaw: number;
  currentYaw: number;
  totalCompApplied: number;
  driftOffset: number;
  samplesCount: number;
  completedReport?: string;
}

export interface TelemetryData {
  fps: number;
  frameTimeMs: number;

  // DeviceOrientation raw
  alpha: number | null;
  beta: number | null;
  gamma: number | null;
  absolute: boolean | null;
  orientationHz: number;

  // DeviceMotion raw
  accelX: number | null;
  accelY: number | null;
  accelZ: number | null;
  accelMagnitude: number | null;

  rotAlpha: number | null;
  rotBeta: number | null;
  rotGamma: number | null;
  rotSpeed: number | null;
  motionHz: number;

  // Screen
  screenAngle: number;
  screenType: string;
  viewportWidth: number;
  viewportHeight: number;
  pixelRatio: number;

  // Calculated 3D Orientation (degrees)
  cameraYaw: number;
  cameraPitch: number;
  cameraRoll: number;
  userPanYaw: number;
  userPanPitch: number;

  // Recenter & Calibration
  recenterCount: number;
  calibrationCount: number;

  // Anti-Drift Dynamic Engine & Hardware Bias Calibrator
  rawYaw: number;
  correctedYaw: number;
  yawRate: number; // deg/s
  gyroBiasYaw: number; // deg/s estimated bias
  motionMode: 'stationary' | 'normal' | 'fast-motion';
  isOscillating: boolean;
  oscillationCount: number;
  oscillationCorrection: number; // deg
  oscillationMidpoint: number;
  lockedMidpoint: number;
  isShaking: boolean;
  isStationary: boolean;
  lockCameraRoll: boolean;
  lockCamera: boolean;

  // Modes & Config
  projectionMode: ProjectionMode;
  stereoMode: StereoMode;
  outputMode: OutputMode;
  gyroMode: GyroMode;
  gyroSmoothing: number;
  trackingSensitivity: number;

  // Live Camera Relative Pose & Head Movement Tracking
  cameraPose: CameraRelativePose | null;
  poseHistory: CameraRelativePose[];

  // Benchmark
  benchmark: BenchmarkData | null;

  // Logs
  logs: DebugLogEntry[];
}

