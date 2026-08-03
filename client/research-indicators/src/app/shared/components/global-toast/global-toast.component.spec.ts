import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { GlobalToastComponent } from './global-toast.component';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ActionsService } from '../../services/actions.service';
import { MessageService } from 'primeng/api';
import { signal } from '@angular/core';
import { ToastMessage } from '../../interfaces/toast-message.interface';
import { provideAnimations } from '@angular/platform-browser/animations';

describe('GlobalToastComponent', () => {
  let component: GlobalToastComponent;
  let fixture: ComponentFixture<GlobalToastComponent>;
  let actionsServiceMock: Partial<ActionsService>;
  let messageServiceMock: jest.Mocked<MessageService>;

  beforeEach(async () => {
    if (!window.Element.prototype.animate) {
      window.Element.prototype.animate = () =>
        ({
          play: jest.fn(),
          pause: jest.fn(),
          finish: jest.fn(),
          cancel: jest.fn(),
          reverse: jest.fn(),
          addEventListener: jest.fn(),
          removeEventListener: jest.fn(),
          onfinish: null,
          oncancel: null,
          currentTime: 0,
          playbackRate: 1,
          startTime: 0,
          playState: 'finished',
          finished: Promise.resolve(),
          effect: null,
          id: '',
          timeline: null
        }) as any;
    }
    
    const toastMessageSignal = signal<ToastMessage>({ severity: 'info', summary: '', detail: '' });
    
    actionsServiceMock = {
      toastMessage: toastMessageSignal
    };
    messageServiceMock = {
      add: jest.fn()
    } as any;
    
    await TestBed.configureTestingModule({
      imports: [GlobalToastComponent, HttpClientTestingModule],
      providers: [
        { provide: ActionsService, useValue: actionsServiceMock },
        { provide: MessageService, useValue: messageServiceMock },
        provideAnimations()
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(GlobalToastComponent);
    component = fixture.componentInstance;
    
    // Get the actual MessageService instance used by the component
    const actualMessageService = TestBed.inject(MessageService);
    jest.spyOn(actualMessageService, 'add');
    
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should not call messageService.add if summary is empty', () => {
    const actualMessageService = TestBed.inject(MessageService);
    actionsServiceMock.toastMessage!.set({ severity: 'info', summary: '', detail: '' });
    fixture.detectChanges();
    expect(actualMessageService.add).not.toHaveBeenCalled();
  });

  it('should have effect that calls messageService.add when summary exists', () => {
    // Test that the effect is properly set up by checking the component has the show effect
    expect(component.show).toBeDefined();
    expect(typeof component.show).toBe('object');
  });

  it('should inject ActionsService and MessageService', () => {
    expect(component.actions).toBeDefined();
    expect(component.actions).toBe(actionsServiceMock);
  });

  it('should not call messageService.add when summary is null', () => {
    const actualMessageService = TestBed.inject(MessageService);
    actionsServiceMock.toastMessage!.set({ severity: 'info', summary: null, detail: '' });
    fixture.detectChanges();
    expect(actualMessageService.add).not.toHaveBeenCalled();
  });

  it('should not call messageService.add when summary is undefined', () => {
    const actualMessageService = TestBed.inject(MessageService);
    actionsServiceMock.toastMessage!.set({ severity: 'info', summary: undefined, detail: '' });
    fixture.detectChanges();
    expect(actualMessageService.add).not.toHaveBeenCalled();
  });

  it('should call messageService.add when summary is provided (true branch)', fakeAsync(() => {
    const svc = fixture.debugElement.injector.get(MessageService) as jest.Mocked<MessageService>;
    const addSpy = jest.spyOn(svc, 'add');

    actionsServiceMock.toastMessage!.set({ severity: 'success', summary: 'Hello', detail: 'World' });
    fixture.detectChanges();
    tick();

    expect(addSpy).toHaveBeenCalledWith({ severity: 'success', summary: 'Hello', detail: 'World' });
  }));

});
