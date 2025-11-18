import { BrowserType, DeviceType, OperatingSystem } from '../enums/user.enum';
import { Request } from 'express';

type BrowserInfo = {
  userAgent?: string;
  browser: BrowserType;
  browserVersion?: string;
  device: DeviceType;
  operatingSystem: OperatingSystem;
};

function parseCookies(cookieHeader?: string): Record<string, string> {
  const result: Record<string, string> = {};
  if (!cookieHeader) return result;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [rawKey, ...rest] = part.split('=');
    const key = rawKey?.trim();
    if (!key) continue;
    const value = rest.join('=');
    if (value !== undefined) {
      try {
        result[key] = decodeURIComponent(value.trim());
      } catch {
        result[key] = value.trim();
      }
    }
  }
  return result;
}

function mapBrowser(value?: string, ua?: string): BrowserType {
  const v = (value || '').toLowerCase();
  if (v.includes('edge') || /edg\//i.test(ua || '')) return BrowserType.EDGE;
  if (v.includes('chrome') || /chrome\//i.test(ua || ''))
    return BrowserType.CHROME;
  if (v.includes('firefox') || /firefox\//i.test(ua || ''))
    return BrowserType.FIREFOX;
  if (v.includes('opera') || v.includes('opr') || /opera|opr\//i.test(ua || ''))
    return BrowserType.OPERA;
  if (
    v.includes('safari') ||
    (/safari\//i.test(ua || '') && !/chrome\//i.test(ua || ''))
  )
    return BrowserType.SAFARI;
  return BrowserType.UNKNOWN;
}

function mapOS(value?: string, ua?: string): OperatingSystem {
  const v = (value || '').toLowerCase();
  if (v.includes('windows') || /windows nt/i.test(ua || ''))
    return OperatingSystem.WINDOWS;
  if (v.includes('mac') || /mac os x/i.test(ua || ''))
    return OperatingSystem.MACOS;
  if (v.includes('linux') || /linux/i.test(ua || ''))
    return OperatingSystem.LINUX;
  if (v.includes('android') || /android/i.test(ua || ''))
    return OperatingSystem.ANDROID;
  if (v.includes('ios') || /(iphone|ipad|ipod)/i.test(ua || ''))
    return OperatingSystem.IOS;
  return OperatingSystem.UNKNOWN;
}

function mapDevice(value?: string, ua?: string): DeviceType {
  const v = (value || '').toLowerCase();
  if (v.includes('mobile') || /mobi/i.test(ua || '')) return DeviceType.MOBILE;
  if (v.includes('tablet') || /tablet|ipad/i.test(ua || ''))
    return DeviceType.TABLET;
  return DeviceType.DESKTOP;
}

function extractVersion(browser: BrowserType, ua?: string): string | undefined {
  const s = ua || '';
  try {
    switch (browser) {
      case BrowserType.EDGE: {
        const m = s.match(/edg\/(\d+[\d\.]*)/i);
        return m?.[1];
      }
      case BrowserType.CHROME: {
        const m = s.match(/chrome\/(\d+[\d\.]*)/i);
        return m?.[1];
      }
      case BrowserType.FIREFOX: {
        const m = s.match(/firefox\/(\d+[\d\.]*)/i);
        return m?.[1];
      }
      case BrowserType.OPERA: {
        const m = s.match(/(?:opr|opera)\/(\d+[\d\.]*)/i);
        return m?.[1];
      }
      case BrowserType.SAFARI: {
        const m = s.match(/version\/(\d+[\d\.]*)/i);
        return m?.[1];
      }
      default:
        return undefined;
    }
  } catch {
    return undefined;
  }
}

export function extractBrowserInfoFromRequest(req: Request): BrowserInfo {
  const ua = (req.headers['user-agent'] as string) || '';
  const cookies = parseCookies(req.headers['cookie']);

  const cookieBrowser = cookies['browser'] || cookies['browser_name'];
  const cookieVersion = cookies['browserVersion'] || cookies['browser_version'];
  const cookieDevice = cookies['device'] || cookies['device_type'];
  const cookieOS =
    cookies['os'] || cookies['operatingSystem'] || cookies['operating_system'];
  const cookieUA = cookies['userAgent'] || cookies['ua'];

  const browser = mapBrowser(cookieBrowser, ua);
  const operatingSystem = mapOS(cookieOS, ua);
  const device = mapDevice(cookieDevice, ua);
  const browserVersion = cookieVersion || extractVersion(browser, ua);

  return {
    userAgent: cookieUA || ua,
    browser,
    browserVersion,
    device,
    operatingSystem,
  };
}
