import { TelemetryData, DebugLogEntry, BenchmarkData, CameraRelativePose } from '../types/debug';

type TelemetryListener = (data: TelemetryData) => void;

interface BenchmarkSample {
  t: number;
  rawYaw: number;
  correctedYaw: number;
  driftComp: number;
  rotSpeed: number;
  accel: number;
}

class TelemetryManager {
  private data: TelemetryData = {
    fps: 60,
    frameTimeMs: 16.6,
    alpha: null,
    beta: null,
    gamma: null,
    absolute: null,
    orientationHz: 0,
    accelX: null,
    accelY: null,
    accelZ: null,
    accelMagnitude: null,
    rotAlpha: null,
    rotBeta: null,
    rotGamma: null,
    rotSpeed: null,
    motionHz: 0,
    screenAngle: 0,
    screenType: 'unknown',
    viewportWidth: typeof window !== 'undefined' ? window.innerWidth : 1920,
    viewportHeight: typeof window !== 'undefined' ? window.innerHeight : 1080,
    pixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : 1,
    cameraYaw: 0,
    cameraPitch: 0,
    cameraRoll: 0,
    userPanYaw: 0,
    userPanPitch: 0,
    recenterCount: 0,
    calibrationCount: 0,
    rawYaw: 0,
    correctedYaw: 0,
    yawRate: 0,
    gyroBiasYaw: 0,
    motionMode: 'normal',
    isOscillating: false,
    oscillationCount: 0,
    oscillationCorrection: 0,
    oscillationMidpoint: 0,
    lockedMidpoint: 0,
    isShaking: false,
    isStationary: false,
    lockCameraRoll: true,
    lockCamera: false,
    projectionMode: 'dome180',
    stereoMode: 'sbs',
    outputMode: 'split',
    gyroMode: 'dual-axis',
    gyroSmoothing: 0.22,
    trackingSensitivity: 1.0,
    cameraPose: null,
    poseHistory: [],
    benchmark: null,
    logs: [],
  };

  private listeners = new Set<TelemetryListener>();
  private logBuffer: DebugLogEntry[] = [];
  private poseHistoryBuffer: CameraRelativePose[] = [];
  private maxLogs = 300;
  private maxPoseHistory = 400;
  private lastNotifyTime = 0;
  private notifyInterval = 80; // ~12Hz UI refresh for high responsiveness
  private lastPoseLogTime = 0;
  private lastLoggedYaw = 0;
  private lastLoggedPitch = 0;
  private sessionStartTime = performance.now();

  // Benchmark Tracking
  private benchmarkTimer: NodeJS.Timeout | null = null;
  private benchmarkInterval: NodeJS.Timeout | null = null;
  private benchmarkSamples: BenchmarkSample[] = [];

  constructor() {
    this.log('system', 'OmniVR Telemetry initialized', {
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'node',
      screen: typeof window !== 'undefined' ? `${window.screen?.width}x${window.screen?.height}` : 'unknown',
    });
  }

  public update(patch: Partial<TelemetryData>) {
    Object.assign(this.data, patch);

    // If benchmark is active, feed live samples
    if (this.data.benchmark && this.data.benchmark.isRunning) {
      const bm = this.data.benchmark;
      const now = performance.now();
      const elapsedSec = (now - bm.startedAt) / 1000;
      bm.elapsedSec = Math.min(elapsedSec, bm.durationSec);

      const rotSpeed = this.data.rotSpeed || 0;
      const accel = this.data.accelMagnitude || 0;
      if (rotSpeed > bm.peakRotSpeed) bm.peakRotSpeed = rotSpeed;
      if (accel > bm.peakAccel) bm.peakAccel = accel;

      bm.currentYaw = this.data.cameraYaw;
      bm.totalCompApplied = this.data.oscillationCorrection;
      bm.oscillationCycles = Math.max(bm.oscillationCycles, this.data.oscillationCount);
      bm.driftOffset = Math.abs(bm.currentYaw - bm.initialYaw);
      bm.samplesCount = this.benchmarkSamples.length;

      this.benchmarkSamples.push({
        t: Math.round(elapsedSec * 1000),
        rawYaw: parseFloat(this.data.rawYaw.toFixed(2)),
        correctedYaw: parseFloat(this.data.correctedYaw.toFixed(2)),
        driftComp: parseFloat(this.data.oscillationCorrection.toFixed(2)),
        rotSpeed: parseFloat(rotSpeed.toFixed(1)),
        accel: parseFloat(accel.toFixed(1)),
      });
    }

    const now = performance.now();
    if (now - this.lastNotifyTime > this.notifyInterval) {
      this.lastNotifyTime = now;
      this.notify();
    }
  }

