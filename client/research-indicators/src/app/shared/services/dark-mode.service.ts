import { Injectable, Renderer2, RendererFactory2, Signal, WritableSignal, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DarkModeService {
  private readonly renderer: Renderer2;
  private readonly isDarkMode: WritableSignal<boolean> = signal<boolean>(false);

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  // Readonly exposure of the dark-mode signal so consumers (e.g. chart-tokens.util)
  // can re-resolve theme-derived values without becoming a writer. The service stays
  // the sole writer via loadThemePreference / toggleDarkMode (R-PD-006 / D-PD-5).
  darkMode(): Signal<boolean> {
    return this.isDarkMode.asReadonly();
  }

  // Load the user's theme preference from localStorage or the system's default
  loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.isDarkMode.set(savedTheme === 'dark');
    } else {
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.isDarkMode.set(prefersDarkMode);
    }
    this.applyTheme(this.isDarkMode());
  }

  // Toggle dark mode manually
  toggleDarkMode() {
    this.isDarkMode.set(!this.isDarkMode());
    this.applyTheme(this.isDarkMode());
    localStorage.setItem('theme', this.isDarkMode() ? 'dark' : 'light'); // Save preference
  }

  // Apply the theme by setting data-theme attribute
  private applyTheme(isDarkMode: boolean) {
    if (isDarkMode) {
      this.renderer.setAttribute(document.documentElement, 'data-theme', 'dark');
    } else {
      this.renderer.setAttribute(document.documentElement, 'data-theme', 'light');
    }
  }

  // Check if dark mode is enabled (preserved; delegates to the signal)
  isDarkModeEnabled() {
    return this.isDarkMode();
  }
}
