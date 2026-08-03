import { Injectable, Renderer2, RendererFactory2 } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class DarkModeService {
  private readonly renderer: Renderer2;
  private isDarkMode = false;

  constructor(rendererFactory: RendererFactory2) {
    this.renderer = rendererFactory.createRenderer(null, null);
  }

  // Load the user's theme preference from localStorage or the system's default
  loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme) {
      this.isDarkMode = savedTheme === 'dark';
    } else {
      const prefersDarkMode = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.isDarkMode = prefersDarkMode;
    }
    this.applyTheme(this.isDarkMode);
  }

  // Toggle dark mode manually
  toggleDarkMode() {
    this.isDarkMode = !this.isDarkMode;
    this.applyTheme(this.isDarkMode);
    localStorage.setItem('theme', this.isDarkMode ? 'dark' : 'light'); // Save preference
  }

  // Apply the theme by setting data-theme attribute
  private applyTheme(isDarkMode: boolean) {
    if (isDarkMode) {
      this.renderer.setAttribute(document.documentElement, 'data-theme', 'dark');
    } else {
      this.renderer.setAttribute(document.documentElement, 'data-theme', 'light');
    }
  }

  // Check if dark mode is enabled
  isDarkModeEnabled() {
    return this.isDarkMode;
  }
}
