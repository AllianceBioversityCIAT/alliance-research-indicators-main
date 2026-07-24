import { inject, Injectable } from '@angular/core';
import { CacheService } from '@services/cache/cache.service';
import { ApiService } from './api.service';
import { SwUpdate } from '@angular/service-worker';
import { ToPromiseService } from './to-promise.service';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ValidateCacheService {
  api = inject(ApiService);
  private readonly cache = inject(CacheService);
  swUpdate = inject(SwUpdate);

  tp = inject(ToPromiseService);

  getConfiguration = () => {
    return this.tp.get(`configuration/${environment.frontVersionKey}`);
  };

  async validateVersions(): Promise<void> {
    if (!this.cache.dataCache().access_token) {
      return;
    }
    const response = await this.getConfiguration();
    const currentVersion = response?.data?.simple_value;
    if (currentVersion == null) {
      return;
    }
    const lastValidatedVersion = localStorage.getItem('lastVersionValidated');
    const pendingUpdateVersion = localStorage.getItem('pendingUpdateVersion');

    // If there's a pending update and it matches current version, apply silently
    if (pendingUpdateVersion === currentVersion && pendingUpdateVersion !== lastValidatedVersion) {
      console.warn('Applying pending update silently...');
      await this.applySilentUpdate(currentVersion);
      return;
    }

    // If it's the same version as last validated, no action needed
    if (currentVersion === lastValidatedVersion) return;

    // New version detected, prompt user for update
    // After the check above, currentVersion !== lastValidatedVersion is always true here
    this.requeestUpdateFrontVersion(currentVersion);
  }

  private async clearStaticResourceCaches(): Promise<void> {
    if (!('caches' in window) || !window.caches) {
      console.warn('Cache API not supported in this browser');
      return;
    }

    try {
      const cacheNames = await window.caches.keys();
      // Static resources: CSS, JS, images, fonts, and other assets
      const staticExtensions = [
        // Styles
        '.css',
        '.scss',
        '.sass',
        '.less',
        // JavaScript
        '.js',
        '.mjs',
        '.ts',
        '.jsx',
        '.tsx',
        // Images
        '.png',
        '.jpg',
        '.jpeg',
        '.gif',
        '.svg',
        '.webp',
        '.ico',
        '.bmp',
        '.avif',
        // Fonts
        '.woff',
        '.woff2',
        '.ttf',
        '.eot',
        '.otf',
        // Other assets
        '.json',
        '.xml',
        '.txt',
        '.pdf'
      ];

      // Process caches in parallel for better performance
      const cachePromises = cacheNames.map(async cacheName => {
        try {
          const cache = await window.caches.open(cacheName);
          const requests = await cache.keys();

          // Filter static resource requests
          const staticRequests = requests.filter(request => {
            const url = request.url.toLowerCase();
            return staticExtensions.some((ext: string) => url.includes(ext));
          });

          if (staticRequests.length > 0) {
            await Promise.all(staticRequests.map(request => cache.delete(request)));
            console.warn(`Cleared ${staticRequests.length} static resources from cache: ${cacheName}`);
          }
        } catch (error) {
          console.error(`Error clearing static resources from cache ${cacheName}:`, error);
        }
      });

      await Promise.all(cachePromises);
      console.warn('Static resource caches (CSS, JS, images) cleared successfully');
    } catch (error) {
      console.error('Error clearing static resource caches:', error);
      throw error;
    }
  }

  async requeestUpdateFrontVersion(newVersion: string): Promise<void> {
    try {
      // Show confirmation dialog to user
      const userConfirmed = confirm(
        '🔄 New changes are available. Do you want to update the application now?\n\nThis will clear the cache and reload the page.'
      );

      if (!userConfirmed) {
        console.warn('User declined immediate update, downloading in background...');
        // Download updates in background but don't apply immediately
        await this.downloadUpdatesInBackground(newVersion);
        return;
      }

      console.warn('New version available, updating application...');
      await this.performImmediateUpdate(newVersion);
    } catch (error) {
      console.error('Error updating front version:', error);
      // Fallback: show alert and manual reload
      alert('❌ Update error. Please reload the page manually (Ctrl+F5 or Cmd+Shift+R)');
    }
  }

  private async clearApplicationCache(): Promise<void> {
    try {
      // IMPORTANT: DO NOT clear localStorage - it contains JWT session data
      // Only clear sessionStorage to remove temporary data
      sessionStorage.clear();

      // Clear IndexedDB if supported (for app data, not session data)
      if ('indexedDB' in window) {
        try {
          // Get all databases (this is not widely supported yet)
          if ('databases' in indexedDB) {
            const databases = await indexedDB.databases();
            await Promise.all(
              databases.map(db => {
                if (db.name) {
                  return new Promise<void>((resolve, reject) => {
                    const deleteReq = indexedDB.deleteDatabase(db.name!);
                    deleteReq.onsuccess = () => resolve();
                    deleteReq.onerror = () => reject(new Error(`Failed to delete database: ${db.name}`));
                  });
                }
                return Promise.resolve();
              })
            );
          }
        } catch (error) {
          console.warn('Could not clear IndexedDB:', error);
        }
      }

      console.warn('Application cache cleared successfully (localStorage preserved for session)');
    } catch (error) {
      console.error('Error clearing application cache:', error);
      throw error;
    }
  }

  private async clearAllCaches(): Promise<void> {
    if (!('caches' in window) || !window.caches) {
      console.warn('Cache API not supported in this browser');
      return;
    }

    try {
      const cacheNames = await window.caches.keys();

      if (cacheNames.length === 0) {
        console.warn('No caches to clear');
        return;
      }

      // Delete all caches in parallel with individual error handling
      const deletePromises = cacheNames.map(async cacheName => {
        try {
          const deleted = await window.caches.delete(cacheName);
          if (deleted) {
            console.warn(`Successfully deleted cache: ${cacheName}`);
          } else {
            console.warn(`Cache not found or already deleted: ${cacheName}`);
          }
        } catch (error) {
          console.error(`Error deleting cache ${cacheName}:`, error);
        }
      });

      await Promise.all(deletePromises);
      console.warn(`All ${cacheNames.length} caches processed successfully`);
    } catch (error) {
      console.error('Error clearing caches:', error);
      throw error;
    }
  }

  private async updateServiceWorker(): Promise<void> {
    if (!this.swUpdate.isEnabled) {
      console.warn('Service worker not enabled');
      return;
    }

    try {
      // Check for updates
      const updateAvailable = await this.swUpdate.checkForUpdate();

      if (updateAvailable) {
        console.warn('Service worker update available, activating...');
        await this.swUpdate.activateUpdate();
        console.warn('Service worker updated successfully');
      } else {
        console.warn('No service worker update available');
      }
    } catch (error) {
      console.error('Error updating service worker:', error);
      throw error;
    }
  }

  private async downloadUpdatesInBackground(newVersion: string): Promise<void> {
    try {
      console.warn('Downloading updates in background...');

      // Update service worker to download new resources in background
      await this.updateServiceWorker();

      // Mark this version as pending for next refresh
      localStorage.setItem('pendingUpdateVersion', newVersion);

      console.warn(`Version ${newVersion} downloaded and ready for next refresh`);
    } catch (error) {
      console.error('Error downloading updates in background:', error);
    }
  }

  private async performImmediateUpdate(newVersion: string): Promise<void> {
    // Execute cache clearing operations in parallel for better performance
    // IMPORTANT: localStorage is preserved to maintain JWT session
    const cacheOperations = [this.clearAllCaches(), this.clearStaticResourceCaches(), this.clearApplicationCache(), this.updateServiceWorker()];

    await Promise.allSettled(cacheOperations);

    // Mark version as validated
    localStorage.setItem('lastVersionValidated', newVersion);
    localStorage.removeItem('pendingUpdateVersion'); // Clear pending flag

    // Force reload to apply changes
    this.forceReload();
  }

  private async applySilentUpdate(newVersion: string): Promise<void> {
    try {
      console.warn('Applying silent update...');

      // Clear caches silently without user interaction
      const cacheOperations = [this.clearAllCaches(), this.clearStaticResourceCaches(), this.clearApplicationCache()];

      await Promise.allSettled(cacheOperations);

      // Mark version as validated
      localStorage.setItem('lastVersionValidated', newVersion);
      localStorage.removeItem('pendingUpdateVersion'); // Clear pending flag

      console.warn(`Silent update applied for version ${newVersion}`);
    } catch (error) {
      console.error('Error applying silent update:', error);
    }
  }

  private forceReload(): void {
    console.warn('Forcing page reload immediately...');
    // Show loading message to user
    alert('✅ Cache cleared successfully. The application will reload now...');

    // Reload immediately without delay
    window.location.reload();
  }
}
