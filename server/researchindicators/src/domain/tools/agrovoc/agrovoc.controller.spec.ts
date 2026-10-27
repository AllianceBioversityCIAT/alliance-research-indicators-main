import {
  BadGatewayException,
  BadRequestException,
  RequestMethod,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AgrovocController } from './agrovoc.controller';
import { AgrovocService } from './agrovoc.service';
import { AgrovocTermDto } from './dto/agrovoc-term.dto';

describe('AgrovocController', () => {
  let controller: AgrovocController;
  const agrovocService = { search: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AgrovocController],
      providers: [{ provide: AgrovocService, useValue: agrovocService }],
    }).compile();
    controller = module.get(AgrovocController);
  });

  it('returns a 200 envelope carrying the service data', async () => {
    const data: AgrovocTermDto[] = [
      {
        uri: 'http://aims.fao.org/aos/agrovoc/c_7861',
        label: 'training',
      },
    ];
    agrovocService.search.mockResolvedValue(data);

    await expect(controller.search('training')).resolves.toEqual({
      description: 'AGROVOC terms found',
      status: 200,
      data,
      errors: undefined,
    });
    expect(agrovocService.search).toHaveBeenCalledWith('training');
  });

  it('returns a 200 envelope when the service finds no matches', async () => {
    agrovocService.search.mockResolvedValue([]);

    await expect(controller.search('zzqqxx')).resolves.toEqual({
      description: 'AGROVOC terms found',
      status: 200,
      data: [],
      errors: undefined,
    });
  });

  it.each([
    [
      '400',
      new BadRequestException('query must be between 3 and 100 characters'),
    ],
    ['502', new BadGatewayException('AGROVOC service is unavailable')],
    [
      '503',
      new ServiceUnavailableException(
        'AGROVOC host is not configured (ARI_AGROVOC_URL)',
      ),
    ],
  ])('propagates the service %s exception', async (_status, error) => {
    agrovocService.search.mockRejectedValue(error);

    await expect(controller.search('be')).rejects.toBe(error);
  });

  it('declares the unversioned search route and Swagger metadata', () => {
    expect(Reflect.getMetadata('path', AgrovocController)).toBe('/');
    expect(
      Reflect.getMetadata('path', AgrovocController.prototype.search),
    ).toBe('search');
    expect(
      Reflect.getMetadata('method', AgrovocController.prototype.search),
    ).toBe(RequestMethod.GET);
    expect(
      Reflect.getMetadata('__version__', AgrovocController.prototype.search),
    ).toBeUndefined();

    expect(
      Reflect.getMetadata('swagger/apiUseTags', AgrovocController),
    ).toEqual(['AGROVOC']);
    expect(
      Reflect.getMetadata('swagger/apiSecurity', AgrovocController),
    ).toEqual([{ bearer: [] }]);
    expect(
      Reflect.getMetadata(
        'swagger/apiOperation',
        AgrovocController.prototype.search,
      ),
    ).toEqual(expect.objectContaining({ summary: 'Search AGROVOC terms' }));
    expect(
      Reflect.getMetadata(
        'swagger/apiParameters',
        AgrovocController.prototype.search,
      ),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          name: 'query',
          required: true,
          in: 'query',
        }),
      ]),
    );
  });
});
