# Licensing and release status

The project is a public community fork. Public source availability does not by itself establish an open-source license; see [GitHub's licensing guide](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository).

The inherited wrapper and adapted StremioR code do not currently have an explicit repository-wide license declaration identified by this project. This fork does not assert a blanket license over other authors' work.

Before distributing a binary as a fully licensed release:

1. Clarify the inherited wrapper and patch licensing with upstream maintainers and retain attribution.
2. Identify redistribution terms and corresponding-source requirements for the pinned Theater/WASM bundle, streaming server, and FFmpeg/FFprobe build; include applicable notices and source references.
3. Document a compatible license for original contributions once the inherited terms are clear.
4. State the tested model, version, and validation limits accurately.

The release workflow builds draft prereleases for review. It requires a matching `docs/RELEASE-NOTES-<version>.md`; create that file before tagging a new version. Historical release notes are retained for that workflow. The [changelog](../CHANGELOG.md) is the consolidated version history.

A draft release is not a public download. There is no public binary release documented by this project. See [device validation](DEVICE-VALIDATION.md) for the scope of existing tests.
