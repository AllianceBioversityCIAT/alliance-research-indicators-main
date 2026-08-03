import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { GeoScopeGeocodeTask, GeocodedLocation } from '@interfaces/geo-scope.interface';
import { environment } from '../../../environments/environment';
import { Observable, catchError, forkJoin, map, of } from 'rxjs';

interface MapboxGeocodingResponse {
  features?: {
    center?: [number, number];
  }[];
}

@Injectable({ providedIn: 'root' })
export class MapboxGeocodingService {
  private readonly http = inject(HttpClient);
  private readonly cache = new Map<string, GeocodedLocation | null>();

  geocode(query: string, countryCode?: string): Observable<GeocodedLocation | null> {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return of(null);
    }

    const cacheKey = `${normalizedQuery.toLowerCase()}:${countryCode?.toLowerCase() ?? ''}`;
    if (this.cache.has(cacheKey)) {
      return of(this.cache.get(cacheKey) ?? null);
    }

    const token = environment.mapboxAccessToken?.trim();
    if (!token) {
      return of(null);
    }

    const url = `${environment.mapboxGeocodingUrl}/${encodeURIComponent(normalizedQuery)}.json`;
    const params: Record<string, string> = {
      access_token: token,
      limit: '1'
    };

    if (countryCode) {
      params['country'] = countryCode.toLowerCase();
    }

    if (query.includes(',')) {
      params['types'] = 'place,region,district,locality';
    }

    return this.http.get<MapboxGeocodingResponse>(url, { params }).pipe(
      map(response => {
        const center = response.features?.[0]?.center;
        const location =
          center?.length === 2
            ? {
                lng: center[0],
                lat: center[1]
              }
            : null;
        this.cache.set(cacheKey, location);
        return location;
      }),
      catchError(() => {
        this.cache.set(cacheKey, null);
        return of(null);
      })
    );
  }

  geocodeTasks(tasks: readonly GeoScopeGeocodeTask[]): Observable<Map<string, GeocodedLocation | null>> {
    if (!tasks.length) {
      return of(new Map());
    }

    return forkJoin(
      tasks.map(task =>
        this.geocode(task.query, task.countryCode).pipe(
          map(location => ({ cacheKey: task.cacheKey, location }) as const)
        )
      )
    ).pipe(
      map(results => {
        const lookup = new Map<string, GeocodedLocation | null>();
        for (const result of results) {
          lookup.set(result.cacheKey, result.location);
        }
        return lookup;
      })
    );
  }

  /** @deprecated Use geocodeTasks instead. */
  geocodeMany(queries: readonly string[]): Observable<Map<string, GeocodedLocation | null>> {
    const uniqueQueries = [...new Set(queries.map(query => query.trim()).filter(Boolean))];
    if (!uniqueQueries.length) {
      return of(new Map());
    }

    return forkJoin(
      uniqueQueries.map(query =>
        this.geocode(query).pipe(map(location => ({ query, location }) as const))
      )
    ).pipe(
      map(results => {
        const lookup = new Map<string, GeocodedLocation | null>();
        for (const result of results) {
          lookup.set(result.query.toLowerCase(), result.location);
        }
        return lookup;
      })
    );
  }
}
