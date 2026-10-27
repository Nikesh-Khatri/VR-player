import React, { useState } from 'react';
import { MediaItem, StereoMode, ProjectionMode } from '../types/vr';
import { SAMPLE_VIDEOS } from '../constants/presets';
import {
  UploadCloud,
  Link as LinkIcon,
  Film,
  Play,
  Sparkles,
  Youtube,
  Copy,
  Check,
  AlertCircle,
  Download,
  Info,
} from 'lucide-react';

interface MediaSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectMedia: (item: MediaItem) => void;
  currentMediaId: string;
}

export const MediaSourceModal: React.FC<MediaSourceModalProps> = ({
  isOpen,
  onClose,
  onSelectMedia,
  currentMediaId,
}) => {
  const [activeTab, setActiveTab] = useState<'samples' | 'upload' | 'url' | 'youtube'>('samples');
  const [urlInput, setUrlInput] = useState('');
  const [urlTitle, setUrlTitle] = useState('');
  const [urlStereo, setUrlStereo] = useState<StereoMode>('sbs');
  const [urlProjection, setUrlProjection] = useState<ProjectionMode>('curved');
  const [dragActive, setDragActive] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const isYouTubeUrl = /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)/i.test(urlInput);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleFileUpload = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    const objectUrl = URL.createObjectURL(file);
    const fileName = file.name.toLowerCase();

    // Auto-detect hints from filename
    let detectedStereo: StereoMode = 'sbs';
    let detectedProj: ProjectionMode = 'curved';

    if (fileName.includes('360') || fileName.includes('equirectangular')) {
      detectedProj = 'sphere360';
    } else if (fileName.includes('180') || fileName.includes('vr180')) {
      detectedProj = 'dome180';
    }

    if (fileName.includes('tb') || fileName.includes('ou') || fileName.includes('topbottom') || fileName.includes('overunder')) {
      detectedStereo = 'top-bottom';
    } else if (fileName.includes('2d') || fileName.includes('mono')) {
      detectedStereo = 'mono';
    }

    const item: MediaItem = {
      id: `local-${Date.now()}`,
      title: file.name,
      sourceType: 'file',
      url: objectUrl,
      stereoMode: detectedStereo,
      projectionMode: detectedProj,
      description: `Local Video File (${(file.size / (1024 * 1024)).toFixed(1)} MB)`,
    };

    onSelectMedia(item);
    onClose();
  };

  const handleUrlSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    const item: MediaItem = {
      id: `url-${Date.now()}`,
      title: urlTitle.trim() || 'Online Video Stream',
      sourceType: 'url',
      url: urlInput.trim(),
      stereoMode: urlStereo,
      projectionMode: urlProjection,
      description: 'Network Stream / Video URL',
    };

    onSelectMedia(item);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-md p-0 sm:p-4 pointer-events-auto">
      <div className="w-full sm:max-w-xl max-h-[88vh] bg-slate-950 border-t sm:border border-white/10 rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden text-slate-200 flex flex-col">
        {/* Mobile Drag Indicator */}
        <div className="w-12 h-1.5 bg-slate-700/80 rounded-full mx-auto my-2 sm:hidden shrink-0" />

        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Film className="w-5 h-5 text-sky-400" />
            <h2 className="text-base font-semibold text-white">Select Video Source</h2>
          </div>
          <button
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center text-slate-400 hover:text-white transition-colors text-lg cursor-pointer"
          >
            ✕
          </button>
        </div>

        {/* Tab Controls (Horizontally scrollable on mobile) */}
        <div className="flex border-b border-white/10 px-3 sm:px-6 pt-1 sm:pt-2 gap-2 sm:gap-6 text-xs font-medium overflow-x-auto scrollbar-none flex-nowrap shrink-0">
          <button
            onClick={() => setActiveTab('samples')}
            className={`min-h-[44px] pb-2 sm:pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2 sm:px-0 ${
              activeTab === 'samples'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Samples</span>
          </button>

          <button
            onClick={() => setActiveTab('upload')}
            className={`min-h-[44px] pb-2 sm:pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2 sm:px-0 ${
              activeTab === 'upload'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5" />
            <span>Local File</span>
          </button>

          <button
            onClick={() => setActiveTab('url')}
            className={`min-h-[44px] pb-2 sm:pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2 sm:px-0 ${
              activeTab === 'url'
                ? 'border-sky-500 text-sky-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <LinkIcon className="w-3.5 h-3.5" />
            <span>Direct URL</span>
          </button>

          <button
            onClick={() => setActiveTab('youtube')}
            className={`min-h-[44px] pb-2 sm:pb-3 border-b-2 transition-colors cursor-pointer flex items-center gap-1.5 whitespace-nowrap shrink-0 px-2 sm:px-0 ${
              activeTab === 'youtube'
                ? 'border-red-500 text-red-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Youtube className="w-3.5 h-3.5 text-red-500" />
            <span>YouTube Guide</span>
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-4 sm:p-6 flex-1 overflow-y-auto overscroll-contain">
          {activeTab === 'samples' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-400 mb-2">
                Choose an instant stereoscopic test pattern or sample clip to evaluate SBS and camera properties:
              </p>
              {SAMPLE_VIDEOS.map((sample) => (
                <button
                  key={sample.id}
                  onClick={() => {
                    onSelectMedia(sample);
                    onClose();
                  }}
                  className={`w-full text-left p-3.5 rounded-xl border text-xs transition-all cursor-pointer flex items-center justify-between group ${
                    currentMediaId === sample.id
                      ? 'bg-sky-500/15 border-sky-500/40 text-white'
                      : 'bg-slate-900/60 border-white/5 text-slate-300 hover:bg-slate-900 hover:border-white/15'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white group-hover:text-sky-300 transition-colors">
                        {sample.title}
                      </span>
                      {sample.sourceType === 'procedural' && (
                        <span className="text-[10px] text-sky-400 font-mono-numbers bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                          LIVE 60FPS SYNTH
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">{sample.description}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono-numbers">
                      <span>Stereo: {sample.stereoMode.toUpperCase()}</span>
                      <span>·</span>
                      <span>Projection: {sample.projectionMode}</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-full bg-slate-800 group-hover:bg-sky-500 group-hover:text-white transition-colors text-slate-300">
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </div>
                </button>
              ))}
            </div>
          )}

          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  handleFileUpload(e.dataTransfer.files);
                }}
                className={`border-2 border-dashed rounded-2xl p-8 text-center transition-colors ${
                  dragActive
                    ? 'border-sky-500 bg-sky-500/10'
                    : 'border-white/15 bg-slate-900/40 hover:border-white/30'
                }`}
              >
                <UploadCloud className="w-10 h-10 text-sky-400 mx-auto mb-3" />
                <h3 className="text-sm font-medium text-white mb-1">
                  Drag and drop your SBS / VR video here
                </h3>
                <p className="text-xs text-slate-400 mb-4">
                  Supports MP4, WebM, MKV with Side-by-Side (SBS), Over-Under, or 180°/360° tracks
                </p>
                <label className="inline-flex items-center px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white text-xs font-medium rounded-lg cursor-pointer transition-colors shadow-sm">
                  <span>Browse Local Files</span>
                  <input
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                </label>
              </div>
              <p className="text-[11px] text-slate-500 text-center">
                All video decoding happens entirely in your browser using hardware GPU acceleration. No data is uploaded to any server.
              </p>
            </div>
          )}

          {activeTab === 'url' && (
            <form onSubmit={handleUrlSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-medium mb-1">Video Stream URL</label>
                <input
                  type="url"
                  placeholder="https://domain.com/video_sbs.mp4"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 font-mono-numbers"
                  required
                />
              </div>

              {/* YouTube In-Line Detection Alert */}
              {isYouTubeUrl && (
                <div className="p-3 bg-red-950/40 border border-red-500/30 rounded-xl space-y-2.5 text-slate-300 animate-in fade-in duration-150">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <div className="font-semibold text-red-300 text-xs">YouTube URL Detected</div>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        Standard YouTube webpage links cannot be mapped onto WebGL 3D surfaces due to browser Cross-Origin (CORS) security restrictions.
                      </p>
                    </div>
                  </div>

                  <div className="bg-slate-900/90 rounded-lg p-2.5 border border-white/5 space-y-1.5 text-[11px]">
                    <div className="text-sky-300 font-medium flex items-center gap-1.5">
                      <Download className="w-3.5 h-3.5" />
                      <span>Recommended: Save clip via yt-dlp, then drop into Local Files</span>
                    </div>
                    <p className="text-slate-400 text-[10px]">
                      Copy and run this command in your terminal to save the video file:
                    </p>
                    <div className="flex items-center justify-between bg-black/70 px-2.5 py-1.5 rounded font-mono text-[10px] text-emerald-400 border border-white/10">
                      <span className="truncate mr-2">yt-dlp -f &quot;bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]&quot; &quot;{urlInput.trim()}&quot;</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(`yt-dlp -f "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]" "${urlInput.trim()}"`, 'cmd-quick')}
                        className="shrink-0 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        title="Copy command"
                      >
                        {copiedKey === 'cmd-quick' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-400 pt-0.5">
                    <span>Need more details on streaming options?</span>
                    <button
                      type="button"
                      onClick={() => setActiveTab('youtube')}
                      className="text-sky-400 hover:text-sky-300 underline font-medium cursor-pointer"
                    >
                      Open YouTube VR Guide →
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-300 font-medium mb-1">Title (Optional)</label>
                <input
                  type="text"
                  placeholder="My VR Video"
                  value={urlTitle}
                  onChange={(e) => setUrlTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-medium mb-1">Stereo Format</label>
                  <select
                    value={urlStereo}
                    onChange={(e) => setUrlStereo(e.target.value as StereoMode)}
                    className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="sbs">Side-by-Side (SBS)</option>
                    <option value="top-bottom">Over-Under (TB)</option>
                    <option value="mono">2D Monoscopic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-300 font-medium mb-1">Projection</label>
                  <select
                    value={urlProjection}
                    onChange={(e) => setUrlProjection(e.target.value as ProjectionMode)}
                    className="w-full px-3 py-2 bg-slate-900 border border-white/10 rounded-lg text-white focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    <option value="curved">Curved Cinema</option>
                    <option value="flat">Flat Screen</option>
                    <option value="dome180">VR 180° Dome</option>
                    <option value="sphere360">VR 360° Sphere</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 bg-sky-500 hover:bg-sky-400 text-white font-medium rounded-lg transition-colors cursor-pointer text-xs shadow-sm mt-2"
              >
                Load Stream URL
              </button>
            </form>
          )}

          {activeTab === 'youtube' && (
            <div className="space-y-4 text-xs text-slate-300">
              {/* Header explanation banner */}
              <div className="p-3.5 bg-slate-900/90 border border-white/10 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-white font-semibold">
                  <Youtube className="w-4 h-4 text-red-500" />
                  <span>How to Play YouTube VR / 180° / 360° Videos</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Web browsers enforce strict Cross-Origin Resource Sharing (CORS) security rules: WebGL 3D textures can only sample pixels from direct video streams served with CORS headers. Because standard YouTube webpage embeds block cross-origin texture access, here are the two verified ways to play them:
                </p>
              </div>

              {/* Method 1: Local File Playback */}
              <div className="p-4 bg-slate-900/60 border border-white/10 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center text-[10px]">
                      1
                    </span>
                    <span>Method 1: Download & Play Locally (Recommended)</span>
                  </div>
                  <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Highest Quality · Zero Lag
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Download the VR video file to your computer or phone using <code className="text-sky-300 font-mono">yt-dlp</code> or any video downloader, then drop it into the <strong>Load Local Video File</strong> tab. It plays with full hardware GPU decoding at 4K 60FPS.
                </p>

                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 font-medium">Terminal Command:</div>
                  <div className="flex items-center justify-between bg-black/80 px-3 py-2 rounded-lg font-mono text-[11px] text-emerald-400 border border-white/10">
                    <span className="truncate mr-2">yt-dlp -f &quot;bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]&quot; &quot;&lt;YOUTUBE_URL&gt;&quot;</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('yt-dlp -f "bv*[ext=mp4]+ba[ext=m4a]/b[ext=mp4]" "<YOUTUBE_URL>"', 'cmd-ytdlp')}
                      className="shrink-0 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy command"
                    >
                      {copiedKey === 'cmd-ytdlp' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Method 2: Extract Direct Stream URL */}
              <div className="p-4 bg-slate-900/60 border border-white/10 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-white flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 flex items-center justify-center text-[10px]">
                      2
                    </span>
                    <span>Method 2: Extract Direct Stream URL</span>
                  </div>
                  <span className="text-[10px] text-sky-400 bg-sky-500/10 px-2 py-0.5 rounded-full border border-sky-500/20">
                    Direct Streaming
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  Extract the direct MP4 / HLS stream URL using <code className="text-sky-300 font-mono">yt-dlp -g</code> or an Invidious / Cobalt proxy with CORS enabled, then paste the direct stream link into the <strong>Direct Video URL</strong> tab.
                </p>

                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 font-medium">Extract Stream URL Command:</div>
                  <div className="flex items-center justify-between bg-black/80 px-3 py-2 rounded-lg font-mono text-[11px] text-sky-300 border border-white/10">
                    <span className="truncate mr-2">yt-dlp -g -f &quot;best[ext=mp4]&quot; &quot;&lt;YOUTUBE_URL&gt;&quot;</span>
                    <button
                      type="button"
                      onClick={() => copyToClipboard('yt-dlp -g -f "best[ext=mp4]" "<YOUTUBE_URL>"', 'cmd-stream')}
                      className="shrink-0 text-slate-400 hover:text-white transition-colors cursor-pointer"
                      title="Copy command"
                    >
                      {copiedKey === 'cmd-stream' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Recommended VR Projection Settings */}
              <div className="p-3.5 bg-slate-900/40 border border-white/5 rounded-xl space-y-2">
                <div className="font-semibold text-white text-[11px] flex items-center gap-1.5">
                  <Info className="w-3.5 h-3.5 text-sky-400" />
                  <span>VR Projection Matching Guide</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px] text-slate-400">
                  <div className="p-2 bg-black/40 rounded-lg border border-white/5">
                    <div className="text-white font-medium mb-0.5">VR 180° Videos</div>
                    <div>Projection: <strong>VR 180° Dome</strong></div>
                    <div>Stereo: <strong>Side-by-Side (SBS)</strong></div>
                  </div>
                  <div className="p-2 bg-black/40 rounded-lg border border-white/5">
                    <div className="text-white font-medium mb-0.5">360° Panoramic Videos</div>
                    <div>Projection: <strong>VR 360° Sphere</strong></div>
                    <div>Stereo: <strong>Monoscopic or SBS</strong></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
