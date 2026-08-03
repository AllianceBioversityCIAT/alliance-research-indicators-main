import { IndicatorsService } from './indicators.service';

describe('IndicatorsService', () => {
  let service: IndicatorsService;
  let apiMock: any;
  let indicatorsMock: any;
  let loadingMock: any;
  let isOpenSearchMock: any;

  const mockIndicatorTypes: any[] = [
    {
      indicator_type_id: 1,
      name: 'Type 1',
      indicators: [
        {
          indicator_id: 1,
          name: 'Indicator 1',
          is_active: true,
          description: '',
          long_description: '',
          indicator_type_id: 1,
          icon_src: '',
          severity: ''
        },
        {
          indicator_id: 2,
          name: 'Indicator 2',
          is_active: true,
          description: '',
          long_description: '',
          indicator_type_id: 1,
          icon_src: '',
          severity: ''
        },
        {
          indicator_id: 3,
          name: 'Indicator 3',
          is_active: true,
          description: '',
          long_description: '',
          indicator_type_id: 1,
          icon_src: '',
          severity: ''
        }
      ]
    },
    {
      indicator_type_id: 2,
      name: 'Type 2',
      indicators: [
        {
          indicator_id: 4,
          name: 'Indicator 4',
          is_active: true,
          description: '',
          long_description: '',
          indicator_type_id: 2,
          icon_src: '',
          severity: ''
        },
        {
          indicator_id: 5,
          name: 'Indicator 5',
          is_active: true,
          description: '',
          long_description: '',
          indicator_type_id: 2,
          icon_src: '',
          severity: ''
        }
      ]
    }
  ];

  beforeEach(() => {
    apiMock = {
      GET_IndicatorTypes: jest.fn().mockResolvedValue({ data: mockIndicatorTypes })
    };
    indicatorsMock = Object.assign(() => [], { set: jest.fn() });
    loadingMock = Object.assign(() => false, { set: jest.fn() });
    isOpenSearchMock = Object.assign(() => false, { set: jest.fn() });

    service = Object.create(IndicatorsService.prototype);
    service.api = apiMock;
    service.indicators = indicatorsMock;
    service.loading = loadingMock;
    service.isOpenSearch = isOpenSearchMock;

    (service as any).indicatorsGrouped = Object.assign(() => [], {});
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('main should set loading and indicators correctly', async () => {
    await service.main();
    expect(loadingMock.set).toHaveBeenCalledWith(true);
    expect(apiMock.GET_IndicatorTypes).toHaveBeenCalled();
    expect(indicatorsMock.set).toHaveBeenCalledWith(mockIndicatorTypes);
    expect(loadingMock.set).toHaveBeenCalledWith(false);
  });

  it('generateGroupedIndicators should filter and group correctly', () => {
    const result = service.generateGroupedIndicators(mockIndicatorTypes, 'name', 'indicator_type_id', 'name', 'indicator_id');

    expect(result).toEqual([
      {
        label: 'Type 1',
        value: 1,
        items: [
          { label: 'Indicator 1', value: 1 },
          { label: 'Indicator 2', value: 2 }
        ]
      },
      {
        label: 'Type 2',
        value: 2,
        items: [
          { label: 'Indicator 4', value: 4 },
          { label: 'Indicator 5', value: 5 }
        ]
      }
    ]);
  });

  it('generateGroupedIndicators should return empty array if no data', () => {
    const result = service.generateGroupedIndicators([], 'name', 'indicator_type_id', 'name', 'indicator_id');
    expect(result).toEqual([]);
  });

  it('generateGroupedIndicators should filter only types with valid indicators', () => {
    const dataWithInvalidIndicators: any[] = [
      {
        indicator_type_id: 1,
        name: 'Type 1',
        indicators: [
          {
            indicator_id: 1,
            name: 'Indicator 1',
            is_active: true,
            description: '',
            long_description: '',
            indicator_type_id: 1,
            icon_src: '',
            severity: ''
          }
        ]
      },
      {
        indicator_type_id: 2,
        name: 'Type 2',
        indicators: [
          {
            indicator_id: 10,
            name: 'Invalid Indicator',
            is_active: true,
            description: '',
            long_description: '',
            indicator_type_id: 2,
            icon_src: '',
            severity: ''
          }
        ]
      }
    ];

    const result = service.generateGroupedIndicators(dataWithInvalidIndicators, 'name', 'indicator_type_id', 'name', 'indicator_id');

    expect(result).toEqual([
      {
        label: 'Type 1',
        value: 1,
        items: [{ label: 'Indicator 1', value: 1 }]
      }
    ]);
  });

  it('initial indicators, loading, isOpenSearch signals', () => {
    expect(indicatorsMock()).toEqual([]);
    expect(loadingMock()).toBe(false);
    expect(isOpenSearchMock()).toBe(false);
  });
});
