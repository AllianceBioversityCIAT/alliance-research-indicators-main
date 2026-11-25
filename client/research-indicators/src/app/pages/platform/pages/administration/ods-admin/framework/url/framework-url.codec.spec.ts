import { parseFrameworkUrl, serializeFrameworkUrl, FrameworkUrlParams, FrameworkUrlState } from './framework-url.codec';

// @akili-spec institutional-performance/strategy-framework T-23 — design §6.4, D-STF-37.
// `view` is editor|table. An old `level=depth-<n>` still parses and is dropped.
// Serialize never writes `level`.

const paramsOf = (record: Record<string, string | null>): FrameworkUrlParams => ({
  get: name => record[name] ?? null
});

describe('framework-url.codec', () => {
  it('round-trips the view and drops a level', () => {
    const states: FrameworkUrlState[] = [
      { view: 'editor', level: null },
      { view: 'table', level: null },
      { view: 'table', level: 2 },
      { view: 'editor', level: 4 }
    ];
    for (const state of states) {
      expect(parseFrameworkUrl(paramsOf(serializeFrameworkUrl(state)))).toEqual({ view: state.view, level: null });
    }
  });

  it('writes the view and never the level', () => {
    expect(serializeFrameworkUrl({ view: 'editor', level: null })).toEqual({ view: null, level: null });
    expect(serializeFrameworkUrl({ view: 'table', level: null })).toEqual({ view: 'table', level: null });
    expect(serializeFrameworkUrl({ view: 'table', level: 4 })).toEqual({ view: 'table', level: null });
    expect(serializeFrameworkUrl({ view: 'editor', level: 4 })).toEqual({ view: null, level: null });
  });

  it('opens Table from an old level param and ignores the depth', () => {
    expect(parseFrameworkUrl(paramsOf({ view: 'table', level: 'depth-3' }))).toEqual({ view: 'table', level: null });
    expect(parseFrameworkUrl(paramsOf({ view: 'table', level: 'depth-2' }))).toEqual({ view: 'table', level: null });
  });

  it('falls back when the view or level slug is not in the frozen vocabulary', () => {
    expect(parseFrameworkUrl(paramsOf({ view: 'outline', level: 'performance-area' }))).toEqual({ view: 'editor', level: null });
    expect(parseFrameworkUrl(paramsOf({ view: 'table', level: 'depth-0' }))).toEqual({ view: 'table', level: null });
    expect(parseFrameworkUrl(paramsOf({ view: 'TABLE', level: 'depth-' }))).toEqual({ view: 'editor', level: null });
    expect(parseFrameworkUrl(paramsOf({}))).toEqual({ view: 'editor', level: null });
  });
});
