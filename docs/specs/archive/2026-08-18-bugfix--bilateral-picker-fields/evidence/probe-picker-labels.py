#!/usr/bin/env python3
import json,re,urllib.request,collections
url="https://clarisatest-back.ciat.cgiar.org/api/projects"
ALL={"CIAT","BIOVERSITY"}
def norm(s): return re.sub(r"[^A-Z0-9]+"," ",(s or "").upper()).strip()
def is_bil(p): return norm(p.get("source_of_funding")).startswith("BILATERAL")
def is_all(p):
    a=(p.get("source_center_acronym") or "").strip().upper()
    if a in ALL: return True
    l=((p.get("lead_institution_object") or {}).get("acronym") or "").strip().upper()
    return bool(re.match(r"^ABC([^A-Z0-9]|$)",l))
def ph(p):
    try: return int(str(p.get("phase")).strip())==2026
    except: return False
with urllib.request.urlopen(urllib.request.Request(url,headers={"Accept":"application/json"}),timeout=240) as r:
    data=json.loads(r.read().decode())
sel=[p for p in data if is_bil(p) and is_all(p) and ph(p)]
shapes=collections.Counter(re.sub(r"\d","#",re.sub(r"[A-Za-z]","@",(p.get("short_name") or "").strip())) for p in sel)
print("short_name shapes (@=letter #=digit):")
for s,c in shapes.most_common(10): print(f"   {s:10} x{c}")
looks_like_name=[p for p in sel if " " in (p.get("short_name") or "").strip()]
print(f"\nshort_name containing a space (i.e. plausibly a name): {len(looks_like_name)}/{len(sel)}")
print("\n20 random short_names:")
import itertools
for p in sel[::17][:20]: print(f"   '{p.get('short_name')}'")
