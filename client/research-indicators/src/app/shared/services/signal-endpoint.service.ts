import { Injectable, WritableSignal, inject, signal } from '@angular/core';
import { MainResponse } from '../interfaces/responses.interface';
import { ToPromiseService } from './to-promise.service';
import { ControlListCacheService } from './control-list-cache.service';

export interface LazySignals<T> {
  isLoading: WritableSignal<boolean>;
  hasValue: WritableSignal<boolean>;
  list: WritableSignal<T>;
}

export interface SignalEndpoint<T> {
  lazy: () => LazySignals<T>;
  fetch: () => Promise<void>;
  promise: () => Promise<T>;
  setReferenceName: (name: string) => void;
}

@Injectable({
  providedIn: 'root'
})
export class SignalEndpointService {
  private TP = inject(ToPromiseService);
  private clCache = inject(ControlListCacheService);

  createEndpoint<T>(urlFn: () => string, referenceName?: string, useCache = true): SignalEndpoint<T> {
    const loading = signal(false);
    const data = signal<T>([] as unknown as T);
    const hasValueSignal = signal(false);
    const currentReferenceName = signal<string | undefined>(referenceName);
    const isInitialized = signal(false);

    const getParentCacheKey = () => urlFn();
    const getReferenceCacheKey = (reference: string) => `${urlFn()}_${reference}`;

    const fetchFromAPI = async () => {
      const { data: responseData } = (await this.TP.get(urlFn(), {})) as MainResponse<T>;
      if (useCache) {
        this.clCache.set(getParentCacheKey(), responseData);
        const reference = currentReferenceName();
        if (reference) {
          this.clCache.set(getReferenceCacheKey(reference), responseData);
        }
      }
      return responseData;
    };

    const getCachedData = () => {
      if (!useCache) return null;

      const reference = currentReferenceName();
      if (reference) {
        const referenceCacheKey = getReferenceCacheKey(reference);
        if (this.clCache.has(referenceCacheKey)) {
          return this.clCache.get(referenceCacheKey);
        }
      }

      const parentCacheKey = getParentCacheKey();
      return this.clCache.has(parentCacheKey) ? this.clCache.get(parentCacheKey) : null;
    };

    const promise = async () => {
      const cachedData = getCachedData();
      if (cachedData) return cachedData;
      return fetchFromAPI();
    };

    const updateHasValue = (value: T) => {
      let hasValue = false;
      if (Array.isArray(value)) {
        hasValue = value.length > 0;
      } else if (value && typeof value === 'object') {
        hasValue = Object.keys(value).length > 0;
      }
      hasValueSignal.set(hasValue);
    };

    const fetch = async () => {
      loading.set(true);
      try {
        const responseData = await promise();
        data.set(responseData);
        updateHasValue(responseData);
      } finally {
        loading.set(false);
      }
    };

    const setReferenceName = (name: string) => {
      currentReferenceName.set(name);
      if (isInitialized()) {
        fetch();
      }
    };

    const lazy = () => {
      if (!isInitialized()) {
        isInitialized.set(true);
        fetch();
      }
      return {
        isLoading: loading,
        hasValue: hasValueSignal,
        list: data
      };
    };

    return {
      lazy,
      fetch,
      promise,
      setReferenceName
    };
  }
}
