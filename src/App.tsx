import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CameraProperties,
  VideoColorProperties,
  StereoMode,
  ProjectionMode,
  OutputMode,
  MediaItem,
  GyroMode,
} from './types/vr';
import {
  DEFAULT_CAMERA_PROPERTIES,
  DEFAULT_COLOR_PROPERTIES,
  SAMPLE_VIDEOS,
} from './constants/presets';
import { StereoscopicTestPatternGenerator } from './utils/testPatternGenerator';
import { VRCanvas } from './components/VRCanvas';
import { CardboardOverlay } from './components/CardboardOverlay';
import { Header } from './components/Header';
import { ControlsBar } from './components/ControlsBar';
import { OpticsPanel } from './components/OpticsPanel';
import { FormatPanel } from './components/FormatPanel';
import { DisplayPanel } from './components/DisplayPanel';
import { MediaSourceModal } from './components/MediaSourceModal';
import { AndroidInstallModal } from './components/AndroidInstallModal';
import { DebugOverlay } from './components/DebugOverlay';
import { usePWAInstall } from './hooks/usePWAInstall';
import { vrAudio } from './utils/audioManager';
import { telemetry } from './utils/telemetryManager';
import { Eye, HelpCircle, Smartphone, Film, FolderOpen, UploadCloud, Disc, Box, Tv, Sliders, Sun } from 'lucide-react';


