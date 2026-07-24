import { setupZoneTestEnv } from 'jest-preset-angular/setup-env/zone';
import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideHttpClientTesting } from '@angular/common/http/testing';

setupZoneTestEnv();

beforeEach(() => {
  TestBed.configureTestingModule({
    providers: [provideNoopAnimations(), provideHttpClientTesting()]
  });
});

// Add polyfills for missing browser APIs
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const setImmediatePolyfill = (handler: (...args: any[]) => void): NodeJS.Timeout => setTimeout(handler, 0);
setImmediatePolyfill.__promisify__ = () => Promise.resolve();
global.setImmediate = setImmediatePolyfill as unknown as typeof setImmediate;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.clearImmediate = ((id: any) => clearTimeout(id)) as typeof clearImmediate;

// Mock window.alert
// eslint-disable-next-line @typescript-eslint/no-empty-function
window.alert = () => {};

// Mock CSS @layer and other CSS features
Object.defineProperty(window, 'CSS', {
  value: {
    supports: () => true,
    escape: (str: string) => str,
    layer: () => true
  }
});

// Mock HTMLCanvasElement
class MockContext2D {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  beginPath() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  moveTo() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  lineTo() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  stroke() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  fill() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  closePath() {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  clearRect() {}
  // Add any other canvas methods you need
}

// Mock canvas getContext
const originalGetContext = HTMLCanvasElement.prototype.getContext;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, contextId: string, options?: any) {
  if (contextId === '2d') {
    return new MockContext2D() as unknown as CanvasRenderingContext2D;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return originalGetContext.call(this, contextId, options) as any;
};

// Suppress specific console errors
const originalConsoleError = console.error;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
console.error = (...args: any[]) => {
  const errorMessage = args[0]?.toString() ?? '';
  if (
    errorMessage.includes('Could not parse CSS stylesheet') ||
    errorMessage.includes('@layer') ||
    errorMessage.includes('Failed to parse') ||
    errorMessage.includes('Failed to create chart') ||
    errorMessage.includes('Cannot set properties of undefined') ||
    errorMessage.includes('evidence_url') ||
    errorMessage.includes('Not implemented: HTMLCanvasElement.prototype.getContext')
  ) {
    return;
  }
  originalConsoleError(...args);
};

// Mock style loading
class MockStyleSheet {
  cssRules: CSSRule[] = [];
  insertRule(rule: string): number {
    // Silently ignore @layer rules
    if (rule.includes('@layer')) {
      return 0;
    }
    this.cssRules.push({ cssText: rule } as CSSRule);
    return this.cssRules.length - 1; // Return the index of the newly added rule
  }
  deleteRule(): void {
    // No-op
  }
}

class MockCSSStyleSheet extends MockStyleSheet {
  replaceSync(): void {
    // No-op
  }
  replace(): Promise<void> {
    return Promise.resolve();
  }
}

// Mock adoptedStyleSheets
Object.defineProperty(document, 'adoptedStyleSheets', {
  value: [],
  writable: true
});

Object.defineProperty(document, 'styleSheets', {
  value: {
    item: () => new MockStyleSheet(),
    length: 0
  }
});

// Mock CSSStyleSheet constructor
// eslint-disable-next-line @typescript-eslint/no-explicit-any
(window as any).CSSStyleSheet = MockCSSStyleSheet;

// Mock createRange for PrimeNG
// eslint-disable-next-line @typescript-eslint/no-empty-function
const noOp = () => {};

document.createRange = () => {
  const range = {
    setStart: noOp,
    setEnd: noOp,
    commonAncestorContainer: {
      nodeName: 'BODY',
      ownerDocument: document
    },
    createContextualFragment(str: string) {
      const temp = document.createElement('template');
      temp.innerHTML = str;
      return temp.content;
    },
    // Minimal mock implementation of required Range methods
    cloneContents: noOp,
    cloneRange: () => document.createRange(),
    collapse: noOp,
    compareBoundaryPoints: () => 0,
    comparePoint: () => 0,
    deleteContents: noOp,
    detach: noOp,
    extractContents: () => document.createDocumentFragment(),
    getBoundingClientRect: () => ({ bottom: 0, height: 0, left: 0, right: 0, top: 0, width: 0 }),
    getClientRects: () => [],
    insertNode: noOp,
    intersectsNode: () => false,
    isPointInRange: () => false,
    selectNode: noOp,
    selectNodeContents: noOp,
    setEndAfter: noOp,
    setEndBefore: noOp,
    setStartAfter: noOp,
    setStartBefore: noOp,
    surroundContents: noOp,
    toString: () => '',
    // Range constants
    START_TO_START: 0,
    START_TO_END: 1,
    END_TO_END: 2,
    END_TO_START: 3,
    collapsed: true,
    endContainer: document.body,
    endOffset: 0,
    startContainer: document.body,
    startOffset: 0
  };
  return range as unknown as Range;
};

global.ResizeObserver = class {
  observe(target: Element) {
    console.warn('Mock observe called on:', target);
  }
  unobserve(target: Element) {
    console.warn('Mock unobserve called on:', target);
  }
  disconnect() {
    console.warn('Mock disconnect called');
  }
};
