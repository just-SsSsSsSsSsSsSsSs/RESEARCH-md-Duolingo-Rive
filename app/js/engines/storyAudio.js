/**
 * StoryAudio — dual-track (fusha / baladi) narration engine for story activities.
 *
 *   const a = new StoryAudio({ base: 'content/audio/plant/', tracks, clips });
 *   a.lang = 'baladi';            // switch track; keeps the current clip at the same relative position
 *   a.play('story'); a.pause(); a.toggle('story'); a.replay(); a.seek(0.5); a.stop();
 *   a.rate = 0.8;                  // slow mode for young readers
 *   a.on('time', ({ t, d, p }) => …) ; a.on('end') ; a.on('state', { playing, clip, lang, rate }) ; a.on('error')
 *
 * Mobile-first: one shared <audio> element (unlocked on the first tap), optional preload of the next clip,
 * graceful fallback when a clip is missing in one dialect (falls back to the other track).
 */
import { APP_VERSION } from '../core/version.js';

const APP_BASE = new URL('../../', import.meta.url.split('?')[0]);

export class StoryAudio {
  constructor({ base, tracks, clips, lang = 'fusha' }) {
    this.base = base; this.tracks = tracks; this.clips = clips;
    this._lang = tracks[lang] ? lang : Object.keys(tracks)[0];
    this.clip = null; this.playing = false; this._rate = 1; this._handlers = {}; this._cache = new Map();
    const el = this.el = new Audio(); el.preload = 'auto'; el.setAttribute('playsinline', '');
    el.addEventListener('timeupdate', () => this._emit('time', this.time));
    el.addEventListener('durationchange', () => this._emit('time', this.time));
    el.addEventListener('play', () => { this.playing = true; this._emit('state', this.state); });
    el.addEventListener('pause', () => { if (this.playing) { this.playing = false; this._emit('state', this.state); } });
    el.addEventListener('ended', () => { this.playing = false; this._emit('state', this.state); this._emit('end', { clip: this.clip, lang: this._lang }); });
    el.addEventListener('error', () => this._emit('error', { clip: this.clip, lang: this._lang }));
    window.__storyAudio = this; // E2E/debug hook (element is detached from DOM)
  }
  /* ---------- events ---------- */
  on(evt, fn) { (this._handlers[evt] ||= new Set()).add(fn); return () => this._handlers[evt]?.delete(fn); }
  _emit(evt, data) { this._handlers[evt]?.forEach((f) => { try { f(data); } catch (e) { console.warn('[storyAudio]', e); } }); }

  /* ---------- props ---------- */
  get lang() { return this._lang; }
  set lang(l) {
    if (!this.tracks[l] || l === this._lang) return;
    const wasPlaying = this.playing, clip = this.clip, prog = this.progress;
    this._lang = l;
    if (clip) {
      const url = this.url(clip);
      if (url) {
        this._load(url);
        if (prog > 0 && prog < 1) this.el.addEventListener('loadedmetadata', () => { this.el.currentTime = prog * (this.el.duration || 0); }, { once: true });
        if (wasPlaying) this.el.play().catch(() => {});
      }
    }
    this._emit('state', this.state);
  }
  get rate() { return this._rate; }
  set rate(r) { this._rate = Number(r) || 1; this.el.playbackRate = this._rate; this._emit('state', this.state); }
  get time() { const t = this.el.currentTime || 0, d = Number.isFinite(this.el.duration) ? this.el.duration : 0; return { t, d, p: d ? t / d : 0 }; }
  get progress() { return this.time.p; }
  get state() { return { playing: this.playing, clip: this.clip, lang: this._lang, rate: this._rate }; }
  /** does this clip exist in the given language? */
  has(clip, lang = this._lang) { return !!this.clips[clip]?.[lang]; }
  /** resolved, versioned URL for a clip (falls back to any available track) */
  url(clip, lang = this._lang) {
    const c = this.clips[clip]; if (!c) return null;
    const l = c[lang] ? lang : Object.keys(c).find((k) => this.tracks[k]);
    if (!l) return null;
    const u = new URL(this.base + this.tracks[l].dir + c[l], APP_BASE); u.searchParams.set('v', APP_VERSION); return u.href;
  }

  /* ---------- control ---------- */
  _load(url) { if (this.el.src !== url) { this.el.src = url; this.el.load(); this.el.playbackRate = this._rate; } }
  /** play a clip; `at` = seconds to start from (applied after metadata when the src changes) */
  async play(clip = this.clip, { at = null } = {}) {
    const url = clip && this.url(clip); if (!url) return false;
    const changed = clip !== this.clip || this.el.src !== url;
    if (changed) { this.clip = clip; this._load(url); }
    if (at != null || changed) this.seekSec(at ?? 0);
    try { await this.el.play(); return true; } catch (e) { this._emit('error', { clip, lang: this._lang, e }); return false; }
  }
  /** seek to absolute seconds — robust: waits for metadata, applies, then re-applies on canplay if the
   *  browser dropped it (MP3 without seek index in some engines ignores seeks before enough data is buffered). */
  seekSec(t) {
    const want = Math.max(0, Number(t) || 0);
    this._pendingSeek = want; // latest request wins
    const apply = () => { if (this._pendingSeek !== want) return; try { this.el.currentTime = want; } catch {} };
    const verify = () => { if (this._pendingSeek !== want) return; if (Math.abs(this.el.currentTime - want) > 0.75) apply(); else this._pendingSeek = null; };
    if (this.el.readyState >= 1) apply(); else this.el.addEventListener('loadedmetadata', apply, { once: true });
    this.el.addEventListener('canplay', verify, { once: true });
    setTimeout(verify, 400); setTimeout(verify, 900);
  }
  pause() { this.el.pause(); }
  toggle(clip = this.clip) { if (this.playing && clip === this.clip) { this.pause(); return false; } return this.play(clip); }
  replay() { this.el.currentTime = 0; return this.play(this.clip); }
  seek(p) { if (this.el.duration) this.el.currentTime = Math.max(0, Math.min(1, p)) * this.el.duration; }
  stop() { this.el.pause(); try { this.el.currentTime = 0; } catch {} this.playing = false; this._emit('state', this.state); }
  preload(clip) { const u = this.url(clip); if (u && !this._cache.has(u)) { const a = new Audio(); a.preload = 'auto'; a.src = u; this._cache.set(u, a); } }
  destroy() { this.stop(); this.el.removeAttribute('src'); this.el.load(); this._handlers = {}; this._cache.clear(); }
}
export default StoryAudio;
