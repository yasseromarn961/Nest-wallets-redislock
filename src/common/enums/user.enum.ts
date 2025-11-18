export enum UserType {
  GUEST = 'guest',
  REGISTERED = 'registered',
}

export enum SupportedLanguage {
  EN = 'en',
  AR = 'ar',
}

export enum BrowserType {
  CHROME = 'chrome',
  FIREFOX = 'firefox',
  SAFARI = 'safari',
  EDGE = 'edge',
  OPERA = 'opera',
  UNKNOWN = 'unknown',
}

export enum DeviceType {
  DESKTOP = 'desktop',
  MOBILE = 'mobile',
  TABLET = 'tablet',
  UNKNOWN = 'unknown',
}

export enum OperatingSystem {
  WINDOWS = 'windows',
  MACOS = 'macos',
  LINUX = 'linux',
  IOS = 'ios',
  ANDROID = 'android',
  UNKNOWN = 'unknown',
}

export enum GuestTokenType {
  PERSISTENT = 'persistent',
  TEMPORARY = 'temporary',
}
