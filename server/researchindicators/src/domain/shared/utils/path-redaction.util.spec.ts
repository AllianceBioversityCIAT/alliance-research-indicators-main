import {
  redactCallbackDiagnostics,
  redactCallbackPath,
} from './path-redaction.util';

describe('redactCallbackPath', () => {
  const prefix = '/api/prms-callback';
  const segment = 'segment-k7';

  beforeEach(() => {
    delete process.env.ARI_PRMS_WEBHOOK_SECRET;
  });

  afterEach(() => {
    delete process.env.ARI_PRMS_WEBHOOK_SECRET;
  });

  it('drops every segment and query after the callback prefix', () => {
    expect(redactCallbackPath(`${prefix}/${segment}`)).toBe(prefix);
    expect(redactCallbackPath(`${prefix}/${segment}?q=1`)).toBe(prefix);
    expect(redactCallbackPath(`${prefix}/`)).toBe(prefix);
    expect(redactCallbackPath(`${prefix}?q=1`)).toBe(prefix);
    expect(redactCallbackPath(prefix)).toBe(prefix);
  });

  it('leaves a non-callback URL unchanged, including the disjoint sibling prefix', () => {
    expect(redactCallbackPath('/api/results/99?q=1')).toBe(
      '/api/results/99?q=1',
    );
    expect(redactCallbackPath('/api/prms-webhook/register')).toBe(
      '/api/prms-webhook/register',
    );
    expect(redactCallbackPath('/api/prms-callbacks/segment-k7')).toBe(
      '/api/prms-callbacks/segment-k7',
    );
    expect(
      redactCallbackPath('/api/results/compare/api/prms-callback/segment-k7'),
    ).toBe('/api/results/compare/api/prms-callback/segment-k7');
  });

  it('redacts a mixed-case callback prefix the way Express routes it', () => {
    expect(redactCallbackPath(`/API/PRMS-CALLBACK/${segment}`)).toBe(prefix);
    expect(redactCallbackPath(`/Api/Prms-Callback/${segment}?q=1`)).toBe(
      prefix,
    );
    expect(redactCallbackPath('/API/PRMS-CALLBACK')).toBe(prefix);
    expect(redactCallbackPath('/API/PRMS-CALLBACK?q=1')).toBe(prefix);
  });

  it('does not redact mixed-case siblings, plurals, embedded paths, or other routes', () => {
    expect(redactCallbackPath('/API/PRMS-CALLBACKS/segment-k7')).toBe(
      '/API/PRMS-CALLBACKS/segment-k7',
    );
    expect(redactCallbackPath('/API/PRMS-WEBHOOK/register')).toBe(
      '/API/PRMS-WEBHOOK/register',
    );
    expect(redactCallbackPath('/API/RESULTS/99?q=1')).toBe(
      '/API/RESULTS/99?q=1',
    );
    expect(
      redactCallbackPath('/api/results/compare/API/PRMS-CALLBACK/segment-k7'),
    ).toBe('/api/results/compare/API/PRMS-CALLBACK/segment-k7');
  });

  it('redacts when ARI_PRMS_WEBHOOK_SECRET is unset', () => {
    expect(process.env.ARI_PRMS_WEBHOOK_SECRET).toBeUndefined();
    expect(redactCallbackPath(`${prefix}/${segment}`)).toBe(prefix);
  });

  it('keys off the route prefix when the env var is assigned after import', () => {
    const configured = 'configured-after-import';
    process.env.ARI_PRMS_WEBHOOK_SECRET = configured;

    expect(redactCallbackPath(`${prefix}/${configured}`)).toBe(prefix);
    expect(redactCallbackPath(`/api/results/${configured}`)).toBe(
      `/api/results/${configured}`,
    );
    expect(redactCallbackPath(`${prefix}/other-segment`)).toBe(prefix);
  });

  it('returns a non-string unchanged', () => {
    expect(redactCallbackPath(undefined as unknown as string)).toBeUndefined();
    expect(redactCallbackPath('')).toBe('');
  });

  it('(f) truncates absolute and protocol-relative callback URLs', () => {
    expect(redactCallbackPath(`//host${prefix}/${segment}?x=1`)).toBe(
      `//host${prefix}`,
    );
    expect(
      redactCallbackPath(`https://star.ciat.cgiar.org${prefix}/${segment}`),
    ).toBe(`https://star.ciat.cgiar.org${prefix}`);
    expect(
      redactCallbackPath(`HTTPS://HOST/API/PRMS-CALLBACK/${segment}`),
    ).toBe(`HTTPS://HOST${prefix}`);
  });

  it('(f) leaves absolute non-callback URLs unchanged', () => {
    const sibling = `https://host/api/prms-callbacks/${segment}`;
    const other = 'https://host/api/results/99?q=1';

    expect(redactCallbackPath(sibling)).toBe(sibling);
    expect(redactCallbackPath(other)).toBe(other);
  });
});

