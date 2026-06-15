# normalize_jar.py — stdin の jar を読み、STORED+data-descriptor エントリ（JDKの
# JarInputStream が "invalid entry size" で弾く形式）があれば zip を再構築して stdout に返す。
# 問題が無ければそのまま通す。sync_mods.js から各MOD jarをパイプして使う。
import sys, io, zipfile

data = sys.stdin.buffer.read()
try:
    src = zipfile.ZipFile(io.BytesIO(data))
    needs = any(i.compress_type == 0 and (i.flag_bits & 0x08) for i in src.infolist())
    if not needs:
        sys.stdout.buffer.write(data); sys.exit(0)
    names = [n for n in src.namelist() if not n.endswith("/")]
    order = sorted(names, key=lambda n: (0 if n.upper() == "META-INF/MANIFEST.MF" else 1, n))
    out = io.BytesIO(); seen = set()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for n in order:
            if n in seen: continue
            seen.add(n)
            try:
                d = src.read(n)
            except Exception:
                continue
            zi = zipfile.ZipInfo(n); zi.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(zi, d)
    sys.stdout.buffer.write(out.getvalue())
except Exception:
    sys.stdout.buffer.write(data)  # 何かあれば原本を通す（壊さない）
