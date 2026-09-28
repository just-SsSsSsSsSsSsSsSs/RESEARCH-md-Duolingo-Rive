# V1_CHOREOGRAPHY - the v1 `think()` and `sad()` choreographies as data (K9.6-1, research only)

- Date: 2026-09-28  - Branch: sandbox/a1-gate5-art-sw  - Status: research document, no code
- Owner decision: gist 4f70a2dc rev a3e73842 ("carry the winner") + rev cf3d3a8a (full choreography, all channels,
  channel-by-channel measured acceptance; sad() added under the same protocol).
- Source of every number below: `sandbox/rig.js` at branch head cde4af4 - `think()` lines 390-422, `sad()` lines 342-386.
  Numbers are copied from the source lines, not from memory (AGENTS.md section 13, copied-number rule).
- Why this document exists: the winner is code (hard-coded WAAPI calls). The port must move it into
  `owl.motion.json` as DATA without changing what the eye sees. This table is the contract the proof
  (`choreo_proof.py`, K9.6-4) measures against.

## 0. Primitives used by both choreographies (rig.js)

| primitive | source | semantics the port must reproduce |
|---|---|---|
| `anim(el, keyframes, opts, keep)` | rig.js 88-94 | `el.animate(keyframes, opts)`; `keep=true` adds it to `this.live` (so `release()` can cancel it); `keep=false` cancels on finish |
| `later(fn, ms)` | rig.js 556-560 (v2: motion.js 71 divides by `clock.rate`) | `setTimeout` tracked for dispose |
| `setMouth(shape)` | rig.js 185-188 | shows exactly one `data-mouth` plate; on p2 art `smile` -> `beak_smile.webp`, `sad` -> `beak_sad.webp` (a10f3db) |
| `blink(double)` | rig.js 136-146 | lids `scaleY 0 -> 1 (0.35) -> 1 (0.5) -> 0`, 150 ms, EASE.soft; `double` fires a second blink after 200 ms. v2 adds `cue('blink')` |
| `release(re)` | rig.js 333-338 | cancels every LIVE animation whose target joint matches `re` and whose `fill === 'forwards'` |
| `EASE` | rig.js 38-44 | `soft = cubic-bezier(.4,0,.2,1)`, `inOut = ease-in-out`, `pop = spring(220,12,1)`, `land = spring(300,20,1)`, `sine = cubic-bezier(.45,.05,.55,.95)`; `linear` is used literally once in sad() |
| `REDUCED` | rig.js 54 | prefers-reduced-motion: face-only variants (see 1.3 / 2.3) |
| `busy` | both functions | set true at entry, false at the last `later`; a second call while busy is ignored |

## 1. `think()` - rig.js 390-422 (total 3500 ms, 7 channels + 1 event track)

All times are absolute from the call (t0 = 0). "keep" = `anim(..., true)` (live, releasable).

### 1.1 Channels

| # | channel | joint(s) | keyframes (transform) | duration ms | delay ms | start -> end ms | easing | iterations | composite | fill / keep | source line |
|---|---|---|---|---|---|---|---|---|---|---|---|
| T1 | eye roll | pupilL, pupilR (same frames) | `translate(0,0)` -> `translate(0,-5px)` @0.2 -> `translate(-5px,-3px)` @0.45 -> `translate(5px,-3px)` @0.7 -> `translate(3px,-4px)` @1 | 1500 | 0 | 0 -> 1500 (held to 2600) | soft | 1 | replace (default) | forwards, keep | 395-398 |
| T2 | head tilt | head | `rotate(0)` -> `rotate(9deg) translate(3px,-2px)` | 700 | 0 | 0 -> 700 (held to 2600) | soft | 1 | add | forwards, keep | 399-400 |
| T3 | wing to chin | armR | `rotate(0)` -> `rotate(-128deg) translate(2px,-14px)` | 550 | 200 | 200 -> 750 (held to 2600) | pop | 1 | add | forwards, keep | 402-403 |
| T4 | wing taps | armR | `translate(0,0)` -> `translate(0,-3px)` -> `translate(0,0)` | 380 | 800 | 800 -> 2320 | sine | 4 | add | none | 404-405 |
| T5 | foot tap | legL | `translateY(0)` -> `translateY(-3px) rotate(-6deg)` -> `translateY(0)` | 340 | 700 | 700 -> 2400 | sine | 5 | add | none | 407-408 |
| T6 | aha head pop | head | `translateY(0) scale(1)` -> `translateY(-6px) scale(1.06)` -> `translateY(0) scale(1)` | 450 | 0 (fired at 2600) | 2600 -> 3050 | pop | 1 | add | none | 414-415 |
| T7 | aha pupils wide | pupilL, pupilR | `scale(1)` -> `scale(1.3)` -> `scale(1)` | 500 | 0 (fired at 2600) | 2600 -> 3100 | pop | 1 | add | none | 416 |
| T8 | aha wing flick | armR | `rotate(0)` -> `rotate(-140deg)` -> `rotate(0)` | 700 | 0 (fired at 2600) | 2600 -> 3300 | pop | 1 | add | none | 417 |

