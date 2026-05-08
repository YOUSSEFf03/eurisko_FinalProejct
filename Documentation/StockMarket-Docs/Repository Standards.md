# Repository Standards

## Summary
Defines the standard files and folders
every contributor must maintain.

## Required Files & Folders
| Path                      | Purpose                              |
|--------------------------|--------------------------------------|
| `.husky/`                 | Git hooks — see [[Husky Setup]]      |
| `.github/`                | CI & PR templates — see [[GitHub Actions CI]] |
| `Documentation/`          | Postman, schemas, env template       |
| `.env.example`            | Environment variable reference       |
| `README.md`               | Project setup and run guide          |
| `commitlint.config.js`    | Commit rules — see [[Commitlint]]    |

## What Must Not Be Committed
| Item               | Reason                        |
|-------------------|-------------------------------|
| `.env`             | Contains real secrets         |
| `node_modules/`    | Installed locally             |
| `.obsidian/`       | Personal Obsidian settings    |
| `dist/`            | Build output                  |

## .gitignore Must Include

.env
node_modules/
dist/
StockMarket-Docs/.obsidian/

## Related
- [[Git Strategy]]
- [[Husky Setup]]
- [[GitHub Actions CI]]
- [[Branch Protection]]
- [[Commit Convention]]