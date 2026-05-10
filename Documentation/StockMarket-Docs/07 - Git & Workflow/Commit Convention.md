
## Summary
All commits follow the Conventional Commits standard,
enforced automatically by [[Commitlint]] and [[Husky Setup]].

## Format

## Types
| Type       | When to use                          |
|-----------|--------------------------------------|
| `feat`     | New feature                          |
| `fix`      | Bug fix                              |
| `chore`    | Config, deps, maintenance            |
| `refactor` | Code restructure, no behavior change |
| `docs`     | Documentation changes                |
| `test`     | Adding or updating tests             |

## Scopes (match our services)
| Scope           | Maps to                        |
|----------------|-------------------------------|
| `auth`          | feature/auth                  |
| `wallet`        | feature/wallet                |
| `stocks`        | feature/stocks                |
| `orders`        | feature/orders                |
| `analytics`     | feature/analytics             |
| `notifications` | feature/notifications         |
| `cms`           | feature/cms                   |

## Real Examples From This Project

feat(auth): add otp verification
feat(auth): add jwt refresh token
feat(wallet): add deposit flow
feat(wallet): add withdrawal request
fix(wallet): prevent overdraft on concurrent orders
feat(stocks): add price history tracking
feat(orders): add buy order execution
feat(orders): add sell order with p&l calculation
feat(analytics): add trading volume endpoint
feat(notifications): add rabbitmq consumer
feat(cms): add role-based access control
chore: add eslint and prettier config
chore: add husky and commitlint
docs(readme): update setup guide
test(auth): add otp verification unit tests


## Related
- [[Husky Setup]]
- [[Commitlint]]
- [[Git Strategy]]
- [[Lint Staged]]