export default function App() {
  // PWA & Android Installation Hook
  const {
    isInstallable,
    isInstalled,
    isAndroid,
    isWakeLockActive,
    enableWakeLock,
    releaseWakeLock,
    lockLandscape,
    install,
  } = usePWAInstall();

  // State: Default to null so video decoders and procedural loops don't lag the PC on startup
  const [currentMedia, setCurrentMedia] = useState<MediaItem | null>(null);
  const [stereoMode, setStereoMode] = useState<StereoMode>('sbs');
  const [projectionMode, setProjectionMode] = useState<ProjectionMode>('dome180');
  const [outputMode, setOutputMode] = useState<OutputMode>('split');

  const [cameraProperties, setCameraProperties] = useState<CameraProperties>(DEFAULT_CAMERA_PROPERTIES);
  const [colorProperties, setColorProperties] = useState<VideoColorProperties>(DEFAULT_COLOR_PROPERTIES);

  // Playback state: Paused on boot until user picks a source
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [volume, setVolume] = useState<number>(1.0);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [playbackRate, setPlaybackRate] = useState<number>(1.0);
  const [isLooping, setIsLooping] = useState<boolean>(true);

  // UI state
  const [activePanel, setActivePanel] = useState<'optics' | 'format' | 'display' | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [isDebugOpen, setIsDebugOpen] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isHudVisible, setIsHudVisible] = useState<boolean>(true);
  const [isUiHidden, setIsUiHidden] = useState<boolean>(false);
  const [showQuickHelp, setShowQuickHelp] = useState<boolean>(false);
  const [recenterTrigger, setRecenterTrigger] = useState<number>(0);
  const [calibrateTrigger, setCalibrateTrigger] = useState<number>(0);
  const [, setVideoReady] = useState<boolean>(false);

  // References
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const testPatternRef = useRef<StereoscopicTestPatternGenerator | null>(null);
  const hudTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Android OSD Toast state & handlers
  const [osdToast, setOsdToast] = useState<{ icon: string; title: string; detail: string } | null>(null);
  const osdTimerRef = useRef<NodeJS.Timeout | null>(null);

  const triggerOsd = useCallback((icon: string, title: string, detail: string) => {
    if (osdTimerRef.current) clearTimeout(osdTimerRef.current);
    setOsdToast({ icon, title, detail });
    osdTimerRef.current = setTimeout(() => {
      setOsdToast(null);
    }, 1400);
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      setVideoReady(true);
    }
  }, []);

  // Initialize procedural generator on standby without running an animation loop
  useEffect(() => {
    const generator = new StereoscopicTestPatternGenerator(1920, 1080);
    // Kept idle until user selects procedural test pattern
    testPatternRef.current = generator;

    return () => {
      generator.destroy();
    };
  }, []);

  // Update media source: Only decodes and plays when a source is selected
  useEffect(() => {
    const video = videoRef.current;
    if (!currentMedia) {
      if (video) {
        video.pause();
        video.removeAttribute('src');
        video.load();
      }
      if (testPatternRef.current) {
        testPatternRef.current.stop();
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    if (currentMedia.sourceType === 'procedural') {
      if (video) {
        video.pause();
        video.removeAttribute('src');
      }
      if (testPatternRef.current) {
        testPatternRef.current.start();
      }
      setIsPlaying(true);
      setCurrentTime(0);
      setDuration(0);
    } else {
      if (testPatternRef.current) {
        testPatternRef.current.stop();
      }
      if (video && currentMedia.url) {
        video.src = currentMedia.url;
        video.load();
        video.play().then(() => {
          setIsPlaying(true);
        }).catch((err) => {
          console.warn('Auto-play was prevented:', err);
          setIsPlaying(false);
        });
      }
    }

    setStereoMode(currentMedia.stereoMode);
    setProjectionMode(currentMedia.projectionMode);
  }, [currentMedia]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const objectUrl = URL.createObjectURL(file);
    const fileName = file.name.toLowerCase();

    let detectedStereo: StereoMode = 'sbs';
    let detectedProj: ProjectionMode = 'dome180';
    if (fileName.includes('360')) detectedProj = 'sphere360';
    else if (fileName.includes('cinema') || fileName.includes('flat')) detectedProj = 'curved';
    if (fileName.includes('tb') || fileName.includes('topbottom')) detectedStereo = 'top-bottom';
    else if (fileName.includes('mono') || fileName.includes('2d')) detectedStereo = 'mono';

    const item: MediaItem = {
      id: `local-${Date.now()}`,
      title: file.name,
      sourceType: 'file',
      url: objectUrl,
      stereoMode: detectedStereo,
      projectionMode: detectedProj,
      description: `Local Video File (${(file.size / (1024 * 1024)).toFixed(1)} MB)`,
    };
    setCurrentMedia(item);
    telemetry.log('media', `Loaded local video file: ${file.name}`);
  };

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration || 0);
    const handleEnded = () => {
      telemetry.log('media', 'Video reached end of playback', { isLooping });
      if (!isLooping) setIsPlaying(false);
    };
    const handlePlay = () => telemetry.log('media', 'Video playback started');
    const handlePause = () => telemetry.log('media', 'Video playback paused', { atTime: video.currentTime.toFixed(1) });
    const handleLoadedMetadata = () => {
      telemetry.log('media', `Video metadata loaded (${video.videoWidth}x${video.videoHeight}, duration: ${video.duration.toFixed(1)}s)`, {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        duration: video.duration,
      });
    };
    const handleError = () => telemetry.log('media', 'Video playback error encountered', { error: video.error?.message });

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('loadedmetadata', handleLoadedMetadata);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('loadedmetadata', handleLoadedMetadata);
      video.removeEventListener('error', handleError);
    };
  }, [isLooping]);

  // Fullscreen change listener
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // HUD Toggle & Autohide logic
  const toggleHud = useCallback(() => {
    if (activePanel) {
      setActivePanel(null);
      return;
    }
    setIsHudVisible((prev) => {
      const next = !prev;
      if (hudTimeoutRef.current) {
        clearTimeout(hudTimeoutRef.current);
      }
      // If toggled visible while playing, auto-hide after 4 seconds of inactivity
      if (next && isPlaying) {
        hudTimeoutRef.current = setTimeout(() => {
          setIsHudVisible(false);
        }, 4000);
      }
      return next;
    });
  }, [activePanel, isPlaying]);

  const resetHudTimer = useCallback(() => {
    setIsHudVisible(true);
    if (hudTimeoutRef.current) {
      clearTimeout(hudTimeoutRef.current);
    }
    // Only auto-hide if no modal or settings panel is open
    if (!activePanel && !isMediaModalOpen && !showQuickHelp && isPlaying) {
      hudTimeoutRef.current = setTimeout(() => {
        setIsHudVisible(false);
      }, 3500);
    }
  }, [activePanel, isMediaModalOpen, showQuickHelp, isPlaying]);

  // Hide Everything (Pure Video Mode) Toggle
  const toggleHideAllUi = useCallback(() => {
    setIsUiHidden((prev) => {
      const next = !prev;
      if (next) {
        setIsHudVisible(false);
        setActivePanel(null);
        setIsDebugOpen(false);
        setShowQuickHelp(false);
        triggerOsd('👁️‍🗨️', 'Pure Video', 'All UI Hidden • Tap Anywhere to Restore');
      } else {
        setIsHudVisible(true);
        resetHudTimer();
      }
      return next;
    });
  }, [triggerOsd, resetHudTimer]);

  // Single-tap / click on canvas: if in pure video mode, restore UI; otherwise toggle HUD
  const handleCanvasClick = useCallback(() => {
    if (isUiHidden) {
      setIsUiHidden(false);
      setIsHudVisible(true);
      resetHudTimer();
    } else {
      toggleHud();
    }
  }, [isUiHidden, toggleHud, resetHudTimer]);

  useEffect(() => {
    const handleMouseMove = () => {
      // Only keep timer alive if HUD is already visible
      if (isHudVisible && isPlaying && !activePanel) {
        if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
        hudTimeoutRef.current = setTimeout(() => {
          setIsHudVisible(false);
        }, 3500);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (hudTimeoutRef.current) clearTimeout(hudTimeoutRef.current);
    };
  }, [isHudVisible, isPlaying, activePanel]);

  // Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept when typing in inputs
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      switch (e.code) {
        case 'Space':
          e.preventDefault();
          togglePlay();
          break;
        case 'KeyF':
          e.preventDefault();
          toggleFullscreen();
          break;
        case 'KeyR':
          e.preventDefault();
          handleRecenter();
          break;
        case 'KeyC':
          e.preventDefault();
          setOutputMode((prev) => (prev === 'split' ? 'single-left' : 'split'));
          break;
        case 'KeyS':
          e.preventDefault();
          setCameraProperties((prev) => ({ ...prev, eyeSwap: !prev.eyeSwap }));
          break;
        case 'KeyL':
          e.preventDefault();
          setCameraProperties((prev) => {
            const nextLocked = !prev.lockCamera;
            triggerOsd(nextLocked ? '🔒' : '🔓', 'Camera Lock', nextLocked ? 'Camera Locked (Fixed)' : 'Camera Unlocked');
            return {
              ...prev,
              lockCamera: nextLocked,
              gyroMode: nextLocked ? 'camera-locked' : 'dual-axis',
            };
          });
          break;
        case 'KeyZ':
          e.preventDefault();
          setCameraProperties((prev) => {
            const sequence: GyroMode[] = ['dual-axis', 'camera-locked', 'zero-drift', 'horizon-lock', 'full-3dof'];
            const currentIdx = sequence.indexOf(prev.gyroMode);
            const nextMode = sequence[(currentIdx + 1) % sequence.length];
            const isCamLocked = nextMode === 'camera-locked';
            triggerOsd(
              nextMode === 'dual-axis' ? '🛡️' : nextMode === 'camera-locked' ? '🔒' : nextMode === 'zero-drift' ? '↕️' : '🌐',
              'Gyro Mode',
              nextMode === 'dual-axis' ? 'Dual-Axis Anti-Drift (H+V)' : nextMode === 'camera-locked' ? 'Camera Locked (Fixed)' : nextMode === 'zero-drift' ? 'Vertical Look Only' : nextMode === 'horizon-lock' ? 'Horizon Anchor' : 'Full 360 Look'
            );
            return {
              ...prev,
              gyroMode: nextMode,
              lockCamera: isCamLocked,
              lockCameraRoll: nextMode !== 'full-3dof',
              enableHorizontalTracking: nextMode !== 'zero-drift' && !isCamLocked,
              enableVerticalTracking: true,
            };
          });
          break;
        case 'KeyM':

          e.preventDefault();
          toggleMute();
          break;
        case 'KeyH':
          e.preventDefault();
          toggleHud();
          break;
        case 'KeyD':
          e.preventDefault();
          toggleDebug();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          seekDelta(-5);
          break;
        case 'ArrowRight':
          e.preventDefault();
          seekDelta(5);
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(0.1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(-0.1);
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [volume, isMuted]);

  // Controls Handlers
  const togglePlay = () => {
    if (!currentMedia) {
      setIsMediaModalOpen(true);
      return;
    }
    if (currentMedia.sourceType === 'procedural') {
      if (testPatternRef.current) {
        if (isPlaying) {
          testPatternRef.current.stop();
          setIsPlaying(false);
        } else {
          testPatternRef.current.start();
          setIsPlaying(true);
        }
      }
    } else {
      const video = videoRef.current;
      if (!video) return;
      if (video.paused) {
        video.play().then(() => setIsPlaying(true)).catch(console.warn);
      } else {
        video.pause();
        setIsPlaying(false);
      }
    }
    resetHudTimer();
  };

  const handleSeek = (newTime: number) => {
    const video = videoRef.current;
    if (video && currentMedia && currentMedia.sourceType !== 'procedural') {
      video.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const seekDelta = (delta: number) => {
    const video = videoRef.current;
    if (video && currentMedia && currentMedia.sourceType !== 'procedural') {
      video.currentTime = Math.max(0, Math.min(video.duration || 0, video.currentTime + delta));
    }
  };

  const changeVolume = (delta: number) => {
    const newVol = Math.max(0, Math.min(1, volume + delta));
    setVolume(newVol);
    if (videoRef.current) videoRef.current.volume = newVol;
    if (isMuted && newVol > 0) setIsMuted(false);
  };

  const handleVolumeChange = (newVol: number) => {
    setVolume(newVol);
    if (videoRef.current) {
      videoRef.current.volume = newVol;
    }
    if (isMuted && newVol > 0) {
      setIsMuted(false);
      if (videoRef.current) videoRef.current.muted = false;
    }
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (videoRef.current) {
      videoRef.current.muted = nextMuted;
    }
  };

  const handlePlaybackRateChange = (rate: number) => {
    setPlaybackRate(rate);
    if (videoRef.current) {
      videoRef.current.playbackRate = rate;
    }
  };

  const toggleLoop = () => {
    const next = !isLooping;
    setIsLooping(next);
    if (videoRef.current) {
      videoRef.current.loop = next;
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen().catch((err) => {
        console.warn('Exit fullscreen error:', err);
      });
    }
  };

  const handleRecenter = useCallback(() => {
    setRecenterTrigger((prev) => prev + 1);
  }, []);

  const handleCalibrateSensors = useCallback(() => {
    setCalibrateTrigger((prev) => prev + 1);
  }, []);

  const handleCalibrationComplete = useCallback((biasDeg: number) => {
    triggerOsd('🎯', 'Gyro Calibrated', `Bias: ${biasDeg.toFixed(2)}°/s nullified`);
  }, [triggerOsd]);

  const toggleDebug = () => {
    setIsDebugOpen((prev) => !prev);
  };

  // Sync Audio enhancements
  useEffect(() => {
    vrAudio.setVolumeBoost(colorProperties.volumeBoost);
    vrAudio.setBassEnhance(colorProperties.bassEnhance);
  }, [colorProperties.volumeBoost, colorProperties.bassEnhance]);

  // Attach video to Web Audio on user play
  useEffect(() => {
    if (videoRef.current && isPlaying && currentMedia && currentMedia.sourceType !== 'procedural') {
      vrAudio.attachVideo(videoRef.current);
    }
  }, [isPlaying, currentMedia]);

  // Android Back Gesture & PopState handling
  useEffect(() => {
    const handlePopState = () => {
      if (activePanel) {
        setActivePanel(null);
      } else if (isDebugOpen) {
        setIsDebugOpen(false);
      } else if (isMediaModalOpen) {
        setIsMediaModalOpen(false);
      } else if (isInstallModalOpen) {
        setIsInstallModalOpen(false);
      } else if (showQuickHelp) {
        setShowQuickHelp(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activePanel, isDebugOpen, isMediaModalOpen, isInstallModalOpen, showQuickHelp]);

  const handleAdjustBrightness = useCallback((delta: number) => {
    setColorProperties((prev) => {
      const nextVal = Math.max(0.4, Math.min(1.8, prev.brightness + delta));
      triggerOsd('☀️', 'Brightness', `${Math.round(nextVal * 100)}%`);
      return { ...prev, brightness: nextVal };
    });
  }, [triggerOsd]);

  const handleAdjustVolume = useCallback((delta: number) => {
    setVolume((prev) => {
      const nextVol = Math.max(0, Math.min(1.0, prev + delta));
      if (videoRef.current) videoRef.current.volume = nextVol;
      setIsMuted(nextVol === 0);
      triggerOsd(nextVol === 0 ? '🔇' : nextVol > 0.5 ? '🔊' : '🔉', 'Volume', `${Math.round(nextVol * 100)}%`);
      return nextVol;
    });
  }, [triggerOsd]);

  const handleAdjustIPD = (delta: number) => {
    setCameraProperties((prev) => {
      const nextIpd = Math.max(0.045, Math.min(0.080, prev.ipd + delta));
      triggerOsd('👁️', 'Eye IPD', `${(nextIpd * 1000).toFixed(1)}mm`);
      return { ...prev, ipd: nextIpd };
    });
  };

  const handleAdjustFOV = useCallback((delta: number) => {
    setCameraProperties((prev) => {
      const nextFov = Math.max(35, Math.min(125, prev.fov + delta));
      triggerOsd('🔍', 'Zoom / FOV', `${Math.round(nextFov)}°`);
      return { ...prev, fov: nextFov };
    });
  }, [triggerOsd]);

  const handleSeekDelta = useCallback((deltaSec: number) => {
    seekDelta(deltaSec);
    triggerOsd(deltaSec > 0 ? '⏩' : '⏪', 'Seek', deltaSec > 0 ? `+${deltaSec}s` : `${deltaSec}s`);
  }, [triggerOsd]);

  const handleCycleProjection = () => {
    const modes: ProjectionMode[] = ['curved', 'flat', 'dome180', 'sphere360'];
    setProjectionMode((curr) => {
      const nextIdx = (modes.indexOf(curr) + 1) % modes.length;
      return modes[nextIdx];
    });
  };

  const updateCameraProps = (props: Partial<CameraProperties>) => {
    setCameraProperties((prev) => ({ ...prev, ...props }));
  };

  const updateColorProps = (props: Partial<VideoColorProperties>) => {
    setColorProperties((prev) => ({ ...prev, ...props }));
  };

  const togglePanel = (panel: 'optics' | 'format' | 'display') => {
    if (activePanel === panel) {
      setActivePanel(null);
    } else {
      window.history.pushState({ panel }, '');
      setActivePanel(panel);
    }
  };

  return (
    <div className="relative w-screen h-screen bg-black overflow-hidden select-none">
      {/* Offscreen HTML5 Video element (positioned offscreen instead of display:none so browser decodes video frames) */}
      <video
        ref={videoRef}
        crossOrigin={currentMedia?.url?.startsWith('blob:') ? undefined : 'anonymous'}
        playsInline
        webkit-playsinline="true"
        loop={isLooping}
        className="fixed top-0 left-0 w-px h-px opacity-0 pointer-events-none -z-50"
      />

      {/* 3D WebGL Stereoscopic Canvas Viewport */}
      <VRCanvas
        videoElement={videoRef.current}
        mediaUrl={currentMedia?.url || ''}
        currentMediaId={currentMedia?.id || ''}
        testPatternGenerator={testPatternRef.current}
        isProcedural={currentMedia?.sourceType === 'procedural'}
        stereoMode={stereoMode}
        projectionMode={projectionMode}
        outputMode={outputMode}
        cameraProperties={cameraProperties}
        colorProperties={colorProperties}
        recenterTrigger={recenterTrigger}
        calibrateTrigger={calibrateTrigger}
        onCalibrationComplete={handleCalibrationComplete}
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        onRecenterAction={handleRecenter}
        onAdjustIPD={handleAdjustIPD}
        onAdjustFOV={handleAdjustFOV}
        onCycleProjection={handleCycleProjection}
        onCanvasClick={handleCanvasClick}
        onAdjustBrightness={handleAdjustBrightness}
        onAdjustVolume={handleAdjustVolume}
        onSeekDelta={handleSeekDelta}
      />

      {/* Hidden local video file picker */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/*"
        onChange={handleFileSelect}
        className="hidden"
      />

      {/* Standby Mode Prompt (Shown when no media source is selected yet) */}
      {!currentMedia && (
        <div className="absolute inset-0 z-20 flex items-center justify-center p-3 sm:p-4 pointer-events-auto bg-black/40 backdrop-blur-xs overflow-y-auto">
          <div className="w-full max-w-lg max-h-[92vh] overflow-y-auto overscroll-contain bg-slate-950/95 backdrop-blur-xl border border-sky-500/30 rounded-2xl shadow-2xl p-4 sm:p-7 text-center space-y-4 sm:space-y-5 animate-in fade-in duration-200">
            {/* Visual Icon & Title */}
            <div className="space-y-1.5">
              <div className="inline-flex items-center justify-center p-2.5 sm:p-3 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 mb-0.5">
                <Film className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
                <span>OmniVR Stereoscopic Player</span>
                <span className="text-[10px] font-mono-numbers px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  STANDBY
                </span>
              </h1>
              <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
                Video playback and hardware decoders are completely idle to keep your device responsive and cool. Select a source below to start.
              </p>
            </div>

            {/* Primary Action Button */}
            <button
              onClick={() => setIsMediaModalOpen(true)}
              className="w-full min-h-[48px] py-3 px-4 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold text-sm rounded-xl transition-all cursor-pointer shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Browse All Media Sources</span>
            </button>

            {/* Quick Launch Cards */}
            <div className="space-y-2 pt-2 border-t border-white/10 text-left">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-1">
                Quick Launch Samples
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* Sample 1: True VR 180 */}
                <button
                  onClick={() => setCurrentMedia(SAMPLE_VIDEOS[0])}
                  className="min-h-[48px] p-2.5 sm:p-3 bg-slate-900/80 hover:bg-slate-850 hover:border-sky-500/50 border border-white/10 rounded-xl transition-all text-left flex items-start gap-2.5 cursor-pointer group active:scale-[0.98]"
                >
                  <Disc className="w-4 h-4 text-amber-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="font-semibold text-white group-hover:text-sky-300 transition-colors">
                      True VR 180°
                    </div>
                    <div className="text-[10px] text-slate-400">Procedural 3D depth dome</div>
                  </div>
                </button>

                {/* Sample 2: 360 Panoramic */}
                <button
                  onClick={() => setCurrentMedia(SAMPLE_VIDEOS[1])}
                  className="min-h-[48px] p-2.5 sm:p-3 bg-slate-900/80 hover:bg-slate-850 hover:border-sky-500/50 border border-white/10 rounded-xl transition-all text-left flex items-start gap-2.5 cursor-pointer group active:scale-[0.98]"
                >
                  <Box className="w-4 h-4 text-indigo-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="font-semibold text-white group-hover:text-sky-300 transition-colors">
                      Cosmic 360° VR
                    </div>
                    <div className="text-[10px] text-slate-400">Panoramic sphere flight</div>
                  </div>
                </button>

                {/* Sample 3: Big Buck Bunny 3D SBS */}
                <button
                  onClick={() => setCurrentMedia(SAMPLE_VIDEOS[2])}
                  className="min-h-[48px] p-2.5 sm:p-3 bg-slate-900/80 hover:bg-slate-850 hover:border-sky-500/50 border border-white/10 rounded-xl transition-all text-left flex items-start gap-2.5 cursor-pointer group active:scale-[0.98]"
                >
                  <Tv className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="font-semibold text-white group-hover:text-sky-300 transition-colors">
                      3D SBS Cinema
                    </div>
                    <div className="text-[10px] text-slate-400">Side-by-Side stereo theater</div>
                  </div>
                </button>

                {/* Local File Input trigger */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="min-h-[48px] p-2.5 sm:p-3 bg-slate-900/80 hover:bg-slate-850 hover:border-sky-500/50 border border-white/10 rounded-xl transition-all text-left flex items-start gap-2.5 cursor-pointer group active:scale-[0.98]"
                >
                  <UploadCloud className="w-4 h-4 text-sky-400 mt-0.5 shrink-0 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="font-semibold text-white group-hover:text-sky-300 transition-colors">
                      Local Video File
                    </div>
                    <div className="text-[10px] text-slate-400">Play MP4/WebM from device</div>
                  </div>
                </button>
              </div>
            </div>

            <div className="text-[11px] text-slate-500 font-sans pt-0.5">
              Press any source or drag file onto screen to begin
            </div>
          </div>
        </div>
      )}

      {/* Android Toast On-Screen Display (Brightness, Volume, Zoom, Seek) */}
      {osdToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 pointer-events-none transition-all duration-200">
          <div className="flex items-center gap-2.5 px-4 py-2 bg-slate-950/90 backdrop-blur-md border border-white/20 rounded-full shadow-2xl text-slate-100">
            <span className="text-base">{osdToast.icon}</span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xs font-medium text-slate-300">{osdToast.title}</span>
              <span className="text-xs font-bold font-mono-numbers text-sky-400">{osdToast.detail}</span>
            </div>
          </div>
        </div>
      )}


      {/* Cardboard Split Screen Overlay (Center Divider & Alignment Guides) */}
      {outputMode === 'split' && (
        <CardboardOverlay
          colorProperties={colorProperties}
          cameraProperties={cameraProperties}
          projectionMode={projectionMode}
          onSelectProjectionMode={setProjectionMode}
          isFullscreen={isFullscreen}
          onToggleFullscreen={toggleFullscreen}
          onRecenter={handleRecenter}
          onCalibrateSensors={handleCalibrateSensors}
          onChangeCameraProperties={updateCameraProps}
          onToggleTracking={(enabled) => updateCameraProps({ headTracking: enabled })}
          onToggleGyroMode={() => {
            const sequence: GyroMode[] = ['dual-axis', 'camera-locked', 'zero-drift', 'horizon-lock', 'full-3dof'];
            const currentIdx = sequence.indexOf(cameraProperties.gyroMode);
            const nextMode = sequence[(currentIdx + 1) % sequence.length];
            const isCamLocked = nextMode === 'camera-locked';
            updateCameraProps({
              gyroMode: nextMode,
              lockCamera: isCamLocked,
              lockCameraRoll: nextMode !== 'full-3dof',
              enableHorizontalTracking: nextMode !== 'zero-drift' && !isCamLocked,
              enableVerticalTracking: true,
            });
            triggerOsd(
              nextMode === 'dual-axis' ? '🛡️' : nextMode === 'camera-locked' ? '🔒' : nextMode === 'zero-drift' ? '↕️' : '🌐',
              'Gyro Mode',
              nextMode === 'dual-axis' ? 'Dual-Axis Anti-Drift (H+V)' : nextMode === 'camera-locked' ? 'Camera Locked (Fixed)' : nextMode === 'zero-drift' ? 'Vertical Look Only' : nextMode === 'horizon-lock' ? 'Horizon Anchor' : 'Full 360 Look'
            );
          }}
          isDebugMode={isDebugOpen}
          onToggleDebug={toggleDebug}
          isUiHidden={isUiHidden}
          onToggleHideAllUi={toggleHideAllUi}
        />
      )}

      {/* Top Header */}
      <Header
        outputMode={outputMode}
        onSelectOutputMode={(mode) => {
          setOutputMode(mode);
          if (mode === 'split') {
            enableWakeLock();
            lockLandscape();
            if (!document.fullscreenElement) {
              toggleFullscreen();
            }
          }
        }}
        projectionMode={projectionMode}
        onSelectProjectionMode={setProjectionMode}
        onOpenMediaModal={() => setIsMediaModalOpen(true)}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onRecenter={handleRecenter}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
        visible={!isUiHidden && (isHudVisible || activePanel !== null)}
        onToggleHud={toggleHud}
        isDebugMode={isDebugOpen}
        onToggleDebug={toggleDebug}
        hasSelectedSource={!!currentMedia}
        mediaTitle={currentMedia?.title}
      />

      {/* Mobile-Optimized Settings Bottom Sheet / Desktop Drawer */}
      {activePanel && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:justify-end sm:p-4 bg-black/60 backdrop-blur-sm pointer-events-auto"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setActivePanel(null);
            }
          }}
        >
          <div
            className="h-[88dvh] max-h-[88dvh] sm:h-auto sm:max-h-[85vh] w-full sm:w-[460px] bg-slate-950/98 border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden flex flex-col pointer-events-auto animate-in slide-in-from-bottom duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Mobile Sheet Grab Handle */}
            <div className="w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto my-2.5 sm:hidden shrink-0" />

            {/* Mobile-Friendly Segmented Panel Switcher */}
            <div className="flex items-center gap-1 p-1 bg-slate-900/90 rounded-xl border border-white/10 mx-3 sm:mx-4 mt-1 mb-2 shrink-0">
              <button
                onClick={() => setActivePanel('optics')}
                className={`flex-1 min-h-[40px] py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activePanel === 'optics'
                    ? 'bg-sky-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Optics & Gyro</span>
              </button>
              <button
                onClick={() => setActivePanel('format')}
                className={`flex-1 min-h-[40px] py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activePanel === 'format'
                    ? 'bg-sky-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>3D & VR</span>
              </button>
              <button
                onClick={() => setActivePanel('display')}
                className={`flex-1 min-h-[40px] py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap ${
                  activePanel === 'display'
                    ? 'bg-sky-500 text-slate-950 shadow-sm font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sun className="w-3.5 h-3.5" />
                <span>Display</span>
              </button>
            </div>

            <div
              className="flex-1 min-h-0 overflow-y-auto overscroll-contain touch-pan-y"
              style={{ WebkitOverflowScrolling: 'touch' }}
            >
              {activePanel === 'optics' && (
                <OpticsPanel
                  cameraProperties={cameraProperties}
                  onChange={updateCameraProps}
                  onClose={() => setActivePanel(null)}
                  onRecenter={handleRecenter}
                  onCalibrateSensors={handleCalibrateSensors}
                />
              )}
              {activePanel === 'format' && (
                <FormatPanel
                  stereoMode={stereoMode}
                  onStereoModeChange={setStereoMode}
                  projectionMode={projectionMode}
                  onProjectionModeChange={setProjectionMode}
                  cameraProperties={cameraProperties}
                  onCameraChange={updateCameraProps}
                  onClose={() => setActivePanel(null)}
                />
              )}
              {activePanel === 'display' && (
                <DisplayPanel
                  colorProperties={colorProperties}
                  onChange={updateColorProps}
                  onClose={() => setActivePanel(null)}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Quick Help Modal */}
      {showQuickHelp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 pointer-events-auto">
          <div className="w-full max-w-md bg-slate-950 border border-white/10 rounded-2xl shadow-2xl p-6 text-slate-200">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-5 h-5 text-sky-400" />
                <h3 className="font-semibold text-white">Keyboard & Gesture Controls</h3>
              </div>
              <button
                onClick={() => setShowQuickHelp(false)}
                className="text-slate-400 hover:text-white px-2 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="pb-1 border-b border-white/10 font-semibold text-sky-400">
                Android Touch Gestures:
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Tap Anywhere</span>
                <span className="font-mono-numbers text-sky-300">Toggle Title & Controls</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Swipe Left Edge Up/Down</span>
                <span className="font-mono-numbers text-sky-300">Brightness Control</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Swipe Right Edge Up/Down</span>
                <span className="font-mono-numbers text-sky-300">Volume Control</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Two-Finger Pinch</span>
                <span className="font-mono-numbers text-sky-300">Smooth Zoom (FOV)</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Double-Tap Screen</span>
                <span className="font-mono-numbers text-sky-300">Recenter Camera Ahead</span>
              </div>

              <div className="pt-2 pb-1 border-b border-white/10 font-semibold text-sky-400">
                Keyboard Shortcuts:
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Drag Mouse / Touch</span>
                <span className="font-mono-numbers text-sky-300">Look Around 360° / 180°</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Space</span>
                <span className="font-mono-numbers text-sky-300">Play / Pause</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">F</span>
                <span className="font-mono-numbers text-sky-300">Toggle Fullscreen</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">R</span>
                <span className="font-mono-numbers text-sky-300">Recenter Camera to Front</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">L</span>
                <span className="font-mono-numbers text-indigo-300">Lock / Unlock Camera Screen</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Z</span>
                <span className="font-mono-numbers text-emerald-300">Cycle Gyro & Anti-Drift Mode</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">C</span>
                <span className="font-mono-numbers text-sky-300">Switch Split VR / 2D</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">S</span>
                <span className="font-mono-numbers text-sky-300">Swap Left & Right Eyes</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">Left / Right Arrows</span>
                <span className="font-mono-numbers text-sky-300">Seek -5s / +5s</span>
              </div>
              <div className="flex justify-between py-1 border-b border-white/5">
                <span className="text-slate-400">H</span>
                <span className="font-mono-numbers text-sky-300">Toggle HUD Visibility</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-400">D</span>
                <span className="font-mono-numbers text-amber-300">VR Sensor Diagnostics & Debug</span>
              </div>
            </div>

            <button
              onClick={() => setShowQuickHelp(false)}
              className="mt-5 w-full py-2 bg-sky-500 hover:bg-sky-400 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors"
            >
              Got It
            </button>
          </div>
        </div>
      )}

      {/* Floating Toggle Pill when HUD is hidden */}
      {!isHudVisible && !isUiHidden && (
        <div className="absolute bottom-5 left-6 z-20 flex items-center gap-2 pointer-events-auto">
          <button
            onClick={toggleHud}
            className="flex items-center gap-2 px-3.5 py-2 bg-slate-950/85 hover:bg-slate-900 border border-white/15 hover:border-sky-500/50 rounded-full text-xs text-slate-200 hover:text-white shadow-2xl cursor-pointer transition-all hover:scale-105 active:scale-95 group"
            title="Show Title & Playback Controls (H or Tap Screen)"
          >
            <Eye className="w-3.5 h-3.5 text-sky-400 group-hover:text-sky-300" />
            <span className="font-medium text-[11px]">Show Controls</span>
          </button>
          <div className="hidden sm:block text-[11px] font-mono-numbers text-slate-400 bg-black/60 backdrop-blur-sm px-2.5 py-1.5 rounded-full border border-white/10 opacity-70">
            {currentMedia ? `${currentMedia.title} · ${projectionMode.toUpperCase()}` : 'Standby (No Source Selected)'}
          </div>
        </div>
      )}

      {/* Bottom Playback & Settings Controls Bar */}
      <ControlsBar
        isPlaying={isPlaying}
        onTogglePlay={togglePlay}
        currentTime={currentTime}
        duration={duration}
        onSeek={handleSeek}
        volume={volume}
        isMuted={isMuted}
        onVolumeChange={handleVolumeChange}
        onToggleMute={toggleMute}
        playbackRate={playbackRate}
        onPlaybackRateChange={handlePlaybackRateChange}
        isLooping={isLooping}
        onToggleLoop={toggleLoop}
        activePanel={activePanel}
        onTogglePanel={togglePanel}
        isProcedural={currentMedia?.sourceType === 'procedural'}
        visible={!isUiHidden && (isHudVisible || activePanel !== null)}
        onToggleHud={toggleHud}
        onToggleHideAllUi={toggleHideAllUi}
        isDebugMode={isDebugOpen}
        onToggleDebug={toggleDebug}
        hasSelectedSource={!!currentMedia}
        onRecenter={handleRecenter}
        onCalibrateSensors={handleCalibrateSensors}
        cameraProperties={cameraProperties}
        onToggleCameraLock={() => {
          setCameraProperties((prev) => {
            const nextLocked = !prev.lockCamera;
            triggerOsd(nextLocked ? '🔒' : '🔓', 'Camera Lock', nextLocked ? 'Camera Locked to Screen' : 'Camera Unlocked');
            return {
              ...prev,
              lockCamera: nextLocked,
              gyroMode: nextLocked ? 'camera-locked' : 'dual-axis',
            };
          });
        }}
      />

      {/* Source Selection Modal */}
      <MediaSourceModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onSelectMedia={(item) => setCurrentMedia(item)}
        currentMediaId={currentMedia?.id ?? ''}
      />

      {/* Android PWA & APK Installation Modal */}
      <AndroidInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        isInstallable={isInstallable}
        isInstalled={isInstalled}
        onInstall={install}
        isWakeLockActive={isWakeLockActive}
        onToggleWakeLock={() => {
          if (isWakeLockActive) releaseWakeLock();
          else enableWakeLock();
        }}
      />

      {/* VR Sensor Diagnostics & Debug Overlay */}
      <DebugOverlay
        isOpen={isDebugOpen}
        onClose={() => setIsDebugOpen(false)}
        outputMode={outputMode}
        showHorizonGuide={cameraProperties.showHorizonGuide ?? false}
        onToggleHorizonGuide={() => updateCameraProps({ showHorizonGuide: !cameraProperties.showHorizonGuide })}
      />


      {/* Help Trigger in bottom corner */}
      {!isUiHidden && (
        <button
          onClick={() => setShowQuickHelp(true)}
          className="absolute bottom-20 right-6 z-20 p-2 rounded-full bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-white border border-white/10 shadow-lg cursor-pointer transition-colors text-xs"
          title="Controls & Shortcuts"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}
