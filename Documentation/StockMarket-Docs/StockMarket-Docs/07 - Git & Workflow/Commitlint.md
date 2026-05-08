# Commitlint

## Summary
Commitlint checks every commit message against
the conventional commit format before it is accepted.
Works together with [[Husky Setup]].

## Config File

commitlint.config.js

## Config Content
```js
module.exports = {
  extends: ['@commitlint/config-conventional'],
};
```

## What Gets Rejected
```bash
# Bad — will be rejected
git commit -m "fixed stuff"
git commit -m "WIP"
git commit -m "updated wallet"

# Good — will pass
git commit -m "fix(wallet): prevent overdraft"
git commit -m "feat(auth): add otp verification"
```

## Installation
```bash
npm install --save-dev @commitlint/cli @commitlint/config-conventional
```

## Related
- [[Husky Setup]]
- [[Commit Convention]]
- [[Lint Staged]]