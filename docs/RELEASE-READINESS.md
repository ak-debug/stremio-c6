# First public release

The fork is already public at https://github.com/ak-debug/stremio-c6. Public source availability is different from an explicitly licensed open-source distribution. As checked on 15 November 2026, the upstream kieranbrown/stremio-webos and jrubimf/StremioR trees contain no explicit license file, and GitHub's license endpoint returns 404 for each. This fork also has no repository-wide license declaration.

Before publishing a distributable binary as a fully licensed open-source release:

1. Establish the license/permission for the inherited wrapper and imported StremioR code. Check any explicit permission from maintainers; do not assume public GitHub code is MIT-licensed. No maintainer has been contacted by this task.
2. Establish the redistribution terms and corresponding-source requirements for the exact downloaded Theater/WASM bundle, Stremio server and static FFmpeg/FFprobe build. Preserve the applicable third-party notices and source references. Do not apply a new blanket license to other authors' code.
3. Choose and document a compatible license for the original contributions after the inherited terms are clear. GitHub explains the distinction in its [repository licensing guide](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).
4. Release initially as a community test build. List the tested model/firmware and the short synthetic validation accurately. Avoid claims of universal webOS compatibility, uninterrupted torrents or verified 4K Dolby Vision.

## Prepared artifacts

- TV app 1.1.0 with its own application/service IDs.
- Reproducible source and pinned download hashes.
- Build, install, Mac/external-server and device-validation instructions.
- Draft release notes and a checksum for the locally tested IPK.
- Release workflow set to produce drafts/prereleases, allowing the maintainer to review artifacts and licensing before publication.

The default workflow no longer publishes a stable release automatically when a version tag is pushed. It builds a draft prerelease. A draft is not a public download release.

## Suggested attribution request

The following is prepared text only; it has not been sent to anyone:

> I maintain a fork of your webOS Stremio project and would like to redistribute a community build, with attribution and source changes published. I could not find an explicit license declaration in the repository. Could you clarify the license for your original wrapper/patches and any conditions for redistribution? I will retain the applicable upstream and third-party notices.
