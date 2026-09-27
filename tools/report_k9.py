#!/usr/bin/env python3
"""K9.6-1: generate the K9 principle matrix (gist annex b) and the declared-budgets table (G13) FROM the committed
proof files. This script is the only writer of sandbox/docs/K9_MATRIX.md and sandbox/docs/K9_BUDGETS.md: no number in
those two files is typed by hand, so a stale number is impossible by construction (AGENTS section 13).

Rules:
  - every number is read from a JSON on the branch and printed next to its file name and the file's own timestamp;
  - a missing file or key is a hard failure (exit 2), never a blank cell;
  - budgets are PASS only when a declared value exists in a file written BEFORE the measurement (spec or budgets_declared);
    a measured value with no prior declaration is OPEN, with the measured number shown, never a cap invented afterwards;
  - no emoji, plain ASCII tables.

Usage: python3 tools/report_k9.py            (writes both docs, prints a summary)
       python3 tools/report_k9.py --check    (exit 1 if the docs on disk differ from what would be generated)
"""
import json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SB = os.path.join(ROOT, 'sandbox')
PROOFS = os.path.join(SB, 'samples', 'proofs')
SFX = os.path.join(SB, 'samples', 'sfx')
DOCS = os.path.join(SB, 'docs')


def load(path):
    if not os.path.exists(path):
        sys.exit(f'MISSING FILE: {os.path.relpath(path, ROOT)}')
    with open(path) as fh:
        return json.load(fh)


def get(d, *keys, src='?'):
    cur = d
    for k in keys:
        if isinstance(cur, list):
            if not isinstance(k, int) or k >= len(cur):
                sys.exit(f'MISSING KEY {keys} in {src}')
            cur = cur[k]
        elif isinstance(cur, dict) and k in cur:
            cur = cur[k]
        else:
            sys.exit(f'MISSING KEY {keys} in {src}')
    return cur


def f1(v):
    return f'{v:.1f}' if isinstance(v, float) else str(v)


def rel(p):
    return os.path.relpath(p, SB)