The owner's "seven channels" = T1 eye roll, T2 head, T3+T4 wing (chin + taps), T5 foot, mouth track (1.2), and the
aha group T6+T7+T8 with the smile. The table lists them as 8 WAAPI channels + 1 event track so the proof can check
each `animate()` call separately.

### 1.2 Event track (setMouth / blink / release)

| at ms | event | source line |
|---|---|---|
| 0 | `setMouth('mid')` | 393 |
| 900 | `setMouth('closed')` | 410 |
| 1500 | `setMouth('mid')` | 410 |
| 2600 | `release(/^(pupilL\|pupilR\|head\|armR)$/)` - cancels T1, T2, T3 (the held forwards layers) | 413 |
| 2600 | T6, T7, T8 start; `setMouth('open')` | 414-418 |
| 2600 | `blink(false)` | 419 |
| 2900 | `setMouth('smile')` (`later(..., 300)` inside the 2600 callback) | 418 |
| 3500 | `setMouth('closed')`; `busy = false` | 421 |

Mouth plate sequence, in order: mid (0) -> closed (900) -> mid (1500) -> open (2600) -> smile (2900) -> closed (3500).
On p2 art the `smile` step shows `beak_smile.webp` (137 x 126, K9.5-3) - the owner's condition "the final smile via
the new plate" is met by the existing wiring; no art change is part of the port.

### 1.3 REDUCED variant (rig.js 392)

`setMouth('mid')`; `blink(true)`; at 1400: `setMouth('closed')`, `busy = false`. No transforms.

### 1.4 Channel overlap map (what is on screen when)

```
ms      0    200  700 750  800  900      1500          2320 2400  2600      2900 3050 3100 3300 3500
T1 eyes |=========================================== hold ==============|X
T2 head |=========| hold ======================================================|X
T3 wing      |=========| hold ================================================|X
T4 taps                     |=== x4 ============================|
T5 foot                |=== x5 ==================================|
mouth   mid            closed     mid                                  open     smile          closed
T6/7/8                                                                  |pop|wide|flick|
blink                                                                   |
```
`X` = cancelled by `release` at 2600; the joints snap back to their base (there is no settle - the aha pops read as
the release). This snap is part of what the raters saw and is kept.

## 2. `sad()` - rig.js 342-386 (total 2500 ms, 8 channels + 1 event track)

### 2.1 Channels

| # | channel | joint(s) | keyframes (transform) | duration ms | delay ms | start -> end ms | easing | iterations | composite | fill / keep | source line |
|---|---|---|---|---|---|---|---|---|---|---|---|
| S1 | startle pupils | pupilL, pupilR | `scale(1)` -> `scale(1.25)` -> `scale(1)` | 700 | 0 | 0 -> 700 | soft | 1 | add | none | 350-351 |
| S2 | recoil | root | `translate(0,0) rotate(0)` @0 -> `translate(-6px,-14px) rotate(-8deg)` @0.18 -> `translate(-14px,0) rotate(-4deg)` @0.34 -> `translate(-12px,-8px) rotate(3deg)` @0.5 -> `translate(-10px,0) rotate(0)` @0.64 -> `translate(0,0) rotate(0)` @1 | 1600 | 0 | 0 -> 1600 | soft | 1 | add | none | 352-359 |
| S3 | squash | body | `scale(1,1)` -> `scale(0.9,1.14)` @0.18 -> `scale(1.12,0.88)` @0.34 -> `scale(1,1)` @0.55 -> `scale(1,1)` | 1600 | 0 | 0 -> 1600 | soft | 1 | add | none | 360-363 |
| S4 | wings flail | armL (s=+1), armR (s=-1) | `rotate(0)` -> `rotate(95s deg)` @0.2 -> `rotate(75s)` @0.3 -> `rotate(100s)` @0.4 -> `rotate(80s)` @0.5 -> `rotate(0)` @0.8 -> `rotate(0)` | 1600 | 0 | 0 -> 1600 | soft | 1 | add | none | 365-368 |
| S5 | dizzy head | head | `rotate(0) translate(0,0)` -> `rotate(-10deg) translate(-3px,2px)` -> `rotate(0) translate(0,4px)` -> `rotate(10deg) translate(3px,2px)` -> `rotate(0) translate(0,0)` | 520 | 250 | 250 -> 1810 | sine | 3 | add | none | 370-373 |
| S6 | pupils orbit | pupilL, pupilR | `translate(0,-4px)` -> `translate(4px,0)` -> `translate(0,4px)` -> `translate(-4px,0)` -> `translate(0,-4px)` | 420 | 250 | 250 -> 1930 | **linear** | 4 | add | none | 374-376 |
| S7 | recovery shrug | armL (+1), armR (-1) | `rotate(0)` -> `rotate(35s deg)` -> `rotate(0)` | 600 | 0 (fired at 1700) | 1700 -> 2300 | pop | 1 | add | none | 381-382 |
| S8 | recovery head | head | `rotate(0)` -> `rotate(8deg) translateY(2px)` -> `rotate(0)` | 600 | 0 (fired at 1700) | 1700 -> 2300 | soft | 1 | add | none | 383 |

