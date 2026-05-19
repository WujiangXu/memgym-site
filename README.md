# memgym-site

Project landing page for **MemGym: a Long-Horizon Memory Environment for LLM Agents**.

Code: <https://github.com/WujiangXu/MemGym>

## Local preview

```sh
python -m http.server 8000
# then open http://localhost:8000
```

`fetch()` of `data/leaderboard.json` only works over HTTP, not `file://`, so the leaderboard will be empty if you double-click `index.html`. Always preview through `http.server`.

## Adding a leaderboard row

Edit `data/leaderboard.json`, append one entry to the `entries` array (schema fields: `track`, `method`, `score`, `score_units`, `base_model`, `baseline`, `delta`, `n`, `notes`, `is_baseline`, `date_added`), commit, push. No HTML edits required.

## Regenerating figures from the paper

```sh
bash scripts/convert_figures.sh
```

Requires `pdftoppm` (`apt-get install poppler-utils`). The paper source path is hardcoded in `scripts/convert_figures.sh` — edit `SRC` there to match your figure directory.

## Deploy

```sh
git init && git add . && git commit -m "Initial project page"
gh repo create WujiangXu/memgym-site --public --source=. --remote=origin --push
# Then in GitHub: Settings → Pages → Branch: main / Folder: / (root)
```

Live URL: <https://wujiangxu.github.io/memgym-site/>
