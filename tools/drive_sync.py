"""Fetch the IELTS Drive folder listing + text of PDF/DOCX files into _source/."""
import json, os, subprocess, sys, gdown
URL = "https://drive.google.com/drive/folders/1SJ27Mwr5bkzGCfRJktlOIokHY03oCEeD"
out = "_source"
os.makedirs(out, exist_ok=True)
files = gdown.download_folder(URL, skip_download=True, quiet=True, remaining_ok=True)
man = [{"id": f.id, "path": f.path} for f in files]
json.dump(man, open(f"{out}/manifest.json", "w"), ensure_ascii=False, indent=1)
print(len(man), "files listed")
for f in man:
    p = f["path"]; low = p.lower()
    if not (low.endswith(".pdf") or low.endswith(".docx")):
        continue
    if "key.pdf" in low or low.split("/")[-1].startswith("full"):
        continue
    dst = os.path.join("/tmp/raw", p)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    try:
        gdown.download(id=f["id"], output=dst, quiet=True)
    except Exception as e:
        print("FAIL", p, e); continue
    txt = os.path.join(out, "text", p) + (".md" if low.endswith(".docx") else ".txt")
    os.makedirs(os.path.dirname(txt), exist_ok=True)
    if low.endswith(".pdf"):
        subprocess.run(["pdftotext", dst, txt])
    else:
        subprocess.run(["pandoc", dst, "-t", "gfm", "--wrap=none", "-o", txt,
                        "--extract-media", os.path.join(out, "media", os.path.dirname(p))])
    print("ok", p)
