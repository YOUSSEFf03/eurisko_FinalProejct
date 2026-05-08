# GitHub Actions CI

## Summary
Automated CI pipeline that runs on every Pull Request
targeting `develop` or `main`.

## Pipeline Location

.github/
└── workflows/ 
└── ci.yml


## Pipeline Steps
| Step            | What it does                    |
|----------------|----------------------------------|
| `npm install`   | Installs all dependencies        |
| `lint`          | Runs ESLint across all files     |
| `test`          | Runs all unit and e2e tests      |

## Triggers
```yaml
on:
  pull_request:
    branches:
      - main
      - develop
```

## ci.yml Structure
```yaml
name: CI

on:
  pull_request:
    branches:
      - main
      - develop

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - uses: actions/checkout@v3

      - name: Setup Node
        uses: actions/setup-node@v3
        with:
          node-version: '20'

      - name: Install dependencies
        run: npm install

      - name: Run lint
        run: npm run lint

      - name: Run tests
        run: npm run test
```

## How It Connects
Every PR must pass this pipeline before
[[Branch Protection]] allows the merge.

## Related
- [[Branch Protection]]
- [[PR Template]]
- [[Git Strategy]]
- [[Lint Staged]]