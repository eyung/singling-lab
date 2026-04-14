const THEME_KEY = 'singling-lab:theme'

export type Theme = 'dark' | 'light'

// Read which theme the inline script already applied (avoids double localStorage read)
export function getInitialTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light'
}

// Apply theme class to <html> and persist to localStorage
export function applyTheme(theme: Theme): void {
  if (theme === 'dark') {
    document.documentElement.classList.add('dark')
  } else {
    document.documentElement.classList.remove('dark')
  }
  try {
    localStorage.setItem(THEME_KEY, theme)
  } catch {
    // silent — storage may be unavailable
  }
}