describe('redactCallbackDiagnostics', () => {
  const prefix = '/api/prms-callback';
  const segment = 'segment-k7';

  it('truncates a callback URL inside a NotFoundException message', () => {
    expect(redactCallbackDiagnostics(`Cannot POST ${prefix}/guess/extra`)).toBe(
      `Cannot POST ${prefix}`,
    );
    expect(
      redactCallbackDiagnostics(`Cannot POST /API/PRMS-CALLBACK/${segment}`),
    ).toBe(`Cannot POST ${prefix}`);
  });

  it('leaves non-callback diagnostics unchanged, including embedded and sibling paths', () => {
    const plain = 'Not Found';
    const other = 'Cannot GET /api/results/99';
    const sibling = 'Cannot POST /api/prms-callbacks/segment-k7';
    const mixedSibling = 'Cannot POST /API/PRMS-CALLBACKS/segment-k7';
    const embedded =
      'Cannot GET /api/results/compare/api/prms-callback/segment-k7';
    const mixedEmbedded =
      'Cannot GET /api/results/compare/API/PRMS-CALLBACK/segment-k7';
    const stack = [
      `NotFoundException: Cannot GET /api/results/99`,
      '    at callback (/Users/pelitos/app/global.exception.ts:31:5)',
    ].join('\n');

    expect(redactCallbackDiagnostics(plain)).toBe(plain);
    expect(redactCallbackDiagnostics(other)).toBe(other);
    expect(redactCallbackDiagnostics(sibling)).toBe(sibling);
    expect(redactCallbackDiagnostics(mixedSibling)).toBe(mixedSibling);
    expect(redactCallbackDiagnostics(embedded)).toBe(embedded);
    expect(redactCallbackDiagnostics(mixedEmbedded)).toBe(mixedEmbedded);
    expect(redactCallbackDiagnostics(stack)).toBe(stack);
    expect(redactCallbackDiagnostics('')).toBe('');
  });

  it('(e) keeps every delimiter around a callback path it truncates', () => {
    expect(
      redactCallbackDiagnostics(
        `{"path":"${prefix}/example","reason":"invalid"}`,
      ),
    ).toBe(`{"path":"${prefix}","reason":"invalid"}`);
    expect(
      redactCallbackDiagnostics(`Cannot POST ${prefix}/${segment}, retrying`),
    ).toBe(`Cannot POST ${prefix}, retrying`);
    expect(
      redactCallbackDiagnostics(`at handler (${prefix}/${segment}:11:7)`),
    ).toBe(`at handler (${prefix}:11:7)`);
    expect(
      redactCallbackDiagnostics(`route '${prefix}/${segment}' missing`),
    ).toBe(`route '${prefix}' missing`);
  });

  it('(e) stops the token at the first character outside the secret alphabet', () => {
    expect(redactCallbackDiagnostics(`${prefix}/${segment}!!!`)).toBe(
      `${prefix}!!!`,
    );
    expect(redactCallbackDiagnostics(`${prefix}/${segment}.,;`)).toBe(
      `${prefix}.,;`,
    );
    expect(redactCallbackDiagnostics(`${prefix}/${segment}?x=1&y=2`)).toBe(
      `${prefix}?x=1&y=2`,
    );
    expect(redactCallbackDiagnostics(`[${prefix}/${segment}] rejected`)).toBe(
      `[${prefix}] rejected`,
    );
    expect(redactCallbackDiagnostics(`<${prefix}/${segment}> {"a":1}`)).toBe(
      `<${prefix}> {"a":1}`,
    );
  });

  it('removes a C-T08-conformant credential whatever follows it', () => {
    const credential = 'Kx7_aZ-19Qw';
    const contexts = [
      `Cannot POST ${prefix}/${credential}`,
      `Cannot POST ${prefix}/${credential}?x=1`,
      `Cannot POST ${prefix}/${credential}, retrying`,
      `{"path":"${prefix}/${credential}"}`,
      `at h (${prefix}/${credential}:11:7)`,
      `[${prefix}/${credential}]`,
      `${prefix}/${credential}!!!`,
      `//host${prefix}/${credential}?x=1`,
      `https://host${prefix}/${credential}`,
    ];

    for (const context of contexts) {
      expect(redactCallbackDiagnostics(context)).not.toContain(credential);
    }
  });

  it('(g) consumes a percent-encoded segment instead of leaving a tail', () => {
    // `%` is outside C-T08's credential alphabet but inside the scanner's
    // reach, so a percent-encoded guess is dropped whole rather than surviving
    // as an unbounded tail in an unmatched-route diagnostic (R-PWH-004 AC.7).
    expect(
      redactCallbackDiagnostics(`Cannot POST ${prefix}/abc%2Fdef%2Fghi`),
    ).toBe(`Cannot POST ${prefix}`);
    expect(redactCallbackDiagnostics(`Cannot POST ${prefix}/%53EGMENT`)).toBe(
      `Cannot POST ${prefix}`,
    );
    expect(redactCallbackDiagnostics(`${prefix}/abc%2Fdef, retrying`)).toBe(
      `${prefix}, retrying`,
    );
    expect(redactCallbackPath(`${prefix}/%53EGMENT?x=1`)).toBe(prefix);
    expect(redactCallbackPath(`${prefix}/abc%2Fdef`)).toBe(prefix);
  });

  it('(g) keeps the byte-for-byte preservation cases intact', () => {
    const cases = [
      '    at callback (/Users/pelitos/app/global.exception.ts:31:5)',
      '{"path":"/api/results/910150901/prms-sync","reason":"x"}',
      'GET /api/prms-callbacks/list failed',
      '/api/results/compare/api/prms-callback/x',
    ];

    for (const value of cases) {
      expect(redactCallbackDiagnostics(value)).toBe(value);
    }
  });

  it('(f) redacts callback references carried by an absolute URL', () => {
    expect(
      redactCallbackDiagnostics(`Cannot POST //host${prefix}/${segment}?x=1`),
    ).toBe(`Cannot POST //host${prefix}?x=1`);
    expect(
      redactCallbackDiagnostics(
        `failed https://star.ciat.cgiar.org${prefix}/${segment}`,
      ),
    ).toBe(`failed https://star.ciat.cgiar.org${prefix}`);
    expect(
      redactCallbackDiagnostics(
        `{"url":"https://host/API/PRMS-CALLBACK/${segment}","retry":true}`,
      ),
    ).toBe(`{"url":"https://host${prefix}","retry":true}`);
  });

  it('(f) leaves an absolute non-callback URL unchanged', () => {
    const sibling = `Cannot POST https://host/api/prms-callbacks/${segment}`;
    const embedded = `Cannot GET https://host/api/results/compare${prefix}/${segment}`;

    expect(redactCallbackDiagnostics(sibling)).toBe(sibling);
    expect(redactCallbackDiagnostics(embedded)).toBe(embedded);
  });

  it('(e) leaves a non-callback token byte-for-byte intact around delimiters', () => {
    const cases = [
      `{"path":"/api/results/99","callback":"${prefix}/${segment}"}`,
      `at build (/Users/pelitos/app/global.exception.ts:31:5) for ${prefix}/${segment}`,
      `siblings ('/api/prms-callbacks/${segment}', "/api/prms-webhook/register") vs ${prefix}/${segment}`,
    ];

    expect(redactCallbackDiagnostics(cases[0])).toBe(
      `{"path":"/api/results/99","callback":"${prefix}"}`,
    );
    expect(redactCallbackDiagnostics(cases[1])).toBe(
      `at build (/Users/pelitos/app/global.exception.ts:31:5) for ${prefix}`,
    );
    expect(redactCallbackDiagnostics(cases[2])).toBe(
      `siblings ('/api/prms-callbacks/${segment}', "/api/prms-webhook/register") vs ${prefix}`,
    );
  });

  it('redacts only the callback token inside a stack and keeps the frames', () => {
    const leaked = `${prefix}/guess/extra`;
    const stack = [
      `NotFoundException: Cannot POST ${leaked}`,
      '    at callback (/Users/pelitos/app/global.exception.ts:31:5)',
    ].join('\n');

    expect(redactCallbackDiagnostics(stack)).toBe(
      stack.replaceAll(leaked, prefix),
    );
    expect(redactCallbackDiagnostics(stack)).not.toContain('guess/extra');
  });
});
