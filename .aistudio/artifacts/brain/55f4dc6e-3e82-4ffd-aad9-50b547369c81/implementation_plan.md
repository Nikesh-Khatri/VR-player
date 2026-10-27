# Horizon Level Guide, Quick IPD Controls & Stereoscopic Toe-In Convergence

An implementation plan to introduce a dual pitch-ladder Horizon Level guide overlay in the Debug menu, direct thumb-friendly IPD adjustment inside both the VR HUD and settings, adjustable stereoscopic camera convergence (toe-in angle) for enhanced 3D depth, and complete 2-axis (horizontal + vertical) viewpoint centering with anti-drift stabilization.

> [!IMPORTANT]
> **Confirmed User Decisions from Phase 1:**
> - **Stereoscopic Convergence**: Adjustable toe-in angle with comfortable preset (0.0° parallel to 3.0° deep convergence; default 0.8° cinema sweet spot).
> - **Horizon Level Overlay**: Dual pitch ladder with roll tilt indicator and center reticle, rendered identically in both eye viewports for stereoscopic alignment.
> - **IPD Adjustment**: Quick slider accessible both directly in the VR HUD (for quick thumb tuning while wearing a Cardboard headset) and within the full Settings/Optics menu.
> - **2-Axis Viewpoint Centering**: Full horizontal (yaw) and vertical (pitch) zeroing upon Recenter / Calibration, accompanied by continuous center-anchor drift absorption in `dual-axis` mode.

---

### 1. Overview & Core Concept

When viewing side-by-side (SBS) VR video through mobile Cardboard or VR viewers, three critical factors determine visual comfort and immersion:
1. **Horizon Alignment & Drift Verification**: Users need a visual ground truth (an artificial horizon / pitch ladder) to verify whether head tracking has drifted or if their phone is seated crookedly inside the viewer frame.
2. **Interpupillary Distance (IPD)**: Human eye distance varies between 55mm and 72mm (average 64mm). If lens separation does not match optical separation, users experience severe eye strain and double vision. Providing instantaneous thumb adjustments without breaking VR mode is essential.
3. **Stereoscopic Convergence (Toe-In Angle)**: Pure parallel cameras can feel flat on virtual screens. Introducing an adjustable toe-in angle directs each eye camera inward toward the virtual screen plane, providing rich stereoscopic depth and 3D pop-out.

---

### 2. User Experience & Visual Design

#### A. In-VR Horizon Level Guide Overlay
- **Toggle Location**: A dedicated switch in the Debug Menu ("Show Horizon Level Guide") and a quick toggle button on the debug bar.
- **Visual Appearance**:
  - Twin pitch ladders rendered across both left and right eye viewports so they fuse stereoscopically.
  - A crisp, luminous horizontal line (with graduation ticks at $\pm 5^\circ, \pm 10^\circ, \pm 20^\circ$) that rotates dynamically with camera roll and moves vertically with pitch.
  - Live numerical badge showing current roll offset (`Roll: -0.5°`) and pitch angle (`Pitch: +0.2°`) with an instant "Zero Roll" button.

#### B. Quick IPD Thumb Controller in VR HUD
- **HUD Placement**: A dedicated quick control button (`IPD 64mm`) placed in the top-right / bottom-right thumb zone of `CardboardOverlay.tsx`.
- **Interaction**:
  - Tapping opens a minimal, floating glass pill slider directly over the canvas.
  - Users can slide or tap `[-]` / `[+]` in 1mm increments (45mm to 80mm).
  - Both eye crosshairs briefly highlight to show the exact optical center of each lens.
  - Auto-collapses after 3 seconds of inactivity to keep the viewing experience clean.

#### C. Stereoscopic Convergence (Toe-In Angle) Controls
- **Optics Menu & HUD**:
  - Slider ranging from `0.0° (Strict Parallel)` to `3.0° (Deep 3D Pop-out)`.
  - Presets: `Parallel (0.0°)`, `Cinema Sweet Spot (0.8°)`, `Intense 3D (1.6°)`.
  - Instant live response: left camera rotates inward by $+\theta/2$ and right camera by $-\theta/2$.

#### D. True 2-Axis Viewpoint Centering & Zero Creep
- When the user taps **Recenter** or **Calibrate**:
  - Yaw is zeroed to the current gaze azimuth.
  - Pitch is zeroed so the virtual screen sits at eye level $(0, 0, -1)$, even if reclining at 30° or lying in bed.
  - Roll is calibrated to 0°.
