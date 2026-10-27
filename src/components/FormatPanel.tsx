import React from 'react';
import { StereoMode, ProjectionMode, CameraProperties } from '../types/vr';
import { Box, RefreshCw, Disc, Monitor, Tv, Eye, Maximize2 } from 'lucide-react';

interface FormatPanelProps {
  stereoMode: StereoMode;
  onStereoModeChange: (mode: StereoMode) => void;
  projectionMode: ProjectionMode;
  onProjectionModeChange: (mode: ProjectionMode) => void;
  cameraProperties: CameraProperties;
  onCameraChange: (props: Partial<CameraProperties>) => void;
  onClose: () => void;
}

export const FormatPanel: React.FC<FormatPanelProps> = ({
  stereoMode,
  onStereoModeChange,
  projectionMode,
  onProjectionModeChange,
  cameraProperties,
  onCameraChange,
  onClose,
}) => {
  const stereoOptions: { id: StereoMode; label: string; desc: string }[] = [
    { id: 'sbs', label: 'Side-by-Side (SBS)', desc: 'Half or Full SBS (Left / Right split)' },
    { id: 'top-bottom', label: 'Over-Under (TB)', desc: 'Top / Bottom stereo split' },
    { id: 'mono', label: '2D Monoscopic', desc: 'Standard non-3D single video feed' },
    { id: 'anaglyph', label: 'Red-Cyan Anaglyph', desc: 'Synthesizes stereoscopic Dubois matrix' },
  ];

  const projectionOptions: { id: ProjectionMode; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'fill',
      label: 'Fullscreen Fill',
      icon: <Maximize2 className="w-4 h-4 text-emerald-400" />,
      desc: 'Edge-to-edge direct VR fill (zero black borders)',
    },
    {
      id: 'curved',
      label: 'Curved Cinema',
      icon: <Tv className="w-4 h-4 text-sky-400" />,
      desc: 'IMAX-style wrapped virtual screen',
    },
    {
      id: 'flat',
      label: 'Flat Screen',
      icon: <Monitor className="w-4 h-4 text-slate-400" />,
      desc: 'Traditional cinema canvas in 3D room',
    },
    {
      id: 'dome180',
      label: 'VR 180° Dome',
      icon: <Disc className="w-4 h-4 text-amber-400" />,
      desc: 'Hemispherical 180° stereoscopic field',
    },
    {
      id: 'sphere360',
      label: 'VR 360° Sphere',
      icon: <Box className="w-4 h-4 text-indigo-400" />,
      desc: 'Full 360° equirectangular surround',
    },
  ];


  return (
    <div className="w-full p-4 sm:p-5 text-slate-200 pb-28 space-y-4">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Eye className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-semibold text-white tracking-wide">3D Format & VR Projection</h2>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white text-sm px-1.5 cursor-pointer"
        >
          ✕
        </button>
      </div>

      {/* Stereoscopic Encoding */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-400 mb-2">
          Stereoscopic Input Format
        </label>
        <div className="space-y-1.5">
          {stereoOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => onStereoModeChange(opt.id)}
              className={`w-full min-h-[48px] text-left p-3 rounded-xl border text-xs transition-colors cursor-pointer flex items-center justify-between active:scale-[0.99] ${
                stereoMode === opt.id
                  ? 'bg-sky-500/15 border-sky-500/40 text-white'
                  : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-slate-900'
              }`}
            >
              <div>
                <div className="font-medium">{opt.label}</div>
                <div className="text-[11px] text-slate-400">{opt.desc}</div>
              </div>
              {stereoMode === opt.id && (
                <div className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_8px_#38bdf8]" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Eye Swap Switcher */}
      <div className="mb-5 p-3 bg-slate-900/80 rounded-xl border border-white/5 flex items-center justify-between gap-2">
        <div>
          <span className="text-xs font-medium text-slate-200 block">Eye Order (Swap L/R)</span>
          <span className="text-[11px] text-slate-400">
            {cameraProperties.eyeSwap ? 'Right Eye / Left Eye (Inverted)' : 'Left Eye / Right Eye (Normal)'}
          </span>
        </div>
        <button
          onClick={() => onCameraChange({ eyeSwap: !cameraProperties.eyeSwap })}
          className={`min-h-[44px] flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors cursor-pointer active:scale-95 shrink-0 ${
            cameraProperties.eyeSwap
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
          }`}
          title="Swap Left and Right stereoscopic feeds (S)"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Swap Eyes</span>
        </button>
      </div>

      {/* Projection Mode */}
      <div className="mb-4">
        <label className="block text-xs font-medium text-slate-400 mb-2">
          Virtual Projection Geometry
        </label>
        <div className="grid grid-cols-2 gap-2">
          {projectionOptions.map((proj) => (
            <button
              key={proj.id}
              onClick={() => onProjectionModeChange(proj.id)}
              className={`min-h-[52px] text-left p-3 rounded-xl border text-xs transition-colors cursor-pointer flex flex-col justify-center gap-1 active:scale-[0.99] ${
                projectionMode === proj.id
                  ? 'bg-sky-500/15 border-sky-500/40 text-white'
                  : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {proj.icon}
                <span className="font-semibold">{proj.label}</span>
              </div>
              <p className="text-[10px] text-slate-500 line-clamp-1">{proj.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Screen Zoom & Scale (Applies to Flat, Curved & Fill) */}
      {(projectionMode === 'flat' || projectionMode === 'curved' || projectionMode === 'fill') && (
        <div className="mb-4 pt-3 border-t border-white/5 text-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-300 font-medium">Virtual Screen Zoom / Fill Scale</span>
            <span className="font-mono-numbers text-sky-400">
              {((cameraProperties.screenScale || 1.0) * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0.6"
            max="2.5"
            step="0.05"
            value={cameraProperties.screenScale || 1.0}
            onChange={(e) => onCameraChange({ screenScale: parseFloat(e.target.value) })}
            className="w-full"
          />
          <div className="grid grid-cols-4 gap-1.5 mt-2">
            {[
              { label: 'Normal', scale: 1.0 },
              { label: 'Large', scale: 1.3 },
              { label: 'IMAX', scale: 1.6 },
              { label: 'Fill View', scale: 2.0 },
            ].map((btn) => (
              <button
                key={btn.label}
                onClick={() => onCameraChange({ screenScale: btn.scale })}
                className="py-1 bg-slate-900 hover:bg-slate-800 text-[10px] rounded border border-white/5 text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Curvature adjustment (when Curved Screen is active) */}
      {projectionMode === 'curved' && (
        <div className="mb-4 pt-3 border-t border-white/5 text-xs">
          <div className="flex justify-between items-center mb-1">
            <span className="text-slate-300 font-medium">Screen Curve Arc</span>
            <span className="font-mono-numbers text-sky-400">{cameraProperties.curvature}°</span>
          </div>
          <input
            type="range"
            min="30"
            max="180"
            step="5"
            value={cameraProperties.curvature}
            onChange={(e) => onCameraChange({ curvature: parseInt(e.target.value, 10) })}
            className="w-full"
          />
        </div>
      )}


      {/* Screen Aspect Ratio Overrides (Flat or Curved) */}
      {(projectionMode === 'flat' || projectionMode === 'curved') && (
        <div className="pt-3 border-t border-white/5 text-xs">
          <label className="block font-medium text-slate-400 mb-2">Aspect Ratio Override</label>
          <div className="grid grid-cols-4 gap-1.5 font-mono-numbers text-[11px]">
            <button
              onClick={() => onCameraChange({ screenWidth: 6.4, screenHeight: 3.6 })}
              className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 rounded border border-white/5 text-center text-slate-300 transition-colors cursor-pointer"
            >
              16:9
            </button>
            <button
              onClick={() => onCameraChange({ screenWidth: 7.2, screenHeight: 3.0 })}
              className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 rounded border border-white/5 text-center text-slate-300 transition-colors cursor-pointer"
            >
              21:9
            </button>
            <button
              onClick={() => onCameraChange({ screenWidth: 4.8, screenHeight: 3.6 })}
              className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 rounded border border-white/5 text-center text-slate-300 transition-colors cursor-pointer"
            >
              4:3
            </button>
            <button
              onClick={() => onCameraChange({ screenWidth: 4.0, screenHeight: 4.0 })}
              className="py-1.5 px-2 bg-slate-900 hover:bg-slate-800 rounded border border-white/5 text-center text-slate-300 transition-colors cursor-pointer"
            >
              1:1
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
