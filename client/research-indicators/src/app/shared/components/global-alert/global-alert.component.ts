import { Component, computed, inject, signal, OnInit, OnDestroy } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { ActionsService } from '../../services/actions.service';
import { ButtonModule } from 'primeng/button';
import { GlobalAlert } from '@shared/interfaces/global-alert.interface';
import { InputComponent } from '../custom-fields/input/input.component';
import { SelectModule } from 'primeng/select';
import { FormsModule } from '@angular/forms';
import { ServiceLocatorService } from '@shared/services/service-locator.service';
import { GetYear } from '@shared/interfaces/get-year.interface';
interface ListService {
  list(): GetYear[];
}

@Component({
  selector: 'app-global-alert',
  imports: [ButtonModule, InputComponent, FormsModule, SelectModule],
  templateUrl: './global-alert.component.html',
  standalone: true,
  styleUrls: ['./global-alert.component.scss'],
  animations: [
    trigger('alertAnimation', [
      state('information', style({ opacity: 1 })),
      state('warning', style({ opacity: 1 })),
      state('error', style({ opacity: 1 })),
      transition('void => information', [style({ opacity: 0 }), animate('300ms ease-in')]),
      transition('void => warning', [style({ opacity: 0 }), animate('300ms ease-in')]),
      transition('void => error', [style({ opacity: 0 }), animate('300ms ease-in')])
    ])
  ]
})
export class GlobalAlertComponent implements OnInit, OnDestroy {
  actions = inject(ActionsService);
  service?: ListService;
  optionsList: GetYear[] = [];
  selectedTemp = null;
  showReportedWarning = false;

  body = signal<{ commentValue: string; selectValue: number | string | null }>({
    commentValue: '',
    selectValue: null
  });

  constructor(private readonly serviceLocator: ServiceLocatorService) {}
  private autoHideTimeouts: number[] = [];

  onCommentInput(event: Event): void {
    const value = (event.target as HTMLTextAreaElement | HTMLInputElement)?.value ?? '';
    this.body.update(prev => ({
      ...prev,
      commentValue: value
    }));
  }

  alertList = computed(() => {
    const list = this.actions.globalAlertsStatus().map((alert: GlobalAlert) => {
      if (!alert.icon) {
        alert.icon = this.getIcon(alert.severity).icon;
      }
      if (!alert.color) {
        alert.color = this.getIcon(alert.severity).color;
      }
      if (!alert.buttonColor) {
        alert.buttonColor = this.getIcon(alert.severity).buttonColor;
      }
      if (alert.serviceName) {
        const foundService = this.serviceLocator.getService(alert.serviceName);
        this.service = foundService === null ? undefined : (foundService as unknown as ListService);
        this.optionsList = this.service ? this.service.list() : [];
      } else {
        this.service = undefined;
      }

      if (alert.commentLabel) {
        alert.commentLabel = alert.commentRequired ? alert.commentLabel : `${alert.commentLabel} (Optional)`;
      }
      if (!alert.cancelCallback?.label) alert.cancelCallback = { label: 'Cancel' };
      return alert;
    });

    this.setupAutoHideForAlerts(list);

    return list;
  });

  get isInvalid(): boolean {
    return !this.body()?.selectValue;
  }
  ngOnInit(): void {
    this.setupAutoHideForAlerts(this.alertList());
  }

  ngOnDestroy(): void {
    this.clearAllTimeouts();
  }

  private setupAutoHideForAlerts(alerts: GlobalAlert[]): void {
    this.clearAllTimeouts();

    alerts.forEach((alert, index) => {
      if (alert.autoHideDuration) {
        const timeoutId = window.setTimeout(() => {
          this.closeAlert(index);
        }, alert.autoHideDuration);

        this.autoHideTimeouts[index] = timeoutId;
      }
    });
  }

  private clearAllTimeouts(): void {
    this.autoHideTimeouts.forEach(timeoutId => {
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    });
    this.autoHideTimeouts = [];
  }

  closeAlert(index: number) {
    if (this.autoHideTimeouts[index]) {
      window.clearTimeout(this.autoHideTimeouts[index]);
      this.autoHideTimeouts[index] = 0;
    }

    this.actions.hideGlobalAlert(index);
    this.body.update(body => ({ ...body, commentValue: '', selectValue: null }));
  }

  onDetailLinkClick(event: MouseEvent | KeyboardEvent, index: number) {
    const target = (event.target as Element)?.closest?.('a.alert-link-custom');
    if (!target) return;
    const alerts = this.alertList();
    const alert = alerts[index];
    if (alert?.onDetailLinkClick) {
      event.preventDefault();
      event.stopPropagation();
      alert.onDetailLinkClick();
    }
  }

  getIcon(severity: 'success' | 'info' | 'warning' | 'error' | 'secondary' | 'contrast' | 'confirm' | 'delete' | 'processing'): {
    icon: string;
    color: string;
    buttonColor?: string;
  } {
    switch (severity) {
      case 'success':
        return { icon: 'pi pi-check-circle', color: '#509C55' };
      case 'confirm':
        return { icon: 'pi pi-pencil', color: '#509C55' };
      case 'warning':
        return { icon: 'pi pi-history', color: '#E69F00', buttonColor: '#035BA9' };
      case 'secondary':
        return { icon: 'pi pi-exclamation-triangle', color: '#E69F00', buttonColor: '#E69F00' };
      case 'error':
        return { icon: 'pi pi-times-circle', color: '#CF0808' };
      case 'delete':
        return { icon: 'pi pi-trash', color: '#CF0808', buttonColor: '#CF0808' };
      case 'processing':
        return { icon: 'pi pi-info-circle', color: '#CF0808' };
      case 'info':
        return { icon: 'pi pi-info-circle', color: '#035BA9' };
      default:
        return { icon: 'pi pi-info-circle', color: '#035BA9' };
    }
  }

  onSelectChange(selectedValue: number | string) {
    const selectedObj = this.optionsList.find(x => x.report_year === selectedValue);
    if (selectedObj?.has_reported === 1) {
      this.showReportedWarning = true;
    } else {
      this.showReportedWarning = false;
      this.body.update(b => ({ ...b, selectValue: selectedValue }));
    }
  }
}
