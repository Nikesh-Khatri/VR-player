import React from 'react';
import { Smartphone, Download, CheckCircle2, ShieldCheck, Zap, ExternalLink } from 'lucide-react';

interface AndroidInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  isInstallable: boolean;
  isInstalled: boolean;
  onInstall: () => Promise<boolean>;
  isWakeLockActive: boolean;
  onToggleWakeLock: () => void;
}

export const AndroidInstallModal: React.FC<AndroidInstallModalProps> = ({
  isOpen,
  onClose,
  isInstallable,
  isInstalled,
  onInstall,
  isWakeLockActive,
  onToggleWakeLock,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 pointer-events-auto">
      <div className="w-full max-w-lg bg-slate-950 border border-white/10 rounded-2xl shadow-2xl overflow-hidden text-slate-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-gradient-to-r from-emerald-950/40 to-slate-950">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-white">Android VR App Installation</h2>
              <p className="text-xs text-slate-400">Install as native Android app or WebAPK</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors text-lg cursor-pointer px-2"
          >
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs max-h-[75vh] overflow-y-auto">
          {/* Status Box */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 font-medium">Application Status:</span>
              {isInstalled ? (
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <CheckCircle2 className="w-4 h-4" /> Installed (Standalone Mode)
                </span>
              ) : isInstallable ? (
                <span className="flex items-center gap-1.5 text-sky-400 font-medium">
                  <Zap className="w-4 h-4" /> Ready to Install
                </span>
              ) : (
                <span className="text-slate-400">Android PWA Ready</span>
              )}
            </div>

            {/* Direct 1-Click Install Button */}
            {!isInstalled && (
              <button
                onClick={async () => {
                  const success = await onInstall();
                  if (success) onClose();
                }}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-2 text-sm shadow-lg shadow-emerald-500/20"
              >
                <Download className="w-4 h-4" />
                <span>Install App on Android</span>
              </button>
            )}
          </div>

          {/* Android VR Hardware Optimizations */}
          <div className="space-y-3">
            <h3 className="font-semibold text-white tracking-wide">Android VR Headset Features</h3>

            {/* Screen Wake Lock Toggle */}
            <div className="flex items-center justify-between p-3.5 bg-slate-900/60 rounded-xl border border-white/5">
              <div>
                <span className="font-medium text-slate-200 block">Prevent Screen Sleep (Wake Lock)</span>
                <span className="text-[11px] text-slate-400">
                  Keeps display constantly awake inside Cardboard / VR box
                </span>
              </div>
              <button
                onClick={onToggleWakeLock}
                className={`px-3 py-1.5 rounded-lg font-medium text-xs transition-colors cursor-pointer ${
                  isWakeLockActive
                    ? 'bg-emerald-500 text-slate-950 font-semibold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {isWakeLockActive ? 'Active' : 'Enable'}
              </button>
            </div>
          </div>

          {/* How to Install on Android Manual Guide */}
          <div className="space-y-2">
            <h3 className="font-semibold text-white tracking-wide">Manual Android Installation</h3>
            <ol className="space-y-2 text-slate-400 list-decimal list-inside bg-slate-900/40 p-4 rounded-xl border border-white/5">
              <li>
                Open this URL in <strong className="text-slate-200">Google Chrome</strong> or <strong className="text-slate-200">Samsung Internet</strong> on your Android phone.
              </li>
              <li>
                Tap the <strong className="text-slate-200">⋮ (three dots)</strong> menu in the top-right corner.
              </li>
              <li>
                Select <strong className="text-emerald-400">"Install app"</strong> or <strong className="text-emerald-400">"Add to Home screen"</strong>.
              </li>
              <li>
                Android will package it with its icon and launch it in full-bleed fullscreen without browser address bars!
              </li>
            </ol>
          </div>

          {/* Packaging as standalone APK (TWA) */}
          <div className="p-4 rounded-xl bg-slate-900/40 border border-white/5 space-y-2">
            <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Package as Standalone Android APK</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              To publish to Google Play Store or build an <code className="text-sky-300 font-mono-numbers">.apk</code> file, you can pass this app's URL directly to Google's official <strong className="text-slate-200">Bubblewrap CLI</strong> or <strong className="text-slate-200">PWABuilder</strong>:
            </p>
            <div className="p-2.5 bg-black/60 rounded-lg font-mono-numbers text-[11px] text-emerald-400 select-all border border-white/5">
              npx @bubblewrap/cli init --manifest=manifest.webmanifest
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-900/80 border-t border-white/10 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
