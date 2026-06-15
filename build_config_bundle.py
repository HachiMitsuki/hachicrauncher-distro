# build_config_bundle.py <configDir>
# config/ を決定的(内容が同じならハッシュ不変)な zip にまとめて stdout に出す。
# 個人設定(シェーダー/画質/ボイス)は除外して、ゲームプレイ系mod設定だけ共有する。
import sys, os, io, zipfile

CONFIG = sys.argv[1]
DENY_EXACT = {
    "iris.properties", "iris-excluded.json", "oculus.properties",
    "chloride-client.json", "sodium-options.json", "sodium-extra-options.json",
    "embeddium-options.json", "badoptimizations.txt",
    "entityculling.json", "immediatelyfast.json",
}
DENY_PREFIX = ("voicechat/",)

files = []
for root, _, fnames in os.walk(CONFIG):
    for f in fnames:
        full = os.path.join(root, f)
        rel = os.path.relpath(full, CONFIG).replace("\\", "/")
        if rel in DENY_EXACT:
            continue
        if any(rel.startswith(p) for p in DENY_PREFIX):
            continue
        files.append((rel, full))
files.sort()

out = io.BytesIO()
with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
    for rel, full in files:
        zi = zipfile.ZipInfo(rel, date_time=(1980, 1, 1, 0, 0, 0))  # 固定タイムスタンプ=決定的
        zi.compress_type = zipfile.ZIP_DEFLATED
        with open(full, "rb") as fh:
            z.writestr(zi, fh.read())

sys.stdout.buffer.write(out.getvalue())
sys.stderr.write(f"bundled {len(files)} config files\n")
