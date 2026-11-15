# Contributing

Keep changes small enough to review and describe the user-visible problem they solve. Identify inherited behavior separately from new work, retain attribution, and do not commit generated bundles or local device configuration.

## Working locally

1. Create a branch from the latest `main`.
2. Change source under `app/`, `service/`, `scripts/`, or `patches/`.
3. Run `make check` for service changes. For frontend patches or build changes, also run `make build`; use `make package` when packaging changes.
4. Record meaningful device observations in [device validation](docs/DEVICE-VALIDATION.md). State the tested version and distinguish automated, synthetic, and device evidence.
5. Describe the resulting behavior, validation, and remaining limitations in the PR.

Use generated clips or media you are authorized to distribute for reproducible fixtures. Reports should include relevant codec/container, bitrate, backend version, and playback state without personal viewing history, account tokens, stream hashes, or home-network addresses.

## Compatibility constraints

- Keep frontend streaming requests routed through the configured proxy.
- External mode must not start a local TV streaming engine.
- Avoid arbitrary file-serving endpoints and changes to platform permissions.
- Measure resource usage before increasing buffers; document cache targets accurately.
- Keep the TV screensaver policy intact.
- Preserve seek, reconnect, request-cancellation, and engine-cleanup behavior.

## Contributing upstream

The base project is [kieranbrown/stremio-webos](https://github.com/kieranbrown/stremio-webos). Send focused changes against its current default branch rather than proposing this entire fork as one merge.

Good initial candidates are the bundled server's upload-speed correction and connected-seeder detection fix in `scripts/build.py`. Each should include a reproducible explanation and a regression check adapted to upstream's build. The playback Stats control is a useful later change, but its patch depends on the telemetry helper and must be separated from this fork's buffering and setup code first.

Keep fork-specific branding, application IDs, profile defaults, and external-server architecture out of unrelated fixes. Review upstream's existing changes before preparing a PR. Confirm inherited licensing with maintainers before describing the project as a fully licensed distribution; see [release status](docs/RELEASE-READINESS.md).
