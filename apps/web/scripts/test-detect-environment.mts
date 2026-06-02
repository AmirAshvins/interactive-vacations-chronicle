#!/usr/bin/env tsx
import assert from 'node:assert/strict';
import {
  detectEnvironmentFromSignals,
  isLikelyTabletDevice,
} from '../src/utils/detectEnvironment.ts';

const ipadDesktopUa =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

assert.equal(isLikelyTabletDevice(ipadDesktopUa, 'MacIntel', 5), true);

const ipad = detectEnvironmentFromSignals({
  ua: ipadDesktopUa,
  platform: 'MacIntel',
  maxTouchPoints: 5,
  width: 1024,
  coarsePointer: true,
  finePointer: false,
  hover: false,
  tvDisplayMode: false,
  touchCapable: true,
});

assert.equal(ipad.kind, 'desktop', '13" iPad should not be detected as TV');
assert.equal(ipad.label.includes('Tablet'), true);

const tv = detectEnvironmentFromSignals({
  ua: 'Mozilla/5.0 (Web0S; Linux/SmartTV) AppleWebKit/537.36',
  platform: 'Linux armv7l',
  maxTouchPoints: 0,
  width: 1920,
  coarsePointer: true,
  finePointer: false,
  hover: false,
  tvDisplayMode: false,
  touchCapable: true,
});

assert.equal(tv.kind, 'tv');

const phone = detectEnvironmentFromSignals({
  ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)',
  platform: 'iPhone',
  maxTouchPoints: 5,
  width: 390,
  coarsePointer: true,
  finePointer: false,
  hover: false,
  tvDisplayMode: false,
  touchCapable: true,
});

assert.equal(phone.kind, 'mobile');

console.log('✅ detectEnvironment tablet / TV / phone cases OK');
