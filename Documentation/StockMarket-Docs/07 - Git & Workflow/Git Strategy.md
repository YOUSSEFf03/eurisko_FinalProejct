# Git Strategy

## Summary
Feature-branch workflow with protected main and develop branches.
All merges done exclusively via Pull Requests.

## Branch Structure

main 
└── develop 
├── feature/auth 
├── feature/wallet 
├── feature/stocks 
├── feature/orders 
├── feature/analytics 
├── feature/notifications 
└── feature/cms


## Flow
feature branch → Pull Request → develop → main

## Rules
- Never commit directly to `main` or `develop`
- Every feature developed in its own branch
- All merges done via Pull Requests only
- Branch must be up to date before merging

## Tools Used
- [[Husky Setup]] — Git hooks automation
- [[Commitlint]] — Commit message enforcement
- [[Lint Staged]] — Pre-commit file checks
- [[GitHub Actions CI]] — Automated pipeline on PRs
- [[Branch Protection]] — Enforced repo rules

## Related
- [[Branch Naming]]
- [[Commit Convention]]
- [[PR Template]]