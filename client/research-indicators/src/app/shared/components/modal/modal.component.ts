import { Component, inject, Input, computed, Signal, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { trigger, state, style, transition, animate } from '@angular/animations';
import { AllModalsService } from '@services/cache/all-modals.service';
import { ModalName } from '@ts-types/modal.types';
import { CreateResultManagementService } from '@shared/components/all-modals/modals-content/create-result-modal/services/create-result-management.service';

@Component({
  selector: 'app-modal',
  imports: [],
  templateUrl: './modal.component.html',
  styleUrl: './modal.component.scss',
  animations: [
    trigger('fadeIn', [
      state('void', style({ opacity: 0 })),
      state('*', style({ opacity: 1 })),
      transition('void <=> *', animate('300ms ease-in-out'))
    ]),
    trigger('scaleIn', [
      state('void', style({ transform: 'scale(0)' })),
      state('*', style({ transform: 'scale(1)' })),
      transition('void <=> *', animate('300ms 500ms ease-out')) // 500ms delay
    ])
  ]
})
export class ModalComponent implements AfterViewChecked {
  allModalsService = inject(AllModalsService);
  createResultManagementService = inject(CreateResultManagementService);
  @Input() modalName!: ModalName;
  @Input() disabledConfirmIf: Signal<boolean> = computed(() => false);
  @Input() clearModal: () => void = () => {
    /* no-op */
  };

  @ViewChild('modalRoot') modalRoot!: ElementRef<HTMLDivElement>;
  private wasOpen = false;

  showModal() {
    return this.allModalsService.isModalOpen(this.modalName);
  }

  getConfig() {
    return this.allModalsService.modalConfig()[this.modalName] ?? {};
  }

  getModalTitle() {
    if (this.modalName === 'createResult' && this.createResultManagementService.resultPageStep() === 2) {
      return this.createResultManagementService.modalTitle();
    }
    return this.getConfig().title;
  }

  handleCloseClick() {
    const config = this.getConfig();
    if (config.iconAction) {
      config.iconAction();
    } else if (config.cancelAction) {
      config.cancelAction();
    } else {
      this.allModalsService.toggleModal(this.modalName);
    }
  }

  ngAfterViewChecked(): void {
    const isOpen = !!this.getConfig().isOpen;
    if (isOpen && !this.wasOpen) {
      this.wasOpen = true;
      setTimeout(() => this.focusFirstElement(), 0);
    }
    if (!isOpen && this.wasOpen) {
      this.wasOpen = false;
    }
  }

  onKeydown(event: KeyboardEvent) {
    if (event.key !== 'Tab') return;
    if (!this.getConfig().isOpen) return;
    const container = this.modalRoot?.nativeElement;
    if (!container) return;

    const focusableSelectors = [
      'a[href]','area[href]','input:not([disabled])','select:not([disabled])','textarea:not([disabled])',
      'button:not([disabled])','iframe','object','embed','[tabindex]:not([tabindex="-1"])','[contenteditable]'
    ].join(',');
    const nodes = Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors))
      .filter(el => el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0);
    if (nodes.length === 0) return;

    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement as HTMLElement | null;
    const goingBackwards = event.shiftKey;

    if (goingBackwards && active === first) {
      event.preventDefault();
      last.focus();
    } else if (!goingBackwards && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focusFirstElement() {
    const container = this.modalRoot?.nativeElement;
    if (!container) return;
    const focusableSelectors = [
      'button','[href]','input:not([disabled])','select:not([disabled])','textarea:not([disabled])',
      '[tabindex]:not([tabindex="-1"])'
    ].join(',');
    const nodes = Array.from(container.querySelectorAll<HTMLElement>(focusableSelectors))
      .filter(el => el.offsetWidth > 0 || el.offsetHeight > 0 || el.getClientRects().length > 0);
    if (nodes.length > 0) {
      nodes[0].focus();
    } else {
      container.focus();
    }
  }
}