- Continuous center-anchor drift damper is activated in default `dual-axis` mode so horizontal creep is subliminally drained while watching the movie.

---

### 3. Key Product Decisions & Trade-Offs

- **Toe-In Rotation vs. Asymmetric Frustum**:
  - *Chosen Approach*: Implement calibrated symmetric toe-in camera rotation (`rotation.y = ±toeInAngle`) on the eye cameras inside `cameraRig`.
  - *Why*: Provides immediate, noticeable 3D depth pop-out for cinema and curved projections without requiring custom projection matrix recalculations on every frame. Users can dial down to `0.0°` if they prefer strict parallel rendering.
- **Dual-Eye Horizon Overlay Rendering**:
  - *Chosen Approach*: Render the horizon guide inside `CardboardOverlay.tsx` mirrored into both left and right eye containers.
  - *Why*: In stereoscopic viewing, a 2D guide rendered in only one eye causes binocular rivalry (headache). Mirroring it identically across both eye displays creates a comfortable virtual HUD.

---

### 4. Technical Architecture & Data Strategy

```
┌────────────────────────────────────────────────────────────────────────┐
│                               App.tsx                                  │
│  State: cameraProperties (ipd, stereoConvergenceAngle, rollOffset...)  │
│         debugProperties (showHorizonGuide, showDebugOverlay...)        │
└───────────────────┬───────────────────────────────────┬────────────────┘
                    │                                   │
                    ▼                                   ▼
┌───────────────────────────────────────┐   ┌────────────────────────────┐
│              VRCanvas.tsx             │   │    CardboardOverlay.tsx    │
│  - 2-Axis Viewpoint Centering         │   │  - Dual Horizon Guide HUD  │
│    (pitchOffsetRef, rollOffsetRef)    │   │  - Quick Thumb IPD Slider  │
│  - Continuous Drift Bleed (dual-axis) │   │  - Convergence Presets     │
│  - Eye Camera Toe-in Convergence:     │   │  - Recenter / Calibrate    │
│    leftCam.rotation.y = +toeIn        │   └────────────────────────────┘
│    rightCam.rotation.y = -toeIn       │
└───────────────────────────────────────┘
```

#### Step-by-Step Execution Plan

1. **Type Definitions (`src/types/vr.ts` & `src/types/debug.ts`)**:
   - Add `stereoConvergenceAngle: number` (0 to 3.0 degrees) to `CameraProperties`.
   - Add `showHorizonGuide: boolean` to `CameraProperties` / `TelemetryData`.

2. **2-Axis Viewpoint Centering & Drift Dampening (`src/components/VRCanvas.tsx`)**:
   - In `calibrateHeadingToForward`, calculate and store `pitchOffsetRef.current` and `rollOffsetRef.current` from `alignedDevQuat`.
   - In `doRecenter` and `doCalibrateSensors`, update pitch and roll offsets.
   - In render loop: compute `pitchAngle = rawPitchAngle - pitchOffsetRef.current` and `rollAngle = rawRollAngle - rollOffsetRef.current`.
   - Update stationary human fixation threshold to $< 3.2^\circ/\text{s}$.
   - Apply continuous center-anchor damper in `cam.gyroMode === 'dual-axis'` as well as `'horizon-lock'`.
   - Apply `stereoConvergenceAngle`: rotate left camera around Y by `+theta` and right camera by `-theta`.

3. **Horizon Level Guide Overlay (`src/components/CardboardOverlay.tsx`)**:
   - Render dual pitch-ladder guide lines and roll indicator across left and right eye viewports.
   - React to real-time `cameraPitch` and `cameraRoll` telemetry.

4. **Quick IPD Thumb Slider in VR HUD (`src/components/CardboardOverlay.tsx`)**:
   - Add an IPD button in the HUD controls bar that toggles a floating thumb slider (45mm to 80mm).
   - Display real-time mm values and quick `[-1mm]` / `[+1mm]` bump buttons.

5. **Optics Panel Updates (`src/components/OpticsPanel.tsx`)**:
   - Add the Stereoscopic Convergence (Toe-in Angle) slider with quick preset buttons (`Parallel 0°`, `Sweet-Spot 0.8°`, `Deep 1.6°`).
   - Add the "Show Horizon Level Guide" toggle switch.

6. **Debug Overlay Updates (`src/components/DebugOverlay.tsx`)**:
   - Add a quick toggle for "Horizon Level Guide" in the motion/sensor tabs.
