"""Build data/ielts/*.js from compact source files in tools/ielts_src/*.txt.

Format (one test per '=== ' header):
=== <Reading|Listening> | <Vol> | <Test title> | <minutes>
## <section title>
@audio <url>            (optional, Listening)
<passage lines ...>     (until first '>' or question line)
> <instruction for the next group>
f <n> | <question, ___ = gap> | ans1 / alt2
tf <n> | <statement> | T|F|NG
yn <n> | <statement> | Y|N|NG
m <n> | <question> | opt A ;; opt B ;; ... | <letter>
L <n> | <statement> | <letters e.g. ABCD> | <letter>
"""
import json, re, sys, glob, os
SRC = os.path.join(os.path.dirname(__file__), "ielts_src")
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "ielts")
TF = {"T": 0, "F": 1, "NG": 2}
YN = {"Y": 0, "N": 1, "NG": 2}

def slug(s): return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

def parse(text):
    tests, t, sec, instr = [], None, None, None
    def addq(q):
        nonlocal instr
        if instr:
            q["q"] = instr + "\n" + q["q"]; instr = None
        sec["questions"].append(q)
    for raw in text.splitlines():
        line = raw.rstrip()
        if line.startswith("=== "):
            skill, vol, title, mins = [x.strip() for x in line[4:].split("|")]
            t = {"id": "t-" + slug(vol + "-" + skill[0] + "-" + title), "type": "ielts", "skill": skill,
                 "vol": vol, "title": f"{vol} · {title} · {skill}", "minutes": int(mins), "builtin": True,
                 "desc": f"IELTS {skill} {vol} – {title}", "sections": []}
            tests.append(t); sec = None; continue
        if line.startswith("## "):
            sec = {"title": line[3:].strip(), "passage": "", "questions": []}
            t["sections"].append(sec); continue
        if sec is None: continue
        if line.startswith("@audio "):
            sec["audioSrc"] = line[7:].strip(); continue
        if line.startswith("> "):
            instr = (instr + "\n" if instr else "") + line[2:]; continue
        m = re.match(r"^(f|tf|yn|m|L) (\d+) \| (.*)$", line)
        if m:
            kind, n, rest = m.group(1), m.group(2), m.group(3)
            parts = [p.strip() for p in rest.split(" | ")]
            q = parts[0].replace("___", "______")
            if kind == "f":
                addq({"t": "fill", "q": q, "a": [a.strip().lower() for a in parts[1].split(" / ")]})
            elif kind == "tf":
                addq({"t": "mc", "q": q, "o": ["TRUE", "FALSE", "NOT GIVEN"], "a": TF[parts[1]]})
            elif kind == "yn":
                addq({"t": "mc", "q": q, "o": ["YES", "NO", "NOT GIVEN"], "a": YN[parts[1]]})
            elif kind == "m":
                opts = [o.strip() for o in parts[1].split(";;")]
                addq({"t": "mc", "q": q, "o": [f"{chr(65+i)}. {o}" for i, o in enumerate(opts)],
                      "a": ord(parts[2].strip()) - 65})
            elif kind == "L":
                letters = list(parts[1].replace(" ", ""))
                addq({"t": "mc", "q": q, "o": letters, "a": letters.index(parts[2].strip())})
            continue
        if not sec["questions"] and instr is None:
            sec["passage"] += line + "\n"
    for t in tests:
        for s in t["sections"]:
            s["passage"] = s["passage"].strip()
            if not s["passage"]: del s["passage"]
        t["desc"] += f" · {sum(len(s['questions']) for s in t['sections'])} câu"
    return tests

def main():
    os.makedirs(OUT, exist_ok=True)
    names = []
    for f in sorted(glob.glob(os.path.join(SRC, "*.txt"))):
        tests = parse(open(f, encoding="utf-8").read())
        name = os.path.splitext(os.path.basename(f))[0] + ".js"
        with open(os.path.join(OUT, name), "w", encoding="utf-8") as o:
            o.write("window.IELTS_DATA=(window.IELTS_DATA||[]).concat(")
            json.dump(tests, o, ensure_ascii=False, separators=(",", ":"))
            o.write(");\n")
        names.append(name)
        for t in tests:
            print(name, t["title"], [len(s["questions"]) for s in t["sections"]])
    json.dump(names, open(os.path.join(OUT, "index.json"), "w"))

if __name__ == "__main__":
    main()

def inject():
    p = os.path.join(os.path.dirname(__file__), "..", "index.html")
    s = open(p, encoding="utf-8").read()
    names = json.load(open(os.path.join(OUT, "index.json")))
    tags = "".join(f'\n<script src="data/ielts/{n}"></script>' for n in names) + "\n"
    s = re.sub(r"<!--IELTS-DATA-->.*?<!--/IELTS-DATA-->", lambda m: "<!--IELTS-DATA-->" + tags + "<!--/IELTS-DATA-->", s, flags=re.S)
    open(p, "w", encoding="utf-8").write(s)

inject()
