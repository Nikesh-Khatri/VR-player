import React, { useState, useEffect } from 'react';
import { VideoColorProperties, CameraProperties, ProjectionMode } from '../types/vr';
import { TelemetryData } from '../types/debug';
import { telemetry } from '../utils/telemetryManager';
import {
  Compass,
  RotateCcw,
  Maximize2,
  ShieldCheck,
  Disc,
  Box,
  Tv,
  EyeOff,
  Crosshair,
  Eye,
  Sliders,
} from 'lucide-react';

interface CardboardOverlayProps {
  colorProperties: VideoColorProperties;
  cameraProperties: CameraProperties;
  projectionMode: ProjectionMode;
  onSelectProjectionMode: (mode: ProjectionMode) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onRecenter: () => void;
  onCalibrateSensors?: () => void;
  onChangeCameraProperties?: (props: Partial<CameraProperties>) => void;
  onToggleTracking: (enabled: boolean) => void;
  onToggleGyroMode: () => void;
  isDebugMode?: boolean;
  onToggleDebug?: () => void;
  isUiHidden?: boolean;
  onToggleHideAllUi?: () => void;
}

export const CardboardOverlay: React.FC<CardboardOverlayProps> = ({
  colorProperties,
  cameraProperties,
  projectionMode,
  onSelectProjectionMode,
  isFullscreen,
  onToggleFullscreen,
  onRecenter,
  onCalibrateSensors,
  onChangeCameraProperties,
  onToggleTracking,
  onToggleGyroMode,
  isUiHidden,
  onToggleHideAllUi,
}) => {
  const [gyroRequested, setGyroRequested] = useState(false);
  const [showIpdSlider, setShowIpdSlider] = useState(false);
  const [telemetryData, setTelemetryData] = useState<TelemetryData>(telemetry.getData());

  useEffect(() => {
    return telemetry.subscribe((next) => {
      setTelemetryData(next);
    });
  }, []);

  const requestGyroPermission = async () => {
    if (
      typeof DeviceOrientationEvent !== 'undefined' &&
      // @ts-expect-error iOS Safari permission check
      typeof DeviceOrientationEvent.requestPermission === 'function'
    ) {
      try {
        // @ts-expect-error iOS Safari permission check
        const response = await DeviceOrientationEvent.requestPermission();
        if (response === 'granted') {
          onToggleTracking(true);
          setGyroRequested(true);
        }
      } catch (err) {
        console.warn('Gyroscope permission error:', err);
      }
    } else {
      onToggleTracking(!cameraProperties.headTracking);
    }
  };

  // If UI is toggled completely hidden, do not display any UI buttons, badges, banners or text
  if (isUiHidden) {
    return colorProperties.showCenterDivider ? (
      <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
        <div
          className="h-full bg-slate-800/80 shadow-[0_0_12px_rgba(0,0,0,0.8)] shrink-0"
          style={{ width: `${colorProperties.dividerWidth}px` }}
        />
      </div>
    ) : null;
  }

  // Dual Pitch Ladder & Roll Tilt Guide for Visual Horizon Verification
  const renderHorizonGuide = (eyeLabel: 'L' | 'R') => {
    if (!cameraProperties.showHorizonGuide) return null;
    const pitch = telemetryData.cameraPitch || 0;
    const roll = telemetryData.cameraRoll || 0;

    return (
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden select-none">
        {/* Dynamic Artificial Horizon Pitch Ladder & Roll Line */}
        <div
          className="relative w-56 h-56 flex items-center justify-center transition-transform duration-75 will-change-transform"
          style={{
            transform: `rotate(${-roll}deg) translateY(${pitch * 2.2}px)`,
          }}
        >
          {/* Main 0° Horizontal Horizon Line */}
          <div className="absolute left-2 right-2 h-[2px] flex items-center justify-between">
            <div className="w-20 h-full bg-emerald-400/90 shadow-[0_0_8px_rgba(52,211,153,0.8)] rounded-full" />
            <div className="w-20 h-full bg-emerald-400/90 shadow-[0_0_8px_rgba(52,211,153,0.8)] rounded-full" />
          </div>

          {/* Pitch +10° rung */}
          <div className="absolute top-[32px] flex items-center justify-between w-36">
            <span className="text-[9px] font-mono-numbers text-emerald-300 font-bold tracking-tight">+10°</span>
            <div className="w-8 h-[1.5px] bg-emerald-400/70 border-b border-emerald-400/40" />
            <div className="w-4" />
            <div className="w-8 h-[1.5px] bg-emerald-400/70 border-b border-emerald-400/40" />
            <span className="text-[9px] font-mono-numbers text-emerald-300 font-bold tracking-tight">+10°</span>
          </div>

          {/* Pitch +5° rung */}
          <div className="absolute top-[68px] flex items-center justify-between w-28">
            <span className="text-[8px] font-mono-numbers text-emerald-300/80 font-medium">+5°</span>
            <div className="w-6 h-[1px] bg-emerald-400/60" />
            <div className="w-4" />
            <div className="w-6 h-[1px] bg-emerald-400/60" />
            <span className="text-[8px] font-mono-numbers text-emerald-300/80 font-medium">+5°</span>
          </div>

          {/* Pitch -5° rung (dashed) */}
          <div className="absolute bottom-[68px] flex items-center justify-between w-28">
            <span className="text-[8px] font-mono-numbers text-emerald-300/80 font-medium">-5°</span>
            <div className="w-6 h-[1px] border-b border-dashed border-emerald-400/60" />
            <div className="w-4" />
            <div className="w-6 h-[1px] border-b border-dashed border-emerald-400/60" />
            <span className="text-[8px] font-mono-numbers text-emerald-300/80 font-medium">-5°</span>
          </div>

          {/* Pitch -10° rung (dashed) */}
          <div className="absolute bottom-[32px] flex items-center justify-between w-36">
            <span className="text-[9px] font-mono-numbers text-emerald-300 font-bold tracking-tight">-10°</span>
            <div className="w-8 h-[1.5px] border-b border-dashed border-emerald-400/70" />
            <div className="w-4" />
            <div className="w-8 h-[1.5px] border-b border-dashed border-emerald-400/70" />
            <span className="text-[9px] font-mono-numbers text-emerald-300 font-bold tracking-tight">-10°</span>
          </div>
        </div>

        {/* Center Fixed Aircraft Reticle */}
        <div className="absolute pointer-events-none flex items-center justify-center">
          <div className="w-4 h-4 border border-emerald-400/70 rounded-full" />
          <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
          <div className="absolute -left-3 w-2 h-[1px] bg-emerald-400/70" />
          <div className="absolute -right-3 w-2 h-[1px] bg-emerald-400/70" />
        </div>

        {/* Numerical Pitch & Roll Telemetry Badge */}
        <div className="absolute bottom-12 flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-950/85 backdrop-blur-md border border-emerald-500/30 text-[10px] font-mono-numbers text-emerald-300 shadow-lg">
          <Compass className="w-3 h-3 text-emerald-400 shrink-0" />
          <span>P: {pitch >= 0 ? `+${pitch.toFixed(1)}°` : `${pitch.toFixed(1)}°`}</span>
          <span className="text-slate-600">|</span>
          <span>R: {roll >= 0 ? `+${roll.toFixed(1)}°` : `${roll.toFixed(1)}°`}</span>
          <span className="text-slate-500 font-bold">[{eyeLabel}]</span>
        </div>
      </div>
    );
  };

  // Real-time horizontal shift in pixels based on IPD deviation from 64mm:
  const ipdDeltaMm = ((cameraProperties.ipd || 0.064) - 0.064) * 1000;
  const ipdPixelShift = ipdDeltaMm * 3.0;

  return (
    <div className="absolute inset-0 pointer-events-none z-10 flex">
      {/* Left Eye Half */}
      <div
        className="relative w-1/2 h-full flex items-center justify-center transition-transform duration-75"
        style={{ transform: `translateX(${-ipdPixelShift}px)` }}
      >
        {colorProperties.showAlignmentCrosshairs && (
          <div className="relative w-12 h-12 opacity-40">
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-sky-400" />
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-sky-400" />
            <div className="absolute inset-0 border border-sky-400/50 rounded-full" />
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono-numbers text-sky-400 tracking-wider">
              L - {(cameraProperties.ipd * 1000).toFixed(0)}mm
            </span>
          </div>
        )}
        {renderHorizonGuide('L')}
      </div>

      {/* Center Divider Line */}
      {colorProperties.showCenterDivider && (
        <div
          className="h-full bg-slate-800/80 shadow-[0_0_12px_rgba(0,0,0,0.8)] shrink-0"
          style={{ width: `${colorProperties.dividerWidth}px` }}
        />
      )}

      {/* Right Eye Half */}
      <div
        className="relative w-1/2 h-full flex items-center justify-center transition-transform duration-75"
        style={{ transform: `translateX(${+ipdPixelShift}px)` }}
      >
        {colorProperties.showAlignmentCrosshairs && (
          <div className="relative w-12 h-12 opacity-40">
            <div className="absolute top-1/2 left-0 right-0 h-[1px] bg-sky-400" />
            <div className="absolute left-1/2 top-0 bottom-0 w-[1px] bg-sky-400" />
            <div className="absolute inset-0 border border-sky-400/50 rounded-full" />
            <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-mono-numbers text-sky-400 tracking-wider">
              R - {(cameraProperties.ipd * 1000).toFixed(0)}mm
            </span>
          </div>
        )}
        {renderHorizonGuide('R')}
      </div>

      {/* Corner Quick Controls for Cardboard Viewer (Accessible by thumbs without blocking center nose divider) */}
      <div className="absolute top-3 left-3 sm:left-4 pointer-events-auto flex items-center gap-2 z-20">
        {/* Quick Projection Switcher */}
        <button
          onClick={() => onSelectProjectionMode(projectionMode === 'dome180' ? 'sphere360' : projectionMode === 'sphere360' ? 'curved' : 'dome180')}
          className="min-h-[44px] px-3 flex items-center gap-1.5 bg-slate-950/90 hover:bg-slate-900 backdrop-blur-md border border-white/10 rounded-xl shadow-xl text-xs font-semibold text-amber-300 active:scale-95 cursor-pointer transition-transform"
          title="Cycle VR Mode: 180° Dome, 360° Sphere, or Cinema"
        >
          {projectionMode === 'dome180' ? (
            <>
              <Disc className="w-4 h-4 text-amber-400" />
              <span>180° Dome</span>
            </>
          ) : projectionMode === 'sphere360' ? (
            <>
              <Box className="w-4 h-4 text-indigo-400" />
              <span>360° Sphere</span>
            </>
          ) : (
            <>
              <Tv className="w-4 h-4 text-slate-300" />
              <span>Cinema</span>
            </>
          )}
        </button>

        {/* Gyro Permission Check Button if iOS or sensor permission needed */}
        {typeof DeviceOrientationEvent !== 'undefined' &&
          // @ts-expect-error iOS Safari permission check
          typeof DeviceOrientationEvent.requestPermission === 'function' &&
          !gyroRequested && (
            <button
              onClick={requestGyroPermission}
              className="min-h-[44px] px-3 flex items-center gap-1.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl shadow-xl text-xs active:scale-95 cursor-pointer transition-all animate-pulse"
              title="Allow Motion Sensors for Head Tracking"
            >
              <Compass className="w-4 h-4" />
              <span>Enable Gyro</span>
            </button>
          )}
      </div>

      <div className="absolute top-3 right-3 sm:right-4 pointer-events-auto flex items-center gap-2 z-20">
        {/* Quick IPD Adjustment Button (Opens floating thumb slider) */}
        {onChangeCameraProperties && (
          <button
            onClick={() => setShowIpdSlider((v) => !v)}
            className={`min-h-[44px] px-2.5 flex items-center justify-center gap-1.5 backdrop-blur-md border rounded-xl shadow-xl text-xs font-semibold active:scale-95 cursor-pointer transition-transform ${
              showIpdSlider
                ? 'bg-sky-950/90 text-sky-300 border-sky-500/60'
                : 'bg-slate-950/90 text-slate-300 border-white/10 hover:text-white'
            }`}
            title="Quick IPD Eye Separation Adjustment"
          >
            <Eye className="w-4 h-4 text-sky-400" />
            <span className="font-mono-numbers">{(cameraProperties.ipd * 1000).toFixed(0)}mm</span>
          </button>
        )}

        {/* Visual Horizon Level Guide Toggle Button */}
        {onChangeCameraProperties && (
          <button
            onClick={() => onChangeCameraProperties({ showHorizonGuide: !cameraProperties.showHorizonGuide })}
            className={`min-h-[44px] px-2.5 flex items-center justify-center gap-1.5 backdrop-blur-md border rounded-xl shadow-xl text-xs font-semibold active:scale-95 cursor-pointer transition-transform ${
              cameraProperties.showHorizonGuide
                ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/60'
                : 'bg-slate-950/90 text-slate-300 border-white/10 hover:text-white'
            }`}
            title="Toggle Visual Horizon Level Guide (Pitch Ladder & Roll)"
          >
            <Compass className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Horizon</span>
          </button>
        )}

        {/* Recenter Heading */}
        <button
          onClick={onRecenter}
          className="min-h-[44px] min-w-[44px] px-3 flex items-center justify-center gap-1.5 bg-slate-950/90 hover:bg-slate-900 backdrop-blur-md border border-sky-500/30 rounded-xl shadow-xl text-xs font-semibold text-sky-300 active:scale-95 cursor-pointer transition-transform"
          title="Recenter Camera Forward (Double-tap screen)"
        >
          <RotateCcw className="w-4 h-4 text-sky-400" />
          <span className="hidden xs:inline">Recenter</span>
        </button>

        {/* 1-Tap Gyroscope Hardware Calibrate */}
        {onCalibrateSensors && (
          <button
            onClick={onCalibrateSensors}
            className="min-h-[44px] px-2.5 flex items-center justify-center gap-1.5 bg-slate-950/90 hover:bg-slate-900 backdrop-blur-md border border-emerald-500/40 rounded-xl shadow-xl text-xs font-semibold text-emerald-300 active:scale-95 cursor-pointer transition-transform"
            title="Calibrate Gyroscope & Null Sensor Bias"
          >
            <Crosshair className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Calibrate</span>
          </button>
        )}

        {/* Anti-Drift Mode & Camera Lock Switcher */}
        <button
          onClick={onToggleGyroMode}
          className={`min-h-[44px] px-3 flex items-center justify-center gap-1.5 backdrop-blur-md border rounded-xl shadow-xl text-xs font-semibold active:scale-95 cursor-pointer transition-transform ${
            cameraProperties.lockCamera || cameraProperties.gyroMode === 'camera-locked'
              ? 'bg-indigo-950/90 text-indigo-300 border-indigo-500/50'
              : cameraProperties.gyroMode === 'dual-axis'
              ? 'bg-emerald-950/90 text-emerald-300 border-emerald-500/50'
              : 'bg-slate-950/90 text-sky-300 border-white/10'
          }`}
          title="Cycle Anti-Drift & Camera Lock"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>
            {cameraProperties.lockCamera || cameraProperties.gyroMode === 'camera-locked'
              ? 'Locked'
              : cameraProperties.gyroMode === 'dual-axis'
              ? 'Anti-Drift'
              : 'Free 360'}
          </span>
        </button>

        {onToggleHideAllUi && (
          <button
            onClick={onToggleHideAllUi}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center bg-slate-950/90 hover:bg-slate-900 border border-rose-500/30 rounded-xl shadow-xl text-rose-300 active:scale-95 cursor-pointer transition-transform"
            title="Hide UI (Zero UI Mode)"
          >
            <EyeOff className="w-4 h-4 text-rose-400" />
          </button>
        )}
      </div>

      {/* Floating Quick IPD Slider Overlay */}
      {showIpdSlider && onChangeCameraProperties && (
        <div className="absolute top-16 right-3 sm:right-4 z-30 pointer-events-auto bg-slate-950/95 backdrop-blur-xl border border-sky-500/40 rounded-2xl shadow-2xl p-3 min-w-[260px] animate-in fade-in duration-150">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-sky-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-sky-400" />
              IPD Eye Separation
            </span>
            <button
              onClick={() => setShowIpdSlider(false)}
              className="text-slate-400 hover:text-white text-xs p-1 cursor-pointer"
            >
              ✕
            </button>
          </div>
          <div className="flex items-center justify-between text-xs font-mono-numbers text-sky-400 mb-2 font-bold">
            <span>{(cameraProperties.ipd * 1000).toFixed(1)} mm</span>
            <span className="text-[10px] text-slate-400 font-normal">
              {cameraProperties.ipd * 1000 < 58 ? 'Narrow' : cameraProperties.ipd * 1000 > 68 ? 'Wide' : 'Standard (64mm)'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const next = Math.max(0.045, cameraProperties.ipd - 0.001);
                onChangeCameraProperties({ ipd: next });
              }}
              className="w-9 h-9 flex items-center justify-center bg-slate-900 hover:bg-slate-800 rounded-lg text-white font-bold text-sm border border-white/10 active:scale-95 cursor-pointer"
              title="Decrease IPD (-1mm)"
            >
              -
            </button>
            <input
              type="range"
              min="45"
              max="80"
              step="0.5"
              value={cameraProperties.ipd * 1000}
              onChange={(e) => {
                onChangeCameraProperties({ ipd: parseFloat(e.target.value) / 1000 });
              }}
              className="flex-1 accent-sky-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
            <button
              onClick={() => {
                const next = Math.min(0.080, cameraProperties.ipd + 0.001);
                onChangeCameraProperties({ ipd: next });
              }}
              className="w-9 h-9 flex items-center justify-center bg-slate-900 hover:bg-slate-800 rounded-lg text-white font-bold text-sm border border-white/10 active:scale-95 cursor-pointer"
              title="Increase IPD (+1mm)"
            >
              +
            </button>
          </div>
          {/* Quick Presets */}
          <div className="grid grid-cols-3 gap-1.5 mt-3 pt-2 border-t border-white/10 text-[11px]">
            <button
              onClick={() => onChangeCameraProperties({ ipd: 0.058 })}
              className="py-1 px-1.5 bg-slate-900 hover:bg-slate-800 rounded text-slate-300 font-mono-numbers cursor-pointer text-center"
            >
              58mm
            </button>
            <button
              onClick={() => onChangeCameraProperties({ ipd: 0.064 })}
              className="py-1 px-1.5 bg-slate-900 hover:bg-slate-800 rounded text-sky-300 font-bold font-mono-numbers border border-sky-500/30 cursor-pointer text-center"
            >
              64mm
            </button>
            <button
              onClick={() => onChangeCameraProperties({ ipd: 0.070 })}
              className="py-1 px-1.5 bg-slate-900 hover:bg-slate-800 rounded text-slate-300 font-mono-numbers cursor-pointer text-center"
            >
              70mm
            </button>
          </div>
        </div>
      )}

      {/* Fullscreen Notice Banner if browser address bar is still showing */}
      {!isFullscreen && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 pointer-events-auto z-20">
          <button
            onClick={onToggleFullscreen}
            className="min-h-[46px] flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm rounded-full shadow-2xl shadow-emerald-500/30 transition-transform active:scale-95 cursor-pointer animate-pulse"
          >
            <Maximize2 className="w-4 h-4" />
            <span>Tap for Fullscreen (Hide Browser URL Bar)</span>
          </button>
        </div>
      )}

      {/* Double tap hint at bottom safe zone */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 pointer-events-none opacity-60 text-[10px] font-mono-numbers text-slate-400 bg-black/70 backdrop-blur-xs px-3.5 py-1.5 rounded-full border border-white/5 z-10">
        Double-tap screen anytime to Recenter
      </div>
    </div>
  );
};
