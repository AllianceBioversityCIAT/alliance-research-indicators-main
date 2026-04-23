import { Test, TestingModule } from '@nestjs/testing';
import { ReactRendererService } from './react-renderer.service';

jest.mock(
  '../client/entry-server',
  () => ({
    render: jest.fn((url: string) => `<div data-test="ssr">${url}</div>`),
  }),
  { virtual: true },
);

describe('ReactRendererService', () => {
  let service: ReactRendererService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReactRendererService],
    }).compile();

    service = module.get<ReactRendererService>(ReactRendererService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('render', () => {
    it('should return HTML document including SSR output and initial data', async () => {
      const initialData = { foo: 'bar' };
      const html = await service.render('/admin', initialData);

      expect(html).toContain('<!DOCTYPE html>');
      expect(html).toContain('<div id="root">');
      expect(html).toContain('data-test="ssr"');
      expect(html).toContain('/admin');
      expect(html).toContain('window.__INITIAL_DATA__');
      expect(html).toContain(JSON.stringify(initialData));
    });
  });
});
