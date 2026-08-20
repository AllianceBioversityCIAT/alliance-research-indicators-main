#!/usr/bin/env python3
"""
Read-only probe of CLARISA /api/projects.

Measures the population produced by each of the user's four stated criteria,
independently and cumulatively, so the selector decision is made against a
number rather than an inference.

Criteria (stated 2026-08-14):
  1. source_center_acronym IN (CIAT, BIOVERSITY)
  2. phase == 2026
  3. has project mappings
  4. has science programs
"""
import json
import sys
import urllib.request

HOSTS = {
    "test": "https://clarisatest-back.ciat.cgiar.org/api/projects",
    "prod": "https://api.clarisa.cgiar.org/api/projects",
}

ALLIANCE = {"CIAT", "BIOVERSITY"}
PHASE = 2026


def fetch(url):
    req = urllib.request.Request(url, headers={"Accept": "application/json"})
    with urllib.request.urlopen(req, timeout=180) as r:
        return json.loads(r.read().decode("utf-8"))


def is_alliance(p):
    a = p.get("source_center_acronym")
    return bool(a) and a.strip().upper() in ALLIANCE


def is_phase(p):
    ph = p.get("phase")
    if ph is None or str(ph).strip() == "":
        return False
    try:
        return int(float(ph)) == PHASE
    except (TypeError, ValueError):
        return False


def mappings(p):
    m = p.get("project_mappings_array")
    return m if isinstance(m, list) else []


def has_mappings(p):
    return len(mappings(p)) > 0


def sp_entries(p, confirmed_only=True, code=22):
    out = []
    for m in mappings(p):
        if confirmed_only and m.get("status") != "Confirmed":
            continue
        gu = m.get("global_unit_object") or {}
        et = gu.get("cgiar_entity_type_object") or {}
        if et.get("code") == code:
            out.append(m)
    return out


def has_sp(p):
    return len(sp_entries(p)) > 0


def has_sp_any_status(p):
    return len(sp_entries(p, confirmed_only=False)) > 0


def legacy(p):
    inst = p.get("lead_institution_object") or {}
    return (inst.get("acronym") or "").strip().upper() == "ABC"


def bilateral_ci(p):
    return (p.get("source_of_funding") or "").strip().lower() == "bilateral"


def bilateral_cs(p):
    return p.get("source_of_funding") == "Bilateral"


def report(env, projects):
    n = len(projects)
    print(f"\n{'=' * 62}\n{env.upper()}  —  {n} projects fetched\n{'=' * 62}")

    checks = [
        ("C1  alliance centre IN (CIAT, BIOVERSITY)", is_alliance),
        ("C2  phase == 2026", is_phase),
        ("C3  has project mappings", has_mappings),
        ("C4  has science programs (Confirmed, code 22)", has_sp),
        ("C4' has science programs (any status)", has_sp_any_status),
    ]
    print("\n-- each criterion INDEPENDENTLY --")
    for label, fn in checks:
        print(f"  {label:<48} {sum(1 for p in projects if fn(p)):>5}")

    print("\n-- CUMULATIVE (the actual selector) --")
    cum = list(projects)
    for label, fn in checks[:4]:
        cum = [p for p in cum if fn(p)]
        print(f"  + {label:<48} {len(cum):>5}")

    print("\n-- what the CURRENT picker returns --")
    cur = [p for p in projects if bilateral_cs(p) and legacy(p)]
    print(f"  source_of_funding == 'Bilateral' AND acronym == 'ABC' {len(cur):>5}")
    print(f"  case-insensitive variant                              "
          f"{sum(1 for p in projects if bilateral_ci(p) and legacy(p)):>5}")
    print(f"  legacy acronym == 'ABC' alone                         "
          f"{sum(1 for p in projects if legacy(p)):>5}")

    print("\n-- funding-source spread of the C1+C2 slice --")
    slice2 = [p for p in projects if is_alliance(p) and is_phase(p)]
    spread = {}
    for p in slice2:
        k = (p.get("source_of_funding") or "<empty>").strip()
        spread[k] = spread.get(k, 0) + 1
    for k, v in sorted(spread.items(), key=lambda kv: -kv[1]):
        print(f"  {k:<52} {v:>5}")

    final = [p for p in slice2 if has_mappings(p) and has_sp(p)]
    print(f"\n>> FINAL selector population: {len(final)}")
    for p in final[:12]:
        sps = [
            (m.get("global_unit_object") or {}).get("smo_code")
            for m in sp_entries(p)
        ]
        print(f"   id={p.get('id'):<6} {str(p.get('short_name'))[:38]:<40} "
              f"code={p.get('external_code')} SP={sps}")


if __name__ == "__main__":
    for env in sys.argv[1:] or ["test", "prod"]:
        try:
            report(env, fetch(HOSTS[env]))
        except Exception as e:
            print(f"\n{env.upper()}: FAILED — {type(e).__name__}: {e}")
