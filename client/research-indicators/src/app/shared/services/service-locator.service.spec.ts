import { TestBed } from '@angular/core/testing';
import { ServiceLocatorService } from './service-locator.service';
import { NotableReferenceTypesService } from './short-control-list/notable-reference-types.service';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ApiService } from '../services/api.service';

describe('ServiceLocatorService notableReferenceTypes', () => {
  let locator: ServiceLocatorService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ServiceLocatorService, NotableReferenceTypesService, ApiService]
    });
    locator = TestBed.inject(ServiceLocatorService);
  });

  it('should resolve notableReferenceTypes service', () => {
    const svc = locator.getService('notableReferenceTypes');
    expect(svc).toBeInstanceOf(NotableReferenceTypesService);
  });
});

import { Injector } from '@angular/core';
// duplicate import removed

describe('ServiceLocatorService', () => {
  let service: ServiceLocatorService;
  let injectorMock: any;
  let serviceMock: any;

  beforeEach(() => {
    serviceMock = {
      list: { set: jest.fn() },
      main: jest.fn()
    };
    injectorMock = {
      get: jest.fn().mockReturnValue(serviceMock)
    };
    service = new ServiceLocatorService(injectorMock as Injector);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getService returns from getPrimaryServices', () => {
    jest.spyOn(service as any, 'getPrimaryServices').mockReturnValue('primary');
    expect(service.getService('actorTypes')).toBe('primary');
  });

  it('getService returns from getSecondaryServices', () => {
    jest.spyOn(service as any, 'getPrimaryServices').mockReturnValue(null);
    jest.spyOn(service as any, 'getSecondaryServices').mockReturnValue('secondary');
    expect(service.getService('countries')).toBe('secondary');
  });

  it('getService returns from getTertiaryServices', () => {
    jest.spyOn(service as any, 'getPrimaryServices').mockReturnValue(null);
    jest.spyOn(service as any, 'getSecondaryServices').mockReturnValue(null);
    jest.spyOn(service as any, 'getTertiaryServices').mockReturnValue('tertiary');
    expect(service.getService('policyTypes')).toBe('tertiary');
  });

  it('getService returns from getQuaternaryServices', () => {
    jest.spyOn(service as any, 'getPrimaryServices').mockReturnValue(null);
    jest.spyOn(service as any, 'getSecondaryServices').mockReturnValue(null);
    jest.spyOn(service as any, 'getTertiaryServices').mockReturnValue(null);
    jest.spyOn(service as any, 'getQuaternaryServices').mockReturnValue('quaternary');
    expect(service.getService('regions')).toBe('quaternary');
  });

  it('getService returns from getOtherServices', () => {
    jest.spyOn(service as any, 'getPrimaryServices').mockReturnValue(null);
    jest.spyOn(service as any, 'getSecondaryServices').mockReturnValue(null);
    jest.spyOn(service as any, 'getTertiaryServices').mockReturnValue(null);
    jest.spyOn(service as any, 'getQuaternaryServices').mockReturnValue(null);
    jest.spyOn(service as any, 'getOtherServices').mockReturnValue('other');
    expect(service.getService('ipOwners')).toBe('other');
  });

  it('clearService calls list.set and main if present', () => {
    const spy = jest.spyOn(service, 'getService').mockReturnValue(serviceMock);
    service.clearService('actorTypes');
    expect(serviceMock.list.set).toHaveBeenCalledWith([]);
    expect(serviceMock.main).toHaveBeenCalled();
    spy.mockRestore();
  });

  it('clearService does nothing if service not found', () => {
    const spy = jest.spyOn(service, 'getService').mockReturnValue(null);
    expect(() => service.clearService('actorTypes')).not.toThrow();
    spy.mockRestore();
  });

  it('clearService only calls list.set if main not present', () => {
    const partialApiMock = { TP: {}, cache: {}, clCache: {}, signalEndpoint: jest.fn() };
    const partialMock = {
      list: { set: jest.fn() },
      loading: false,
      isOpenSearch: false,
      severity: '',
      main: undefined,
      api: partialApiMock
    } as unknown as any;
    const spy = jest.spyOn(service, 'getService').mockReturnValue(partialMock);
    service.clearService('actorTypes');
    expect(partialMock.list.set).toHaveBeenCalledWith([]);
    spy.mockRestore();
  });

  it('clearService only calls main if list not present', () => {
    const partialApiMock2 = { TP: {}, cache: {}, clCache: {}, signalEndpoint: jest.fn() };
    const partialMock2 = {
      main: jest.fn(),
      loading: false,
      isOpenSearch: false,
      severity: '',
      list: undefined,
      api: partialApiMock2
    } as unknown as any;
    const spy2 = jest.spyOn(service, 'getService').mockReturnValue(partialMock2);
    service.clearService('actorTypes');
    expect(partialMock2.main).toHaveBeenCalled();
    spy2.mockRestore();
  });

  describe('getPrimaryServices', () => {
    it('returns actorTypes service', () => {
      const result = (service as any).getPrimaryServices('actorTypes');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns institutionTypes service', () => {
      const result = (service as any).getPrimaryServices('institutionTypes');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns anticipatedUsers service', () => {
      const result = (service as any).getPrimaryServices('anticipatedUsers');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns innovationTypes service', () => {
      const result = (service as any).getPrimaryServices('innovationTypes');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns innovationCharacteristics service', () => {
      const result = (service as any).getPrimaryServices('innovationCharacteristics');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns innovationReadinessLevels service', () => {
      const result = (service as any).getPrimaryServices('innovationReadinessLevels');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns contracts service', () => {
      const result = (service as any).getPrimaryServices('contracts');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns institutions service', () => {
      const result = (service as any).getPrimaryServices('institutions');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns userStaff service', () => {
      const result = (service as any).getPrimaryServices('userStaff');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns maturityLevels service', () => {
      const result = (service as any).getPrimaryServices('maturityLevels');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('calls main(true) for countriesWithSubnational', () => {
      const svc = { main: jest.fn() };
      injectorMock.get.mockReturnValue(svc);
      const result = (service as any).getPrimaryServices('countriesWithSubnational');
      expect(svc.main).toHaveBeenCalledWith(true);
      expect(result).toBe(svc);
    });

    it('calls main(false) for countriesWithoutSubnational', () => {
      const svc = { main: jest.fn() };
      injectorMock.get.mockReturnValue(svc);
      const result = (service as any).getPrimaryServices('countriesWithoutSubnational');
      expect(svc.main).toHaveBeenCalledWith(false);
      expect(result).toBe(svc);
    });

    it('returns null for unknown', () => {
      expect((service as any).getPrimaryServices('unknown')).toBeNull();
    });
  });

  describe('getSecondaryServices', () => {
    it('returns countries service', () => {
      const result = (service as any).getSecondaryServices('countries');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns languages service', () => {
      const result = (service as any).getSecondaryServices('languages');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns capSharingGenders service', () => {
      const result = (service as any).getSecondaryServices('capSharingGenders');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns capSharingFormats service', () => {
      const result = (service as any).getSecondaryServices('capSharingFormats');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns capSharingTypes service', () => {
      const result = (service as any).getSecondaryServices('capSharingTypes');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns capSharingDegrees service', () => {
      const result = (service as any).getSecondaryServices('capSharingDegrees');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns capSharingLengths service', () => {
      const result = (service as any).getSecondaryServices('capSharingLengths');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns disseminationQualifications service', () => {
      const result = (service as any).getSecondaryServices('disseminationQualifications');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns toolFunctions service', () => {
      const result = (service as any).getSecondaryServices('toolFunctions');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns initiatives service', () => {
      const result = (service as any).getSecondaryServices('initiatives');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns tags service', () => {
      const result = (service as any).getSecondaryServices('tags');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns oicrResults service', () => {
      const result = (service as any).getSecondaryServices('oicrResults');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns null for unknown', () => {
      expect((service as any).getSecondaryServices('unknown')).toBeNull();
    });
  });

  describe('getTertiaryServices', () => {
    it('returns capSharingDeliveryModalities service', () => {
      const result = (service as any).getTertiaryServices('capSharingDeliveryModalities');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns capSharingSessionPurpose service', () => {
      const result = (service as any).getTertiaryServices('capSharingSessionPurpose');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns yesOrNo service', () => {
      const result = (service as any).getTertiaryServices('yesOrNo');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns expansionPotential service', () => {
      const result = (service as any).getTertiaryServices('expansionPotential');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns policyTypes service', () => {
      const result = (service as any).getTertiaryServices('policyTypes');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns policyStages service', () => {
      const result = (service as any).getTertiaryServices('policyStages');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns geoFocus service', () => {
      const result = (service as any).getTertiaryServices('geoFocus');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns innResults service', () => {
      const result = (service as any).getTertiaryServices('innResults');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns null for unknown', () => {
      expect((service as any).getTertiaryServices('unknown')).toBeNull();
    });
  });

  describe('getQuaternaryServices', () => {
    it('returns regions service', () => {
      const result = (service as any).getQuaternaryServices('regions');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns geoScopeOpenSearch service', () => {
      const result = (service as any).getQuaternaryServices('geoScopeOpenSearch');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns openSearchCountries service', () => {
      const result = (service as any).getQuaternaryServices('openSearchCountries');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns openSearchResult service', () => {
      const result = (service as any).getQuaternaryServices('openSearchResult');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns innoDevOutput service', () => {
      const result = (service as any).getQuaternaryServices('innoDevOutput');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns innoUseOutput service', () => {
      const result = (service as any).getQuaternaryServices('innoUseOutput');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns informativeRoles service', () => {
      const result = (service as any).getQuaternaryServices('informativeRoles');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns globalTargets service', () => {
      const result = (service as any).getQuaternaryServices('globalTargets');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns impactAreaScores service', () => {
      const result = (service as any).getQuaternaryServices('impactAreaScores');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns impactAreas service', () => {
      const result = (service as any).getQuaternaryServices('impactAreas');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns null for unknown', () => {
      expect((service as any).getQuaternaryServices('unknown')).toBeNull();
    });
  });

  describe('getOtherServices', () => {
    it('returns openSearchSubNationals service', () => {
      const result = (service as any).getOtherServices('openSearchSubNationals');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns getAllIndicators service', () => {
      const result = (service as any).getOtherServices('getAllIndicators');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns allResultStatus service', () => {
      const result = (service as any).getOtherServices('allResultStatus');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns getYears service', () => {
      const result = (service as any).getOtherServices('getYears');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns getYearsByCode service', () => {
      const result = (service as any).getOtherServices('getYearsByCode');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns getAllYears service', () => {
      const result = (service as any).getOtherServices('getAllYears');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns ipOwners service', () => {
      const result = (service as any).getOtherServices('ipOwners');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns GetSubnationalByIsoAlpha service', () => {
      const result = (service as any).getOtherServices('GetSubnationalByIsoAlpha');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns clarisaInstitutionsTypes service', () => {
      const result = (service as any).getOtherServices('clarisaInstitutionsTypes');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns clarisaInstitutionsTypesChildless service', () => {
      const result = (service as any).getOtherServices('clarisaInstitutionsTypesChildless');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns sdgs service', () => {
      const result = (service as any).getOtherServices('sdgs');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns scaling service', () => {
      const result = (service as any).getOtherServices('scaling');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns applicationOptions service', () => {
      const result = (service as any).getOtherServices('applicationOptions');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns levers service', () => {
      const result = (service as any).getOtherServices('levers');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns strategicObjectives service', () => {
      const result = (service as any).getOtherServices('strategicObjectives');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns impactOutcomes service', () => {
      const result = (service as any).getOtherServices('impactOutcomes');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns leverStrategicOutcomes service', () => {
      const result = (service as any).getOtherServices('leverStrategicOutcomes');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns leverSdgTargets service', () => {
      const result = (service as any).getOtherServices('leverSdgTargets');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns clarisaSdgTargets service', () => {
      const result = (service as any).getOtherServices('clarisaSdgTargets');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns sourceFilterOptions service', () => {
      const result = (service as any).getOtherServices('sourceFilterOptions');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns projectStatus service', () => {
      const result = (service as any).getOtherServices('projectStatus');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns fundingTypes service', () => {
      const result = (service as any).getOtherServices('fundingTypes');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns allianceStaffByGroup service', () => {
      const result = (service as any).getOtherServices('allianceStaffByGroup');
      expect(injectorMock.get).toHaveBeenCalled();
      expect(result).toBe(serviceMock);
    });

    it('returns null and warns for unknown', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation();
      expect((service as any).getOtherServices('unknown')).toBeNull();
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });
});
