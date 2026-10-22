# LedgerPulse test evidence

This folder mirrors Sayphora's visual-evidence approach: ordered journeys, captions, and aligned side-by-side screenshots embedded directly in GitHub Markdown.

- [End-to-end visual walkthrough](VISUAL-TEST-WALKTHROUGH.md) — screenshots embedded inline with action/assertion captions.
- [Latest CI test report](TEST-REPORT.md) — source commit, CI run, results and explicit limits.
- [Screenshot files and manifest](visuals/) — individual PNGs and metadata; the historical failure is labelled separately and not counted as a pass.
- [Browser/API test suite](../../e2e/ledgerpulse.spec.cjs).
- [GitHub Actions workflow](../../.github/workflows/ledgerpulse-e2e.yml).

Only successful checkpoint screenshots count as passed visuals. The before-fix image documents the reproduced acceptance-modal defect; failure traces and service logs remain in CI artifacts.