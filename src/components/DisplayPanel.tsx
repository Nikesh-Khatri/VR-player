import React from 'react';
import { VideoColorProperties, EnvironmentTheme, AnaglyphType } from '../types/vr';
import { DEFAULT_COLOR_PROPERTIES, ENVIRONMENT_PRESETS } from '../constants/presets';
import { Sun, Sparkles, RotateCcw, Volume2, Waves, Theater, Box } from 'lucide-react';

interface DisplayPanelProps {
  colorProperties: VideoColorProperties;
  onChange: (props: Partial<VideoColorProperties>) => void;
  onClose: () => void;
}

export const DisplayPanel: React.FC<DisplayPanelProps> = ({
  colorProperties,
  onChange,
  onClose,
}) => {
  const handleReset = () => {
    onChange(DEFAULT_COLOR_PROPERTIES);
  };

  const anaglyphModes: { id: AnaglyphType; name: string; desc: string }[] = [
    { id: 'dubois', name: 'Dubois (Red-Cyan)', desc: 'Least ghosting & balanced color' },
    { id: 'colorcode', name: 'ColorCode 3D', desc: 'Amber / Dark Blue lenses' },
    { id: 'green-magenta', name: 'Green - Magenta', desc: 'TrioViz 3D filter glasses' },
    { id: 'monochrome', name: 'Monochrome High-Disparity', desc: 'High luminance separation' },
  ];

  return (
    <div className="w-full p-4 sm:p-5 text-slate-200 pb-28 space-y-4">
      <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Sun className="w-4 h-4 text-sky-400" />
          <h2 className="text-sm font-semibold text-white tracking-wide">Environment & Ambience</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="Reset to default display"
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

      <div className="space-y-4 text-xs">
        {/* Virtual 3D Theater Environment */}
        <div>
          <label className="block text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
            <Theater className="w-3.5 h-3.5 text-sky-400" />
            <span>Virtual Environment</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {ENVIRONMENT_PRESETS.map((env) => (
              <button
                key={env.id}
                onClick={() => onChange({ environment: env.id })}
                className={`min-h-[48px] text-left p-2.5 rounded-xl border transition-all cursor-pointer active:scale-95 flex flex-col justify-center ${
                  colorProperties.environment === env.id
                    ? 'bg-sky-500/20 border-sky-400 text-white font-medium shadow-sm'
                    : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="font-semibold text-slate-200">{env.name}</div>
                <div className="text-[10px] text-slate-400 line-clamp-1">{env.description}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Anaglyph 3D Flavor */}
        <div>
          <label className="block text-slate-300 font-medium mb-1.5 flex items-center gap-1.5">
            <Box className="w-3.5 h-3.5 text-rose-400" />
            <span>Anaglyph Color Palette</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {anaglyphModes.map((ana) => (
              <button
                key={ana.id}
                onClick={() => onChange({ anaglyphType: ana.id })}
                className={`min-h-[46px] text-left p-2.5 rounded-xl border transition-all cursor-pointer active:scale-95 flex flex-col justify-center ${
                  colorProperties.anaglyphType === ana.id
                    ? 'bg-rose-500/20 border-rose-400 text-white font-medium'
                    : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-slate-800'
                }`}
              >
                <div className="font-semibold text-slate-200">{ana.name}</div>
                <div className="text-[10px] text-slate-400 line-clamp-1">{ana.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Virtual Cinema Acoustics (Bass Boost & Gain) */}
        <div className="pt-3 border-t border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-medium flex items-center gap-1.5">
              <Waves className="w-3.5 h-3.5 text-indigo-400" />
              <span>Cinema Bass Acoustic Rumble</span>
            </span>
            <button
              onClick={() => onChange({ bassEnhance: !colorProperties.bassEnhance })}
              className={`min-h-[40px] px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors cursor-pointer active:scale-95 ${
                colorProperties.bassEnhance
                  ? 'bg-indigo-500 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {colorProperties.bassEnhance ? 'Active (+6dB)' : 'Off'}
            </button>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-300 font-medium flex items-center gap-1.5">
                <Volume2 className="w-3.5 h-3.5 text-indigo-400" />
                <span>Volume High-Gain Amplifier</span>
              </span>
              <span className="font-mono-numbers text-indigo-400">
                {(colorProperties.volumeBoost * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="1.0"
              max="2.0"
              step="0.05"
              value={colorProperties.volumeBoost}
              onChange={(e) => onChange({ volumeBoost: parseFloat(e.target.value) })}
              className="w-full"
            />
            <div className="flex justify-between text-[10px] text-slate-500 font-mono-numbers mt-0.5">
              <span>100% (Standard)</span>
              <span>150%</span>
              <span>200% (Super Boost)</span>
            </div>
          </div>
        </div>

        {/* Brightness & Contrast */}
        <div className="pt-3 border-t border-white/5 space-y-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-300 font-medium">Brightness</span>
              <span className="font-mono-numbers text-sky-400">
                {(colorProperties.brightness * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={colorProperties.brightness}
              onChange={(e) => onChange({ brightness: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-300 font-medium">Contrast</span>
              <span className="font-mono-numbers text-sky-400">
                {(colorProperties.contrast * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.5"
              step="0.05"
              value={colorProperties.contrast}
              onChange={(e) => onChange({ contrast: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-300 font-medium">Saturation</span>
              <span className="font-mono-numbers text-sky-400">
                {(colorProperties.saturation * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="2.0"
              step="0.05"
              value={colorProperties.saturation}
              onChange={(e) => onChange({ saturation: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <span className="text-slate-300 font-medium">Gamma Correction</span>
              <span className="font-mono-numbers text-sky-400">
                {colorProperties.gamma.toFixed(2)}
              </span>
            </div>
            <input
              type="range"
              min="0.6"
              max="1.4"
              step="0.05"
              value={colorProperties.gamma}
              onChange={(e) => onChange({ gamma: parseFloat(e.target.value) })}
              className="w-full"
            />
          </div>
        </div>

        {/* Ambient Room Bounce Light */}
        <div className="pt-3 border-t border-white/5">
          <div className="flex justify-between items-center mb-1">
            <span className="flex items-center gap-1.5 text-slate-300 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-sky-400" />
              Theater Ambient Screen Glow
            </span>
            <span className="font-mono-numbers text-sky-400">
              {(colorProperties.ambientGlow * 100).toFixed(0)}%
            </span>
          </div>
          <input
            type="range"
            min="0.0"
            max="1.0"
            step="0.05"
            value={colorProperties.ambientGlow}
            onChange={(e) => onChange({ ambientGlow: parseFloat(e.target.value) })}
            className="w-full"
          />
        </div>

        {/* Cardboard Split Guides */}
        <div className="pt-3 border-t border-white/5 space-y-3">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={colorProperties.showCenterDivider}
                onChange={(e) => onChange({ showCenterDivider: e.target.checked })}
                className="rounded bg-slate-900 border-white/20 text-sky-500 focus:ring-0"
              />
              <span className="text-slate-300">Center Divider Line</span>
            </label>
            {colorProperties.showCenterDivider && (
              <span className="font-mono-numbers text-[10px] text-slate-400">
                {colorProperties.dividerWidth}px
              </span>
            )}
          </div>

          {colorProperties.showCenterDivider && (
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              value={colorProperties.dividerWidth}
              onChange={(e) => onChange({ dividerWidth: parseInt(e.target.value, 10) })}
              className="w-full"
            />
          )}

          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={colorProperties.showAlignmentCrosshairs}
                onChange={(e) => onChange({ showAlignmentCrosshairs: e.target.checked })}
                className="rounded bg-slate-900 border-white/20 text-sky-500 focus:ring-0"
              />
              <span className="text-slate-300">Optical Alignment Crosshairs</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

