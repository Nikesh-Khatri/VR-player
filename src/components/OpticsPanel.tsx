import React from 'react';
import { CameraProperties } from '../types/vr';
import { HEADSET_PROFILES, HeadsetProfile, DEFAULT_CAMERA_PROPERTIES, SEAT_PRESETS, SeatPreset } from '../constants/presets';
import { Sliders, RotateCcw, Glasses, Eye, Compass, Armchair, Crosshair, ArrowUpDown, Lock, Unlock, MoveHorizontal, MoveVertical, ShieldCheck } from 'lucide-react';

interface OpticsPanelProps {
  cameraProperties: CameraProperties;
  onChange: (props: Partial<CameraProperties>) => void;
  onClose: () => void;
  onRecenter?: () => void;
  onCalibrateSensors?: () => void;
}

export const OpticsPanel: React.FC<OpticsPanelProps> = ({
  cameraProperties,
  onChange,
  onClose,
  onRecenter,
  onCalibrateSensors,
}) => {
  const handleProfileSelect = (profile: HeadsetProfile) => {
    onChange({
      barrelDistortionK1: profile.k1,
      barrelDistortionK2: profile.k2,
      fov: profile.fov,
      lensMask: profile.lensMask,
    });
  };

  const handleSeatSelect = (seat: SeatPreset) => {
    onChange({
      distance: seat.distance,
      fov: seat.fov,
      curvature: seat.curvature,
    });
  };

  const handleReset = () => {
    onChange(DEFAULT_CAMERA_PROPERTIES);
  };

  return (
    <div className="w-full p-4 sm:p-5 text-slate-200 pb-28 space-y-4">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-semibold text-white tracking-wide">Camera & Optical Calibration</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Reset to defaults"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white text-sm px-1.5 cursor-pointer"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Seat Row Presets */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center gap-1.5">
          <Armchair className="w-3.5 h-3.5 text-sky-400" />
          <span>Theater Seating Distance</span>
        </label>
        <div className="grid grid-cols-4 gap-1.5">
          {SEAT_PRESETS.map((seat) => (
            <button
              key={seat.id}
              onClick={() => handleSeatSelect(seat)}
              className="min-h-[42px] py-2 px-1 bg-slate-900/80 hover:bg-slate-800 border border-white/5 rounded-xl text-center text-[11px] text-slate-200 hover:text-white transition-colors cursor-pointer font-medium active:scale-95 flex items-center justify-center"
            >
              {seat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Headset Profile Presets */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-400 mb-1.5">
          VR Headset Optical Profile
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {HEADSET_PROFILES.map((prof) => (
            <button
              key={prof.name}
              onClick={() => handleProfileSelect(prof)}
              className="min-h-[46px] text-left px-3 py-2 bg-slate-900/80 hover:bg-slate-800 border border-white/5 rounded-xl text-xs transition-colors cursor-pointer active:scale-95 flex flex-col justify-center"
            >
              <div className="font-semibold text-slate-200 truncate">{prof.name}</div>
              <div className="text-[10px] text-slate-500 font-mono-numbers">FOV {prof.fov}°</div>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 text-xs">
        {/* In-VR Hands-Free Gaze Controls */}
        <div className="p-3 bg-sky-950/30 rounded-xl border border-sky-500/20 space-y-2">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-sky-200">
              <Crosshair className="w-4 h-4 text-sky-400" />
              <span>In-VR Hands-Free Gaze Pointer</span>
            </label>
            <input
              type="checkbox"
              checked={cameraProperties.gazeControlsEnabled}
              onChange={(e) => onChange({ gazeControlsEnabled: e.target.checked })}
              className="rounded bg-slate-900 border-white/20 text-sky-500 focus:ring-0"
            />
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Look at controls inside your VR headset to trigger them automatically without touching the phone screen.
          </p>
          {cameraProperties.gazeControlsEnabled && (
            <div className="pt-1">
              <div className="flex justify-between items-center mb-1 text-[11px]">
                <span className="text-slate-400">Hover Dwell Time</span>
                <span className="font-mono-numbers text-sky-400">
                  {(cameraProperties.gazeDwellTime / 1000).toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min="600"
                max="2200"
                step="100"
                value={cameraProperties.gazeDwellTime}
                onChange={(e) => onChange({ gazeDwellTime: parseInt(e.target.value, 10) })}
                className="w-full"
              />
            </div>
          )}
        </div>

        {/* IPD Slider */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              IPD (Interpupillary Separation)
            </span>
            <span className="font-mono-numbers text-sky-400">
              {(cameraProperties.ipd * 1000).toFixed(1)} mm
            </span>
          </div>
          <input
            type="range"
            min="45"
            max="80"
            step="0.5"
            value={cameraProperties.ipd * 1000}
            onChange={(e) => onChange({ ipd: parseFloat(e.target.value) / 1000 })}
            className="w-full"
          />
          <div className="flex justify-between text-[10px] text-slate-500 font-mono-numbers mt-0.5">
            <span>45mm (Narrow)</span>
            <span>64mm (Standard)</span>
            <span>80mm (Wide)</span>
          </div>
        </div>

        {/* Stereoscopic Convergence (Toe-in Angle) for 3D Depth */}
        <div className="p-3 bg-slate-900/90 rounded-xl border border-sky-500/20 space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="flex items-center gap-1.5 text-slate-200 font-semibold text-xs">
              <Glasses className="w-3.5 h-3.5 text-sky-400" />
              Stereoscopic Convergence (Toe-in)
            </span>
            <span className="font-mono-numbers text-sky-400 font-bold">
              {(cameraProperties.stereoConvergenceAngle ?? 0.8).toFixed(1)}°
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Angles left and right eye cameras inward toward the screen for enhanced 3D stereoscopic depth and pop-out.
          </p>
          <input
            type="range"
            min="0"
            max="3.0"
            step="0.1"
            value={cameraProperties.stereoConvergenceAngle ?? 0.8}
            onChange={(e) => onChange({ stereoConvergenceAngle: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="grid grid-cols-3 gap-1 pt-1">
            <button
              onClick={() => onChange({ stereoConvergenceAngle: 0.0 })}
              className={`py-1.5 px-2 rounded-lg text-[10px] font-medium transition-colors cursor-pointer border ${
                (cameraProperties.stereoConvergenceAngle ?? 0.8) === 0
                  ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold'
                  : 'bg-slate-800 text-slate-300 border-white/5 hover:text-white'
              }`}
            >
              Parallel (0°)
            </button>
            <button
              onClick={() => onChange({ stereoConvergenceAngle: 0.8 })}
              className={`py-1.5 px-2 rounded-lg text-[10px] font-medium transition-colors cursor-pointer border ${
                (cameraProperties.stereoConvergenceAngle ?? 0.8) === 0.8
                  ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold'
                  : 'bg-slate-800 text-slate-300 border-white/5 hover:text-white'
              }`}
            >
              Cinema (0.8°)
            </button>
            <button
              onClick={() => onChange({ stereoConvergenceAngle: 1.6 })}
              className={`py-1.5 px-2 rounded-lg text-[10px] font-medium transition-colors cursor-pointer border ${
                (cameraProperties.stereoConvergenceAngle ?? 0.8) === 1.6
                  ? 'bg-sky-500 text-slate-950 border-sky-400 font-bold'
                  : 'bg-slate-800 text-slate-300 border-white/5 hover:text-white'
              }`}
            >
              Deep 3D (1.6°)
            </button>
          </div>
        </div>

        {/* Horizon Level Guide Overlay Toggle */}
        <div className="p-3 bg-slate-900/80 rounded-xl border border-white/10 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-200">
              <Compass className="w-4 h-4 text-emerald-400" />
              <span>Show Horizon Level Guide</span>
            </label>
            <input
              type="checkbox"
              checked={cameraProperties.showHorizonGuide ?? false}
              onChange={(e) => onChange({ showHorizonGuide: e.target.checked })}
              className="rounded bg-slate-900 border-white/20 text-emerald-500 focus:ring-0 cursor-pointer"
            />
          </div>
          <p className="text-[10px] text-slate-400 leading-relaxed">
            Renders an artificial horizon pitch ladder with roll tilt indicator to visually verify and level the viewer.
          </p>
        </div>

        {/* Headset Roll Tilt Calibration */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-300 font-medium">Headset Horizon Roll Tilt</span>
            <span className="font-mono-numbers text-sky-400">
              {cameraProperties.rollOffset > 0 ? `+${cameraProperties.rollOffset}°` : `${cameraProperties.rollOffset}°`}
            </span>
          </div>
          <input
            type="range"
            min="-15"
            max="15"
            step="0.5"
            value={cameraProperties.rollOffset}
            onChange={(e) => onChange({ rollOffset: parseFloat(e.target.value) })}
            className="w-full"
          />
          <p className="text-[10px] text-slate-500 mt-0.5">
            Levels horizon if phone sits slightly crooked in headset
          </p>
        </div>

        {/* FOV Slider */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-300 font-medium">Field of View (FOV / Zoom)</span>
            <span className="font-mono-numbers text-sky-400">{cameraProperties.fov}°</span>
          </div>
          <input
            type="range"
            min="40"
            max="120"
            step="1"
            value={cameraProperties.fov}
            onChange={(e) => onChange({ fov: parseInt(e.target.value, 10) })}
            className="w-full"
          />
        </div>

        {/* Distance Slider */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-300 font-medium">Screen Distance</span>
            <span className="font-mono-numbers text-sky-400">
              {cameraProperties.distance.toFixed(1)} m
            </span>
          </div>
          <input
            type="range"
            min="1.0"
            max="7.0"
            step="0.1"
            value={cameraProperties.distance}
            onChange={(e) => onChange({ distance: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* Camera Height Offset */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-300 font-medium">Elevation / Seat Height</span>
            <span className="font-mono-numbers text-sky-400">
              {cameraProperties.height.toFixed(2)} m
            </span>
          </div>
          <input
            type="range"
            min="-1.5"
            max="1.5"
            step="0.05"
            value={cameraProperties.height}
            onChange={(e) => onChange({ height: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* Vertical Parallax Correction */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-300 font-medium">Vertical Parallax Shift</span>
            <span className="font-mono-numbers text-sky-400">
              {(cameraProperties.verticalParallax * 100).toFixed(1)}%
            </span>
          </div>
          <input
            type="range"
            min="-0.05"
            max="0.05"
            step="0.002"
            value={cameraProperties.verticalParallax}
            onChange={(e) => onChange({ verticalParallax: parseFloat(e.target.value) })}
            className="w-full"
          />
          <p className="text-[10px] text-slate-500 mt-0.5">
            Fixes camera vertical misalignment in SBS footage
          </p>
        </div>

        {/* Barrel / Pincushion Distortion (K1) */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Glasses className="w-3.5 h-3.5 text-sky-400" />
              Lens Distortion (K1 Factor)
            </span>
            <span className="font-mono-numbers text-sky-400">
              {cameraProperties.barrelDistortionK1.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="-0.4"
            max="0.6"
            step="0.02"
            value={cameraProperties.barrelDistortionK1}
            onChange={(e) => onChange({ barrelDistortionK1: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* Barrel Distortion (K2) */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-300 font-medium">Lens Distortion (K2 Fine)</span>
            <span className="font-mono-numbers text-sky-400">
              {cameraProperties.barrelDistortionK2.toFixed(2)}
            </span>
          </div>
          <input
            type="range"
            min="-0.2"
            max="0.4"
            step="0.02"
            value={cameraProperties.barrelDistortionK2}
            onChange={(e) => onChange({ barrelDistortionK2: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* Lens Mask & Vignette */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cameraProperties.lensMask}
              onChange={(e) => onChange({ lensMask: e.target.checked })}
              className="rounded bg-slate-900 border-white/20 text-sky-500 focus:ring-0"
            />
            <span className="text-slate-300">Circular VR Lens Mask</span>
          </label>
        </div>

        {/* Gyroscope Anti-Drift Engine & Camera Axis Locks */}
        <div className="pt-3 border-t border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 text-slate-200 font-semibold">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              <span>Head Tracking & Camera Lock</span>
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-medium">
              Anti-Drift Active
            </span>
          </div>

          {/* Stationary Sensor Calibration Card */}
          <div className="p-3 bg-slate-900/90 rounded-xl border border-sky-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Crosshair className="w-3.5 h-3.5 text-sky-400" />
                <span>Stationary Sensor Calibration</span>
              </span>
              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Auto-Null Active
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              If your phone has residual gyro bias, rest the phone still for 1 second and tap Calibrate to calculate and zero out hardware sensor bias.
            </p>
            {onCalibrateSensors && (
              <button
                onClick={onCalibrateSensors}
                className="w-full min-h-[44px] py-2 px-3 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-lg text-xs flex items-center justify-center gap-2 transition-all active:scale-95 cursor-pointer shadow-lg shadow-sky-500/20"
              >
                <Crosshair className="w-4 h-4 text-slate-950" />
                <span>Calibrate Sensors & Zero Drift Now</span>
              </button>
            )}
          </div>

          {/* Gyro Tracking Presets */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() =>
                onChange({
                  gyroMode: 'dual-axis',
                  lockCameraRoll: true,
                  lockCamera: false,
                  enableHorizontalTracking: true,
                  enableVerticalTracking: true,
                })
              }
              className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                cameraProperties.gyroMode === 'dual-axis' && !cameraProperties.lockCamera
                  ? 'bg-emerald-500/20 border-emerald-400 text-white shadow-sm ring-1 ring-emerald-500/30'
                  : 'bg-slate-900/60 border-white/5 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 text-xs flex items-center gap-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  Dual-Axis Anti-Drift
                </span>
                <span className="text-[9px] text-emerald-400 uppercase font-mono">H + V Free</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 leading-tight">
                Locks camera roll horizon. Head moves horizontally & vertically with zero creep!
              </div>
            </button>

            <button
              onClick={() =>
                onChange({
                  gyroMode: 'camera-locked',
                  lockCamera: true,
                })
              }
              className={`text-left p-2.5 rounded-xl border transition-all cursor-pointer ${
                cameraProperties.lockCamera || cameraProperties.gyroMode === 'camera-locked'
                  ? 'bg-indigo-500/20 border-indigo-400 text-white shadow-sm ring-1 ring-indigo-500/30'
                  : 'bg-slate-900/60 border-white/5 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-semibold text-slate-200 text-xs flex items-center gap-1">
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                  Lock Camera (Fixed)
                </span>
                <span className="text-[9px] text-indigo-400 uppercase font-mono">100% Fixed</span>
              </div>
              <div className="text-[10px] text-slate-400 mt-1 leading-tight">
                Locks camera directly facing screen. 100% immune to all gyro drift!
              </div>
            </button>
          </div>

          <div className="grid grid-cols-3 gap-1.5">
            <button
              onClick={() =>
                onChange({
                  gyroMode: 'horizon-lock',
                  lockCamera: false,
                  lockCameraRoll: true,
                  enableHorizontalTracking: true,
                  enableVerticalTracking: true,
                })
              }
              className={`text-left p-2 rounded-lg border transition-all cursor-pointer ${
                cameraProperties.gyroMode === 'horizon-lock' && !cameraProperties.lockCamera
                  ? 'bg-amber-500/20 border-amber-400 text-white shadow-sm'
                  : 'bg-slate-900/60 border-white/5 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="font-semibold text-slate-200 text-[11px]">Horizon Anchor</div>
              <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">
                Elastic center pull for 180° VR
              </div>
            </button>

            <button
              onClick={() =>
                onChange({
                  gyroMode: 'zero-drift',
                  lockCamera: false,
                  enableHorizontalTracking: false,
                  enableVerticalTracking: true,
                })
              }
              className={`text-left p-2 rounded-lg border transition-all cursor-pointer ${
                cameraProperties.gyroMode === 'zero-drift' && !cameraProperties.lockCamera
                  ? 'bg-sky-500/20 border-sky-400 text-white shadow-sm'
                  : 'bg-slate-900/60 border-white/5 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="font-semibold text-slate-200 text-[11px]">Vertical Look Only</div>
              <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">
                Yaw locked forward, pitch free
              </div>
            </button>

            <button
              onClick={() =>
                onChange({
                  gyroMode: 'full-3dof',
                  lockCamera: false,
                  lockCameraRoll: false,
                  enableHorizontalTracking: true,
                  enableVerticalTracking: true,
                })
              }
              className={`text-left p-2 rounded-lg border transition-all cursor-pointer ${
                cameraProperties.gyroMode === 'full-3dof' && !cameraProperties.lockCamera
                  ? 'bg-purple-500/20 border-purple-400 text-white shadow-sm'
                  : 'bg-slate-900/60 border-white/5 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <div className="font-semibold text-slate-200 text-[11px]">Full 360° Free Look</div>
              <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">
                Full 3DoF with tilt roll
              </div>
            </button>
          </div>

          {/* Granular Axis & Horizon Locks */}
          <div className="p-2.5 bg-slate-900/80 rounded-xl border border-white/5 space-y-2">
            <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
              <span>Granular Camera Axis Locks</span>
              <span className="text-[9px] text-slate-400 font-mono">Independent Controls</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Lock Roll Horizon */}
              <button
                onClick={() => onChange({ lockCameraRoll: !(cameraProperties.lockCameraRoll !== false) })}
                className={`flex items-center justify-between p-2 rounded-lg border transition-colors cursor-pointer ${
                  cameraProperties.lockCameraRoll !== false
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                    : 'bg-slate-950/60 border-white/5 text-slate-400 hover:bg-slate-800'
                }`}
                title="Keeps the camera strictly level with the horizon, eliminating sideways tilt drift and vertical stereo disparity"
              >
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Camera Horizon</span>
                </div>
                <span className="font-mono text-[10px] font-bold">
                  {cameraProperties.lockCameraRoll !== false ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Lock Camera to Screen */}
              <button
                onClick={() =>
                  onChange({
                    lockCamera: !cameraProperties.lockCamera,
                    gyroMode: !cameraProperties.lockCamera ? 'camera-locked' : 'dual-axis',
                  })
                }
                className={`flex items-center justify-between p-2 rounded-lg border transition-colors cursor-pointer ${
                  cameraProperties.lockCamera
                    ? 'bg-indigo-500/15 border-indigo-500/40 text-indigo-300'
                    : 'bg-slate-950/60 border-white/5 text-slate-400 hover:bg-slate-800'
                }`}
                title="Locks the camera facing forward toward the video screen"
              >
                <div className="flex items-center gap-1.5">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Lock Camera to Screen</span>
                </div>
                <span className="font-mono text-[10px] font-bold">
                  {cameraProperties.lockCamera ? 'ON' : 'OFF'}
                </span>
              </button>

              {/* Horizontal Head Movement (Yaw) */}
              <button
                onClick={() =>
                  onChange({
                    enableHorizontalTracking: !(cameraProperties.enableHorizontalTracking !== false),
                  })
                }
                className={`flex items-center justify-between p-2 rounded-lg border transition-colors cursor-pointer ${
                  cameraProperties.enableHorizontalTracking !== false
                    ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                    : 'bg-slate-950/60 border-white/5 text-slate-400 hover:bg-slate-800'
                }`}
                title="Enable or disable horizontal head rotation (look left/right)"
              >
                <div className="flex items-center gap-1.5">
                  <MoveHorizontal className="w-3.5 h-3.5" />
                  <span>Horizontal Axis (Yaw)</span>
                </div>
                <span className="font-mono text-[10px] font-bold">
                  {cameraProperties.enableHorizontalTracking !== false ? 'ACTIVE' : 'LOCKED'}
                </span>
              </button>

              {/* Vertical Head Movement (Pitch) */}
              <button
                onClick={() =>
                  onChange({
                    enableVerticalTracking: !(cameraProperties.enableVerticalTracking !== false),
                  })
                }
                className={`flex items-center justify-between p-2 rounded-lg border transition-colors cursor-pointer ${
                  cameraProperties.enableVerticalTracking !== false
                    ? 'bg-sky-500/15 border-sky-500/40 text-sky-300'
                    : 'bg-slate-950/60 border-white/5 text-slate-400 hover:bg-slate-800'
                }`}
                title="Enable or disable vertical head rotation (look up/down)"
              >
                <div className="flex items-center gap-1.5">
                  <MoveVertical className="w-3.5 h-3.5" />
                  <span>Vertical Axis (Pitch)</span>
                </div>
                <span className="font-mono text-[10px] font-bold">
                  {cameraProperties.enableVerticalTracking !== false ? 'ACTIVE' : 'LOCKED'}
                </span>
              </button>
            </div>
          </div>

          {/* Anti-Drift Centering Strength */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-300 font-medium">Anti-Drift Horizon Strength</span>
              <span className="font-mono-numbers text-sky-400">
                {Math.round((cameraProperties.antiDriftStrength ?? 0.8) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min="0.2"
              max="1.0"
              step="0.05"
              value={cameraProperties.antiDriftStrength ?? 0.8}
              onChange={(e) => onChange({ antiDriftStrength: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono-numbers mt-0.5">
              <span>Subtle (20%)</span>
              <span>Balanced (80%)</span>
              <span>Aggressive Lock (100%)</span>
            </div>
          </div>

          {/* Quick Recenter View Button */}
          {onRecenter && (
            <button
              onClick={onRecenter}
              className="w-full py-2 px-3 bg-sky-500/15 hover:bg-sky-500/25 border border-sky-500/30 text-sky-300 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
              <span>Recenter Heading to Horizon (Press R)</span>
            </button>
          )}

          {/* Gyro Smoothing */}
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-300 font-medium">Sensor Smoothing Damping</span>
              <span className="font-mono-numbers text-sky-400">
                {(cameraProperties.gyroSmoothing || 0.18).toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.05"
              max="0.40"
              step="0.02"
              value={cameraProperties.gyroSmoothing || 0.18}
              onChange={(e) => onChange({ gyroSmoothing: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono-numbers mt-0.5">
              <span>Ultra Smooth (Dampened)</span>
              <span>Direct / Snappy</span>
            </div>
          </div>
        </div>

        {/* Head Tracking Sensitivity */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Compass className="w-3.5 h-3.5 text-sky-400" />
              Lookaround Sensitivity
            </span>
            <span className="font-mono-numbers text-sky-400">
              {cameraProperties.trackingSensitivity.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min="0.4"
            max="2.5"
            step="0.1"
            value={cameraProperties.trackingSensitivity}
            onChange={(e) => onChange({ trackingSensitivity: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* Invert Pitch / Vertical Axis Toggle */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={cameraProperties.invertPitch || false}
              onChange={(e) => onChange({ invertPitch: e.target.checked })}
              className="rounded bg-slate-900 border-white/20 text-sky-500 focus:ring-0"
            />
            <span className="text-slate-300 flex items-center gap-1.5 text-xs font-medium">
              <ArrowUpDown className="w-3.5 h-3.5 text-sky-400" />
              <span>Invert Vertical Look (Pitch)</span>
            </span>
          </label>
          <span className="text-[10px] text-slate-500">
            {cameraProperties.invertPitch ? 'Inverted' : 'Standard'}
          </span>
        </div>
      </div>
    </div>
  );
};