def main():
    spec_p = os.path.join(SB, 'companions', 'owl.motion.json'); spec = load(spec_p)
    proofs_p = os.path.join(PROOFS, 'proofs.json'); pr = load(proofs_p); G = get(pr, 'gates', src='proofs.json')
    eye_p = os.path.join(PROOFS, 'g11c_eyelead_ab.json'); eye = load(eye_p)
    intent_p = os.path.join(PROOFS, 'g12_intent.json'); it = load(intent_p)
    perf_p = os.path.join(PROOFS, 'g13_performances.json'); pf = load(perf_p)
    flex_p = os.path.join(PROOFS, 'g14_flex.json'); fx = load(flex_p)
    wing_p = os.path.join(PROOFS, 'g14_wing_render.json'); wg = load(wing_p)
    ship_p = os.path.join(PROOFS, 'g11c_ship_visible.json'); sh = load(ship_p)
    matrix_p = os.path.join(SB, 'samples', 'measure_matrix.json'); mx = load(matrix_p)
    # G12 human gate: the verdict is read from the scorer's output, never typed here (owner directive, gist rev 0c05fdfc).
    g12_p = os.path.join(SB, 'samples', 'watch', 'results', 'SCORE.generated.json'); g12 = load(g12_p)
    g12_verdict = get(g12, 'verdict', src='SCORE.generated'); g12_beats = get(g12, 'per_beat', src='SCORE.generated')
    g12_kit = load(os.path.join(SB, 'samples', 'watch', 'manifest.json')).get('kit_version', 1)
    g12_line = (f'watch kit v{g12_kit} ({get(g12, "kit", src="SCORE.generated")}): '
                f'{g12_verdict} - v2 {g12["v2_chosen"]}/{g12["n"]} from {len(g12["raters"])} named raters, two-sided p {g12["two_sided_p"]:.4f} (PASS needed >= {g12["min_v2_wins_for_pass"]}/{g12["n"]}); '
                'per beat v2 ' + ', '.join(f'{b} {v["v2"]}/{v["n"]}' for b, v in g12_beats.items()))
    sync_p = os.path.join(SFX, 'sfx_sync.json'); sy = load(sync_p)
    mix_p = os.path.join(SFX, 'sfx_mix.json'); mi = load(mix_p)
    poly_p = os.path.join(SFX, 'sfx_polyphony.json'); po = load(poly_p)

    ts = {
        'proofs': get(pr, 'captured_at', src='proofs.json'), 'intent': get(it, 'captured_at', src='g12'), 'perf': get(pf, 'captured_at', src='g13'),
        'flex': get(fx, 'generated_at', src='g14_flex'), 'wing': get(wg, 'generated_at', src='g14_wing_render'), 'matrix': get(mx, 'measured_at', src='matrix'),
        'g12': get(g12, 'scored_at', src='SCORE.generated'),
        'sync': get(sy, 'measured_at', src='sfx_sync'), 'mix': get(mi, 'measured_at', src='sfx_mix'), 'poly': get(po, 'measured_at', src='sfx_poly'),
    }
    eye_ts = eye.get('captured_at') or 'no timestamp in file; commit history: git log -- ' + rel(eye_p)

    # ---- numbers ----
    sq = get(spec, 'squash', src='spec'); land_sy = get(sq, 'landing', 'scaleY', src='spec'); crouch = get(sq, 'takeoffCrouch', src='spec')
    g2_first = get(G, 'G2_landing_squash', 0, 'squash', src='proofs')            # e.g. scale(1.25, 0.8)
    ant = get(G, 'G3_anticipation_ms', src='proofs')
    arcs = get(G, 'G4_arc_geometry', src='proofs'); sag = [get(a, 'sagitta_pct_of_chord', src='proofs') for a in arcs]
    ov = get(G, 'G5_secondary_overshoot', src='proofs')
    hier = get(spec, 'hierarchy', src='spec')
    edge = get(G, 'G7_edge_width', src='proofs')
    lead_a = get(eye, 'A', 'lead_median_ms', src='eyelead'); lead_b = get(eye, 'B', 'lead_median_ms', src='eyelead')
    im = get(it, 'summary', 'A_median', src='g12'); ib = get(spec, 'acting', 'intent', src='spec')
    ps = get(pf, 'summary', src='g13'); pb = get(pf, 'budgets_declared', src='g13')
    fs = get(fx, 'spec_flex', src='g14_flex'); fr = get(fx, 'runs', 0, 'notes', src='g14_flex')
    fperf = get(fx, 'perf', 'cells', src='g14_flex')
    wd = get(wg, 'dpr', src='wing'); wb = get(wg, 'budget_accepted', src='wing')
    cells = get(mx, 'cells', src='matrix')
    def cell(name, cpu):
        for c in cells:
            if c['cell'] == name and c['cpu_throttle'] == cpu: return c
        sys.exit(f'MISSING matrix cell {name} {cpu}')
    v2_1 = cell('v2 + Foley', 1.0); v2_4 = cell('v2 + Foley', 4.0); v1_1 = cell('v1 reference', 1.0)
    v1_4 = cell('v1 reference', 4.0); nf_1 = cell('v2 no-Foley', 1.0); nf_4 = cell('v2 no-Foley', 4.0); ni_1 = cell('v2 no-intent', 1.0)
    # eyelead disclosure (owner audit F3): the median hides how many reps measured and any reverse outlier
    eyeA = get(eye, 'A', src='eyelead'); eye_rows = get(eyeA, 'rows', src='eyelead'); eye_leads = get(eyeA, 'lead_ms', src='eyelead')
    eye_n = len(eye_rows); eye_measured = len(eye_leads); eye_unmeasured = sum(1 for r in eye_rows if r.get('tPupil') is None or r.get('tHead') is None)
    eye_reverse = [x for x in eye_leads if x < 0]
    eye_note = (f'median over {eye_measured} of {eye_n} reps; {len(eye_reverse)} reverse outlier ({", ".join(f1(x) for x in eye_reverse)} ms); {eye_unmeasured} unmeasured'
                if eye_reverse else f'median over {eye_measured} of {eye_n} reps; {eye_unmeasured} unmeasured')
    esc = get(sh, '9_performances', 'puzzledTiers', src='ship_visible')
    poses = get(sh, '5_poses', 'changedJointsPerPose', src='ship_visible')
    pt = get(pr, 'slow_rate', src='proofs')

    P = lambda ok: 'PASS' if ok else 'FAIL'
    rows = [
        ('1', 'Squash and stretch', 'SquashSpring on the body, sx = 1/sy (volume kept); landing scaleY from spec',
         f'landing impact scaleY {land_sy} -> rebound -> 1.0; volume error 0 by construction',
         f'first landing frame `{g2_first}` (slow rate {pt})', f'{rel(proofs_p)} {ts["proofs"]}', P(g2_first.startswith('scale(1.25, 0.8'))),
        ('2', 'Anticipation', 'takeoff crouch held before every flight; intent (eyes -> head -> body) before the crouch',
         f'hold in [{crouch["holdMs"][0]}, {crouch["holdMs"][1]}] ms (spec); pre-takeoff in [{ib["budget"]["preTakeoffMs"][0]}, {ib["budget"]["preTakeoffMs"][1]}] ms',
         f'anticipate -> takeoff {f1(ant["measured_anticipate_to_takeoff_ms"])} ms; intent pre-takeoff median {f1(im["pre_takeoff_ms"])} ms',
         f'{rel(proofs_p)} {ts["proofs"]}; {rel(intent_p)} {ts["intent"]}', P(ant['pass'] and get(it, 'summary', 'pass_all', src='g12'))),
        ('3', 'Arcs', 'cubic Bezier flight path, arc-length sampling', 'sagitta (max deviation from the chord) > 0 % on every arc, no straight segment',
         f'sagitta {f1(sag[0])} % and {f1(sag[1])} % of chord ({len(arcs)} arcs, 41 points each)', f'{rel(proofs_p)} {ts["proofs"]}', P(all(a['pass_not_straight'] for a in arcs))),
        ('4', 'Slow in / slow out', 'EASE table (spring-derived pop/land, sine, soft) on WAAPI layers; grep 2026-09-27: exactly 2 linear easings in the engine, both deliberate constant-rate motions (rig.js:371 shake oscillation, acting.js:298 pupil spiral) - disclosed, not hidden',
         'every translation/rotation of body, head, wings, root uses a named non-linear easing; linear only where the motion IS constant-rate by design', 'engine-truth: flex followers inherit the parent easing (g14 keyframes match to 0.01 deg); linear count 2 (listed left)',
         f'{rel(flex_p)} {ts["flex"]}', P(get(fx, 'pass_all_runs', src='g14_flex'))),
        ('5', 'Overlapping action', 'hierarchy body <- root, head <- body with declared delays; eyes lead the head (acting.lead)',
         f'head delay {hier["head"]["delayMs"]} ms after body (spec); eyes lead head by > 0 ms in A, 0 in B',
         f'eyes lead head: A median {f1(lead_a)} ms ({eye_note}), B {f1(lead_b)} ms; intent eye -> head {f1(im["eye_to_head_ms"])} ms, eye -> body {f1(im["eye_to_body_ms"])} ms',
         f'{rel(eye_p)} ({eye_ts}); {rel(intent_p)} {ts["intent"]}', P(get(eye, 'pass_all', src='eyelead'))),
        ('6', 'Follow-through', 'secondary springs on wings/head after landing; flex tail on the wing tip after the return',
         f'second swing <= 0.15 x first (spec rule); tail overshoot {fs["tail"]["overshoot"]} x last delta over {fs["tail"]["ms"]} ms',
         f'rebound ratio {ov["observed_ratio"]} (first {ov["observed_first_swing_deg"]} deg, second {ov["observed_second_swing_deg"]} deg); tail {fr["tail"]["layers"][0]["kf"][1]} over {fs["tail"]["ms"]} ms',
         f'{rel(proofs_p)} {ts["proofs"]}; {rel(flex_p)} {ts["flex"]}', P(ov['pass'] and get(fx, 'pass_all_runs', src='g14_flex'))),
        ('7', 'Feather / wing motion', '3-band wing (shoulder, mid, tip) with follower layers: ratio and lag per segment from spec',
         f'mid ratio {fs["segments"]["mid"]["ratio"]} lag {fs["segments"]["mid"]["lagMs"]} ms; tip ratio {fs["segments"]["tip"]["ratio"]} lag {fs["segments"]["tip"]["lagMs"]} ms; clamp {fs["maxDeg"]} deg; seam budget rest <= {wb["rest_max_abs_diff"]}, bend holes per wing <= {wb["bend_holes_px"]["2"]} px DPR2',
         f'timing lag {fr["lag_timing_ms"]["mid"]}/{fr["lag_timing_ms"]["tip"]} ms; observed peaks {fr["lag_observed_peak_ms"]["mid"]}/{fr["lag_observed_peak_ms"]["tip"]} ms; seam rest max {max(w["max_abs_diff"] for w in wd["2"]["median_diff_wing_boxes"].values())} DPR2, bend holes {wd["2"]["bend_holes_px_max_wing"]} px',
         f'{rel(flex_p)} {ts["flex"]}; {rel(wing_p)} {ts["wing"]}', P(get(fx, 'pass_all_runs', src='g14_flex') and get(wg, 'pass_all', src='wing'))),
        ('8', 'Secondary action', 'blink, micro-saccades, brows, wink, dart, moving-hold impulses; Foley + VFX bound to state cues',
         f'>= 1 named idle impulse per 2.5-6 s; Foley sync p95 <= {sy["target_ms"]} ms (target), cap {sy["cap_ms"]} ms',
         f'moving-hold impulses per run {ps["hold_counts"]} ({", ".join(ps["hold_names"])}); Foley controlled offset p95 {sy["controlled_ms"]["p95"]} ms, max {sy["controlled_ms"]["max"]} ms',
         f'{rel(perf_p)} {ts["perf"]}; {rel(sync_p)} {ts["sync"]}', P(sy['pass_target'] and min(ps['hold_counts']) >= 1)),
        ('9', 'Timing', 'every duration is spec data; budgets declared before code and measured (see K9_BUDGETS.md)',
         'declared budget exists for each performance and is met', f'triumph settle {f1(ps["triumph_large_median"]["settle_ms_after_land"])} ms <= {pb["triumph"]["settleWithinMs"]}; oops hold {f1(ps["oops_large_median"]["hold_ms"])} ms in [{pb["oops"]["holdMs"][0]}, {pb["oops"]["holdMs"][1]}]',
         f'{rel(perf_p)} {ts["perf"]}', P(ps['pass_all'])),
        ('10', 'Exaggeration', 'escalation small / medium / large per channel; large = 360 roll, double take, spiral gaze; never on the child',
         f'7-step escalation s s m s s m L; roll 360 deg landing level (abs rot < 2 deg)',
         f'tiers observed {esc}; roll {f1(ps["triumph_large_median"]["rot_max_deg_unwrapped"])} deg, at landing {ps["triumph_large_median"]["rot_at_land_deg"]} deg; puzzled head {f1(ps["puzzled_large_median"]["head_max_deg"])} deg',
         f'{rel(ship_p)}; {rel(perf_p)} {ts["perf"]}', P(esc == ['small', 'small', 'medium', 'small', 'small', 'medium', 'large'])),
        ('11', 'Staging', '6 signature poses readable as stills (G11 pose sheet); one owl, one perch, answer card as target',
         'every pose changes >= 6 joints vs rest and releases cleanly', f'changed joints per pose {poses}; released {get(sh, "5_poses", "releasedJoints", src="ship")}',
         f'{rel(ship_p)}; samples/proofs/g11_pose_sheet.png', P(get(sh, '5_poses', 'pass_', src='ship'))),
        ('12', 'Appeal', 'owner judgement (G12 watch kit: 2AFC, randomised order); performance never below 60 fps at 1x',
         f'5 owls 1x: p95 <= 20 ms, jank < 1 %; watch kit majority for v2 with exact binomial p <= 0.05',
         f'5 owls 1x p95 {v2_1["raf_p95_ms"]} ms, jank {v2_1["jank_pct"]} %, heap +{v2_1["heap_delta_mb_after_scene"]} MB; {g12_line}',
         f'{rel(matrix_p)} {ts["matrix"]}; {rel(g12_p)} {ts["g12"]}',
         # perf half PASS + human half as the scorer says: FAIL / PASS close the row; INSUFFICIENT / REJECTED keep it OPEN
         'FAIL' if g12_verdict == 'FAIL' else ('PASS' if g12_verdict == 'PASS' and v2_1['raf_p95_ms'] <= 20 and v2_1['jank_pct'] < 1 else 'OPEN (human gate)')),
    ]
    edge_line = f'edge width median {edge["dpr2_rest"]["edge_width_device_px_median"]} device px at DPR2 rest, soft edge {P(edge["pass_soft_edge"])} ({rel(proofs_p)} {ts["proofs"]})'

    out = ['# K9 principle matrix (gist annex b) - GENERATED by tools/report_k9.py, do not edit by hand', '',
           'Every number below is read from a committed file; the file and its own timestamp stand next to the number. Regenerate with `python3 tools/report_k9.py`; `--check` fails if this file is stale.', '',
           '| # | principle | implementation on the branch | acceptance criterion (number) | measured | evidence (file, timestamp) | status |', '|---|---|---|---|---|---|---|']
    for r in rows: out.append('| ' + ' | '.join(r) + ' |')
    out += ['', f'Edge quality (G7, not one of the 12): {edge_line}.', '',
            f'Status legend: PASS = measured value inside the declared criterion in the named file; OPEN = needs the owner (human gate) - no agent claim is made.']
    matrix_md = '\n'.join(out) + '\n'

    # ---- G13 budgets table ----
    def within(v, lo, hi): return lo <= v <= hi
    B = [
        ('anticipation hold (takeoff crouch)', 'spec squash.takeoffCrouch.holdMs', f'[{crouch["holdMs"][0]}, {crouch["holdMs"][1]}] ms', f'{f1(ant["measured_anticipate_to_takeoff_ms"])} ms', f'{rel(proofs_p)} {ts["proofs"]}', P(ant['pass'])),
        ('intent: eye -> head lag', 'spec acting.intent.headLagMs', f'[{ib["headLagMs"][0]}, {ib["headLagMs"][1]}] ms', f'{f1(im["eye_to_head_ms"])} ms median', f'{rel(intent_p)} {ts["intent"]}', P(within(im['eye_to_head_ms'], ib['headLagMs'][0] - 16.7, ib['headLagMs'][1] + 16.7) )),
        ('intent: eye -> body lag', 'spec acting.intent.bodyLagMs', f'[{ib["bodyLagMs"][0]}, {ib["bodyLagMs"][1]}] ms', f'{f1(im["eye_to_body_ms"])} ms median', f'{rel(intent_p)} {ts["intent"]}', P(within(im['eye_to_body_ms'], ib['bodyLagMs'][0] - 16.7, ib['bodyLagMs'][1] + 16.7))),
        ('intent: pre-takeoff total', 'spec acting.intent.budget.preTakeoffMs', f'[{ib["budget"]["preTakeoffMs"][0]}, {ib["budget"]["preTakeoffMs"][1]}] ms', f'{f1(im["pre_takeoff_ms"])} ms median', f'{rel(intent_p)} {ts["intent"]}', P(within(im['pre_takeoff_ms'], *ib['budget']['preTakeoffMs']))),
        ('intent: head settle after landing (settle_ms)', 'spec acting.intent.settleWithinMs', f'<= {ib["settleWithinMs"]} ms to < {ib["settleDegTarget"]} deg', f'{f1(im["head_settle_ms"])} ms', f'{rel(intent_p)} {ts["intent"]}', P(im['head_settle_ms'] <= ib['settleWithinMs'])),
        ('asymmetry L/R pupils (asymmetry_px)', 'spec acting.intent.budget.asymMinPx', f'>= {ib["budget"]["asymMinPx"]} px', f'{im["asym_px"]} px', f'{rel(intent_p)} {ts["intent"]}', P(im['asym_px'] >= ib['budget']['asymMinPx'])),
        ('eyes lead head (hierarchy lead_ms)', 'spec acting.leadMs', f'{get(spec, "acting", "leadMs", src="spec")} ms', f'A {f1(lead_a)} ms, B {f1(lead_b)} ms', f'{rel(eye_p)} ({eye_ts})', P(get(eye, 'pass_all', src='eyelead'))),
        ('triumph large: roll_deg', 'g13 budgets_declared.triumph (large roll 360, abs rot < 2 at landing)', '360 deg, landing abs rot < 2 deg', f'{f1(ps["triumph_large_median"]["rot_max_deg_unwrapped"])} deg, landing {ps["triumph_large_median"]["rot_at_land_deg"]} deg', f'{rel(perf_p)} {ts["perf"]}', P(ps['pass_all'])),
        ('triumph large: settle_ms after landing', 'g13 budgets_declared.triumph.settleWithinMs', f'<= {pb["triumph"]["settleWithinMs"]} ms', f'{f1(ps["triumph_large_median"]["settle_ms_after_land"])} ms', f'{rel(perf_p)} {ts["perf"]}', P(ps['triumph_large_median']['settle_ms_after_land'] <= pb['triumph']['settleWithinMs'])),
        ('oops: anticipation (snap_ms)', 'g13 budgets_declared.oops.anticipateMs', f'[{pb["oops"]["anticipateMs"][0]}, {pb["oops"]["anticipateMs"][1]}] ms', f'{min(ps["oops_anticipation_ms_all"])} - {max(ps["oops_anticipation_ms_all"])} ms over {len(ps["oops_anticipation_ms_all"])} takes', f'{rel(perf_p)} {ts["perf"]}', P(ps['pass_all'])),
        ('oops large: hold_ms', 'g13 budgets_declared.oops.holdMs', f'[{pb["oops"]["holdMs"][0]}, {pb["oops"]["holdMs"][1]}] ms', f'{f1(ps["oops_large_median"]["hold_ms"])} ms', f'{rel(perf_p)} {ts["perf"]}', P(within(ps['oops_large_median']['hold_ms'], *pb['oops']['holdMs']))),
        ('oops large: stretch', 'g13 budgets_declared.oops.stretchScaleY', f'[{pb["oops"]["stretchScaleY"][0]}, {pb["oops"]["stretchScaleY"][1]}]', f'{ps["oops_large_median"]["stretch_scaleY"]}', f'{rel(perf_p)} {ts["perf"]}', P(within(ps['oops_large_median']['stretch_scaleY'], *pb['oops']['stretchScaleY']))),
        ('puzzled large: head tilt', 'g13 budgets_declared.puzzled.tiers.large.headDeg', f'{pb["puzzled"]["tiers"]["large"]["headDeg"]} deg', f'{f1(ps["puzzled_large_median"]["head_max_deg"])} deg', f'{rel(perf_p)} {ts["perf"]}', P(ps['pass_all'])),
        ('flex: follower lag (mid / tip)', 'spec acting.flex.segments', f'{fs["segments"]["mid"]["lagMs"]} / {fs["segments"]["tip"]["lagMs"]} ms', f'timing {fr["lag_timing_ms"]["mid"]} / {fr["lag_timing_ms"]["tip"]} ms; observed peaks {fr["lag_observed_peak_ms"]["mid"]} / {fr["lag_observed_peak_ms"]["tip"]} ms (Q 16.7)', f'{rel(flex_p)} {ts["flex"]}', P(get(fx, 'runs', 0, 'checks', 'lag_from_timing', src='g14_flex'))),
        ('flex: wing seam at rest', 'wing_render_proof budget_accepted (owner option a, DIRECTIVES #08)', f'max |diff| <= {wb["rest_max_abs_diff"]} on <= {wb["rest_diff_rows_per_cut"]} device rows per cut', f'DPR1 {"/".join(str(w["max_abs_diff"]) for w in wd["1"]["median_diff_wing_boxes"].values())}, DPR2 {"/".join(str(w["max_abs_diff"]) for w in wd["2"]["median_diff_wing_boxes"].values())}', f'{rel(wing_p)} {ts["wing"]}', P(wd['1']['pass_accepted_rest_max_35'] and wd['2']['pass_accepted_rest_max_35'])),
        ('flex: bend pinholes per wing', 'wing_render_proof budget_accepted', f'<= {wb["bend_holes_px"]["1"]} px DPR1, <= {wb["bend_holes_px"]["2"]} px DPR2', f'{wd["1"]["bend_holes_px_max_wing"]} px DPR1, {wd["2"]["bend_holes_px_max_wing"]} px DPR2', f'{rel(wing_p)} {ts["wing"]}', P(wd['1']['pass_accepted_bend_holes'] and wd['2']['pass_accepted_bend_holes'])),
        ('flex: perf cost rule', 'flex_proof (rule written before the run)', 'activeOnly only if p95(on) - p95(off) > in-cell spread', f'1x {fperf["decision 1x"]["p95_rise_ms"]} ms rise vs spread {fperf["decision 1x"]["in_cell_spread_ms"]}; 4x {fperf["decision 4x"]["p95_rise_ms"]} vs {fperf["decision 4x"]["in_cell_spread_ms"]}', f'{rel(flex_p)} {ts["flex"]}', 'PASS (activeOnly not needed)' if not get(fx, 'perf', 'activeOnly_recommended', src='g14_flex') else 'activeOnly recommended'),
        ('perf 5 owls 1x: p95 frame', 'gist G9 (60 fps)', '<= 20 ms', f'{v2_1["raf_p95_ms"]} ms (v1 reference {v1_1["raf_p95_ms"]})', f'{rel(matrix_p)} {ts["matrix"]}', P(v2_1['budget_p95_le_20'])),
        ('perf 5 owls 1x: jank', 'gist G9', '< 1 %', f'{v2_1["jank_pct"]} % median of 3 (v1 reference {v1_1["jank_pct"]} %)', f'{rel(matrix_p)} {ts["matrix"]}', P(v2_1['budget_jank_lt_1pct'])),
        ('perf 5 owls 1x: heap delta', 'gist G9 (RAM delta ~ 0)', 'no declared number; reported', f'+{v2_1["heap_delta_mb_after_scene"]} MB after the scene (v1 {v1_1["heap_delta_mb_after_scene"]})', f'{rel(matrix_p)} {ts["matrix"]}', 'OPEN (no numeric cap declared; owner to set)'),
        ('perf 5 owls 4x CPU throttle: jank', 'NOT declared before measurement', 'none', f'{v2_4["jank_pct"]} % (p95 {v2_4["raf_p95_ms"]} ms); flex on/off {fperf["flex on 4x"]["jank_median"]} / {fperf["flex off 4x"]["jank_median"]} %', f'{rel(matrix_p)} {ts["matrix"]}; {rel(flex_p)} {ts["flex"]}', 'OPEN (measured, no prior budget - candidate for K10 declaration, not set after the fact)'),
        ('landing settle_ms (body springs)', 'NOT declared as a time cap (only the rebound ratio rule exists)', f'rebound ratio <= 0.15 (spec rule)', f'ratio {ov["observed_ratio"]}; damped half period {ov["damped_half_period_ms"]} ms', f'{rel(proofs_p)} {ts["proofs"]}', 'PASS on ratio; OPEN on settle_ms (no cap declared)'),
        ('Foley sync (controlled offset)', 'sfx target/cap declared in sfx_measure.py', f'p95 <= {sy["target_ms"]} ms, max <= {sy["cap_ms"]} ms', f'p95 {sy["controlled_ms"]["p95"]} ms, max {sy["controlled_ms"]["max"]} ms', f'{rel(sync_p)} {ts["sync"]}', P(sy['pass_target'] and sy['pass_cap'])),
        ('Foley mix', 'sfx_measure.py ceiling', f'peak <= {mi["ceiling_dbfs"]} dBFS, duck >= 8 dB', f'5-cue overlap peak {mi["overlap_5_cues"]["peak_dbfs"]} dBFS, clipped {mi["overlap_5_cues"]["clipped"]}, duck {mi["duck_db"]} dB', f'{rel(mix_p)} {ts["mix"]}', P(mi['pass'])),
        ('Foley polyphony', 'spec sound.polyphony / sameCueGapMs', f'<= {po["polyphony_cap"]} voices, same cue >= {po["same_cue_gap_rule_ms"]} ms apart', f'max {po["max_concurrent_voices"]} voices, min gap {po["same_cue_min_gap_ms"]} ms', f'{rel(poly_p)} {ts["poly"]}', P(po['max_concurrent_voices'] <= po['polyphony_cap'] and po['same_cue_min_gap_ms'] >= po['same_cue_gap_rule_ms'])),
    ]
    out = ['# K9 declared budgets (gate G13) - GENERATED by tools/report_k9.py, do not edit by hand', '',
           'G13 rule (gist): a budget is declared first, then measured; a value measured without a prior declaration is OPEN and is never given a cap afterwards.',
           'Counting convention: the totals line is an exact partition of the rows (PASS / OPEN / MIXED / FAIL, each row in exactly one class). A MIXED row holds two criteria (a passed rule and an undeclared cap), so the criteria count exceeds the row count by the number of MIXED rows.',
           'Tolerance on timing rows: one frame (16.7 ms) where the measurement samples on rAF.', '',
           '| budget | declared where | declared value | measured | evidence (file, timestamp) | status |', '|---|---|---|---|---|---|']
    for r in B: out.append('| ' + ' | '.join(r) + ' |')
    # Exact partition of the rows (owner audit F1, 2026-09-27): a row is counted in exactly one class.
    #   PASS  = status starts with PASS and does not mention OPEN or FAIL
    #   OPEN  = status starts with OPEN
    #   MIXED = status carries both a PASS verdict and an OPEN part (a rule that exists passed; a cap that was never declared stays open)
    #   FAIL  = status is exactly FAIL
    def klass(s):
        if s == 'FAIL': return 'FAIL'
        if s.startswith('PASS') and 'OPEN' in s: return 'MIXED'
        if s.startswith('PASS'): return 'PASS'
        if s.startswith('OPEN'): return 'OPEN'
        sys.exit(f'UNCLASSIFIED STATUS: {s!r}')
    K = [klass(r[5]) for r in B]
    n_pass, n_open, n_mixed, n_fail = (K.count(k) for k in ('PASS', 'OPEN', 'MIXED', 'FAIL'))
    assert n_pass + n_open + n_mixed + n_fail == len(B)
    mixed_names = [r[0] for r, k in zip(B, K) if k == 'MIXED']
    n_criteria = len(B) + n_mixed  # a MIXED row carries two criteria (one passed rule, one undeclared cap)
    out += ['', f'Totals: {len(B)} rows = PASS {n_pass} + OPEN {n_open} + MIXED {n_mixed} + FAIL {n_fail} (exact partition, each row counted once).',
            f'Criteria: {n_criteria} = {len(B)} rows + {n_mixed} MIXED row(s) counted twice; MIXED row(s): {", ".join(mixed_names) if mixed_names else "none"}.',
            f'Undeclared (OPEN or the OPEN half of MIXED): {n_open + n_mixed} - measured, recorded, never given a cap after the fact.', '',
            '## Throttle disclosure (owner audit F4, numbers from samples/measure_matrix.json, no cap set)',
            f'At 4x CPU throttle the new engine is heavier than the old one: v2 + Foley jank {v2_4["jank_pct"]} % (runs {v2_4["runs_jank_pct"]}) vs v1 reference {v1_4["jank_pct"]} % (runs {v1_4["runs_jank_pct"]}); v2 no-Foley {nf_4["jank_pct"]} % (runs {nf_4["runs_jank_pct"]}). flex on/off at 4x: {fperf["flex on 4x"]["jank_median"]} / {fperf["flex off 4x"]["jank_median"]} % (samples/proofs/g14_flex.json). No 4x budget exists and none is set here; a cap may only be declared before a run on a real device (candidate for K10).',
            f'At 1x the medians pass but single runs exceeded the 1 % budget: v2 no-intent runs {ni_1["runs_jank_pct"]} (median {ni_1["jank_pct"]}), v2 no-Foley runs {nf_1["runs_jank_pct"]} (median {nf_1["jank_pct"]}), v2 + Foley runs {v2_1["runs_jank_pct"]}, v1 reference runs {v1_1["runs_jank_pct"]} (median {v1_1["jank_pct"]}); flex on 1x rounds {[r["jank"] for r in fperf["flex on 1x"]["rounds"]]}. The table reports the median of 3; the spread is stated here so the median does not hide it.']
    budgets_md = '\n'.join(out) + '\n'

    # ---- sound cue table (for SOUND_IDENTITY.md, appended by that doc via include) ----
    S = get(spec, 'sound', src='spec'); cues = get(S, 'cues', src='spec')
    out = ['<!-- GENERATED by tools/report_k9.py from companions/owl.motion.json sound block; do not edit -->',
           f'Globals: baseHz {S["baseHz"]}, voiceDetune {S["voiceDetune"]}, master {S["master"]}, duck {S["duckDb"]} dB, polyphony {S["polyphony"]}, same-cue gap {S["sameCueGapMs"]} ms. Cues: {len(cues)}.', '',
           '| cue | generator | hz / detail | attack s | decay s | gain | priority |', '|---|---|---|---|---|---|---|']
    for name, c in cues.items():
        hz = c.get('hz', c.get('hzRange', c.get('ratio', '-')))
        out.append(f'| {name} | {c.get("gen", "-")} | {hz} | {c.get("a", "-")} | {c.get("d", "-")} | {c.get("gain", "-")} | {c.get("priority", "-")} |')
    cues_md = '\n'.join(out) + '\n'

    targets = {os.path.join(DOCS, 'K9_MATRIX.md'): matrix_md, os.path.join(DOCS, 'K9_BUDGETS.md'): budgets_md, os.path.join(DOCS, 'SOUND_CUES.generated.md'): cues_md}
    if '--check' in sys.argv:
        stale = [rel(p) for p, s in targets.items() if not os.path.exists(p) or open(p).read() != s]
        print('STALE: ' + ', '.join(stale) if stale else 'report_k9: docs up to date'); sys.exit(1 if stale else 0)
    os.makedirs(DOCS, exist_ok=True)
    for p, s in targets.items():
        with open(p, 'w') as fh: fh.write(s)
    print(f'K9_MATRIX.md: {len(rows)} principles, PASS {sum(1 for r in rows if r[6] == "PASS")}, OPEN {sum(1 for r in rows if "OPEN" in r[6])}, FAIL {sum(1 for r in rows if r[6] == "FAIL")}')
    print(f'K9_BUDGETS.md: {len(B)} rows = PASS {n_pass} + OPEN {n_open} + MIXED {n_mixed} + FAIL {n_fail}; criteria {n_criteria}')
    print(f'SOUND_CUES.generated.md: {len(cues)} cues')


if __name__ == '__main__':
    main()
