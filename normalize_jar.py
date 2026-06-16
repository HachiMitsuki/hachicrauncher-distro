# normalize_jar.py — stdin の jar を読み、CurseForge の不正ツールが作った壊れた zip
# （STORED ディレクトリエントリに data-descriptor フラグ＋DEFLATED エントリの descriptor
# サイズ不正、が混在し JDK の JarInputStream が "invalid entry size" で弾く）を、python が
# 各エントリを正しく読み直して**クリーンな zip に再構築**することで修復し、stdout に返す。
#
# 検出: STORED(無圧縮)+data-descriptorフラグ(bit3) を1つでも持つ jar をこの不正パターンと判定。
#       それ以外（正常な data-descriptor 利用jar含む）は原本のまま通す。
#
# ※純粋なバイナリ(フラグ)パッチではこの二層の不正を直せない（物理 descriptor 除去にバイト移動が
#   要り結局再構築になる）ため、再構築方式を採用。サーバー実機(OpenJDK21)起動で動作確認済み。
import sys, io, zipfile

data = sys.stdin.buffer.read()
try:
    src = zipfile.ZipFile(io.BytesIO(data))
    needs = any(i.compress_type == 0 and (i.flag_bits & 0x08) for i in src.infolist())
    if not needs:
        sys.stdout.buffer.write(data); sys.exit(0)
    names = [n for n in src.namelist() if not n.endswith("/")]   # データ無しディレクトリは捨てる
    order = sorted(names, key=lambda n: (0 if n.upper() == "META-INF/MANIFEST.MF" else 1, n))
    out = io.BytesIO(); seen = set()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for n in order:
            if n in seen:
                continue
            seen.add(n)
            try:
                d = src.read(n)
            except Exception:
                continue
            zi = zipfile.ZipInfo(n); zi.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(zi, d)
    sys.stdout.buffer.write(out.getvalue())
    sys.stderr.write(f"rebuilt {len(seen)} entries\n")
except Exception as e:
    sys.stderr.write(f"normalize error: {e}\n")
    sys.stdout.buffer.write(data)
