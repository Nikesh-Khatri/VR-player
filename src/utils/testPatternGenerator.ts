/**
 * Procedural Stereoscopic 3D Pattern Generator
 * Generates an active dual-eye (SBS) calibration scene with realistic horizontal
 * parallax disparity, floating 3D geometric wireframes, depth layers, and IPD targets.
 */
export class StereoscopicTestPatternGenerator {
  public canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private animId: number = 0;
  private startTime: number = performance.now();
  public isPlaying: boolean = true;
  private cubeRotX: number = 0;
  private cubeRotY: number = 0;

  constructor(width: number = 1920, height: number = 1080) {
    this.canvas = document.createElement('canvas');
    this.canvas.width = width;
    this.canvas.height = height;
    const context = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not create 2D canvas context');
    }
    this.ctx = context;
    this.draw(performance.now());
  }

  public start() {
    this.isPlaying = true;
    const loop = (time: number) => {
      if (!this.isPlaying) return;
      this.draw(time);
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  public stop() {
    this.isPlaying = false;
    if (this.animId) {
      cancelAnimationFrame(this.animId);
    }
  }

  private draw(timestamp: number) {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    const halfW = w / 2;

    const elapsed = (timestamp - this.startTime) / 1000;
    this.cubeRotX = elapsed * 0.8;
    this.cubeRotY = elapsed * 1.2;

    // Clear background with deep cosmic slate gradient
    ctx.fillStyle = '#060814';
    ctx.fillRect(0, 0, w, h);

    // Draw Left Eye (0 to halfW) and Right Eye (halfW to w)
    this.renderEye(0, 0, halfW, h, 'LEFT EYE (L)', -1, elapsed);
    this.renderEye(halfW, 0, halfW, h, 'RIGHT EYE (R)', 1, elapsed);

    // Center divider on the canvas
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    ctx.setLineDash([8, 8]);
    ctx.beginPath();
    ctx.moveTo(halfW, 0);
    ctx.lineTo(halfW, h);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  private renderEye(
    ox: number,
    oy: number,
    vw: number,
    vh: number,
    label: string,
    eyeSign: number, // -1 for Left, +1 for Right
    t: number
  ) {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(ox, oy, vw, vh);
    ctx.clip();

    const cx = ox + vw / 2;
    const cy = oy + vh / 2;

    // 1. Far Depth Layer (Background stars/nebula points: disparity = 0)
    for (let s = 0; s < 50; s++) {
      const sx = ox + ((s * 137.5) % vw);
      const sy = oy + ((s * 93.3) % vh);
      ctx.fillStyle = s % 2 === 0 ? 'rgba(56, 189, 248, 0.45)' : 'rgba(255, 255, 255, 0.5)';
      ctx.fillRect(sx, sy, 2, 2);
    }

    // 3. Middle Depth Layer - Floating Ring (Disparity = 12px)
    const midParallax = eyeSign * -12;
    ctx.strokeStyle = 'rgba(129, 140, 248, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(cx + midParallax, cy, 220, 0, Math.PI * 2);
    ctx.stroke();

    // 4. Rotating 3D Wireframe Cube in Center
    // The cube has stereoscopic disparity: Left eye looks slightly from left, Right from right
    const cubeParallax = eyeSign * -24; // Convergence disparity
    this.draw3DCube(ctx, cx + cubeParallax, cy, 140, this.cubeRotX, this.cubeRotY + eyeSign * 0.05);

    // 5. Near Foreground Bouncing Orbs (Large Disparity: strong pop-out effect)
    const bounceY = Math.sin(t * 2) * 120;
    const nearParallax = eyeSign * -36; // Strong negative parallax (pops out into room)

    // Glowing cyan/magenta orb
    const grad = ctx.createRadialGradient(
      cx + nearParallax,
      cy + bounceY,
      10,
      cx + nearParallax,
      cy + bounceY,
      60
    );
    grad.addColorStop(0, eyeSign < 0 ? '#38bdf8' : '#f43f5e');
    grad.addColorStop(0.5, eyeSign < 0 ? 'rgba(56, 189, 248, 0.4)' : 'rgba(244, 63, 94, 0.4)');
    grad.addColorStop(1, 'transparent');

    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx + nearParallax, cy + bounceY, 60, 0, Math.PI * 2);
    ctx.fill();

    // 6. Center Optical Crosshair (Screen plane: zero disparity for zero eyestrain focus)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 20, cy);
    ctx.lineTo(cx + 20, cy);
    ctx.moveTo(cx, cy - 20);
    ctx.lineTo(cx, cy + 20);
    ctx.stroke();

    // 7. Eye Identification Banner & Typography
    ctx.fillStyle = eyeSign < 0 ? '#38bdf8' : '#fb7185';
    ctx.font = 'bold 28px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, cx, oy + 80);

    // IPD Convergence Ruler at Bottom
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '14px "JetBrains Mono", monospace';
    ctx.fillText('STEREOSCOPIC SBS CALIBRATION • PARALLAX: ACTIVE', cx, oy + vh - 80);
    ctx.fillStyle = 'rgba(148, 163, 184, 0.8)';
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillText(`T: ${t.toFixed(2)}s  |  DISPARITY: ${(nearParallax).toFixed(1)}px  |  60 FPS`, cx, oy + vh - 55);

    ctx.restore();
  }

  private draw3DCube(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number,
    rotX: number,
    rotY: number
  ) {
    const half = size / 2;
    // 8 vertices of a cube
    const vertices = [
      [-half, -half, -half],
      [half, -half, -half],
      [half, half, -half],
      [-half, half, -half],
      [-half, -half, half],
      [half, -half, half],
      [half, half, half],
      [-half, half, half],
    ];

    // Edges
    const edges = [
      [0, 1], [1, 2], [2, 3], [3, 0],
      [4, 5], [5, 6], [6, 7], [7, 4],
      [0, 4], [1, 5], [2, 6], [3, 7],
    ];

    // Project vertices
    const projected = vertices.map(([x, y, z]) => {
      // Rotate Y
      const cosY = Math.cos(rotY);
      const sinY = Math.sin(rotY);
      const x1 = x * cosY - z * sinY;
      const z1 = z * cosY + x * sinY;

      // Rotate X
      const cosX = Math.cos(rotX);
      const sinX = Math.sin(rotX);
      const y2 = y * cosX - z1 * sinX;
      const z2 = z1 * cosX + y * sinX;

      // Perspective projection
      const fov = 400;
      const pz = z2 + 350;
      const scale = fov / Math.max(pz, 10);

      return {
        x: cx + x1 * scale,
        y: cy + y2 * scale,
      };
    });

    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 2;
    for (const [i1, i2] of edges) {
      const p1 = projected[i1];
      const p2 = projected[i2];
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();
    }
  }

  public destroy() {
    this.stop();
  }
}