Note: `linear` in S6 is the one deliberate constant-rate motion in sad() (the K9 matrix row 4 grep lists the two
engine linears; this v1 one becomes a third, disclosed here, when it enters the spec as data).

### 2.2 Event track

| at ms | event | source line |
|---|---|---|
| 0 | `setMouth('open')`; `blink(false)` | 347-348 |
| 700 | `setMouth('sad')` | 377 |
| 1700 | `setMouth('smile')`; S7, S8 start; `blink(true)` (second blink at 1900) | 379-385 |
| 2500 | `setMouth('closed')`; `busy = false` | 386 |

Mouth plate sequence: open (0) -> sad (700) -> smile (1700) -> closed (2500). On p2 art `sad` shows `beak_sad.webp`
and `smile` shows `beak_smile.webp` (both K9.5-3) - the owner's "with the new sad plate" is met by the existing wiring.

### 2.3 REDUCED variant (rig.js 344)

`setMouth('sad')`; at 900: `setMouth('smile')`, `blink(true)`; at 1600: `setMouth('closed')`, `busy = false`.

## 3. What differs between the v1 rig and the v2 rig that the port must account for

| difference | v1 (SvgRig) | v2 (CinematicRig) | consequence for the port |
|---|---|---|---|
| timer clock | `later` = raw setTimeout | `later` divides by `clock.rate` (motion.js 71) | at `clock.rate = 1` identical; proofs at slow-mo scale every event equally |
| idle overlay | idle breath/head/wing loops run under the choreography (composite add) | same idea from spec ranges; plus secondary physics layers (paused additive `rotate`) and the squash layer | choreography keyframes are additive on top of idle in both; the proof compares the authored channel, not the idle sum (same method as k95_think `head_authored_le_9deg`) |
| flex followers | none | `flex.js` wraps `anim` on armL/armR and adds 3-band followers | followers are additive extras on the wing channels; they were present in every v2 clip the raters saw (kits v1-v3), so the port keeps them; the proof measures the authored wing keyframes |
| cues | none | `cue('perf' / 'blink' / 'settle')` for Foley | the player emits the same cues the other performances emit; silent when Foley is off |
| `busy` semantics | boolean | boolean + `_lastPerf` + `stats.performances` | player sets both, like `P.ponder` |

## 4. Acceptance metric for the port (the proof will implement exactly this)

Per choreography, per channel (T1..T8 / S1..S8):
1. **Schedule**: start and end of the authored animation within 1 frame at 60 fps (16.7 ms) of the table above,
   measured at `clock.rate = 1` from the `animate()` timing (`effect.getTiming()` and `startTime`), not from pixels.
2. **Keyframes**: identical transform strings and offsets (string equality after whitespace normalisation).
3. **Options**: identical easing (EASE name -> same CSS string), iterations, composite, fill, and keep/live flag.
4. **Event track**: identical mouth plate sequence (`data-mouth` visible plate per event time) and blink times within
   1 frame; `release` at the same time cancelling the same joints.
5. **End state**: at total ms both rigs report `busy === false`, mouth `closed`, no live forwards layers on the
   choreography joints.
6. **Reduced**: the REDUCED variant reproduced (mouth sequence + blink) with zero transforms.

PASS iff every row passes for both think and sad. Anything else is a defect in the port, never a "close enough".

## 5. Out of scope (kept as is)

`celebrate` / `triumph`, `flight`, the K9.5-3 plates, `puzzled`, the idle scheduler, `app/`. The K9.5-2 calm think
(`acting.performances.think`, G12 0/3) and the K9.4 take (`acting.performances.oops`) are kept in the spec as
un-routed records (`think_calm_k95`, `oops_take_k94`) when K9.6-2 / -5 replace them, so the history stays readable.
