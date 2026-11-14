# Hosted shader packs

Ray（くわ / kuwacom, 0.1.0a0 nightly c7fa099）は 1.4.1 で配布から外しました。

原因: Ray は colortex16 以降（最大 colortex21）を使います。Iris が 16 個を超える colortex に対応したのは 1.10.5 以降で、NeoForge 1.21.1 向けの最新 Iris は 1.8.14-beta.1（colortex は 16 個まで）です。Iris 1.10/1.11 は 1.21.11 と 26.x 向けで、1.21.1 用はありません。公式 nightly も同じ c7fa099 のままで、同じエラーの Issue が開いたままです。

公式: https://github.com/kuwacom/ray
Issue: https://github.com/kuwacom/ray/issues/8
