import React from 'react';
import { CameraProperties } from '../types/vr';
import {
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Sliders,
  Eye,
  EyeOff,
  Sun,
  Repeat,
  Gauge,
  Bug,
  Lock,
  ShieldCheck,
  Crosshair,
} from 'lucide-react';

interface ControlsBarProps {
  isPlaying: boolean;
  onTogglePlay: () => void;
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
  volume: number;
  isMuted: boolean;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  playbackRate: number;
  onPlaybackRateChange: (rate: number) => void;
  isLooping: boolean;
  onToggleLoop: () => void;
  activePanel: 'optics' | 'format' | 'display' | null;
  onTogglePanel: (panel: 'optics' | 'format' | 'display') => void;
  isProcedural: boolean;
  visible: boolean;
  onToggleHud?: () => void;
  onToggleHideAllUi?: () => void;
  isDebugMode?: boolean;
  onToggleDebug?: () => void;
  hasSelectedSource?: boolean;
  onRecenter?: () => void;
  onCalibrateSensors?: () => void;
  cameraProperties?: CameraProperties;
  onToggleCameraLock?: () => void;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  isPlaying,
  onTogglePlay,
  currentTime,
  duration,
  onSeek,
  volume,
  isMuted,
  onVolumeChange,
  onToggleMute,
  playbackRate,
  onPlaybackRateChange,
  isLooping,
  onToggleLoop,
  activePanel,
  onTogglePanel,
  isProcedural,
  visible,
  onToggleHud,
  onToggleHideAllUi,
  isDebugMode,
  onToggleDebug,
  hasSelectedSource = true,
  onRecenter,
  onCalibrateSensors,
  cameraProperties,
  onToggleCameraLock,
}) => {
  const formatTime = (secs: number) => {
    if (isNaN(secs) || secs < 0) return '00:00';
    const h = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = Math.floor(secs % 60);
    if (h > 0) {
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const speedOptions = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];
  const nextSpeed = () => {
    const currentIndex = speedOptions.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % speedOptions.length;
    onPlaybackRateChange(speedOptions[nextIndex]);
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  const handleScrubberEvent = (clientX: number, currentTarget: HTMLElement) => {
    if (!hasSelectedSource || isProcedural || duration <= 0) return;
    const rect = currentTarget.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    onSeek(pos * duration);
  };

  return (
    <div
      className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-300 pointer-events-auto ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
      }`}
    >
      <div className="bg-gradient-to-t from-black/95 via-black/85 to-transparent backdrop-blur-md px-3 sm:px-6 pt-4 sm:pt-6 pb-3 sm:pb-4 border-t border-white/5 space-y-2">
        {/* Scrubber Bar with >= 44px touch hit area */}
        <div className="flex items-center gap-2 sm:gap-3">
          <span className="font-mono-numbers text-[10px] sm:text-[11px] text-slate-400 w-10 sm:w-12 text-right tabular-nums shrink-0">
            {!hasSelectedSource ? '00:00' : formatTime(currentTime)}
          </span>

          <div
            className="relative flex-1 h-11 flex items-center cursor-pointer select-none touch-none group"
            onClick={(e) => handleScrubberEvent(e.clientX, e.currentTarget)}
            onTouchStart={(e) => {
              if (e.touches.length > 0) {
                handleScrubberEvent(e.touches[0].clientX, e.currentTarget);
              }
            }}
            onTouchMove={(e) => {
              if (e.touches.length > 0) {
                handleScrubberEvent(e.touches[0].clientX, e.currentTarget);
              }
            }}
          >
            {!hasSelectedSource ? (
              <div
                className="h-2 w-full bg-slate-800/80 hover:bg-slate-750 rounded-full overflow-hidden flex items-center justify-center transition-colors"
                onClick={onTogglePlay}
                title="Select a video source to begin"
              >
                <span className="text-[10px] text-slate-500 font-sans tracking-wide">
                  Standby — Tap Play or Source to begin
                </span>
              </div>
            ) : isProcedural ? (
              <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden relative">
                <div className="absolute inset-0 bg-gradient-to-r from-sky-500/20 via-sky-400/60 to-sky-500/20 animate-pulse" />
              </div>
            ) : (
              <div className="relative h-2 w-full bg-white/20 rounded-full overflow-hidden">
                <div
                  className="h-full bg-sky-400 group-hover:bg-sky-300 transition-all rounded-full relative"
                  style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                >
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md -mr-1.5 opacity-90 group-hover:scale-110 transition-transform" />
                </div>
              </div>
            )}
          </div>

          <span className="font-mono-numbers text-[10px] sm:text-[11px] text-slate-400 w-10 sm:w-12 tabular-nums shrink-0">
            {!hasSelectedSource ? '--:--' : isProcedural ? 'LIVE' : formatTime(duration)}
          </span>
        </div>

        {/* MOBILE THUMB ACTION BAR (Visible on screens < md) */}
        <div className="flex md:hidden items-center justify-between gap-1.5 pt-0.5">
          {/* Play / Pause button */}
          <button
            onClick={onTogglePlay}
            className={`min-h-[46px] min-w-[46px] flex items-center justify-center text-white active:scale-95 rounded-xl transition-transform cursor-pointer shadow-md shrink-0 ${
              !hasSelectedSource
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                : 'bg-sky-500 hover:bg-sky-400'
            }`}
            title={!hasSelectedSource ? 'Select Source' : isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <Pause className="w-5 h-5 fill-current" /> : <Play className="w-5 h-5 fill-current ml-0.5" />}
          </button>

          {!isProcedural && (
            <>
              {/* Rewind 10s */}
              <button
                onClick={() => onSeek(Math.max(0, currentTime - 10))}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-300 bg-slate-900/80 border border-white/5 active:scale-95 rounded-xl cursor-pointer"
                title="Rewind 10s"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Forward 10s */}
              <button
                onClick={() => onSeek(Math.min(duration, currentTime + 10))}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-300 bg-slate-900/80 border border-white/5 active:scale-95 rounded-xl cursor-pointer"
                title="Forward 10s"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </>
          )}

          {/* Quick Recenter */}
          {onRecenter && (
            <button
              onClick={onRecenter}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-sky-400 bg-sky-950/70 border border-sky-500/30 active:scale-95 rounded-xl cursor-pointer"
              title="Recenter Camera to Center Horizon"
            >
              <RotateCcw className="w-4 h-4 text-sky-400" />
            </button>
          )}

          {/* Quick Gyro Calibrate */}
          {onCalibrateSensors && (
            <button
              onClick={onCalibrateSensors}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center text-emerald-400 bg-emerald-950/70 border border-emerald-500/30 active:scale-95 rounded-xl cursor-pointer"
              title="Calibrate Gyroscope & Null Sensor Bias"
            >
              <Crosshair className="w-4 h-4 text-emerald-400" />
            </button>
          )}

          {/* Anti-Drift / Camera Lock quick button */}
          {onToggleCameraLock && (
            <button
              onClick={onToggleCameraLock}
              className={`min-h-[44px] px-2.5 flex items-center justify-center gap-1 rounded-xl text-xs font-semibold border active:scale-95 cursor-pointer shrink-0 ${
                cameraProperties?.lockCamera
                  ? 'bg-indigo-500/30 text-indigo-300 border-indigo-500/50'
                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
              }`}
              title={cameraProperties?.lockCamera ? 'Camera Locked to Screen' : 'Anti-Drift Active'}
            >
              {cameraProperties?.lockCamera ? (
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
              ) : (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              )}
              <span className="text-[11px]">{cameraProperties?.lockCamera ? 'Locked' : 'Anti-Drift'}</span>
            </button>
          )}

          {/* Mobile Settings Sheet Trigger */}
          <button
            onClick={() => onTogglePanel(activePanel || 'optics')}
            className={`min-h-[44px] px-3 flex items-center justify-center gap-1.5 rounded-xl text-xs font-medium border active:scale-95 cursor-pointer shrink-0 ${
              activePanel !== null
                ? 'bg-sky-500/25 text-sky-300 border-sky-500/50'
                : 'bg-slate-900/80 text-slate-200 border-white/10'
            }`}
            title="Open VR & Optics Settings Sheet"
          >
            <Sliders className="w-4 h-4 text-sky-400" />
            <span className="text-[11px]">Settings</span>
          </button>
        </div>

        {/* DESKTOP PLAYBACK CONTROLS & SETTINGS (Visible on screens >= md) */}
        <div className="hidden md:flex items-center justify-between">
          {/* Left: Playback buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={onTogglePlay}
              className={`p-2.5 text-white active:scale-95 rounded-xl transition-transform cursor-pointer shadow-md ${
                !hasSelectedSource
                  ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold'
                  : 'bg-sky-500 hover:bg-sky-400'
              }`}
              title={!hasSelectedSource ? 'Select Source to Play' : isPlaying ? 'Pause (Space)' : 'Play (Space)'}
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
            </button>

            {!isProcedural && (
              <>
                <button
                  onClick={() => onSeek(Math.max(0, currentTime - 10))}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/5"
                  title="Rewind 10s (Left Arrow)"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onSeek(Math.min(duration, currentTime + 10))}
                  className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/5"
                  title="Forward 10s (Right Arrow)"
                >
                  <RotateCw className="w-4 h-4" />
                </button>
              </>
            )}

            {/* Volume Control */}
            <div className="flex items-center gap-2 ml-2 group">
              <button
                onClick={onToggleMute}
                className="min-h-[40px] min-w-[40px] flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-white/5"
                title={isMuted ? 'Unmute (M)' : 'Mute (M)'}
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-16 h-1 cursor-pointer"
              />
            </div>
          </div>

          {/* Right: Settings panel tabs */}
          <div className="flex items-center gap-1.5">
            {/* Speed toggle */}
            {!isProcedural && (
              <button
                onClick={nextSpeed}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 rounded-lg border border-white/5 transition-colors cursor-pointer font-mono-numbers"
                title="Playback Speed"
              >
                <Gauge className="w-3.5 h-3.5 text-sky-400" />
                <span>{playbackRate}x</span>
              </button>
            )}

            {/* Loop Toggle */}
            <button
              onClick={onToggleLoop}
              className={`p-2 rounded-lg border transition-colors cursor-pointer ${
                isLooping
                  ? 'bg-sky-500/20 text-sky-400 border-sky-500/40'
                  : 'text-slate-400 hover:text-white border-transparent'
              }`}
              title="Toggle Loop"
            >
              <Repeat className="w-4 h-4" />
            </button>

            <span className="h-4 w-[1px] bg-white/10 mx-1" />

            {/* Quick Gyro Calibrate */}
            {onCalibrateSensors && (
              <button
                onClick={onCalibrateSensors}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border bg-slate-900/80 text-emerald-300 border-emerald-500/30 hover:bg-emerald-950/40"
                title="Calibrate Gyroscope & Null Sensor Bias"
              >
                <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden xl:inline">Calibrate Gyro</span>
              </button>
            )}

            {/* Optics & Camera Properties */}
            <button
              onClick={() => onTogglePanel('optics')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                activePanel === 'optics'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white border-white/10 hover:bg-slate-850'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-sky-400" />
              <span>Camera & Optics</span>
            </button>

            {/* 3D & VR Formats */}
            <button
              onClick={() => onTogglePanel('format')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                activePanel === 'format'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white border-white/10 hover:bg-slate-850'
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-emerald-400" />
              <span>Format & 3D</span>
            </button>

            {/* Display & Screen */}
            <button
              onClick={() => onTogglePanel('display')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                activePanel === 'display'
                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white border-white/10 hover:bg-slate-850'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Display</span>
            </button>

            {/* Camera Lock & Anti-Drift Quick Button */}
            {onToggleCameraLock && (
              <button
                onClick={onToggleCameraLock}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                  cameraProperties?.lockCamera
                    ? 'bg-indigo-500/25 text-indigo-300 border-indigo-500/50 shadow-sm'
                    : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30 hover:bg-emerald-500/25'
                }`}
                title={
                  cameraProperties?.lockCamera
                    ? 'Camera is Locked Forward to Screen (Press L to Unlock)'
                    : 'Dual-Axis Anti-Drift Active: Roll Horizon Locked, H+V Head Tracking (Press L to Lock Camera)'
                }
              >
                {cameraProperties?.lockCamera ? (
                  <Lock className="w-3.5 h-3.5 text-indigo-400" />
                ) : (
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>{cameraProperties?.lockCamera ? 'Camera Locked' : 'Anti-Drift'}</span>
              </button>
            )}

            {/* Recenter Heading Button */}
            {onRecenter && (
              <button
                onClick={onRecenter}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-sky-300 bg-sky-950/60 hover:bg-sky-900/80 border border-sky-500/30 transition-colors cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                title="Recenter Camera View to Center Horizon (Press R or Double-Tap)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-sky-400" />
                <span>Recenter</span>
              </button>
            )}

            {/* Debug & Telemetry HUD */}
            {onToggleDebug && (
              <button
                onClick={onToggleDebug}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                  isDebugMode
                    ? 'bg-amber-500/25 text-amber-300 border-amber-500/50'
                    : 'bg-slate-900/80 text-slate-300 hover:text-white border-white/10 hover:bg-slate-850'
                }`}
                title="Toggle VR Diagnostics & Sensor Debug HUD (D)"
              >
                <Bug className="w-3.5 h-3.5 text-amber-400" />
                <span>Debug</span>
              </button>
            )}

            {/* Hide Everything / Pure Cinema Mode button */}
            {(onToggleHideAllUi || onToggleHud) && (
              <button
                onClick={onToggleHideAllUi || onToggleHud}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-rose-300 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 transition-all cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98]"
                title="Hide Everything (Zero UI Mode) • Press H or Tap Screen"
              >
                <EyeOff className="w-3.5 h-3.5 text-rose-400" />
                <span className="text-[11px]">Hide Everything</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
