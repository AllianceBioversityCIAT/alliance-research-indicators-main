#!/usr/bin/env python3
"""
Regenerates every number in proposal.md §4 from the live CLARISA endpoints.

The raw payloads are ~3 MB and 1 MB and are deliberately NOT committed; this
script is committed instead so the figures stay falsifiable rather than being a
snapshot nobody can re-derive. If a number here stops matching the proposal,
the proposal is stale — that is the point.

    python3 probe-clarisa-projects.py            # fetch live
    python3 probe-clarisa-projects.py test.json  # analyse a saved payload

First run: 2026-08-14. Findings that day are quoted inline as `expected` so a
drift is visible without opening the proposal.
"""
import collections
import json
import re
import sys
import urllib.request

TEST = 'https://clarisatest-back.ciat.cgiar.org/api/projects'
PROD = 'https://api.clarisa.cgiar.org/api/projects'

ALLIANCE = ('CIAT', 'BIOVERSITY')
PHASE = 2026
# The centre prefix carried by external_code. Verified 2026-08-14 to correlate
# exactly with source_center_acronym, with no counter-examples.
CENTRE_PREFIX = re.compile(r'^[BC]-')


def load(src):
    if src.startswith('http'):
        with urllib.request.urlopen(src, timeout=120) as r:
            d = json.load(r)
    else:
        d = json.load(open(src, encoding='utf-8'))
    return d if isinstance(d, list) else d.get('data', d)


def alliance_2026(projects):
    return [
        p for p in projects
        if p.get('source_center_acronym') in ALLIANCE and p.get('phase') == PHASE
    ]


def filled(rows, field):
    return sum(1 for p in rows if p.get(field) not in (None, '', []))


def report(label, projects, expected=None):
    print(f'\n=== {label}: {len(projects)} projects '
          f'{"(expected " + str(expected) + ")" if expected else ""} ===')

    print('  phase          :', collections.Counter(
        str(p.get('phase')) for p in projects).most_common(4))
    print('  centre (top 4) :', collections.Counter(
        str(p.get('source_center_acronym')) for p in projects).most_common(4))

    a = alliance_2026(projects)
    print(f'\n  Alliance + phase {PHASE}: {len(a)}')
    if not a:
        print('  -> no rows carry the new contract in this environment.')
        return

    with_map = [p for p in a if p.get('project_mappings_array')]
    print(f'    with non-empty project_mappings_array : {len(with_map)}')
    for f in ('external_code', 'full_name', 'short_name', 'description', 'summary'):
        print(f'    {f:<22} populated {filled(a, f)}/{len(a)}')

    print('\n  external_code shapes:')
    shapes = collections.Counter(re.sub(r'\d+', '#', str(p['external_code'])) for p in a)
    for shape, n in shapes.most_common():
        print(f'    {shape:<10} {n}')

    print('\n  centre x prefix (expect an exact correlation):')
    x = collections.Counter()
    for p in a:
        ec = str(p['external_code'])
        m = CENTRE_PREFIX.match(ec)
        x[(p['source_center_acronym'], m.group(0) if m else '(none)')] += 1
    for (centre, pre), n in sorted(x.items()):
        print(f'    {centre:<12} {pre:<8} {n}')

    # The safety property the matcher depends on: normalization must not merge
    # two CLARISA projects onto one AGRESSO contract.
    codes = collections.Counter(CENTRE_PREFIX.sub('', str(p['external_code'])) for p in a)
    collisions = {k: v for k, v in codes.items() if v > 1}
    print(f'\n  normalized codes: {len(codes)} distinct from {len(a)} projects')
    print(f'  COLLISIONS: {len(collisions)}'
          f'{" -> " + str(list(collisions)[:5]) if collisions else "  (injective — OQ-3 closed)"}')

    print('\n  source_of_funding raw values (K-005: normalize before filtering):')
    for v, n in collections.Counter(str(p.get('source_of_funding')) for p in a).most_common(8):
        print(f'    {v!r:<28} {n}')


if __name__ == '__main__':
    if len(sys.argv) > 1:
        report(sys.argv[1], load(sys.argv[1]))
    else:
        test = load(TEST)
        prod = load(PROD)
        print('fields ONLY in test :', sorted(set(test[0]) - set(prod[0])))
        print('fields ONLY in prod :', sorted(set(prod[0]) - set(test[0])))
        report('TEST', test, expected=1365)
        report('PROD', prod, expected=299)
