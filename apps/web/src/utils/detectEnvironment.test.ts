import { describe, expect, it } from 'vitest';
import {
  detectEnvironmentFromSignals,
  isLikelyTabletDevice,
} from './detectEnvironment';

const ipadDesktopUa =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';

describe('detectEnvironment', () => {
  it('detects iPad as desktop layout with tablet label', () => {
    expect(isLikelyTabletDevice(ipadDesktopUa, 'MacIntel', 5)).toBe(true);

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

    expect(ipad.kind).toBe('desktop');
    expect(ipad.label.includes('Tablet')).toBe(true);
  });

  it('detects TV user agents', () => {
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

    expect(tv.kind).toBe('tv');
  });

  it('detects phone user agents', () => {
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

    expect(phone.kind).toBe('mobile');
  });
});
