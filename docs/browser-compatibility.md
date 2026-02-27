# Browser Compatibility Matrix

## Supported Targets

| Browser | Minimum Version | Status |
|---|---:|---|
| Chrome | 120+ | Supported |
| Edge (Chromium) | 120+ | Supported |
| Firefox | 122+ | Supported |
| Safari | 17+ | Supported |
| iOS Safari | 17+ | Supported |
| Android Chrome | 120+ | Supported |

## Feature Dependencies

- ES2021 syntax and modules
- CSS custom properties
- `:focus-visible`
- `ResizeObserver`/modern layout APIs
- `Blob` + `URL.createObjectURL` for client-side exports

## Manual Verification Checklist

- Keyboard-only navigation through wizard and results
- Print flow (`window.print`) on results page
- CSV export in all supported browsers
- Local storage persistence restore after refresh
- Dark/light theme readability and focus visibility

## Notes

- Legacy Internet Explorer is not supported.
- If enterprise support for older browsers is required, add transpilation/polyfill policy and CI matrix via BrowserStack/Playwright cloud.
