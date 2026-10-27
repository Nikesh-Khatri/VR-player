import { CameraProperties, VideoColorProperties, MediaItem, EnvironmentTheme, AnaglyphType } from '../types/vr';

export const DEFAULT_CAMERA_PROPERTIES: CameraProperties = {
  fov: 75,
  ipd: 0.064, // 64mm standard average human IPD
  distance: 3.2,
  height: 0.0,
  rollOffset: 0.0, // Headset roll tilt in degrees
  verticalParallax: 0.0,
  eyeSwap: false,
  curvature: 90, // 90 degree arc
  screenWidth: 6.4,
  screenHeight: 3.6,
  screenScale: 1.0,
  screenFillMode: 'fit',
  barrelDistortionK1: 0.0, // clean by default, or headset profile
  barrelDistortionK2: 0.0,
  chromaticAberration: 0.0,
  lensMask: false,
  lensVignetteRadius: 0.95,
  headTracking: true,
  gyroMode: 'dual-axis', // Dual-Axis (Horizontal + Vertical) with Anti-Drift & Locked Roll
  gyroSmoothing: 0.22,
  trackingSensitivity: 1.0,
  antiDriftStrength: 0.85, // Active stationary bias nulling & anti-drift
  lockCameraRoll: true, // Lock camera horizon level to eliminate tilt drift & stereo disparity
  lockCamera: false, // Normal head tracking active (toggle true for fixed screen display)
  enableHorizontalTracking: true, // Horizontal head movement (yaw left/right)
  enableVerticalTracking: true, // Vertical head movement (pitch up/down)
  gazeControlsEnabled: false, // Clean immersive view by default
  gazeDwellTime: 1200, // 1.2s hover to click inside VR
  invertPitch: false,
  stereoConvergenceAngle: 0.8, // 0.8° cinema sweet-spot convergence for enhanced 3D pop-out
  showHorizonGuide: false, // Horizon level guide overlay
};


export const DEFAULT_COLOR_PROPERTIES: VideoColorProperties = {
  brightness: 1.0,
  contrast: 1.0,
  saturation: 1.0,
  gamma: 1.0,
  environment: 'cinema',
  anaglyphType: 'dubois',
  ambientGlow: 0.35,
  dynamicAmbilight: true,
  showCenterDivider: true,
  dividerWidth: 2,
  showAlignmentCrosshairs: false,
  volumeBoost: 1.0,
  bassEnhance: true,
};

export interface EnvironmentPreset {
  id: EnvironmentTheme;
  name: string;
  description: string;
  floorColor: number;
  gridColor: number;
  glowTint: number;
}

export const ENVIRONMENT_PRESETS: EnvironmentPreset[] = [
  {
    id: 'cinema',
    name: 'Virtual IMAX Theater',
    description: 'Acoustic dark auditorium with cinema seating reflections and dynamic light bounce',
    floorColor: 0x05070f,
    gridColor: 0x1e293b,
    glowTint: 0x38bdf8,
  },
  {
    id: 'holodeck',
    name: 'Cyberpunk Holodeck',
    description: 'Tron-inspired vector spatial grid with neon horizon pulses and cosmic starfield',
    floorColor: 0x030712,
    gridColor: 0x06b6d4,
    glowTint: 0x818cf8,
  },
  {
    id: 'aurora',
    name: 'Starlit Aurora Sky',
    description: 'Open twilight horizon under deep aurora borealis ambient glow',
    floorColor: 0x020817,
    gridColor: 0x10b981,
    glowTint: 0x34d399,
  },
  {
    id: 'void',
    name: 'Pure OLED Void',
    description: 'Pitch black zero-reflection space for infinite OLED contrast and zero distraction',
    floorColor: 0x000000,
    gridColor: 0x000000,
    glowTint: 0x000000,
  },
];

export interface SeatPreset {
  id: string;
  name: string;
  distance: number;
  fov: number;
  curvature: number;
}

export const SEAT_PRESETS: SeatPreset[] = [
  { id: 'fill', name: 'Fullscreen Fill', distance: 1.6, fov: 92, curvature: 120 },
  { id: 'imax', name: 'Giant IMAX', distance: 2.3, fov: 88, curvature: 130 },
  { id: 'middle', name: 'Cinema Center', distance: 3.2, fov: 75, curvature: 90 },
  { id: 'back', name: 'Back Row', distance: 4.8, fov: 68, curvature: 70 },
];


export interface HeadsetProfile {
  name: string;
  description: string;
  k1: number;
  k2: number;
  fov: number;
  lensMask: boolean;
}

export const HEADSET_PROFILES: HeadsetProfile[] = [
  {
    name: 'Raw / No Distortion',
    description: 'Direct view, phone viewers with flat lenses, or desktop preview',
    k1: 0.0,
    k2: 0.0,
    fov: 75,
    lensMask: false,
  },
  {
    name: 'Google Cardboard v2',
    description: 'Standard 37mm biconvex lenses with medium barrel pre-distortion',
    k1: 0.22,
    k2: 0.18,
    fov: 80,
    lensMask: true,
  },
  {
    name: 'VR Box / Universal 42mm',
    description: 'Generic 42mm aspheric optical lenses',
    k1: 0.16,
    k2: 0.08,
    fov: 85,
    lensMask: true,
  },
  {
    name: 'Wide FOV High-Curvature',
    description: 'Extreme immersion for 100°+ FOV headset shells',
    k1: 0.34,
    k2: 0.25,
    fov: 95,
    lensMask: true,
  },
];

export const SAMPLE_VIDEOS: MediaItem[] = [
  {
    id: 'procedural-synth',
    title: '3D Stereoscopic Synth (True VR 180°)',
    sourceType: 'procedural',
    url: '',
    stereoMode: 'sbs',
    projectionMode: 'dome180',
    description: 'Immersive 180° stereoscopic VR dome surrounding the user with true parallax depth',
  },
  {
    id: 'sample-oceans',
    title: 'Oceans Horizon (Virtual Cinema)',
    sourceType: 'sample',
    url: 'https://vjs.zencdn.net/v/oceans.mp4',
    stereoMode: 'mono',
    projectionMode: 'curved',
    description: 'High-definition underwater documentary presented in cinema theater format',
  },
  {
    id: 'sample-flower',
    title: 'Vibrant Blossom (Full Viewport Fill)',
    sourceType: 'sample',
    url: 'https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4',
    stereoMode: 'mono',
    projectionMode: 'fill',
    description: 'Ultra-crisp macro footage scaled to 100% immersive VR fill',
  },
  {
    id: 'sample-bbb',
    title: 'Big Buck Bunny (Cinema HD)',
    sourceType: 'sample',
    url: 'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c0/Big_Buck_Bunny_4K.webm/Big_Buck_Bunny_4K.webm.480p.vp9.webm',
    stereoMode: 'mono',
    projectionMode: 'curved',
    description: 'Classic open animated movie with full cross-origin CORS support',
  },
];


