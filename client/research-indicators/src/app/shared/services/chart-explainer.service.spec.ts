import { TestBed } from '@angular/core/testing';
import { ChartExplainerHost, ChartExplainerService } from './chart-explainer.service';

function makeHost(): jest.Mocked<ChartExplainerHost> {
  return { hide: jest.fn() };
}

describe('ChartExplainerService (R-CXP-002 "only one open at a time", D-CXP-7)', () => {
  let service: ChartExplainerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChartExplainerService);
  });

  it('opening a second instance force-hides the first WITHOUT returning focus to it', () => {
    // Arrange the transition (KZ-015): both instances start untouched, A opens first.
    const instanceA = makeHost();
    const instanceB = makeHost();
    service.open(instanceA);
    expect(instanceA.hide).not.toHaveBeenCalled();

    // Act: opening B while A is the tracked open instance.
    service.open(instanceB);

    // Assert: A was force-hidden with returnFocus=false (D-CXP-7 — focus follows the user's
    // latest action, not the explainer that just got displaced). B was never hidden.
    expect(instanceA.hide).toHaveBeenCalledTimes(1);
    expect(instanceA.hide).toHaveBeenCalledWith(false);
    expect(instanceB.hide).not.toHaveBeenCalled();
  });

  it('opening the same instance again does not hide itself', () => {
    const instance = makeHost();
    service.open(instance);
    service.open(instance);
    expect(instance.hide).not.toHaveBeenCalled();
  });

  it('close() clears the tracked instance only when it is still the current one', () => {
    const instanceA = makeHost();
    const instanceB = makeHost();
    service.open(instanceA);

    // A stale close from an already-displaced instance must not clear B's open state.
    service.open(instanceB);
    instanceB.hide.mockClear();
    service.close(instanceA);
    service.open(instanceA);
    // B should still get force-hidden here — proving `close(instanceA)` above did not
    // erase B as the tracked open instance.
    expect(instanceB.hide).toHaveBeenCalledWith(false);
  });
});
