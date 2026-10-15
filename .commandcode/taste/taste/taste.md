# Taste
- When requesting a targeted change, expects it applied surgically: preserve everything not explicitly requested (layout, colors, spacing, components, icons, and brand assets like the logo/wordmark). Explicitly says "change only X" and "do not alter Y". Confidence: 0.75
- Expects changes applied consistently across all screens, apps, and responsive layouts — not just the one screen shown. Confidence: 0.6
- Wants work left uncommitted: explicitly instructs not to commit or push, so the agent should stop at working-tree edits unless asked otherwise. Confidence: 0.7
- After finishing a task, expects a concise report of exactly which files were changed. Confidence: 0.65
- Communicates in Indonesian and expects replies (explanations, summaries, final reports) in Indonesian. Confidence: 0.6
- Standardizes interface typography on Inter with a defined weight hierarchy: headings/status titles Bold (700), body/descriptions Regular (400), labels/navigation Medium (500), numbers/values SemiBold–Bold (600–700). Confidence: 0.6
- Values clean, modern type with consistent letter spacing, comfortable line height, and clear hierarchy. Confidence: 0.55
- Treats the logo/wordmark as an untouchable brand element: keeps its original distinctive lettering and proportions rather than restyling it with the interface font. Confidence: 0.65
- For generated icon/brand assets, prefers deterministic vector geometry (glyph outline extracted and stored as an SVG `<path>`) over `<text>` so rendering does not depend on the font being installed; letterforms should mirror the brand wordmark (e.g. lowercase matching the logo). Confidence: 0.55
