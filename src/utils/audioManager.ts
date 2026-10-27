/**
 * Web Audio API Engine for Virtual Cinema Spatial Acoustics,
 * Bass Boost, and High-Gain Audio Enhancement.
 */

class VRAudioEngine {
  private ctx: AudioContext | null = null;
  private sourceNode: MediaElementAudioSourceNode | null = null;
  private gainNode: GainNode | null = null;
  private bassNode: BiquadFilterNode | null = null;
  private isConnected: boolean = false;

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public attachVideo(video: HTMLVideoElement) {
    if (this.isConnected) return;
    try {
      this.initContext();
      if (!this.ctx) return;

      this.sourceNode = this.ctx.createMediaElementSource(video);

      // 1. Cinema Bass Boost filter (80Hz low-shelf)
      this.bassNode = this.ctx.createBiquadFilter();
      this.bassNode.type = 'lowshelf';
      this.bassNode.frequency.value = 90;
      this.bassNode.gain.value = 6.0; // +6dB deep theater rumble

      // 2. High-gain amplifier (allows volume boost > 100%)
      this.gainNode = this.ctx.createGain();
      this.gainNode.gain.value = 1.0;

      // Connect pipeline: Video -> Bass -> Gain -> Destination
      this.sourceNode.connect(this.bassNode);
      this.bassNode.connect(this.gainNode);
      this.gainNode.connect(this.ctx.destination);

      this.isConnected = true;
    } catch (e) {
      console.warn('Web Audio attachment failed:', e);
    }
  }

  public setVolumeBoost(boost: number) {
    if (this.gainNode) {
      this.gainNode.gain.value = Math.max(0.1, Math.min(2.5, boost));
    }
  }

  public setBassEnhance(enabled: boolean) {
    if (this.bassNode) {
      this.bassNode.gain.value = enabled ? 6.5 : 0.0;
    }
  }

  /**
   * Generates a soft futuristic VR spatial interaction blip
   */
  public playClickSound() {
    try {
      this.initContext();
      if (!this.ctx) return;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, this.ctx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, this.ctx.currentTime + 0.08); // A5

      gain.gain.setValueAtTime(0.08, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start();
      osc.stop(this.ctx.currentTime + 0.08);
    } catch {
      // Audio might be blocked before first interaction
    }
  }
}

export const vrAudio = new VRAudioEngine();
