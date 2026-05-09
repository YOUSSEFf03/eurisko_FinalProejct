# Branch Naming Convention

## Summary
All branches follow a consistent naming pattern
tied to the feature being developed.

## Current Branches
| Branch                    | Purpose                        |
|--------------------------|-------------------------------|
| `main`                   | Production-ready code          |
| `develop`                | Integration branch             |
| `feature/auth`           | Authentication & OTP           |
| `feature/wallet`         | Wallet deposit & withdrawal    |
| `feature/stocks`         | Stock catalogue management     |
| `feature/orders`         | Buy & sell order execution     |
| `feature/analytics`      | Analytics endpoints            |
| `feature/notifications`  | Notification service           |
| `feature/cms`            | CMS admin & roles              |

## Format

## Other Branch Types
| Prefix     | When to use              | Example                    |
|-----------|--------------------------|---------------------------|
| `feature/` | New feature              | `feature/auth`            |
| `fix/`     | Bug fix                  | `fix/wallet-overdraft`    |
| `chore/`   | Config or maintenance    | `chore/eslint-config`     |
| `refactor/`| Code restructure         | `refactor/orders-service` |
| `docs/`    | Documentation only       | `docs/postman-collection` |

## Rules
- Always lowercase
- Use hyphens not underscores
- Keep it short but descriptive

## Related
- [[Git Strategy]]
- [[Commit Convention]]
- [[Branch Protection]]
