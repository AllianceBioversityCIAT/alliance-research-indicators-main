#!/usr/bin/env python3
import json, re, urllib.request
HOSTS={"test":"https://clarisatest-back.ciat.cgiar.org/api/projects",
       "prod":"https://api.clarisa.cgiar.org/api/projects"}
ALLIANCE={"CIAT","BIOVERSITY"}
def norm(s): return re.sub(r"[^A-Z0-9]+"," ",(s or "").upper()).strip()
def is_bil(p): return norm(p.get("source_of_funding")).startswith("BILATERAL")
def is_all(p):
    a=(p.get("source_center_acronym") or "").strip().upper()
    if a in ALLIANCE: return True
    lead=((p.get("lead_institution_object") or {}).get("acronym") or "").strip().upper()
    return bool(re.match(r"^ABC([^A-Z0-9]|$)",lead))
def ph(p,t=2026):
    v=p.get("phase")
    try: return int(str(v).strip())==t
    except: return False
def f(v): return v is not None and str(v).strip()!=""
CODE=re.compile(r"^[A-Z]{0,2}\d{2,6}$")
for lab,url in HOSTS.items():
    try:
        with urllib.request.urlopen(urllib.request.Request(url,headers={"Accept":"application/json"}),timeout=240) as r:
            data=json.loads(r.read().decode())
    except Exception as e:
        print(f"[{lab}] UNREACHABLE {e}"); continue
    base=[p for p in data if is_bil(p) and is_all(p)]
    for name,sel in (("bilateral+Alliance (no phase)",base),
                     ("+ phase==2026  <-- WHAT THE PICKER SHOWS",[p for p in base if ph(p)])):
        n=len(sel)
        print(f"\n[{lab}] {name}: {n}")
        if not n: continue
        code=[p for p in sel if CODE.match((p.get("short_name") or "").strip())]
        print(f"   short_name is a bare code : {len(code):4}/{n} ({100*len(code)/n:5.1f}%)")
        for fld in ("full_name","description"):
            c=sum(1 for p in sel if f(p.get(fld)))
            print(f"   {fld:12} populated  : {c:4}/{n} ({100*c/n:5.1f}%)")
        same=sum(1 for p in sel if (p.get("short_name") or "").strip()==(p.get("full_name") or "").strip())
        print(f"   short_name == full_name   : {same:4}/{n}")
        print("   first 8 rows as the picker labels them (short_name) -> full_name:")
        for p in sel[:8]:
            print(f"     {str(p.get('short_name'))[:22]:22} -> {str(p.get('full_name'))[:52]}")
