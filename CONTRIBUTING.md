# etherpad-next Contributing Guide

Thank you for your interest in contributing to the etherpad-next. Before you proceed, briefly go through the following:

- [Getting started](#getting-started)
  - [CLI Commands](#cli-commands)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Policy](#pull-request-policy)
- [Developer's Certificate of Origin 1.1](#developers-certificate-of-origin-11)

## Getting started

The steps below will give you a general idea of how to prepare your local environment for the Node.js Website and general steps
for getting things done and landing your contribution.

1. Click the fork button in the top right to clone the [etherpad-next Repository](https://github.com/ether/etherpad-next/fork)

2. Clone your fork using SSH, GitHub CLI, or HTTPS.

   ```bash
   git clone git@github.com:<YOUR_GITHUB_USERNAME>/etherpad-next.git # SSH
   git clone https://github.com/<YOUR_GITHUB_USERNAME>/etherpad-next.git # HTTPS
   gh repo clone <YOUR_GITHUB_USERNAME>/etherpad-next # GitHub CLI
   ```

3. Change into the `etherpad-next` directory.

   ```bash
   cd etherpad-next
   ```

4. Create a remote to keep your fork and local clone up-to-date.

   ```bash
   git remote add upstream git@github.com:ether/etherpad-next.git # SSH
   git remote add upstream https://github.com/ether/etherpad-next.git # HTTPS
   gh repo sync ether/etherpad-next # GitHub CLI
   ```

5. Create a new branch for your work.

   ```bash
   git checkout -b name-of-your-branch
   ```

6. Run the following to install the dependencies and start a local preview of your work.

   ```bash
   npm ci # installs this project's dependencies without updating package.json
   npx turbo dev # starts a preview of your local changes
   ```

7. Perform a merge to sync your current branch with the upstream branch.

   ```bash
   git fetch upstream
   git merge upstream/main
   ```

8. Run `npx turbo format` to confirm that linting and formatting are passing.

   ```bash
   npx turbo format
   ```

9. Once you're happy with your changes, add and commit them to your branch, then push the branch to your fork.

   ```bash
   cd ~/ehtherpad-next
   git add .
   git commit -m "some message"
   git push -u origin name-of-your-branch
   ```

   > [!IMPORTANT]\
   > Before committing and opening a Pull Request, please go first through our [Commit](#commit-guidelines) and [Pull Request](#pull-request-policy) guidelines outlined below.

10. Create a Pull Request.

## Commit Guidelines

This project follows the [Conventional Commits][https://www.conventionalcommits.org/] specification.

### Commit Message Guidelines

- Commit messages must include a "type" as described on Conventional Commits
- Commit messages **must** start with a capital letter
- Commit messages **must not** end with a period `.`

## Pull Request Policy

This policy governs how contributions should land within this repository. The lines below state the checks and policies to be followed before merging and in the act of merging.

## Developer's Certificate of Origin 1.1

```
By contributing to this project, I certify that:

- (a) The contribution was created in whole or in part by me and I have the right to
  submit it under the open source license indicated in the file; or
- (b) The contribution is based upon previous work that, to the best of my knowledge,
  is covered under an appropriate open source license and I have the right under that
  license to submit that work with modifications, whether created in whole or in part
  by me, under the same open source license (unless I am permitted to submit under a
  different license), as indicated in the file; or
- (c) The contribution was provided directly to me by some other person who certified
  (a), (b) or (c) and I have not modified it.
- (d) I understand and agree that this project and the contribution are public and that
  a record of the contribution (including all personal information I submit with it,
  including my sign-off) is maintained indefinitely and may be redistributed consistent
  with this project or the open source license(s) involved.
```
