# 可算・不可算 見分けクイズ

英語の可算名詞・不可算名詞を、日本語との距離を基準にした4段階の難易度で学ぶクイズサイトです。

- 収録語数: 800 語（L1 200 / L2 300 / L3 200 / L4 100）
- 1セット10問。語の判定・空所補充・誤り訂正を混ぜて出題
- 回答直後に日本語の解説、結果画面、間違えた語の復習
- 学習履歴はブラウザの `localStorage` にのみ保存

## スタック

- [Bun](https://bun.sh/) + [Vite](https://vite.dev/)
- React 19 + TypeScript 7（`bun check`）
- [TanStack Router](https://tanstack.com/router)（ファイルベースルーティング）
- [shadcn/ui](https://ui.shadcn.com/)（Base UI プリセット `bdKQpI5w` をそのまま使用）
- Tailwind CSS v4
- [oxlint](https://oxc.rs/docs/guide/usage/linter) / [oxfmt](https://oxc.rs/docs/guide/usage/formatter)
- GitHub Pages

## 開発

前提: [mise](https://mise.jdx.dev/) がインストールされていること。

```bash
mise install
bun install
bun run dev
```

| コマンド | 内容 |
| --- | --- |
| `bun run dev` | 開発サーバー |
| `bun run build` | 本番ビルド（`dist/404.html` も生成） |
| `bun run preview` | ビルド結果のプレビュー |
| `bun run check` | TypeScript 7 による型チェック |
| `bun fmt` | oxfmt で整形 |
| `bun run fmt:check` | 整形されているか確認 |
| `bun run lint` | oxlint |
| `bun test` | データとクイズ生成のテスト |
| `bun run data:fetch` | 生データの取得・キャッシュ |
| `bun run data:build` | キュレーションとマージして `src/data/words.json` を生成 |

## データ

`data/curated/*.ts` に手作業で整備した語彙があり、`data/raw/candidates.json` の自動抽出語とマージして 800 語に調整します。L2（抽象名詞）と L3（意味で変わる語）はキュレーション済みの語で構成し、L1 の不足分だけを自動抽出語で補います。

```bash
# 初回・データ更新時（Wiktionary / Wikidata へアクセスします）
bun run data:fetch
bun run data:build
```

- `scripts/fetch-data.ts`: 頻度リスト、Wiktionary の見出し語テンプレートとラベル、Wikidata の日本語ラベルを取得
- `scripts/build-dataset.ts`: 重複除去、難易度割り当て、解説テンプレート、出典付与、件数チェック
- 出力: `src/data/words.json` / `src/data/meta.json`

生データは `data/raw/` にキャッシュされます。Wikidata へのアクセスは間隔を空け、429 応答時は待機して再試行します。

### 出典とライセンス

- English Wiktionary: CC BY-SA 4.0
- Wikidata: CC0 1.0
- FrequencyWords: MIT

各語の解説には参照した Wiktionary ページへのリンクを表示し、`/licenses` にライセンス情報をまとめています。日本語の解説文とクイズ問題はこのプロジェクトのために独自に作成したものです。

## デプロイ

`main` ブランチへの push で GitHub Pages にデプロイします。プロジェクトページ（`https://<owner>.github.io/kasan/`）を想定し、`BASE_PATH` でベースパスを切り替えます。SPA の直接アクセス用に `dist/404.html` を生成します。

初回のみ、リポジトリの Settings → Pages で Source を **GitHub Actions** に設定してください。

## 構成

```text
data/
  curated/       手作業で整備した語彙（both / abstract / countable / uncountable）
  raw/           取得済みキャッシュ
scripts/
  fetch-data.ts  データ取得
  build-dataset.ts データ生成
  postbuild.ts   404.html 生成
src/
  routes/        TanStack Router のルート
  components/    UI（shadcn/ui + クイズ画面）
  lib/           スキーマ、クイズ生成、保存、セッション
  data/          生成された語彙データ
tests/           データ検証とクイズ生成のテスト
docs/DESIGN.md   設計メモ
```
