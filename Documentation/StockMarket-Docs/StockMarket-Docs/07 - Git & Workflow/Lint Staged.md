# Lint Staged

## Summary
Lint Staged runs ESLint and Prettier automatically
but only on files that were modified in the current commit.
Triggered by [[Husky Setup]] pre-commit hook.

## Why Only Modified Files
Running lint on the entire codebase on every commit
is too slow. Lint Staged targets only what changed.

## Config (inside package.json)
```json
"lint-staged": {
  "*.ts": [
    "eslint --fix",
    "prettier --write"
  ]
}
```

## What It Runs
| Tool       | Purpose                          |
|-----------|----------------------------------|
| ESLint     | Catches code quality issues      |
| Prettier   | Enforces consistent formatting   |

## Flow

git commit
↓
Husky pre-commit hook fires
↓
Lint Staged runs on modified .ts files
↓
ESLint checks pass
↓
Prettier formats pass
↓
Commit goes through


## Installation
```bash
npm install --save-dev lint-staged
```

## Related
- [[Husky Setup]]
- [[Commitlint]]
- [[GitHub Actions CI]]