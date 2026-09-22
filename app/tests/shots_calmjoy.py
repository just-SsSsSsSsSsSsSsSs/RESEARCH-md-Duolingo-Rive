#!/usr/bin/env python3
"""Screenshots for PR #3 (Calm & Joy): badges page (SVG medallions), home bottom (nav gap), a party burst."""
import sys
from playwright.sync_api import sync_playwright
BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080/app/index.html'
OUT = sys.argv[2] if len(sys.argv) > 2 else '/tmp'
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 390, 'height': 844}, device_scale_factor=2)
    pg.goto(f'{BASE}#/profile'); pg.wait_for_selector('.hero-card'); pg.locator('.hero-card').first.click(); pg.wait_for_selector('.topbar')
    pg.goto(f'{BASE}#/badges'); pg.wait_for_selector('.badge-grid'); pg.wait_for_timeout(700)
    pg.screenshot(path=f'{OUT}/shot_badges.png')
    pg.goto(f'{BASE}#/home'); pg.wait_for_selector('.nav'); pg.wait_for_timeout(700)
    pg.evaluate('window.scrollTo(0, 99999)'); pg.wait_for_timeout(400)
    pg.screenshot(path=f'{OUT}/shot_home_bottom.png')
    pg.evaluate("() => window.__bubbles.poppers(195, 380, 2)"); pg.wait_for_timeout(450)
    pg.screenshot(path=f'{OUT}/shot_party_poppers.png')
    pg.evaluate("() => { window.__bubbles.balloonParty(195, 500, 2); window.__bubbles.fireworks(195, 300, 2); }"); pg.wait_for_timeout(1400)
    pg.screenshot(path=f'{OUT}/shot_party_balloons_fireworks.png')
    b.close()
print('shots written to', OUT)