  public log(category: DebugLogEntry['category'], message: string, data?: Record<string, unknown>) {
    const entry: DebugLogEntry = {
      id: `${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      time: new Date().toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }) + '.' + Math.floor(Date.now() % 1000).toString().padStart(3, '0'),
      timestamp: Date.now(),
      category,
      message,
      data,
    };

    this.logBuffer.unshift(entry);
    if (this.logBuffer.length > this.maxLogs) {
      this.logBuffer.pop();
    }
    this.data.logs = [...this.logBuffer];
    this.notify();
  }

  public recordCameraPose(pose: CameraRelativePose) {
    this.data.cameraPose = pose;
    this.poseHistoryBuffer.unshift(pose);
    if (this.poseHistoryBuffer.length > this.maxPoseHistory) {
      this.poseHistoryBuffer.pop();
    }
    this.data.poseHistory = [...this.poseHistoryBuffer];

    // Log to debug event stream when significant head movement occurs or periodically during motion
    const now = performance.now();
    const yawDelta = Math.abs(pose.relativeYaw - this.lastLoggedYaw);
    const pitchDelta = Math.abs(pose.relativePitch - this.lastLoggedPitch);
    const timeDelta = now - this.lastPoseLogTime;

    const isSignificantMotion = (yawDelta > 2.5 || pitchDelta > 2.5) && timeDelta > 200;
    const isPeriodicDuringMotion = pose.state === 'moving' && timeDelta > 450;
    const isSpecialEvent = pose.state === 'recentered' || (pose.state === 'fast-shake' && timeDelta > 300);

    if (isSignificantMotion || isPeriodicDuringMotion || isSpecialEvent) {
      this.lastPoseLogTime = now;
      this.lastLoggedYaw = pose.relativeYaw;
      this.lastLoggedPitch = pose.relativePitch;

      const leftX = (pose.leftEyeOffset.x * 1000).toFixed(1);
      const rightX = (pose.rightEyeOffset.x * 1000).toFixed(1);
      const rigPos = `(${pose.headPosition.x.toFixed(2)}, ${pose.headPosition.y.toFixed(2)}, ${pose.headPosition.z.toFixed(2)})`;

      this.log('camera-pose', `Camera Rel to User: Eyes L[${leftX}mm], R[+${rightX}mm] | Rel Gaze: Y=${pose.relativeYaw > 0 ? '+' : ''}${pose.relativeYaw.toFixed(1)}° P=${pose.relativePitch > 0 ? '+' : ''}${pose.relativePitch.toFixed(1)}° R=${pose.relativeRoll.toFixed(1)}° | Head: ${rigPos} | Speed: ${pose.speed.toFixed(1)}°/s | Drift: ${pose.driftCompensated.toFixed(2)}°`, {
        headPos: pose.headPosition,
        leftEye: pose.leftEyeOffset,
        rightEye: pose.rightEyeOffset,
        yaw: pose.relativeYaw,
        pitch: pose.relativePitch,
        roll: pose.relativeRoll,
        yawRate: pose.yawRate,
        speed: pose.speed,
        driftComp: pose.driftCompensated,
        state: pose.state,
      });
    }

    if (now - this.lastNotifyTime > this.notifyInterval) {
      this.lastNotifyTime = now;
      this.notify();
    }
  }

  public clearPoseHistory() {
    this.poseHistoryBuffer = [];
    this.data.poseHistory = [];
    this.notify();
  }

  public exportCameraMotionLog(): string {
    const d = this.data;
    const nowIso = new Date().toISOString();
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
    const totalSamples = this.poseHistoryBuffer.length;
    const currentPose = this.data.cameraPose;

    const header = [
      '========================================================================================================================',
      'OMNIVR STEREOSCOPIC VR - CAMERA POSITION RELATIVE TO USER & HEAD MOVEMENT TIME-SERIES LOG',
      '========================================================================================================================',
      `Exported Timestamp:      ${nowIso}`,
      `User Agent:              ${ua}`,
      `Screen Resolution:       ${d.viewportWidth}x${d.viewportHeight} (DPR: ${d.pixelRatio})`,
      `Projection Mode:         ${d.projectionMode}`,
      `Stereo Output Mode:      ${d.stereoMode} / ${d.outputMode}`,
      `Active Gyro Mode:        ${d.gyroMode}`,
      `Camera Lock Status:      ${d.lockCamera ? 'LOCKED TO SCREEN' : 'FREE VIEW'}`,
      `Camera Horizon Roll:     ${d.lockCameraRoll ? 'LEVEL HORIZON LOCKED (0° ROLL DRIFT IMMUNITY)' : 'FREE TILT'}`,
      `Estimated Gyro DC Bias:  ${d.gyroBiasYaw.toFixed(3)}°/s`,
      `Total Logged Samples:    ${totalSamples}`,
      `User Head Center (Rig):  X=${currentPose?.headPosition.x.toFixed(3) ?? '0.000'}m, Y=${currentPose?.headPosition.y.toFixed(3) ?? '0.000'}m, Z=${currentPose?.headPosition.z.toFixed(3) ?? '0.000'}m`,
      `Left Camera Rel Offset:  X=${currentPose?.leftEyeOffset.x.toFixed(4) ?? '-0.0320'}m (${((currentPose?.leftEyeOffset.x ?? -0.032) * 1000).toFixed(1)}mm), Y=0.0000m, Z=0.0000m`,
      `Right Camera Rel Offset: X=+${currentPose?.rightEyeOffset.x.toFixed(4) ?? '+0.0320'}m (+${((currentPose?.rightEyeOffset.x ?? 0.032) * 1000).toFixed(1)}mm), Y=0.0000m, Z=0.0000m`,
      `Total Anti-Drift Comp:   ${d.oscillationCorrection.toFixed(2)}°`,
      '========================================================================================================================',
      '',
      'TIME (s) | STATE       | USER HEAD RIG POS (m)     | LEFT EYE REL (m)      | RIGHT EYE REL (m)     | REL GAZE [YAW, PITCH, ROLL] (deg)    | ANG SPEED (deg/s) | DRIFT COMP (deg)',
      '--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------'
    ].join('\n');

    const rows = [...this.poseHistoryBuffer].reverse().map((p) => {
      const timeStr = (p.elapsedSec).toFixed(3).padStart(7, ' ');
      const stateStr = p.state.toUpperCase().padEnd(11, ' ');
      const headPosStr = `(${p.headPosition.x.toFixed(2)}, ${p.headPosition.y.toFixed(2)}, ${p.headPosition.z.toFixed(2)})`.padEnd(25, ' ');
      const leftRelStr = `(${p.leftEyeOffset.x.toFixed(3)}, ${p.leftEyeOffset.y.toFixed(3)}, ${p.leftEyeOffset.z.toFixed(3)})`.padEnd(21, ' ');
      const rightRelStr = `(+${p.rightEyeOffset.x.toFixed(3)}, ${p.rightEyeOffset.y.toFixed(3)}, ${p.rightEyeOffset.z.toFixed(3)})`.padEnd(21, ' ');
      const yawStr = (p.relativeYaw >= 0 ? '+' : '') + p.relativeYaw.toFixed(2);
      const pitchStr = (p.relativePitch >= 0 ? '+' : '') + p.relativePitch.toFixed(2);
      const rollStr = (p.relativeRoll >= 0 ? '+' : '') + p.relativeRoll.toFixed(2);
      const gazeStr = `[Y:${yawStr}°, P:${pitchStr}°, R:${rollStr}°]`.padEnd(37, ' ');
      const speedStr = p.speed.toFixed(1).padStart(15, ' ') + '°/s';
      const driftStr = p.driftCompensated.toFixed(2).padStart(16, ' ') + '°';

      return `${timeStr} | ${stateStr} | ${headPosStr} | ${leftRelStr} | ${rightRelStr} | ${gazeStr} | ${speedStr} | ${driftStr}`;
    }).join('\n');

    return `${header}\n${rows}\n\n========================================================================================================================\nEND OF LOG FILE\n========================================================================================================================\n`;
  }

  public clearLogs() {
    this.logBuffer = [];
    this.data.logs = [];
    this.notify();
  }

  public getData(): TelemetryData {
    return { ...this.data, logs: [...this.logBuffer] };
  }

  public subscribe(listener: TelemetryListener): () => void {
    this.listeners.add(listener);
    listener(this.getData());
    return () => this.listeners.delete(listener);
  }

  private notify() {
    const snapshot = this.getData();
    this.listeners.forEach((listener) => {
      try {
        listener(snapshot);
      } catch (err) {
        console.error('Telemetry listener error:', err);
      }
    });
  }

  // 10-Second Head Movement / Drift Benchmark
  public startBenchmark(durationSec: number = 10) {
    if (this.benchmarkTimer) clearTimeout(this.benchmarkTimer);
    if (this.benchmarkInterval) clearInterval(this.benchmarkInterval);

    this.benchmarkSamples = [];
    const startedAt = performance.now();
    const initialYaw = this.data.cameraYaw;

    const benchmarkData: BenchmarkData = {
      isRunning: true,
      startedAt,
      durationSec,
      elapsedSec: 0,
      peakRotSpeed: 0,
      peakAccel: 0,
      oscillationCycles: 0,
      initialYaw,
      currentYaw: initialYaw,
      totalCompApplied: 0,
      driftOffset: 0,
      samplesCount: 0,
    };

    this.data.benchmark = benchmarkData;
    this.log('system', `Started ${durationSec}-second VR Head Tracking Benchmark test`, {
      initialYaw: initialYaw.toFixed(2),
      durationSec,
    });
    this.notify();

    // Timer to finish benchmark
    this.benchmarkTimer = setTimeout(() => {
      this.finishBenchmark();
    }, durationSec * 1000);
  }

  public finishBenchmark() {
    if (this.benchmarkTimer) clearTimeout(this.benchmarkTimer);
    if (!this.data.benchmark) return;

    const bm = this.data.benchmark;
    bm.isRunning = false;
    bm.elapsedSec = bm.durationSec;
    bm.currentYaw = this.data.cameraYaw;
    bm.driftOffset = Math.abs(bm.currentYaw - bm.initialYaw);
    bm.totalCompApplied = this.data.oscillationCorrection;

    const summaryReport = `### 📊 VR Head Shake Drift Benchmark Results (${bm.durationSec}s test)
- **Initial Heading**: ${bm.initialYaw.toFixed(2)}°
- **Final Heading**: ${bm.currentYaw.toFixed(2)}°
- **Residual Heading Offset**: ${bm.driftOffset.toFixed(2)}°
- **Anti-Drift Compensation Applied**: ${bm.totalCompApplied.toFixed(2)}°
- **Detected Oscillation Cycles**: ${bm.oscillationCycles}
- **Peak Head Angular Speed**: ${bm.peakRotSpeed.toFixed(1)} °/s
- **Peak Linear Acceleration**: ${bm.peakAccel.toFixed(1)} m/s²
- **Samples Captured**: ${bm.samplesCount} (~${(bm.samplesCount / bm.durationSec).toFixed(0)} Hz)`;

    bm.completedReport = summaryReport;
    this.log('system', `Benchmark complete: Drift offset = ${bm.driftOffset.toFixed(2)}°, Total comp = ${bm.totalCompApplied.toFixed(2)}°`, {
      peakRotSpeed: bm.peakRotSpeed.toFixed(1),
      oscillationCycles: bm.oscillationCycles,
    });
    this.notify();
  }

  public exportFullJson(): string {
    const payload = {
      exportedAt: new Date().toISOString(),
      deviceInfo: {
        userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown',
        resolution: `${this.data.viewportWidth}x${this.data.viewportHeight}`,
        pixelRatio: this.data.pixelRatio,
        screenOrientation: `${this.data.screenType} (${this.data.screenAngle}°)`,
      },
      currentTelemetry: { ...this.data, logs: undefined, benchmark: undefined, poseHistory: undefined },
      cameraPoseRelativeToUser: this.data.cameraPose,
      cameraMotionHistory: this.poseHistoryBuffer.slice(0, 100),
      benchmark: this.data.benchmark
        ? {
            ...this.data.benchmark,
            samplesPreview: this.benchmarkSamples.slice(0, 50),
            totalSamples: this.benchmarkSamples.length,
          }
        : null,
      eventLogs: this.logBuffer,
    };
    return JSON.stringify(payload, null, 2);
  }

  public generateMarkdownReport(): string {
    const d = this.data;
    const nowIso = new Date().toISOString();
    const ua = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';

    const recentLogs = this.logBuffer.slice(0, 25).map((l) => {
      const dataStr = l.data ? ` ${JSON.stringify(l.data)}` : '';
      return `- [${l.time}] [${l.category.toUpperCase()}] ${l.message}${dataStr}`;
    }).join('\n');

    let benchmarkSection = '';
    if (d.benchmark && d.benchmark.completedReport) {
      benchmarkSection = `\n${d.benchmark.completedReport}\n`;
    }

    const cp = d.cameraPose;
    let cameraRelativeSection = '*(No camera pose recorded yet)*';
    if (cp) {
      const recentPoses = this.poseHistoryBuffer.slice(0, 10).map((p) => {
        return `| ${p.elapsedSec.toFixed(2)}s | ${p.state.toUpperCase()} | (${p.headPosition.x.toFixed(2)}, ${p.headPosition.y.toFixed(2)}, ${p.headPosition.z.toFixed(2)}) | L: ${(p.leftEyeOffset.x * 1000).toFixed(1)}mm, R: +${(p.rightEyeOffset.x * 1000).toFixed(1)}mm | Y:${p.relativeYaw > 0 ? '+' : ''}${p.relativeYaw.toFixed(1)}°, P:${p.relativePitch > 0 ? '+' : ''}${p.relativePitch.toFixed(1)}°, R:${p.relativeRoll.toFixed(1)}° | ${p.speed.toFixed(1)}°/s | ${p.driftCompensated.toFixed(2)}° |`;
      }).join('\n');

      cameraRelativeSection = `- **User Head Origin (Rig)**: [${cp.headPosition.x.toFixed(3)}, ${cp.headPosition.y.toFixed(3)}, ${cp.headPosition.z.toFixed(3)}] m
- **Left Camera Rel Offset**: [${(cp.leftEyeOffset.x * 1000).toFixed(1)}mm, 0mm, 0mm] (World: [${cp.leftEyeWorld.x.toFixed(3)}, ${cp.leftEyeWorld.y.toFixed(3)}, ${cp.leftEyeWorld.z.toFixed(3)}])
- **Right Camera Rel Offset**: [+${(cp.rightEyeOffset.x * 1000).toFixed(1)}mm, 0mm, 0mm] (World: [${cp.rightEyeWorld.x.toFixed(3)}, ${cp.rightEyeWorld.y.toFixed(3)}, ${cp.rightEyeWorld.z.toFixed(3)}])
- **Gaze Relative to Forward**: Yaw: ${cp.relativeYaw.toFixed(2)}°, Pitch: ${cp.relativePitch.toFixed(2)}°, Roll: ${cp.relativeRoll.toFixed(2)}°
- **Head Angular Velocity**: Rate: ${cp.yawRate.toFixed(1)}°/s | Net Speed: ${cp.speed.toFixed(1)}°/s | State: \`${cp.state.toUpperCase()}\`
- **Accumulated Anti-Drift**: ${cp.driftCompensated.toFixed(2)}°

##### ⏱️ Recent Camera Relative Motion Samples:
| Time | State | User Head Pos | Camera Offsets | Rel Gaze Angles | Speed | Drift Comp |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
${recentPoses}
`;
    }

    return `### 📱 VR Head Tracking & Sensor Diagnostic Report
- **Generated At**: ${nowIso}
- **User Agent**: \`${ua}\`
- **Display Resolution**: ${d.viewportWidth}x${d.viewportHeight} (DPR: ${d.pixelRatio})
- **Screen Orientation**: ${d.screenType} (${d.screenAngle}°)
- **VR Modes**: Projection: \`${d.projectionMode}\` | Stereo: \`${d.stereoMode}\` | Output: \`${d.outputMode}\`
- **Gyro Mode**: \`${d.gyroMode}\` (Sensitivity: ${d.trackingSensitivity}x, Smoothing: ${d.gyroSmoothing})
- **Performance**: ${d.fps.toFixed(1)} FPS (${d.frameTimeMs.toFixed(1)} ms)
${benchmarkSection}
#### 🎥 Camera Position Relative to User & Motion Over Time
${cameraRelativeSection}

#### 🧭 IMU Sensors
- **DeviceOrientation**:
  - Alpha (Compass Yaw): ${d.alpha !== null ? d.alpha.toFixed(2) + '°' : 'N/A'}
  - Beta (Pitch): ${d.beta !== null ? d.beta.toFixed(2) + '°' : 'N/A'}
  - Gamma (Roll): ${d.gamma !== null ? d.gamma.toFixed(2) + '°' : 'N/A'}
  - Absolute Heading: ${d.absolute !== null ? String(d.absolute) : 'N/A'}
  - Sensor Frequency: ${d.orientationHz.toFixed(1)} Hz
- **DeviceMotion**:
  - Linear Accel: [${d.accelX?.toFixed(2) ?? '0'}, ${d.accelY?.toFixed(2) ?? '0'}, ${d.accelZ?.toFixed(2) ?? '0'}] m/s²
  - Total Accel Magnitude: ${d.accelMagnitude?.toFixed(2) ?? '0'} m/s²
  - Gyro Rotation Rate: [${d.rotAlpha?.toFixed(1) ?? '0'}, ${d.rotBeta?.toFixed(1) ?? '0'}, ${d.rotGamma?.toFixed(1) ?? '0'}] °/s
  - Total Angular Speed: ${d.rotSpeed?.toFixed(1) ?? '0'} °/s
  - Motion Frequency: ${d.motionHz.toFixed(1)} Hz

#### 🎯 Camera & Orientation Metrics
- **Final Camera Angle**: Yaw: ${d.cameraYaw.toFixed(2)}°, Pitch: ${d.cameraPitch.toFixed(2)}°, Roll: ${d.cameraRoll.toFixed(2)}°
- **Manual Touch Pan**: Yaw: ${d.userPanYaw.toFixed(2)}°, Pitch: ${d.userPanPitch.toFixed(2)}°
- **Recenter Trigger Count**: ${d.recenterCount}

#### ⚡ Anti-Drift Oscillation Engine
- **Is Oscillating**: ${d.isOscillating ? 'YES ⚡' : 'NO'} (Cycles: ${d.oscillationCount})
- **Yaw Angular Velocity**: ${d.yawRate.toFixed(1)} °/s
- **Raw Yaw**: ${d.rawYaw.toFixed(2)}°
- **Corrected Yaw**: ${d.correctedYaw.toFixed(2)}°
- **Accumulated Drift Compensation**: ${d.oscillationCorrection.toFixed(2)}°
- **Oscillation Midpoint**: ${d.oscillationMidpoint.toFixed(2)}° (Locked Baseline: ${d.lockedMidpoint.toFixed(2)}°)
- **High-G Shaking Detected**: ${d.isShaking ? 'YES ⚠️' : 'NO'}

#### 📜 Event Log (Latest Entries):
${recentLogs || '*(No logs recorded yet)*'}
`;
  }
}

export const telemetry = new TelemetryManager();
