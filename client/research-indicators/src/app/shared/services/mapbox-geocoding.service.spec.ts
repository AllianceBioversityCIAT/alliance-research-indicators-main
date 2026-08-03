import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { environment } from '../../../environments/environment';
import { firstValueFrom, of, type Observable } from 'rxjs';
import { MapboxGeocodingService } from './mapbox-geocoding.service';

type GeocodeMany = (queries: readonly string[]) => Observable<Map<string, { lng: number; lat: number } | null>>;

describe('MapboxGeocodingService', () => {
  let service: MapboxGeocodingService;
  let httpMock: HttpTestingController;
  let originalToken: string;

  beforeEach(() => {
    originalToken = environment.mapboxAccessToken;
    environment.mapboxAccessToken = 'mapbox-token';

    TestBed.configureTestingModule({
      providers: [MapboxGeocodingService, provideHttpClient(), provideHttpClientTesting()]
    });

    service = TestBed.inject(MapboxGeocodingService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
    environment.mapboxAccessToken = originalToken;
  });

  it('should return null without an HTTP request when the query is blank', async () => {
    await expect(firstValueFrom(service.geocode('   '))).resolves.toBeNull();
  });

  it('should return null without an HTTP request when the Mapbox token is missing', async () => {
    environment.mapboxAccessToken = '   ';

    await expect(firstValueFrom(service.geocode('Cali'))).resolves.toBeNull();
  });

  it('should geocode a query with country and type filters', async () => {
    const result = firstValueFrom(service.geocode(' Cali, Valle ', 'CO'));

    const request = httpMock.expectOne(req => req.url === `${environment.mapboxGeocodingUrl}/Cali%2C%20Valle.json`);
    expect(request.request.params.get('access_token')).toBe('mapbox-token');
    expect(request.request.params.get('limit')).toBe('1');
    expect(request.request.params.get('country')).toBe('co');
    expect(request.request.params.get('types')).toBe('place,region,district,locality');
    request.flush({ features: [{ center: [-76.532, 3.451] }] });

    await expect(result).resolves.toEqual({ lng: -76.532, lat: 3.451 });
  });

  it('should reuse cached geocoding results', async () => {
    const firstResult = firstValueFrom(service.geocode('Cali'));
    const request = httpMock.expectOne(req => req.url === `${environment.mapboxGeocodingUrl}/Cali.json`);
    expect(request.request.params.get('country')).toBeNull();
    expect(request.request.params.get('types')).toBeNull();
    request.flush({ features: [{ center: [-76.532, 3.451] }] });

    await expect(firstResult).resolves.toEqual({ lng: -76.532, lat: 3.451 });
    await expect(firstValueFrom(service.geocode('Cali'))).resolves.toEqual({ lng: -76.532, lat: 3.451 });
  });

  it('should cache null when Mapbox returns no features', async () => {
    const firstResult = firstValueFrom(service.geocode('Unknown'));
    const request = httpMock.expectOne(req => req.url === `${environment.mapboxGeocodingUrl}/Unknown.json`);
    request.flush({});

    await expect(firstResult).resolves.toBeNull();
    await expect(firstValueFrom(service.geocode('Unknown'))).resolves.toBeNull();
  });

  it('should return null when the first feature has no center', async () => {
    const result = firstValueFrom(service.geocode('No center'));
    const request = httpMock.expectOne(req => req.url === `${environment.mapboxGeocodingUrl}/No%20center.json`);
    request.flush({ features: [{}] });

    await expect(result).resolves.toBeNull();
  });

  it('should return null when the first center is not a coordinate pair', async () => {
    const result = firstValueFrom(service.geocode('Invalid center'));
    const request = httpMock.expectOne(req => req.url === `${environment.mapboxGeocodingUrl}/Invalid%20center.json`);
    request.flush({ features: [{ center: [-76.532] }] });

    await expect(result).resolves.toBeNull();
  });

  it('should cache null when the geocoding request fails', async () => {
    const firstResult = firstValueFrom(service.geocode('Cali'));
    const request = httpMock.expectOne(req => req.url === `${environment.mapboxGeocodingUrl}/Cali.json`);
    request.flush('Request failed', { status: 500, statusText: 'Server Error' });

    await expect(firstResult).resolves.toBeNull();
    await expect(firstValueFrom(service.geocode('Cali'))).resolves.toBeNull();
  });

  it('should return an empty lookup when there are no geocode tasks', async () => {
    const lookup = await firstValueFrom(service.geocodeTasks([]));

    expect(lookup).toEqual(new Map());
  });

  it('should map geocode task results by cache key', async () => {
    jest
      .spyOn(service, 'geocode')
      .mockReturnValueOnce(of({ lng: -76.532, lat: 3.451 }))
      .mockReturnValueOnce(of(null));

    const lookup = await firstValueFrom(
      service.geocodeTasks([
        {
          cacheKey: 'country:co',
          query: 'Colombia',
          countryCode: 'CO',
          level: 'country',
          name: 'Colombia',
          countryName: 'Colombia',
          count: 1
        },
        {
          cacheKey: 'sub-national:co:cali',
          query: 'Cali',
          level: 'sub-national',
          name: 'Cali',
          countryName: 'Colombia',
          count: 2
        }
      ])
    );

    expect(service.geocode).toHaveBeenNthCalledWith(1, 'Colombia', 'CO');
    expect(service.geocode).toHaveBeenNthCalledWith(2, 'Cali', undefined);
    expect(lookup).toEqual(
      new Map([
        ['country:co', { lng: -76.532, lat: 3.451 }],
        ['sub-national:co:cali', null]
      ])
    );
  });

  it('should return an empty lookup when geocodeMany receives no usable queries', async () => {
    const geocodeMany = (service as unknown as { geocodeMany: GeocodeMany }).geocodeMany.bind(service);
    const lookup = await firstValueFrom(geocodeMany(['', '   ']));

    expect(lookup).toEqual(new Map());
  });

  it('should deduplicate and map geocodeMany results by lower-case query', async () => {
    const geocodeMany = (service as unknown as { geocodeMany: GeocodeMany }).geocodeMany.bind(service);
    jest.spyOn(service, 'geocode').mockReturnValueOnce(of({ lng: -76.532, lat: 3.451 })).mockReturnValueOnce(of(null));

    const lookup = await firstValueFrom(geocodeMany(['Cali', 'Cali', 'Bogota']));

    expect(service.geocode).toHaveBeenCalledTimes(2);
    expect(service.geocode).toHaveBeenNthCalledWith(1, 'Cali');
    expect(service.geocode).toHaveBeenNthCalledWith(2, 'Bogota');
    expect(lookup).toEqual(
      new Map([
        ['cali', { lng: -76.532, lat: 3.451 }],
        ['bogota', null]
      ])
    );
  });
});
