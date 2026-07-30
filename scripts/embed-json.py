#!/usr/bin/env python3
"""Re-embed lib/biomimicry-subcategories.json into standalone.html's inline copy.
Doing this by hand is how the two builds drift, so it lives in one place and
verifies the round-trip before writing."""
import json, sys
REPO = "/Users/chun/Desktop/專案/biomimicry/biomimicry-pattern-hub"
SA, LIB = f"{REPO}/standalone.html", f"{REPO}/lib/biomimicry-subcategories.json"

lines = open(SA, encoding="utf-8").read().split("\n")
start = next(i for i, l in enumerate(lines) if l.strip().startswith("const subcategoryData = {"))
depth, end = 0, None
for i in range(start, len(lines)):
    depth += lines[i].count("{") - lines[i].count("}")
    if depth == 0 and i > start:
        end = i; break
if end is None: sys.exit("could not find end of subcategoryData block")

data = json.load(open(LIB, encoding="utf-8"))
emb = "  const subcategoryData = " + json.dumps(data, ensure_ascii=False, indent=2) + ";"
lines[start:end + 1] = emb.split("\n")
open(SA, "w", encoding="utf-8").write("\n".join(lines))

# read it back the same way the browser would, and prove it equals the source
lines = open(SA, encoding="utf-8").read().split("\n")
depth, e2 = 0, None
for i in range(start, len(lines)):
    depth += lines[i].count("{") - lines[i].count("}")
    if depth == 0 and i > start:
        e2 = i; break
back = json.loads("\n".join(lines[start:e2 + 1]).split("=", 1)[1].strip().rstrip(";"))
assert back == data, "round-trip mismatch — standalone.html would disagree with lib"
print(f"embedded ok: lines {start+1}-{e2+1}, {len(data['categories'])} categories, round-trip verified")
