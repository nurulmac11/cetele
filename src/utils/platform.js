// macOS and iOS use Cmd where other systems use Ctrl
export function isApplePlatform() {
  if (typeof navigator === 'undefined') return false
  const platform = navigator.userAgentData?.platform || navigator.platform || ''
  return /mac|iphone|ipad/i.test(platform)
}

// True when the platform's command modifier (Cmd on Apple, Ctrl elsewhere) is held
export function hasCommandModifier(event) {
  return isApplePlatform() ? event.metaKey : event.ctrlKey
}
