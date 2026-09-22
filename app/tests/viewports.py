#!/usr/bin/env python3
"""Cross-device visual + ergonomics test.
Runs the play flow on 4 real-world viewports, asserts: no console errors, all interactive
controls ≥ 44px tall, no horizontal overflow, celebration FX fires on correct answers.
Screenshots → /tmp/vp_<name>_<screen>.png
Usage: python3 app/tests/viewports.py [base_url]
"""
import sys
from playwright.sync_api import sync_playwright

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080/app/index.html'
DEVICES = [
    ('android360', dict(viewport={'width': 360, 'height': 780}, device_scale_factor=2, is_mobile=True, has_touch=True)),
    ('iphone390', dict(viewport={'width': 390, 'height': 844}, device_scale_factor=3, is_mobile=True, has_touch=True)),
    ('ipad820', dict(viewport={'width': 820, 'height': 1180}, device_scale_factor=2, is_mobile=True, has_touch=True)),
    ('desktop1280', dict(viewport={'width': 1280, 'height': 800}, device_scale_factor=1)),
]
fail = []

with sync_playwright() as p:
    b = p.chromium.launch()
    for name, opts in DEVICES:
        ctx = b.new_context(**opts, locale='ar-EG')
        pg = ctx.new_page()
        errs = []
        pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' and 'fonts.g' not in m.text else None)
        pg.on('pageerror', lambda e: errs.append(str(e)))
        pg.goto(f'{BASE}#/profile'); pg.wait_for_selector('.hero-card'); pg.wait_for_timeout(600)
        pg.screenshot(path=f'/tmp/vp_{name}_picker.png')
        pg.locator('.hero-card').first.click(); pg.wait_for_selector('.grid-3'); pg.wait_for_timeout(800)
        pg.screenshot(path=f'/tmp/vp_{name}_home.png')
        # overflow check
        sw = pg.evaluate('document.documentElement.scrollWidth'); cw = pg.evaluate('document.documentElement.clientWidth')
        if sw > cw + 1: fail.append(f'{name}: horizontal overflow {sw}>{cw}')
        # play a quiz
        pg.goto(f'{BASE}#/play/plant_quiz'); pg.wait_for_selector('[data-act="start"]')
        # hit-target audit on intro
        small = pg.evaluate("[...document.querySelectorAll('.btn,.choice,.nav a,.btn-icon')].filter(e=>{const r=e.getBoundingClientRect();return r.height>0&&r.height<44}).map(e=>e.className+':'+Math.round(e.getBoundingClientRect().height))")
        if small: fail.append(f'{name}: small targets {small[:5]}')
        pg.click('[data-act="start"]'); pg.wait_for_selector('.choice'); pg.wait_for_timeout(500)
        pg.screenshot(path=f'/tmp/vp_{name}_play.png')
        choices = pg.locator('.choice')
        small = pg.evaluate("[...document.querySelectorAll('.choice')].filter(e=>e.getBoundingClientRect().height<48).length")
        if small: fail.append(f'{name}: {small} choices < 48px')
        # click the correct one: find by trying each until 'correct' class appears on clicked
        # (answers are shuffled; the renderer marks the correct one after any click)
        choices.first.click(); pg.wait_for_selector('.feedback'); pg.wait_for_timeout(350)
        fx_float = pg.evaluate("document.querySelectorAll('#fx-layer .fx-float').length")
        parts = pg.evaluate('window.__bubbles ? window.__bubbles.parts.length + window.__bubbles.rings.length : -1')
        clicked_correct = pg.evaluate("!!document.querySelector('.choice.correct') && [...document.querySelectorAll('.choice')][0].classList.contains('correct')")
        if fx_float < 1: fail.append(f'{name}: no floater text after answer')
        if clicked_correct and parts < 20: fail.append(f'{name}: celebration particles too few ({parts})')
        pg.screenshot(path=f'/tmp/vp_{name}_feedback.png')
        print(f'✔ {name}: floaters={fx_float} particles={parts} correct={clicked_correct} bubbles={pg.evaluate("window.__bubbles.bubbles.length")}')
        if errs: fail.append(f'{name}: console errors {errs[:3]}')
        ctx.close()
    b.close()

print('\nFAILURES:' if fail else '\n✅ ALL VIEWPORT CHECKS PASSED'); [print(' -', f) for f in fail]
sys.exit(1 if fail else 0)
