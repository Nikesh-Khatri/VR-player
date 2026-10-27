import React from 'react';
import { OutputMode, ProjectionMode } from '../types/vr';
import {
  Maximize2,
  Minimize2,
  Eye,
  EyeOff,
  Glasses,
  SplitSquareVertical,
  FolderOpen,
  RotateCcw,
  Smartphone,
  Disc,
  Box,
  Tv,
  Bug,
} from 'lucide-react';

interface HeaderProps {
  outputMode: OutputMode;
  onSelectOutputMode: (mode: OutputMode) => void;
  projectionMode: ProjectionMode;
  onSelectProjectionMode: (mode: ProjectionMode) => void;
  onOpenMediaModal: () => void;
  onOpenInstallModal: () => void;
  onRecenter: () => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  visible: boolean;
  onToggleHud?: () => void;
  onToggleHideAllUi?: () => void;
  isDebugMode?: boolean;
  onToggleDebug?: () => void;
  hasSelectedSource?: boolean;
  mediaTitle?: string;
}

export const Header: React.FC<HeaderProps> = ({
  outputMode,
  onSelectOutputMode,
  projectionMode,
  onSelectProjectionMode,
  onOpenMediaModal,
  onOpenInstallModal,
  onRecenter,
  isFullscreen,
  onToggleFullscreen,
  visible,
  onToggleHud,
  onToggleHideAllUi,
  isDebugMode,
  onToggleDebug,
  hasSelectedSource = true,
  mediaTitle,
}) => {
  return (
    <header
      className={`absolute top-0 left-0 right-0 z-30 transition-all duration-300 pointer-events-auto ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-4 pointer-events-none'
      }`}
    >
      <div className="flex items-center justify-between px-3 sm:px-6 py-2.5 sm:py-3 bg-gradient-to-b from-black/95 via-black/80 to-transparent backdrop-blur-sm border-b border-white/5 gap-2">
        {/* Zone 1: Single text wordmark */}
        <div className="flex items-center gap-2 shrink-0">
          <span className="font-display text-lg sm:text-xl font-bold tracking-wider text-white">
            Omni<span className="text-sky-400">VR</span>
          </span>
          {mediaTitle ? (
            <span className="hidden xl:inline text-xs text-slate-400 font-mono-numbers truncate max-w-[180px]" title={mediaTitle}>
              · {mediaTitle}
            </span>
          ) : (
            <span className="hidden md:inline text-[11px] text-amber-300/90 font-mono-numbers px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
              Standby
            </span>
          )}
        </div>

        {/* Zone 2: Immersion Switcher */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* Quick True VR Immersion Switcher */}
          <div className="flex items-center bg-slate-900/90 p-0.5 sm:p-1 rounded-xl border border-sky-500/20 shadow-inner">
            <button
              onClick={() => onSelectProjectionMode('dome180')}
              className={`flex items-center justify-center gap-1 min-h-[40px] px-2.5 sm:px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                projectionMode === 'dome180'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="True VR 180° Stereoscopic Dome"
            >
              <Disc className="w-3.5 h-3.5" />
              <span>180°</span>
            </button>

            <button
              onClick={() => onSelectProjectionMode('sphere360')}
              className={`flex items-center justify-center gap-1 min-h-[40px] px-2.5 sm:px-3 text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                projectionMode === 'sphere360'
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white'
              }`}
              title="True VR 360° Panoramic Surround Sphere"
            >
              <Box className="w-3.5 h-3.5" />
              <span>360°</span>
            </button>

            <button
              onClick={() => onSelectProjectionMode('curved')}
              className={`flex items-center justify-center gap-1 min-h-[40px] px-2 sm:px-3 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                projectionMode === 'curved' || projectionMode === 'flat' || projectionMode === 'fill'
                  ? 'bg-slate-800 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Virtual Cinema Theater Screen"
            >
              <Tv className="w-3.5 h-3.5" />
              <span className="hidden xs:inline sm:inline">Cinema</span>
            </button>
          </div>

          {/* Viewing Mode (Split, 2D) */}
          <nav className="hidden md:flex items-center bg-slate-900/80 p-1 rounded-xl border border-white/10 shadow-inner">
            <button
              onClick={() => onSelectOutputMode('split')}
              className={`flex items-center gap-1.5 min-h-[40px] px-3 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                outputMode === 'split'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Cardboard / VR Headset Split View (C)"
            >
              <SplitSquareVertical className="w-3.5 h-3.5" />
              <span>VR Split</span>
            </button>

            <button
              onClick={() => onSelectOutputMode('single-left')}
              className={`flex items-center gap-1.5 min-h-[40px] px-3 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                outputMode === 'single-left' || outputMode === 'single-right'
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Monoscopic 2D Screen Preview"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>2D</span>
            </button>

            <button
              onClick={() => onSelectOutputMode('anaglyph')}
              className={`flex items-center gap-1.5 min-h-[40px] px-3 text-xs font-medium rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                outputMode === 'anaglyph'
                  ? 'bg-gradient-to-r from-rose-500 to-cyan-500 text-white shadow-sm font-semibold'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="Anaglyph 3D Mode (Red-Cyan Glasses)"
            >
              <Glasses className="w-3.5 h-3.5" />
              <span>Anaglyph</span>
            </button>
          </nav>
        </div>

        {/* Zone 3: Primary Actions with >= 44px hitboxes */}
        <div className="flex items-center gap-1 sm:gap-2 shrink-0">
          <button
            onClick={onOpenMediaModal}
            className={`min-h-[44px] min-w-[44px] flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl border transition-all cursor-pointer whitespace-nowrap shadow-sm active:scale-95 ${
              !hasSelectedSource
                ? 'bg-sky-500 hover:bg-sky-400 text-slate-950 border-sky-400 animate-pulse font-bold'
                : 'text-slate-200 bg-slate-800/90 hover:bg-slate-750 hover:text-white border-white/10'
            }`}
            title="Select video file, URL, or sample"
          >
            <FolderOpen className={`w-4 h-4 ${!hasSelectedSource ? 'text-slate-950' : 'text-sky-400'}`} />
            <span className="hidden sm:inline">{!hasSelectedSource ? 'Select Source' : 'Source'}</span>
          </button>

          <button
            onClick={onRecenter}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 active:scale-95 rounded-xl border border-white/10 transition-colors cursor-pointer"
            title="Recenter Camera (R or Double-tap)"
          >
            <RotateCcw className="w-4 h-4 text-sky-400" />
          </button>

          <button
            onClick={onToggleFullscreen}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center p-2.5 text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-750 active:scale-95 rounded-xl border border-white/10 transition-colors cursor-pointer"
            title={isFullscreen ? 'Exit Fullscreen (F)' : 'Enter Fullscreen (F)'}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onOpenInstallModal}
            className="hidden sm:flex min-h-[44px] items-center gap-1.5 px-3 py-2 text-xs font-semibold text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/70 border border-emerald-500/40 rounded-xl transition-colors cursor-pointer whitespace-nowrap shadow-sm shadow-emerald-900/30"
            title="Install as Android App"
          >
            <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden md:inline">Android App</span>
          </button>

          {onToggleDebug && (
            <button
              onClick={onToggleDebug}
              className={`hidden sm:flex min-h-[44px] min-w-[44px] items-center justify-center p-2.5 rounded-xl border transition-colors cursor-pointer ${
                isDebugMode
                  ? 'text-amber-300 bg-amber-500/20 border-amber-400'
                  : 'text-slate-300 hover:text-white bg-slate-800/80 hover:bg-slate-700 border-white/10'
              }`}
              title="VR Sensor Diagnostics & Debug (D)"
            >
              <Bug className="w-4 h-4" />
            </button>
          )}

          {(onToggleHideAllUi || onToggleHud) && (
            <button
              onClick={onToggleHideAllUi || onToggleHud}
              className="hidden sm:flex min-h-[44px] items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 transition-all cursor-pointer shadow-sm"
              title="Hide UI (Zero UI Mode)"
            >
              <EyeOff className="w-3.5 h-3.5 text-rose-400" />
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
