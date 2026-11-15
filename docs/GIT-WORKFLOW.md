# Contributing selected changes from a fork

A fork is your repository on GitHub. A branch identifies a sequence of commits within that repository. A pull request asks another repository to merge a branch. It contains the changes since the branches diverged, not every file in your fork.

Here, `origin` is `ak-debug/stremio-c6` and `upstream` is `kieranbrown/stremio-webos`. Our `main` contains the complete custom application. Contribution branches start from `upstream/main` so they do not include unrelated customizations.

## 1. Get current upstream code

Run these from the repository. Add the upstream remote only once:

```sh
git remote add upstream https://github.com/kieranbrown/stremio-webos.git
git fetch upstream
git status
```

If the remote already exists, skip `git remote add`. Fetch downloads commits and updates `upstream/main`; it does not switch branches or replace working files. Commit or otherwise save existing work before switching branches.

## 2. Create a focused branch

```sh
git switch -c codex/my-fix upstream/main
```

This creates a branch containing upstream's current code. It does not remove the custom application from your `main`. Use a distinct branch for each independent PR.

## 3. Bring over only the relevant work

For an existing commit containing exactly the desired fix:

```sh
git cherry-pick COMMIT_SHA
```

Cherry-pick applies that commit's changes and creates a new commit on the current branch. It does not copy all earlier commits from its original branch. Dependencies still need to be included or adapted to upstream.

If the original commit mixes features, edit just the relevant code here, review it, then stage individual changes:

```sh
git diff
git add -p
git diff --cached
git commit -m "Describe the focused fix"
```

`git add -p` lets you stage chunks rather than whole files. It is easiest when unrelated changes affect different chunks; edit or split a chunk if necessary. Avoid copying entire customized files over upstream files just to transfer a small fix.

## 4. Test and preview the PR

Run the checks appropriate to this branch, then inspect the comparison:

```sh
git diff --check
git diff upstream/main...HEAD --stat
git diff upstream/main...HEAD
git log --oneline upstream/main..HEAD
```

The three-dot diff shows what the branch adds since its common ancestor with upstream, matching the usual PR comparison. Confirm every changed file belongs in the PR. Tests required by a contribution may differ from the checks on our customized `main`.

## 5. Push the branch and open the PR

```sh
git push -u origin codex/my-fix
gh pr create --repo kieranbrown/stremio-webos --base main --head ak-debug:codex/my-fix
```

Push uploads the branch to your fork. It does not merge into anyone's main. In GitHub's website, the equivalent is **New pull request → compare across forks**: base repository `kieranbrown/stremio-webos`, base `main`, head repository `ak-debug/stremio-c6`, compare `codex/my-fix`.

Use a clear title and describe the problem, resulting behavior, tests, and limitations. A focused PR can be opened without a prior introduction. The maintainer decides whether to merge it.

## 6. Respond to review

Edit, test, commit, and push on the same branch. The existing PR updates automatically; a second PR is unnecessary for review fixes. If upstream changes introduce conflicts, fetch and integrate those changes into the contribution branch, inspect the result, and rerun checks.

Return to the complete application when finished:

```sh
git switch main
```

For the next independent PR, start again from the latest `upstream/main`, not the previous feature branch. That prevents one PR from unintentionally depending on another.

## Optional: separate working folders

Git worktrees allow multiple branches to be checked out in separate folders at once:

```sh
git worktree add -b codex/another-fix ../Stremio-upstream-another-fix upstream/main
```

The folders share the repository's commits and remotes, but each has its own branch and working files. This is convenient when preparing several PRs; it is not required and is available to engineers without any agent tooling.
