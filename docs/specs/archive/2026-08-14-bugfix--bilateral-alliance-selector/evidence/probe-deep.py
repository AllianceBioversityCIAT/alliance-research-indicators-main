#!/usr/bin/env python3
"""Second, deeper read-only probe: why the production picker returns one row."""
import json
import urllib.request
from collections import Counter

HOSTS = {
    "test": "https://clarisatest-back.ciat.cgiar.org/api/projects",
    "prod": "https://api.clarisa.cgiar.org/api/projects",
}


def fetch(url):
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read().decode("utf-8"))


def acr(p):
    return ((p.get("lead_institution_object") or {}).get("acronym") or "").strip()


def sofa(p):
    return (p.get("source_of_funding") or "<empty>").strip()


for env in ("prod", "test"):
    ps = fetch(HOSTS[env])
    print(f"\n{'=' * 66}\n{env.upper()} — {len(ps)} projects\n{'=' * 66}")

    print("\n-- source_of_funding, whole feed (exact strings) --")
    for k, v in Counter(sofa(p) for p in ps).most_common(12):
        print(f"   {k!r:<32} {v:>5}")

    print("\n-- lead_institution_object.acronym, top 12 --")
    for k, v in Counter(acr(p) for p in ps).most_common(12):
        print(f"   {k!r:<32} {v:>5}")

    abc = [p for p in ps if acr(p).upper() == "ABC"]
    print(f"\n-- the {len(abc)} ABC-led projects: their funding sources --")
    for k, v in Counter(sofa(p) for p in abc).most_common():
        print(f"   {k!r:<32} {v:>5}")

    print("\n-- keys present on the first project (contract shape) --")
    if ps:
        print("  ", sorted(ps[0].keys()))

    ph = Counter(str(p.get("phase")) for p in ps)
    print(f"\n-- phase values, top 8 -- {dict(list(ph.most_common(8)))}")
    sc = Counter(str(p.get("source_center_acronym")) for p in ps)
    print(f"-- source_center_acronym, top 8 -- {dict(list(sc.most_common(8)))}")
    ec = sum(1 for p in ps if p.get("external_code"))
    print(f"-- external_code populated -- {ec}/{len(ps)}")
