export type StereoMode = 'sbs' | 'top-bottom' | 'mono' | 'anaglyph';

export type ProjectionMode = 'fill' | 'curved' | 'flat' | 'dome180' | 'sphere360';

export type OutputMode = 'split' | 'single-left' | 'single-right' | 'anaglyph';

export type EnvironmentTheme = 'cinema' | 'holodeck' | 'void' | 'aurora';

export type AnaglyphType = 'dubois' | 'colorcode' | 'monochrome' | 'green-magenta';

export type GyroMode = 'dual-axis' | 'camera-locked' | 'zero-drift' | 'horizon-lock' | 'full-3dof' | 'off';

export interface CameraProperties {
  fov: number; // 30 to 120 degrees
  ipd: number; // Interpupillary distance in meters (e.g. 0.064 = 64mm standard)
  distance: number; // Distance from screen/sphere (0.5m to 10m)
  height: number; // Camera Y position offset (-2 to +2)
  rollOffset: number; // Headset roll tilt calibration (-15 to +15 deg)
  verticalParallax: number; // Vertical stereo offset correction (-0.05 to +0.05)
  eyeSwap: boolean; // Swap left and right eye feeds
  curvature: number; // Screen curve angle for curved cinema (30 to 180 deg)
  screenWidth: number; // Virtual screen width in units
  screenHeight: number; // Virtual screen height
  screenScale: number; // Screen scale multiplier (0.6 to 2.5) for instant fullscreen zoom
  screenFillMode: 'fit' | 'fill' | 'stretch'; // Screen fill scaling mode
  barrelDistortionK1: number; // Lens barrel distortion factor 1 (-0.5 to 0.5)
  barrelDistortionK2: number; // Lens barrel distortion factor 2 (-0.5 to 0.5)
  chromaticAberration: number; // Color fringing correction (0 to 0.02)
  lensMask: boolean; // Circular vignette mask matching VR lens perimeter
  lensVignetteRadius: number; // Lens mask radius (0.5 to 1.0)
  headTracking: boolean; // Gyroscope / orientation tracking active
  gyroMode: GyroMode; // Anti-drift mode: 'dual-axis' (H+V free, roll locked, zero creep), 'camera-locked', 'zero-drift', etc.
  gyroSmoothing: number; // Slerp damping factor (0.05 = super smooth, 0.4 = immediate)
  trackingSensitivity: number; // Gyro / mouse drag sensitivity
  gazeControlsEnabled: boolean; // Hands-free gaze pointer inside headset
  gazeDwellTime: number; // Dwell time in milliseconds (800 to 2000ms)
  lockCameraRoll?: boolean; // Lock camera roll axis to 0° (keeps horizon perfectly level, no tilt drift)
  lockCamera?: boolean; // Lock camera facing forward to screen (fixed display mode)
  enableHorizontalTracking?: boolean; // Enable horizontal head movement (yaw left/right)
  enableVerticalTracking?: boolean; // Enable vertical head movement (pitch up/down)
  antiDriftStrength?: number; // 0.0 to 1.0 (anti-drift filter aggressiveness)
  invertPitch?: boolean; // Invert vertical look / pitch (up moves down, down moves up)
  stereoConvergenceAngle?: number; // Stereoscopic eye camera toe-in angle in degrees (0.0 to 3.0, default 0.8)
  showHorizonGuide?: boolean; // Visual dual pitch ladder & roll level guide overlay
}


export interface VideoColorProperties {
  brightness: number; // 0.5 to 1.5 (default 1.0)
  contrast: number; // 0.5 to 1.5 (default 1.0)
  saturation: number; // 0.0 to 2.0 (default 1.0)
  gamma: number; // 0.5 to 1.5 (default 1.0)
  environment: EnvironmentTheme;
  anaglyphType: AnaglyphType;
  ambientGlow: number; // Virtual theater screen glow intensity (0 to 1.0)
  dynamicAmbilight: boolean; // Sample live video frame colors to cast dynamic bounce light
  showCenterDivider: boolean; // Vertical separator line in split-screen mode
  dividerWidth: number; // Width of divider in pixels (1 to 10)
  showAlignmentCrosshairs: boolean; // Optical alignment target in center of each eye
  volumeBoost: number; // 1.0 to 2.0 (100% to 200%)
  bassEnhance: boolean; // Virtual cinema spatial acoustic enhancement
}

export interface MediaItem {
  id: string;
  title: string;
  sourceType: 'file' | 'url' | 'procedural' | 'sample';
  url: string;
  stereoMode: StereoMode;
  projectionMode: ProjectionMode;
  aspectRatio?: number;
  duration?: number;
  thumbnail?: string;
  description?: string;
}

