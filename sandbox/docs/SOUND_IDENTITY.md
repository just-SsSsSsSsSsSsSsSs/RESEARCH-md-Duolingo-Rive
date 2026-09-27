# Sound identity of the owl (K9.6-3)

Scope: the owl only, branch `sandbox/a1-gate5-art-sw`. Source of every number: `companions/owl.motion.json` (block `sound`,
per-state `sfx` / `vfx` maps) read on 2026-09-27. The cue table is generated (`docs/SOUND_CUES.generated.md`, written by
`tools/report_k9.py`); the prose in this file is written by hand and says so where it interprets.

## 1. Principle (decided in K8, gist annex e): procedural first, zero assets

- 0 audio files, 0 bytes of assets, 0 decode RAM; every sound is synthesised on the audio clock from numbers in the spec.
- A new companion ships a new `sound` block, not new files. `validateSpec` rejects unknown generators, unknown cues, gain outside (0, 1].
- Playback rules measured in K8 (files under `samples/sfx/`, 2026-09-26T18:51:03Z): controlled offset p95 1.1 ms (target 16.7, cap 40);
  5-cue overlap peak -13.62 dBFS (ceiling -3), 0 clipped; polyphony max 3 of cap 3; same-cue gap min 140.1 ms (rule 120);
  duck -9 dB while the owl talks; below engine rate 0.5x the Foley mutes, between 0.5x and 1x the envelopes stretch 1/rate.

## 2. The voice (hand-written interpretation of the numbers)

| trait | number in the spec | what it does to the character |
|---|---|---|
| base pitch | `baseHz` 330 (E4) | a small bird, not a bass; tones sit around and above E4 |
| detune | `voiceDetune` 0.04 | two-voice chords are never perfectly in tune: warm, hand-made, not a synthesizer preset |
| level | `master` 0.6, cue gains 0.04 - 0.3 | the loudest sound is the landing thud (0.3); the quietest are the ticks (0.04) and breath (0.05) |
| body | `land` thud 110 Hz slide -0.5 + 2400 Hz click | weight on contact: low body plus a tiny claw click, both under 150 ms |
| wings | `flap` brown noise 420 Hz + 3200 Hz rustle 60 ms | a feather beat has a low push and a high rustle, in that order |
| air | `whoosh` white noise 600 Hz sweep 1.8, `pitchFromVy` 0.35 | the whoosh pitch follows the vertical speed of the actual flight path |
| joy | `chime` chord C5 E5 G5 C6 spread 70 ms, gain 0.2 | the celebration is a rising arpeggio, never a buzzer |
| wink | same chord at gain 0.11 (55 %) | a wink is a small gesture, not a fanfare (comment in the spec) |
| thought | `hmm` 196 Hz (G3) 0.55 s, then `tick` 2600 Hz every 700 ms | a low voiced hum and a clock: the owl is working, the child is not rushed |
| error | `aww` 392 Hz (G4) 0.6 s | a soft falling vowel on the OWL, never a wrong-answer buzzer aimed at the child (gist: humour on the character) |
| life at rest | `breath` pink noise 300 Hz a 0.6 s d 0.9 s at 0.05; `snore` brown 180 Hz every 3.2 s | audible only in silence, and only as texture |
| landing bounce | `boing` 220 Hz 0.32 s | the jump landing in celebrate, not the flight landing |

## 3. Phase map (which motion phase fires which cue) - copied from `states.list[*].sfx / vfx`

| state | sfx by phase | vfx by phase |
|---|---|---|
| idle | blink: blink; wink: wink; enter / breath / dart: none | blink: glint; wink: glint |
| greet | enter: chime | enter: stars |
| talk | duck: true (bus -9 dB for the whole state); wink: wink | wink: glint |
| think | enter: hmm; beat: tick every 700 ms; wink: wink | enter: question; wink: glint |
| celebrate | enter: chime; land: boing; wink: wink | enter: stars; land: dust; wink: glint |
| wrong | enter: aww | enter: sweat |
| fly | anticipate: crouch; takeoff: takeoff; flap: flap; cruise: whoosh; roll: whoosh; land: land; settle: settle; after: pant; intent: none | takeoff: speedLines; roll: speedLines; land: dust |
| rest | enter: snore, loop 3200 ms | enter: zzz, loop 2400 ms |

Silence is a decision too: `intent` (eyes -> head -> body before take-off) and `dart` carry no sound by design; the look must
read visually before anything is heard, otherwise the sound announces the flight before the eyes do.

## 4. Priorities and what gets dropped under load (numbers from `samples/sfx/sfx_polyphony.json`, 2026-09-26T18:51:03Z)

Priority 3: land, chime, aww. Priority 2: takeoff, boing, hmm. Priority 1: crouch, flap, whoosh, sparkle, gulp, wink.
Priority 0 (first to go): breath, blink, settle, tick, pant, snore.
Two guards drop requests: the polyphony cap (3 voices; a higher priority steals a lower one) and the same-cue gap (120 ms).
5-owl scene in the file: played 28, dropped 82, stolen 2, muted 0. Priority-3 cues were never dropped by the POLYPHONY guard
(`top_priority_never_dropped` true in `sfx_summary.json`); they were dropped by the same-cue GAP guard when five owls landed
inside 120 ms of each other (land 3, chime 2) - that is the guard doing its job (one landing sound for a simultaneous group),
disclosed here because "never dropped" without the qualifier would overstate it. Per cue: flap gap 39 + polyphony 6, boing
polyphony 7, takeoff gap 7, crouch gap 6, whoosh gap 2 + polyphony 6, blink polyphony 4. With one owl (the app case) K8 measured
0 drops. (The RESEARCH.md cycle-5 report quotes an earlier run with played 34 / dropped 44 / stolen 3; the committed JSON is
the later run and wins - noted, not hidden.)

## 5. What is NOT here (disclosed)

- No iPhone check: the silent-`<audio>` kick for the iOS mute switch is implemented (`SoundBus.unlock()`) and unverified on a device.
- No loudness normalisation across cues beyond the per-cue gains and the -3 dBFS ceiling; a LUFS target was never declared.
- Headless Chromium cannot prove autoplay policy; what is proven is that our code creates the context only inside its gesture handler.

Generated cue table: see `docs/SOUND_CUES.generated.md` (18 cues; regenerate with `python3 tools/report_k9.py`).
