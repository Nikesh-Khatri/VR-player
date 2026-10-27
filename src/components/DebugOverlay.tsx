import React, { useState, useEffect, useMemo, useRef } from 'react';
import { TelemetryData, DebugLogEntry } from '../types/debug';
import { telemetry } from '../utils/telemetryManager';
import {
  Bug,
  Activity,
  Copy,
  Check,
  RotateCcw,
  X,
  Maximize2,
  Minimize2,
  Trash2,
  Terminal,
  Cpu,
  Compass,
  Zap,
  Download,
  Search,
  Filter,
  Glasses,
  Play,
  Square,
  Flame,
  Camera,
  FileText,
  Eye,
} from 'lucide-react';

interface DebugOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  outputMode: 'split' | 'single-left' | 'single-right' | 'anaglyph';
  showHorizonGuide?: boolean;
  onToggleHorizonGuide?: () => void;
}

export const DebugOverlay: React.FC<DebugOverlayProps> = ({
  isOpen,
  onClose,
  outputMode,
  showHorizonGuide,
  onToggleHorizonGuide,
}) => {
  const [data, setData] = useState<TelemetryData>(telemetry.getData());
  const [isCopied, setIsCopied] = useState(false);
  const [copiedType, setCopiedType] = useState<'markdown' | 'json' | 'log' | null>(null);
  const [activeTab, setActiveTab] = useState<'live' | 'motion' | 'drift' | 'benchmark' | 'logs' | 'report'>('motion');
  const [isMinimized, setIsMinimized] = useState(false);
  const [isStereoHud, setIsStereoHud] = useState(false);
  const [logFilterCategory, setLogFilterCategory] = useState<string>('all');
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const logContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return telemetry.subscribe((next) => {
      setData(next);
    });
  }, []);

  const handleDownloadMotionLog = () => {
    try {
      const logStr = telemetry.exportCameraMotionLog();
      const blob = new Blob([logStr], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omni-vr-camera-motion-${new Date().toISOString().replace(/[:.]/g, '-')}.log`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      telemetry.log('system', 'Camera motion .log file downloaded');
    } catch (err) {
      console.error('Failed to download motion log:', err);
    }
  };

  const handleCopyMotionLog = async () => {
    const logStr = telemetry.exportCameraMotionLog();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(logStr);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = logStr;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setIsCopied(true);
      setCopiedType('log');
      telemetry.log('system', 'Camera motion .log file copied to clipboard');
      setTimeout(() => {
        setIsCopied(false);
        setCopiedType(null);
      }, 2500);
    } catch (err) {
      console.error('Failed to copy motion log:', err);
    }
  };

  const handleClearMotionLog = () => {
    telemetry.clearPoseHistory();
    telemetry.log('system', 'Camera motion tracking log cleared');
  };

  const handleCopyReport = async () => {
    const report = telemetry.generateMarkdownReport();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(report);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = report;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setIsCopied(true);
      setCopiedType('markdown');
      telemetry.log('system', 'Diagnostic markdown report copied to clipboard');
      setTimeout(() => {
        setIsCopied(false);
        setCopiedType(null);
      }, 2500);
    } catch (err) {
      console.error('Failed to copy report:', err);
    }
  };

  const handleCopyJson = async () => {
    const jsonStr = telemetry.exportFullJson();
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(jsonStr);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = jsonStr;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setIsCopied(true);
      setCopiedType('json');
      telemetry.log('system', 'Full JSON telemetry dump copied to clipboard');
      setTimeout(() => {
        setIsCopied(false);
        setCopiedType(null);
      }, 2500);
    } catch (err) {
      console.error('Failed to copy JSON:', err);
    }
  };

  const handleDownloadJson = () => {
    try {
      const jsonStr = telemetry.exportFullJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `omni-vr-telemetry-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      telemetry.log('system', 'Telemetry JSON file downloaded');
    } catch (err) {
      console.error('Failed to download JSON:', err);
    }
  };

  const handleClearLogs = () => {
    telemetry.clearLogs();
  };

  const filteredLogs = useMemo(() => {
    return data.logs.filter((log) => {
      if (logFilterCategory !== 'all' && log.category !== logFilterCategory) {
        return false;
      }
      if (logSearchQuery.trim()) {
        const q = logSearchQuery.toLowerCase();
        const msgMatch = log.message.toLowerCase().includes(q);
        const catMatch = log.category.toLowerCase().includes(q);
        const dataMatch = log.data ? JSON.stringify(log.data).toLowerCase().includes(q) : false;
        return msgMatch || catMatch || dataMatch;
      }
      return true;
    });
  }, [data.logs, logFilterCategory, logSearchQuery]);

  if (!isOpen) return null;

  // STEREO VR HEADSET DUAL-HUD: Renders duplicate HUDs for Left Eye and Right Eye simultaneously!
  if (isStereoHud) {
    const renderCompactEyeHud = (eye: 'L' | 'R') => (
      <div className="w-[88%] max-w-[340px] bg-slate-950/95 border border-sky-500/50 rounded-xl p-3 shadow-2xl text-[11px] font-mono-numbers text-slate-200 pointer-events-auto select-none space-y-2">
        <div className="flex items-center justify-between border-b border-white/10 pb-1.5 font-sans">
          <div className="flex items-center gap-1.5 text-sky-400 font-bold">
            <Bug className="w-3.5 h-3.5 text-sky-400" />
            <span>VR Telemetry ({eye})</span>
          </div>
          <span className="text-emerald-400 font-mono-numbers font-bold">{data.fps.toFixed(0)} FPS</span>
        </div>

        <div className="grid grid-cols-2 gap-1.5 text-[10px]">
          <div className="p-1.5 bg-slate-900 rounded border border-white/5">
            <span className="text-slate-500 font-sans block">Cam Yaw</span>
            <span className="text-sky-300 font-bold text-xs">{data.cameraYaw.toFixed(1)}°</span>
          </div>
          <div className="p-1.5 bg-slate-900 rounded border border-white/5">
            <span className="text-slate-500 font-sans block">Drift Comp</span>
            <span className="text-amber-400 font-bold text-xs">{data.oscillationCorrection.toFixed(1)}°</span>
          </div>
          <div className="p-1.5 bg-slate-900 rounded border border-white/5">
            <span className="text-slate-500 font-sans block">Rot Rate</span>
            <span className="text-indigo-300 font-bold text-xs">{data.rotSpeed ? `${data.rotSpeed.toFixed(0)}°/s` : '0°/s'}</span>
          </div>
          <div className="p-1.5 bg-slate-900 rounded border border-white/5">
            <span className="text-slate-500 font-sans block">Accel</span>
            <span className="text-emerald-300 font-bold text-xs">{data.accelMagnitude ? `${data.accelMagnitude.toFixed(1)}m/s²` : '1g'}</span>
          </div>
        </div>

        <div className="flex items-center justify-between text-[10px] bg-slate-900/90 px-2 py-1 rounded border border-white/5">
          <span className="text-slate-400">Shake Status:</span>
          {data.isShaking ? (
            <span className="text-rose-400 font-bold animate-pulse">SHAKE ⚠️</span>
          ) : data.isOscillating ? (
            <span className="text-amber-300 font-bold">OSCILLATING #{data.oscillationCount}</span>
          ) : (
            <span className="text-emerald-400">STABLE</span>
          )}
        </div>

        <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[10px]">
          <button
            onClick={() => setIsStereoHud(false)}
            className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded font-sans cursor-pointer"
          >
            Exit Stereo
          </button>
          <button
            onClick={handleCopyReport}
            className="px-2 py-1 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded font-sans cursor-pointer"
          >
            {isCopied ? 'Copied!' : 'Copy'}
          </button>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    );

    return (
      <div
        className="fixed inset-0 z-50 flex pointer-events-auto bg-black/40 backdrop-blur-[2px]"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="w-1/2 h-full flex items-center justify-center p-4">
          {renderCompactEyeHud('L')}
        </div>
        <div className="w-1/2 h-full flex items-center justify-center p-4">
          {renderCompactEyeHud('R')}
        </div>
      </div>
    );
  }

  // Render Mini Floating HUD (docked top-left)
  if (isMinimized) {
    return (
      <div
        className="fixed top-14 left-4 z-50 bg-slate-950/95 backdrop-blur-md border border-sky-500/40 rounded-xl p-2.5 shadow-2xl text-[11px] font-mono-numbers text-slate-200 pointer-events-auto flex items-center gap-3 select-none"
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-1.5 text-sky-400 font-semibold font-sans">
          <Bug className="w-3.5 h-3.5 animate-pulse" />
          <span>DEBUG</span>
        </div>
        <span className="text-slate-600">|</span>
        <div>
          <span className="text-slate-500 font-sans">FPS:</span>{' '}
          <span className="text-emerald-400 font-bold">{data.fps.toFixed(0)}</span>
        </div>
        <div>
          <span className="text-slate-500 font-sans">Yaw:</span>{' '}
          <span className="text-sky-300 font-bold">{data.cameraYaw.toFixed(1)}°</span>
        </div>
        <div>
          <span className="text-slate-500 font-sans">DriftComp:</span>{' '}
          <span className={data.oscillationCorrection !== 0 ? 'text-amber-400 font-bold' : 'text-slate-400'}>
            {data.oscillationCorrection.toFixed(1)}°
          </span>
        </div>
        {data.isOscillating && (
          <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-sans font-medium flex items-center gap-1 animate-pulse">
            <Zap className="w-2.5 h-2.5" />
            Shake #{data.oscillationCount}
          </span>
        )}
        <button
          onClick={handleCopyReport}
          className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
          title="Copy Diagnostics Report"
        >
          {isCopied && copiedType === 'markdown' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
        {outputMode === 'split' && (
          <button
            onClick={() => setIsStereoHud(true)}
            className="p-1 hover:bg-slate-800 text-sky-400 hover:text-sky-300 rounded transition-colors cursor-pointer"
            title="Stereo Headset Dual HUD (for looking through VR lenses)"
          >
            <Glasses className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          onClick={() => setIsMinimized(false)}
          className="p-1 hover:bg-slate-800 text-slate-300 hover:text-white rounded transition-colors cursor-pointer"
          title="Expand Diagnostics Inspector"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={onClose}
          className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
          title="Close Debug Mode (D)"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Full Expanded Diagnostic HUD
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/75 backdrop-blur-md pointer-events-auto select-none"
      onClick={onClose}
      onPointerDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
    >
      <div
        className="w-full max-w-3xl max-h-[92vh] bg-slate-950/98 border border-sky-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Bar */}
        <div className="flex items-center justify-between px-4 py-3 bg-slate-900/90 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-sky-500/20 text-sky-400 rounded-lg">
              <Bug className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white flex items-center gap-2">
                <span>VR Diagnostics & Sensor Telemetry</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono-numbers bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  LIVE
                </span>
              </h2>
              <p className="text-[11px] text-slate-400">
                Real-time IMU sensors, oscillation drift compensator & full event log
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {onToggleHorizonGuide && (
              <button
                onClick={onToggleHorizonGuide}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer border ${
                  showHorizonGuide
                    ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-white/10'
                }`}
                title="Toggle visual artificial horizon guide overlay"
              >
                <Compass className="w-3.5 h-3.5 text-emerald-400" />
                <span className="hidden sm:inline">Horizon Level: {showHorizonGuide ? 'ON' : 'OFF'}</span>
                <span className="sm:hidden">Horizon</span>
              </button>
            )}

            {outputMode === 'split' && (
              <button
                onClick={() => setIsStereoHud(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-sky-300 bg-sky-950/60 hover:bg-sky-900/80 border border-sky-500/30 transition-colors cursor-pointer"
                title="View inside Cardboard VR Headset (Dual Eye HUD)"
              >
                <Glasses className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">VR Headset HUD</span>
              </button>
            )}

            <button
              onClick={handleCopyReport}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer shadow-sm ${
                isCopied && copiedType === 'markdown'
                  ? 'bg-emerald-600 text-white'
                  : 'bg-sky-500 hover:bg-sky-400 text-slate-950 hover:text-black font-semibold'
              }`}
              title="Copy Markdown report formatted for AI developer chat"
            >
              {isCopied && copiedType === 'markdown' ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Report Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Report</span>
                </>
              )}
            </button>

            <button
              onClick={() => setIsMinimized(true)}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Minimize to Floating HUD"
            >
              <Minimize2 className="w-4 h-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
              title="Close (D)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 pt-2 border-b border-white/5 bg-slate-950 text-xs overflow-x-auto">
          <button
            onClick={() => setActiveTab('motion')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'motion'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Camera & Motion Log ({data.poseHistory.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('live')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'live'
                ? 'border-sky-400 text-sky-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Live Sensors</span>
          </button>
          <button
            onClick={() => setActiveTab('drift')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'drift'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Anti-Drift Engine</span>
          </button>
          <button
            onClick={() => setActiveTab('benchmark')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'benchmark'
                ? 'border-rose-400 text-rose-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Flame className="w-3.5 h-3.5" />
            <span>10s Drift Benchmark</span>
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'logs'
                ? 'border-indigo-400 text-indigo-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Terminal className="w-3.5 h-3.5" />
            <span>Event Stream ({data.logs.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('report')}
            className={`px-3 py-2 font-medium border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap ${
              activeTab === 'report'
                ? 'border-emerald-400 text-emerald-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Report & Export</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4 font-mono-numbers text-xs">
          {/* TAB 1: LIVE SENSORS */}
          {activeTab === 'live' && (
            <div className="space-y-4">
              {/* Quick Stat Pill Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-3 bg-slate-900/80 rounded-xl border border-white/5">
                  <div className="text-[10px] text-slate-500 font-sans">Framerate</div>
                  <div className="text-lg font-bold text-emerald-400 mt-0.5">
                    {data.fps.toFixed(1)} <span className="text-xs text-slate-500">FPS</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono-numbers">{data.frameTimeMs.toFixed(1)} ms</div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl border border-white/5">
                  <div className="text-[10px] text-slate-500 font-sans">Orientation Sensor</div>
                  <div className="text-lg font-bold text-sky-400 mt-0.5">
                    {data.orientationHz > 0 ? `${data.orientationHz.toFixed(0)} Hz` : 'Active'}
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">
                    Abs: {data.absolute !== null ? String(data.absolute) : 'Relative'}
                  </div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl border border-white/5">
                  <div className="text-[10px] text-slate-500 font-sans">Motion Gyro Rate</div>
                  <div className="text-lg font-bold text-indigo-400 mt-0.5">
                    {data.rotSpeed ? `${data.rotSpeed.toFixed(0)} °/s` : '0 °/s'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Accel: {data.accelMagnitude ? `${data.accelMagnitude.toFixed(1)} m/s²` : '1g'}
                  </div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl border border-white/5">
                  <div className="text-[10px] text-slate-500 font-sans">Screen Orientation</div>
                  <div className="text-lg font-bold text-amber-400 mt-0.5">
                    {data.screenAngle}°
                  </div>
                  <div className="text-[10px] text-slate-400 truncate">{data.screenType}</div>
                </div>
              </div>

              {/* IMU Detailed Readings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* DeviceOrientation Card */}
                <div className="p-3.5 bg-slate-900/60 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between font-sans text-xs font-semibold text-sky-300">
                    <span className="flex items-center gap-1.5">
                      <Compass className="w-3.5 h-3.5 text-sky-400" />
                      DeviceOrientation Raw
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono-numbers">
                      {data.orientationHz.toFixed(1)} Hz
                    </span>
                  </div>

                  <div className="space-y-1.5 text-slate-300 text-[11px]">
                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-slate-400">Alpha (Z compass / yaw):</span>
                      <span className="font-bold text-white">
                        {data.alpha !== null ? `${data.alpha.toFixed(2)}°` : 'null'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-slate-400">Beta (X pitch [-180, 180]):</span>
                      <span className="font-bold text-white">
                        {data.beta !== null ? `${data.beta.toFixed(2)}°` : 'null'}
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400">Gamma (Y roll [-90, 90]):</span>
                      <span className="font-bold text-white">
                        {data.gamma !== null ? `${data.gamma.toFixed(2)}°` : 'null'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* DeviceMotion Card */}
                <div className="p-3.5 bg-slate-900/60 rounded-xl border border-white/10 space-y-2">
                  <div className="flex items-center justify-between font-sans text-xs font-semibold text-indigo-300">
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-indigo-400" />
                      DeviceMotion Gyro & Accel
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono-numbers">
                      {data.motionHz.toFixed(1)} Hz
                    </span>
                  </div>

                  <div className="space-y-1.5 text-slate-300 text-[11px]">
                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-slate-400">Rotation Rate (Alpha/Beta/Gamma):</span>
                      <span className="font-bold text-white">
                        [{data.rotAlpha?.toFixed(0) ?? 0}, {data.rotBeta?.toFixed(0) ?? 0}, {data.rotGamma?.toFixed(0) ?? 0}] °/s
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1 border-b border-white/5">
                      <span className="text-slate-400">Linear Accel (X/Y/Z):</span>
                      <span className="font-bold text-white">
                        [{data.accelX?.toFixed(1) ?? 0}, {data.accelY?.toFixed(1) ?? 0}, {data.accelZ?.toFixed(1) ?? 0}] m/s²
                      </span>
                    </div>
                    <div className="flex justify-between items-center py-1">
                      <span className="text-slate-400">Shake Detection:</span>
                      <span className={data.isShaking ? 'font-bold text-rose-400' : 'text-emerald-400'}>
                        {data.isShaking ? 'SHAKE DETECTED ⚠️' : 'Calm / Steady'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Calculated Camera Pose & Axis Status */}
              <div className="p-3.5 bg-slate-900/60 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between font-sans text-xs font-semibold text-emerald-300">
                  <span>Three.js Final Camera Pose & Axis Locks</span>
                  <div className="flex items-center gap-1.5">
                    {data.lockCamera && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-mono">
                        CAMERA LOCKED
                      </span>
                    )}
                    {data.lockCameraRoll && (
                      <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono">
                        HORIZON ROLL LOCKED
                      </span>
                    )}
                    <span className="text-[10px] text-slate-400">Target Orientation</span>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-slate-950/80 rounded-lg">
                    <div className="text-[10px] text-slate-400 font-sans">HORIZONTAL (YAW)</div>
                    <div className="text-sm font-bold text-sky-400">{data.cameraYaw.toFixed(2)}°</div>
                    <div className="text-[9px] text-slate-500 font-mono">
                      Bias: {data.gyroBiasYaw ? `${data.gyroBiasYaw.toFixed(2)}°/s` : '0.00°/s'}
                    </div>
                  </div>
                  <div className="p-2 bg-slate-950/80 rounded-lg">
                    <div className="text-[10px] text-slate-400 font-sans">VERTICAL (PITCH)</div>
                    <div className="text-sm font-bold text-emerald-400">{data.cameraPitch.toFixed(2)}°</div>
                    <div className="text-[9px] text-slate-500 font-mono">Gravity-Anchored</div>
                  </div>
                  <div className="p-2 bg-slate-950/80 rounded-lg">
                    <div className="text-[10px] text-slate-400 font-sans">CAMERA ROLL</div>
                    <div className="text-sm font-bold text-indigo-400">{data.cameraRoll.toFixed(2)}°</div>
                    <div className="text-[9px] text-slate-500 font-mono">
                      {data.lockCameraRoll ? 'Level Horizon' : 'Free Tilt'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1 px-1 border-t border-white/5 text-slate-400">
                  <span>Head Motion State:</span>
                  <span className={data.isStationary ? 'text-emerald-400 font-bold' : 'text-sky-300 font-medium'}>
                    {data.isStationary ? 'STATIONARY (ZERO-DRIFT LOCK)' : 'ACTIVE HEAD MOVEMENT'}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB: CAMERA POSITION RELATIVE TO USER & HEAD MOTION LOG */}
          {activeTab === 'motion' && (
            <div className="space-y-4">
              {/* Header Box */}
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-200 text-xs leading-relaxed font-sans flex items-start justify-between gap-3">
                <div>
                  <strong>Camera Position Relative to User & Motion Over Time:</strong> Spatial
                  separation of left/right optical cameras relative to user head center, continuous
                  look angles, velocity rates, and time-series head motion history.
                </div>
                <button
                  onClick={handleDownloadMotionLog}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all cursor-pointer text-xs shrink-0 shadow-sm"
                  title="Download .log text file"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download .log</span>
                </button>
              </div>

              {/* Action Buttons for Log File */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDownloadMotionLog}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition-all cursor-pointer text-xs shadow-sm"
                  title="Download standardized .log text file of camera position relative to user and head movement"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Motion Log (.log)</span>
                </button>

                <button
                  onClick={handleCopyMotionLog}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-all cursor-pointer text-xs"
                  title="Copy log file content to clipboard"
                >
                  {isCopied && copiedType === 'log' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{isCopied && copiedType === 'log' ? 'Copied Log!' : 'Copy Log File'}</span>
                </button>

                <button
                  onClick={handleClearMotionLog}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer text-xs ml-auto"
                  title="Clear motion samples"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Clear History</span>
                </button>
              </div>

              {/* Current Live Spatial Positions Card */}
              {data.cameraPose ? (
                <div className="p-3.5 bg-slate-900/80 rounded-xl border border-white/10 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-sans text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-emerald-400" />
                      Live Camera Spatial Position Relative to User Head
                    </span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-sans font-bold uppercase ${
                      data.cameraPose.state === 'stationary'
                        ? 'bg-slate-800 text-slate-300'
                        : data.cameraPose.state === 'fast-shake'
                        ? 'bg-rose-500/20 text-rose-300 animate-pulse'
                        : 'bg-emerald-500/20 text-emerald-300'
                    }`}>
                      {data.cameraPose.state}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-950 rounded-lg border border-white/5">
                      <div className="text-[10px] text-slate-500 font-sans">User Head Center (Rig)</div>
                      <div className="font-bold text-white mt-0.5 text-[11px]">
                        X: {data.cameraPose.headPosition.x.toFixed(3)}m<br/>
                        Y: {data.cameraPose.headPosition.y.toFixed(3)}m<br/>
                        Z: {data.cameraPose.headPosition.z.toFixed(3)}m
                      </div>
                      <div className="text-[9px] text-slate-500 mt-1 font-sans">Rig Coordinates</div>
                    </div>

                    <div className="p-2.5 bg-slate-950 rounded-lg border border-white/5">
                      <div className="text-[10px] text-sky-400 font-sans flex items-center justify-between">
                        <span>Left Camera (Eye L)</span>
                        <span className="text-[9px] text-slate-500 font-mono-numbers">
                          {(data.cameraPose.leftEyeOffset.x * 1000).toFixed(1)}mm
                        </span>
                      </div>
                      <div className="font-bold text-sky-300 mt-0.5 text-[11px]">
                        Rel: [{(data.cameraPose.leftEyeOffset.x * 1000).toFixed(1)}mm, 0, 0]<br/>
                        World: [{data.cameraPose.leftEyeWorld.x.toFixed(2)}, {data.cameraPose.leftEyeWorld.y.toFixed(2)}, {data.cameraPose.leftEyeWorld.z.toFixed(2)}]
                      </div>
                      <div className="text-[9px] text-slate-500 mt-1 font-sans">Offset from User Center</div>
                    </div>

                    <div className="p-2.5 bg-slate-950 rounded-lg border border-white/5">
                      <div className="text-[10px] text-indigo-400 font-sans flex items-center justify-between">
                        <span>Right Camera (Eye R)</span>
                        <span className="text-[9px] text-slate-500 font-mono-numbers">
                          +{(data.cameraPose.rightEyeOffset.x * 1000).toFixed(1)}mm
                        </span>
                      </div>
                      <div className="font-bold text-indigo-300 mt-0.5 text-[11px]">
                        Rel: [+{(data.cameraPose.rightEyeOffset.x * 1000).toFixed(1)}mm, 0, 0]<br/>
                        World: [{data.cameraPose.rightEyeWorld.x.toFixed(2)}, {data.cameraPose.rightEyeWorld.y.toFixed(2)}, {data.cameraPose.rightEyeWorld.z.toFixed(2)}]
                      </div>
                      <div className="text-[9px] text-slate-500 mt-1 font-sans">Offset from User Center</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-white/5">
                    <div className="p-2 bg-slate-950 rounded-lg">
                      <span className="text-[10px] text-slate-500 block font-sans">Relative Yaw</span>
                      <span className="text-white font-bold">{data.cameraPose.relativeYaw > 0 ? '+' : ''}{data.cameraPose.relativeYaw.toFixed(2)}°</span>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-lg">
                      <span className="text-[10px] text-slate-500 block font-sans">Relative Pitch</span>
                      <span className="text-white font-bold">{data.cameraPose.relativePitch > 0 ? '+' : ''}{data.cameraPose.relativePitch.toFixed(2)}°</span>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-lg">
                      <span className="text-[10px] text-slate-500 block font-sans">Head Angular Speed</span>
                      <span className="text-emerald-400 font-bold">{data.cameraPose.speed.toFixed(1)} °/s</span>
                    </div>
                    <div className="p-2 bg-slate-950 rounded-lg">
                      <span className="text-[10px] text-slate-500 block font-sans">Drift Compensated</span>
                      <span className="text-amber-400 font-bold">{data.cameraPose.driftCompensated.toFixed(2)}°</span>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* Time-Series Log Table */}
              <div className="p-3.5 bg-slate-900/60 rounded-xl border border-white/10 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-sans text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-sky-400" />
                    Time-Series Motion Log ({data.poseHistory.length} samples)
                  </span>
                  <span className="text-[10px] text-slate-400">Streamed on Head Movement</span>
                </div>

                <div className="max-h-[280px] overflow-x-auto overflow-y-auto rounded-lg border border-white/5 bg-slate-950 text-[10px]">
                  <table className="w-full text-left font-mono-numbers">
                    <thead className="bg-slate-900/90 text-slate-400 text-[9px] uppercase font-sans sticky top-0 border-b border-white/10">
                      <tr>
                        <th className="py-1.5 px-2">Time</th>
                        <th className="py-1.5 px-2">State</th>
                        <th className="py-1.5 px-2">User Head Pos</th>
                        <th className="py-1.5 px-2">Left Eye Rel</th>
                        <th className="py-1.5 px-2">Right Eye Rel</th>
                        <th className="py-1.5 px-2">Rel Gaze [Y, P, R]</th>
                        <th className="py-1.5 px-2">Speed</th>
                        <th className="py-1.5 px-2">Drift Comp</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.03]">
                      {data.poseHistory.length === 0 ? (
                        <tr>
                          <td colSpan={8} className="text-center py-6 text-slate-600 font-sans">
                            No motion events captured yet. Move or turn your device to log relative head movement.
                          </td>
                        </tr>
                      ) : (
                        data.poseHistory.slice(0, 80).map((pose, idx) => (
                          <tr key={idx} className="hover:bg-slate-900/50">
                            <td className="py-1 px-2 text-slate-400 whitespace-nowrap">{pose.elapsedSec.toFixed(2)}s</td>
                            <td className="py-1 px-2 whitespace-nowrap">
                              <span className={`px-1 py-0.2 rounded text-[9px] font-sans uppercase ${
                                pose.state === 'stationary'
                                  ? 'text-slate-400'
                                  : pose.state === 'fast-shake'
                                  ? 'text-rose-400 font-bold'
                                  : 'text-emerald-400'
                              }`}>
                                {pose.state}
                              </span>
                            </td>
                            <td className="py-1 px-2 text-slate-300 whitespace-nowrap">
                              ({pose.headPosition.x.toFixed(2)}, {pose.headPosition.y.toFixed(2)}, {pose.headPosition.z.toFixed(2)})
                            </td>
                            <td className="py-1 px-2 text-sky-300 whitespace-nowrap">
                              {(pose.leftEyeOffset.x * 1000).toFixed(1)}mm
                            </td>
                            <td className="py-1 px-2 text-indigo-300 whitespace-nowrap">
                              +{(pose.rightEyeOffset.x * 1000).toFixed(1)}mm
                            </td>
                            <td className="py-1 px-2 text-white whitespace-nowrap">
                              [{pose.relativeYaw > 0 ? '+' : ''}{pose.relativeYaw.toFixed(1)}°, {pose.relativePitch > 0 ? '+' : ''}{pose.relativePitch.toFixed(1)}°, {pose.relativeRoll.toFixed(1)}°]
                            </td>
                            <td className="py-1 px-2 text-emerald-400 whitespace-nowrap">{pose.speed.toFixed(1)}°/s</td>
                            <td className="py-1 px-2 text-amber-400 whitespace-nowrap">{pose.driftCompensated.toFixed(2)}°</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Log File Content Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs font-sans text-slate-400">
                  <span>Log File Content Preview (.log):</span>
                  <button
                    onClick={handleDownloadMotionLog}
                    className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1 cursor-pointer text-[11px]"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download file</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  value={telemetry.exportCameraMotionLog()}
                  className="w-full h-44 p-2.5 bg-black/70 border border-white/10 rounded-xl text-slate-300 font-mono text-[10px] leading-relaxed resize-none focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* TAB 2: ANTI-DRIFT OSCILLATION ENGINE */}
          {activeTab === 'drift' && (
            <div className="space-y-4">
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-amber-200 text-xs leading-relaxed font-sans">
                <strong>Anti-Drift Engine Diagnostic:</strong> Detects rapid direction reversals
                during head shake / oscillation, captures the oscillation midpoint, and dynamically
                cancels sensor baseline drift so the center of the video never wanders.
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <div className="p-3 bg-slate-900/80 rounded-xl border border-white/5">
                  <div className="text-[10px] text-slate-500 font-sans">Oscillating?</div>
                  <div className="text-base font-bold mt-0.5 text-white">
                    {data.isOscillating ? (
                      <span className="text-amber-400 animate-pulse">ACTIVE ⚡</span>
                    ) : (
                      <span className="text-slate-400">Idle / Smooth</span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono-numbers">Cycles: {data.oscillationCount}</div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl border border-white/5">
                  <div className="text-[10px] text-slate-500 font-sans">Yaw Angular Rate</div>
                  <div className="text-base font-bold text-sky-400 mt-0.5">
                    {data.yawRate.toFixed(1)} <span className="text-xs">°/s</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans">Velocity</div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl border border-white/5">
                  <div className="text-[10px] text-slate-500 font-sans">Drift Compensated</div>
                  <div className="text-base font-bold text-rose-400 mt-0.5">
                    {data.oscillationCorrection.toFixed(2)}°
                  </div>
                  <div className="text-[10px] text-slate-400 font-sans">Subtracted offset</div>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl border border-white/5">
                  <div className="text-[10px] text-slate-500 font-sans">Current Midpoint</div>
                  <div className="text-base font-bold text-indigo-400 mt-0.5">
                    {data.oscillationMidpoint.toFixed(1)}°
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono-numbers">Locked: {data.lockedMidpoint.toFixed(1)}°</div>
                </div>
              </div>

              <div className="p-3.5 bg-slate-900/60 rounded-xl border border-white/10 space-y-2">
                <div className="text-xs font-semibold text-slate-200 font-sans">
                  Raw Sensor vs Corrected Heading
                </div>
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-slate-400">Raw Heading from IMU:</span>
                    <span className="font-bold text-white">{data.rawYaw.toFixed(2)}°</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-slate-400">Corrected Heading (Displayed):</span>
                    <span className="font-bold text-emerald-400">{data.correctedYaw.toFixed(2)}°</span>
                  </div>
                  <div className="flex justify-between items-center py-1 border-b border-white/5">
                    <span className="text-slate-400">Active Gyro Mode:</span>
                    <span className="font-bold text-sky-400 uppercase">{data.gyroMode}</span>
                  </div>
                  <div className="flex justify-between items-center py-1">
                    <span className="text-slate-400">Recenter Count:</span>
                    <span className="font-bold text-white font-mono-numbers">{data.recenterCount}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: 10-SECOND DRIFT BENCHMARK */}
          {activeTab === 'benchmark' && (
            <div className="space-y-4">
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-200 text-xs leading-relaxed font-sans">
                <strong>10-Second Head Shake Drift Benchmark:</strong> Tap <strong>Start 10s Test</strong>,
                shake your head rapidly back-and-forth as you would in VR, and examine the peak speed,
                detected oscillation cycles, and the exact drift compensation applied.
              </div>

              <div className="flex items-center gap-3">
                {data.benchmark && data.benchmark.isRunning ? (
                  <button
                    onClick={() => telemetry.finishBenchmark()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-lg text-xs cursor-pointer shadow-md"
                  >
                    <Square className="w-3.5 h-3.5 fill-current" />
                    <span>Stop Test Now ({data.benchmark.elapsedSec.toFixed(1)}s / {data.benchmark.durationSec}s)</span>
                  </button>
                ) : (
                  <button
                    onClick={() => telemetry.startBenchmark(10)}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer shadow-md"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Start 10-Second Test</span>
                  </button>
                )}

                {data.benchmark && (
                  <button
                    onClick={() => {
                      if (data.benchmark?.completedReport) {
                        navigator.clipboard.writeText(data.benchmark.completedReport);
                        setIsCopied(true);
                        setCopiedType('markdown');
                        setTimeout(() => {
                          setIsCopied(false);
                          setCopiedType(null);
                        }, 2000);
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{isCopied && copiedType === 'markdown' ? 'Copied!' : 'Copy Benchmark Result'}</span>
                  </button>
                )}
              </div>

              {/* Benchmark Status Card */}
              {data.benchmark && (
                <div className="p-4 bg-slate-900/80 rounded-xl border border-white/10 space-y-3 font-mono-numbers">
                  <div className="flex items-center justify-between border-b border-white/10 pb-2">
                    <span className="font-sans text-xs font-semibold text-white">
                      {data.benchmark.isRunning ? 'Test in Progress - Shake Head Now!' : 'Test Completed'}
                    </span>
                    <span className="text-xs text-sky-400">
                      {data.benchmark.elapsedSec.toFixed(1)}s / {data.benchmark.durationSec}s
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-950 rounded-lg">
                      <div className="text-[10px] text-slate-500 font-sans">Peak Gyro Speed</div>
                      <div className="text-base font-bold text-indigo-400 mt-0.5">
                        {data.benchmark.peakRotSpeed.toFixed(0)} °/s
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-lg">
                      <div className="text-[10px] text-slate-500 font-sans">Peak Accel</div>
                      <div className="text-base font-bold text-emerald-400 mt-0.5">
                        {data.benchmark.peakAccel.toFixed(1)} m/s²
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-lg">
                      <div className="text-[10px] text-slate-500 font-sans">Cycles Detected</div>
                      <div className="text-base font-bold text-amber-400 mt-0.5">
                        {data.benchmark.oscillationCycles}
                      </div>
                    </div>
                    <div className="p-2.5 bg-slate-950 rounded-lg">
                      <div className="text-[10px] text-slate-500 font-sans">Comp Applied</div>
                      <div className="text-base font-bold text-rose-400 mt-0.5">
                        {data.benchmark.totalCompApplied.toFixed(2)}°
                      </div>
                    </div>
                  </div>

                  <div className="text-xs space-y-1.5 pt-2 border-t border-white/5">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Initial Heading:</span>
                      <span className="font-bold text-white">{data.benchmark.initialYaw.toFixed(2)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Final Heading:</span>
                      <span className="font-bold text-white">{data.benchmark.currentYaw.toFixed(2)}°</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Net Residual Heading Offset:</span>
                      <span className="font-bold text-emerald-400">{data.benchmark.driftOffset.toFixed(2)}°</span>
                    </div>
                  </div>

                  {data.benchmark.completedReport && (
                    <pre className="p-3 bg-black/60 rounded-lg border border-white/5 text-[11px] text-slate-300 font-mono overflow-x-auto whitespace-pre-wrap">
                      {data.benchmark.completedReport}
                    </pre>
                  )}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: EVENT STREAM LOGS */}
          {activeTab === 'logs' && (
            <div className="space-y-3">
              {/* Filter & Action Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 text-[11px]">
                  {['all', 'camera-pose', 'oscillation', 'sensor', 'recenter', 'mode', 'gesture', 'system', 'webgl'].map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setLogFilterCategory(cat)}
                      className={`px-2 py-1 rounded capitalize font-medium transition-colors cursor-pointer whitespace-nowrap ${
                        logFilterCategory === cat
                          ? 'bg-sky-500 text-slate-950 font-bold'
                          : 'bg-slate-900 text-slate-400 hover:text-white'
                      }`}
                    >
                      {cat === 'camera-pose' ? 'Camera Pose' : cat}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleDownloadMotionLog}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-emerald-950 hover:bg-emerald-900 text-emerald-300 border border-emerald-500/30 transition-colors cursor-pointer text-[11px]"
                    title="Download camera motion tracking .log file"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download .log</span>
                  </button>
                  <button
                    onClick={handleCopyJson}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer text-[11px]"
                    title="Copy full JSON logs array"
                  >
                    <Copy className="w-3 h-3" />
                    <span>{isCopied && copiedType === 'json' ? 'Copied JSON!' : 'Copy JSON'}</span>
                  </button>
                  <button
                    onClick={handleDownloadJson}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer text-[11px]"
                    title="Download JSON log file"
                  >
                    <Download className="w-3 h-3" />
                    <span>JSON</span>
                  </button>
                  <button
                    onClick={handleClearLogs}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors cursor-pointer text-[11px]"
                    title="Clear current log buffer"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Clear</span>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter logs by message or parameters..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
                />
              </div>

              {/* Log List */}
              <div
                ref={logContainerRef}
                className="max-h-[380px] overflow-y-auto space-y-1 rounded-xl bg-slate-950 p-2 border border-white/5 font-mono text-[11px]"
              >
                {filteredLogs.length === 0 ? (
                  <div className="text-slate-600 text-center py-8 font-sans">
                    No logs matching filter. Move or shake your device to see live events.
                  </div>
                ) : (
                  filteredLogs.map((log) => (
                    <div
                      key={log.id}
                      className="py-1 px-2 rounded hover:bg-slate-900/60 flex items-start gap-2 border-b border-white/[0.03]"
                    >
                      <span className="text-slate-500 whitespace-nowrap">{log.time}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] uppercase font-bold whitespace-nowrap ${
                          log.category === 'camera-pose'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : log.category === 'recenter'
                            ? 'bg-sky-500/20 text-sky-400'
                            : log.category === 'oscillation'
                            ? 'bg-amber-500/20 text-amber-300'
                            : log.category === 'mode'
                            ? 'bg-indigo-500/20 text-indigo-300'
                            : log.category === 'sensor'
                            ? 'bg-rose-500/20 text-rose-300'
                            : log.category === 'gesture'
                            ? 'bg-emerald-500/20 text-emerald-300'
                            : log.category === 'webgl'
                            ? 'bg-cyan-500/20 text-cyan-300'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {log.category}
                      </span>
                      <span className="text-slate-200 flex-1 break-all">{log.message}</span>
                      {log.data && (
                        <span className="text-slate-500 text-[10px] truncate max-w-[200px]" title={JSON.stringify(log.data)}>
                          {JSON.stringify(log.data)}
                        </span>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 5: REPORT & EXPORT */}
          {activeTab === 'report' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-sans">
                  Ready-to-copy Markdown diagnostic report for developer chat
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadJson}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium transition-all cursor-pointer text-xs"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download JSON</span>
                  </button>
                  <button
                    onClick={handleCopyReport}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold transition-all cursor-pointer text-xs"
                  >
                    {isCopied && copiedType === 'markdown' ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{isCopied && copiedType === 'markdown' ? 'Copied to Clipboard!' : 'Copy Markdown'}</span>
                  </button>
                </div>
              </div>

              <textarea
                readOnly
                value={telemetry.generateMarkdownReport()}
                className="w-full h-80 p-3 bg-slate-950 border border-white/10 rounded-xl text-slate-300 font-mono text-[11px] leading-relaxed resize-none focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/60 border-t border-white/5 text-[11px] text-slate-400 font-sans">
          <div className="flex items-center gap-2">
            <span>Shortcut: Press <strong>D</strong> to toggle Debug HUD</span>
            <span>•</span>
            <span>Tap <strong>Copy Report</strong> to paste in chat</span>
          </div>
          <div className="flex items-center gap-2 font-mono-numbers">
            <span>DPR: {data.pixelRatio}</span>
            <span>•</span>
            <span>Res: {data.viewportWidth}x{data.viewportHeight}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
