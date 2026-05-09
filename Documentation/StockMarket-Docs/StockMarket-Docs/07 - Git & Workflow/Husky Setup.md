# Husky Setup

## Summary
Husky automates Git hooks to enforce code quality
and commit standards before any commit goes through.

## What Husky Enforces
| Hook          | What it runs                        |
|--------------|-------------------------------------|
| `pre-commit`  | [[Lint Staged]] (ESLint + Prettier) |
| `commit-msg`  | [[Commitlint]] format check         |

## Installed Location

.husky/ 
├── pre-commit
└── commit-msg

## Pre-commit Hook
```bash
#!/bin/sh
npx lint-staged
```

## Commit-msg Hook
```bash
#!/bin/sh
npx --no -- commitlint --edit $1
```

## Setup Steps
```bash
npm install --save-dev husky
npx husky init
```

## How It Fits In
Every developer on the team gets these checks
automatically — no manual enforcement needed.

## Related
- [[Commitlint]]
- [[Lint Staged]]
- [[Git Strategy]]
- [[Commit Convention]]
