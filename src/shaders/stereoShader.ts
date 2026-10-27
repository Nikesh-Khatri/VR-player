/**
 * GLSL Shaders for Stereoscopic Video Mapping,
 * Lens Distortion (Brown-Conrady Polynomial), and Anaglyph Dubois Synthesis.
 */

export const StereoVideoShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D map;
    uniform int uStereoMode; // 0: Mono, 1: SBS, 2: Top-Bottom
    uniform int uEye;        // 0: Left, 1: Right
    uniform bool uEyeSwap;
    uniform float uVerticalOffset;
    uniform float uBrightness;
    uniform float uContrast;
    uniform float uSaturation;
    uniform float uGamma;
    varying vec2 vUv;

    vec3 applyColorGrading(vec3 color) {
      // Brightness
      color *= uBrightness;

      // Contrast
      color = (color - 0.5) * uContrast + 0.5;

      // Saturation
      float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
      color = mix(vec3(luminance), color, uSaturation);

      // Gamma
      color = pow(max(color, vec3(0.0)), vec3(1.0 / max(uGamma, 0.001)));

      return clamp(color, 0.0, 1.0);
    }

    void main() {
      vec2 eyeUv = vUv;
      eyeUv.y += uVerticalOffset;

      int effectiveEye = uEye;
      if (uEyeSwap) {
        effectiveEye = (effectiveEye == 0) ? 1 : 0;
      }

      if (uStereoMode == 1) {
        // SBS (Side by Side)
        if (effectiveEye == 0) {
          eyeUv.x = eyeUv.x * 0.5;
        } else {
          eyeUv.x = 0.5 + eyeUv.x * 0.5;
        }
      } else if (uStereoMode == 2) {
        // Top-Bottom / Over-Under
        // Standard convention: Left is Top, Right is Bottom
        if (effectiveEye == 0) {
          eyeUv.y = 0.5 + eyeUv.y * 0.5;
        } else {
          eyeUv.y = eyeUv.y * 0.5;
        }
      }

      vec4 texColor = texture2D(map, eyeUv);
      vec3 finalRgb = applyColorGrading(texColor.rgb);

      gl_FragColor = vec4(finalRgb, texColor.a);
    }
  `,
};

export const LensDistortionShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uK1;
    uniform float uK2;
    uniform float uChromatic;
    uniform bool uLensMask;
    uniform float uMaskRadius;
    varying vec2 vUv;

    void main() {
      vec2 coord = vUv - 0.5;
      float r2 = dot(coord, coord);
      float distortion = 1.0 + uK1 * r2 + uK2 * r2 * r2;

      // Lens boundary mask
      float r = length(coord) * 2.0;
      if (uLensMask && r > uMaskRadius) {
        float edge = smoothstep(uMaskRadius, uMaskRadius - 0.05, r);
        if (edge <= 0.0) {
          gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
          return;
        }
      }

      // Chromatic aberration sampling
      vec2 uvR = 0.5 + coord * (distortion * (1.0 + uChromatic));
      vec2 uvG = 0.5 + coord * distortion;
      vec2 uvB = 0.5 + coord * (distortion * (1.0 - uChromatic));

      // Bounds checking
      if (uvG.x < 0.0 || uvG.x > 1.0 || uvG.y < 0.0 || uvG.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
      }

      float red = texture2D(tDiffuse, uvR).r;
      float green = texture2D(tDiffuse, uvG).g;
      float blue = texture2D(tDiffuse, uvB).b;

      gl_FragColor = vec4(red, green, blue, 1.0);
    }
  `,
};

export const AnaglyphDuboisShader = {
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tLeftEye;
    uniform sampler2D tRightEye;
    uniform int uAnaglyphType; // 0: Dubois (Red-Cyan), 1: ColorCode (Amber-Blue), 2: Green-Magenta, 3: Monochrome
    varying vec2 vUv;

    void main() {
      vec3 L = texture2D(tLeftEye, vUv).rgb;
      vec3 R = texture2D(tRightEye, vUv).rgb;

      if (uAnaglyphType == 1) {
        // ColorCode 3D (Amber - Dark Blue)
        float lumL = dot(L, vec3(0.299, 0.587, 0.114));
        float lumR = dot(R, vec3(0.299, 0.587, 0.114));
        // Left eye gets Yellow/Amber, Right eye gets Blue
        gl_FragColor = vec4(L.r * 1.05, (L.g * 0.95 + lumL * 0.05), R.b * 1.2, 1.0);
        return;
      } else if (uAnaglyphType == 2) {
        // Green - Magenta (TrioViz standard)
        gl_FragColor = vec4(R.r, L.g, R.b, 1.0);
        return;
      } else if (uAnaglyphType == 3) {
        // High-contrast Monochrome Red-Cyan
        float lumL = dot(L, vec3(0.299, 0.587, 0.114));
        float lumR = dot(R, vec3(0.299, 0.587, 0.114));
        gl_FragColor = vec4(lumL, lumR, lumR, 1.0);
        return;
      }

      // Default: Dubois Anaglyph Matrix (Red - Cyan)
      // Optimized for least retinal ghosting and color balance
      float r = clamp(
        0.456100 * L.r + 0.500484 * L.g + 0.176381 * L.b
        - 0.0434706 * R.r - 0.0879388 * R.g - 0.00155529 * R.b,
        0.0, 1.0
      );

      float g = clamp(
        -0.0400822 * L.r - 0.0378216 * L.g - 0.0157589 * L.b
        + 0.378476 * R.r + 0.730994 * R.g - 0.018112 * R.b,
        0.0, 1.0
      );

      float b = clamp(
        -0.0152161 * L.r - 0.0205971 * L.g - 0.00546858 * L.b
        - 0.0721527 * R.r - 0.112961 * R.g + 1.22641 * R.b,
        0.0, 1.0
      );

      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `,
};

