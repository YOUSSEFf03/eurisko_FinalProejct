# Pull Request Template

## Summary
Every Pull Request must follow this template
before it can be reviewed and merged.

## Template Location

.github/ 
└── pull_request_template.md


## Template Content
```markdown
## What does this PR do?
<!-- Brief description of the changes -->

## Related Branch
<!-- e.g. feature/wallet -->

## Type of Change
- [ ] feat — new feature
- [ ] fix — bug fix
- [ ] chore — maintenance
- [ ] refactor — restructure
- [ ] docs — documentation
- [ ] test — tests

## Checklist
- [ ] Code follows project conventions
- [ ] ESLint passes
- [ ] Prettier passes
- [ ] Postman examples updated
- [ ] No hardcoded secrets
- [ ] Branch is up to date with develop

## Screenshots / Examples
<!-- Add Postman response or relevant output -->
```

## Merge Rules
- Must pass [[GitHub Actions CI]]
- Must pass [[Branch Protection]] checks
- At least one reviewer approval required

## Related
- [[Git Strategy]]
- [[GitHub Actions CI]]
- [[Branch Protection]]