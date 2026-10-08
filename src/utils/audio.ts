/**
 * Romantic Audio Engine powered by Web Audio API.
 * Synthesizes tender, romantic piano / music-box arpeggios completely offline
 * without any external audio asset dependency.
 */

class RomanticAudioEngine {
  private ctx: AudioContext | null = null;
  private isPlaying: boolean = false;
  private volume: number = 0.35;
  private timerId: number | null = null;
  private currentStep: number = 0;
  private masterGain: GainNode | null = null;

  // Romantic chord progression frequencies (Hz) for gentle arpeggios
  // C major 9 -> Am 9 -> F maj 7 -> G sus 4
  private arpeggioNotes = [
    // Chord 1: C - E - G - B - D
    [261.63, 329.63, 392.0, 493.88, 587.33],
    // Chord 2: A - C - E - G - B
    [220.0, 261.63, 329.63, 392.0, 493.88],
    // Chord 3: F - A - C - E - G
    [174.61, 220.0, 261.63, 329.63, 392.0],
    // Chord 4: G - B - D - F - A
    [196.0, 246.94, 293.66, 349.23, 440.0],
  ];

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtxClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtxClass();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(this.volume, this.ctx.currentTime, 0.05);
    }
  }

  public startMusic() {
    if (this.isPlaying) return;
    try {
      this.getContext();
      this.isPlaying = true;
      const playNextNote = () => {
        if (!this.isPlaying) return;
        const chordIdx = Math.floor(this.currentStep / 8) % this.arpeggioNotes.length;
        const noteIdx = this.currentStep % this.arpeggioNotes[chordIdx].length;
        const freq = this.arpeggioNotes[chordIdx][noteIdx];

        this.playSoftTone(freq, 1.8);
        this.currentStep = (this.currentStep + 1) % 32;

        // Tempo: gentle and calm (~480ms per arpeggio note)
        this.timerId = window.setTimeout(playNextNote, 480);
      };
      playNextNote();
    } catch (e) {
      console.warn('Audio playback not permitted yet or failed:', e);
    }
  }

  public stopMusic() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  public toggleMusic(): boolean {
    if (this.isPlaying) {
      this.stopMusic();
      return false;
    } else {
      this.startMusic();
      return true;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private playSoftTone(freq: number, duration: number) {
    try {
      const ctx = this.getContext();
      if (!this.masterGain) return;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);

      const now = ctx.currentTime;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.18, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(now);
      osc.stop(now + duration);
    } catch {}
  }

  // Romantic wax seal pop and soft chime sound effect
  public playSealBreakSound() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const oscLow = ctx.createOscillator();
      const gainLow = ctx.createGain();
      oscLow.frequency.setValueAtTime(140, now);
      oscLow.frequency.exponentialRampToValueAtTime(40, now + 0.15);
      gainLow.gain.setValueAtTime(0.3, now);
      gainLow.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      oscLow.connect(gainLow);
      gainLow.connect(ctx.destination);
      oscLow.start(now);
      oscLow.stop(now + 0.15);

      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, now + 0.05 + i * 0.06);
        gain.gain.setValueAtTime(0.12, now + 0.05 + i * 0.06);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.6 + i * 0.06);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + 0.05 + i * 0.06);
        osc.stop(now + 0.7 + i * 0.06);
      });
    } catch {}
  }

  // Sparkling sweet heart reaction chime
  public playHeartChime() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const notes = [659.25, 880.0, 1174.66];
      notes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const start = now + i * 0.05;
        osc.frequency.setValueAtTime(f, start);
        gain.gain.setValueAtTime(0.12, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.45);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.5);
      });
    } catch {}
  }

  // Soft page flip sound effect
  public playPageTurnSound() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(320, now);
      osc.frequency.linearRampToValueAtTime(220, now + 0.12);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {}
  }

  // Celebration fanfare sound effect
  public playCelebrationSound() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const notes = [392.0, 523.25, 659.25, 783.99, 1046.5, 1318.51];
      notes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const start = now + i * 0.08;
        osc.frequency.setValueAtTime(f, start);
        gain.gain.setValueAtTime(0.15, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 1.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 1.3);
      });
    } catch {}
  }

  // Sweet notification chime for new letter / moment alerts
  public playNotificationChime() {
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;
      const notes = [587.33, 783.99, 880.0, 1174.66];
      notes.forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const start = now + i * 0.07;
        osc.frequency.setValueAtTime(f, start);
        gain.gain.setValueAtTime(0.16, start);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.6);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.65);
      });
    } catch {}
  }
}

export const romanticAudio = new RomanticAudioEngine();
