import { parseFrameworkUrl, serializeFrameworkUrl, FrameworkUrlParams, FrameworkUrlState } from './framework-url.codec';

// @akili-spec institutional-performance/strategy-framework T-12 — design §2.1.
// Frozen slugs: view is editor|table, level is depth-<n>. Display names are
// not slugs, so an unknown token falls back instead of being parsed.

const paramsOf = (record: Record<string, string | null>): FrameworkUrlParams => ({
  get: name => record[name] ?? null
});

describe('framework-url.codec', () => {
  it('round-trips the default, a table view, and a fourth-level depth', () => {
    const states: FrameworkUrlState[] = [
      { view: 'editor', level: null },
      { view: 'table', level: null },
      { view: 'table', level: 2 },
      { view: 'editor', level: 4 }
    ];
    for (const state of states) {
      expect(parseFrameworkUrl(paramsOf(serializeFrameworkUrl(state)))).toEqual(state);
    }
  });

  it('omits the default view and an empty level from the query', () => {
    expect(serializeFrameworkUrl({ view: 'editor', level: null })).toEqual({ view: null, level: null });
    expect(serializeFrameworkUrl({ view: 'table', level: 4 })).toEqual({ view: 'table', level: 'depth-4' });
  });

  it('falls back when the view or level slug is not in the frozen vocabulary', () => {
    expect(parseFrameworkUrl(paramsOf({ view: 'outline', level: 'performance-area' }))).toEqual({ view: 'editor', level: null });
    expect(parseFrameworkUrl(paramsOf({ view: 'table', level: 'depth-0' }))).toEqual({ view: 'table', level: null });
    expect(parseFrameworkUrl(paramsOf({ view: 'TABLE', level: 'depth-' }))).toEqual({ view: 'editor', level: null });
    expect(parseFrameworkUrl(paramsOf({}))).toEqual({ view: 'editor', level: null });
  });
});
