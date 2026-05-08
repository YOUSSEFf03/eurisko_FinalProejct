# Branch Protection

## Summary
GitHub branch protection rules prevent
direct pushes and enforce quality gates
on `main` and `develop`.

## Protected Branches
| Branch    | Protection Level |
|----------|-----------------|
| `main`    | Strict           |
| `develop` | Strict           |

## Rules Enabled
| Rule                        | Purpose                              |
|----------------------------|--------------------------------------|
| Required Pull Requests      | No direct commits allowed            |
| Required status checks      | [[GitHub Actions CI]] must pass      |
| Prevent force push          | History cannot be rewritten          |
| Require branch up to date   | Must sync with target before merge   |

## Flow This Enforces

feature branch
↓
Pull Request opened
↓
GitHub Actions CI runs automatically
↓
CI passes 
↓
Reviewer approves 
↓
Merge allowed into develop
↓
develop → main (same rules apply)

## Related
- [[Git Strategy]]
- [[GitHub Actions CI]]
- [[PR Template]]
- [[Branch Naming]]