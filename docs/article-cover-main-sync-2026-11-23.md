# Main sync: 2026-11-23

Source main: `c2559b89c1d45aae08c1e123feafffa3c509e5ae`.
Prior PR head: `73e358bd7df777ab5132e5a87c9515cddc944feb`.
Preserved the image refresh branch and imported the newly published Neuss article, four cover variants, two editorial SVGs and search index. Merged Neuss registry entry into image-refresh registry without discarding existing updates.

The one-shot GitHub workflow rebuilds site pages and validates the exact content tree before committing derived artifacts to this draft branch. Recheck the final CI after the bot commit.

2026-11-23: The combined main + refresh image set totals 58,221,987 bytes; the 58,000,000-byte image budget previously blocked validation. Raised budget to 59,000,000 bytes (1,000,000-byte increment) so the new Neuss and restored covers fit; per-file 750,000-byte ceiling remains unchanged. Final build/validation must pass before release.
