---
name: research-writing
description: Draft, revise, translate, render, or illustrate a paper from finalized research artifacts through the unified research workflow. Use only for writing stages; use the account-provided image generation capability for requested paper figures when available.
---

# Research Writing

Ground every empirical and bibliographic claim in the declared input artifacts. Keep missing evidence explicit; do not invent citations, results, significance, or author metadata. Propagate simulated provenance visibly into the manuscript and metadata.

Treat each request as one immutable writing run. Read only the input artifact IDs declared in the run prompt. Never locate a newer artifact implicitly. Write all outputs into the supplied run temporary directory and produce `result.json` listing each output file, role, media type, simulation flag, and useful metadata. Preserve stable citation keys and make the submission handoff self-contained.

Use these output roles:

- `paper-outline` for an evidence-mapped outline.
- `paper-source` for a manuscript source bundle or structured source file.
- `paper-metadata` for title, abstract, authorship decisions, keywords, venue, and provenance.
- `paper-translation` for translated content; never overwrite the source language artifact.
- `paper-figure` for generated, edited, or uploaded figures.
- `paper-pdf` only after a deterministic renderer actually succeeds.

For a figure request, use the image generation capability supplied by the current Codex account. Prefer the requested `gpt-image-2` target when the tool permits model selection. Do not call an HTTP model endpoint, read an API key, or create a substitute image. Save the returned image as a regular PNG or WebP file under the run temporary directory and declare it as `paper-figure`. Include `figureKey`, caption, prompt purpose, input artifact IDs, generation source, requested model, actual model when reported, size, quality, and tool-call identifier in output metadata. If no image generation tool is available, do not claim success: report the limitation so the workflow can surface `unavailable` or `needs_credentials`.

For translation and text generation, use only the current Codex turn. Do not invoke another language model or translation service. A requested section update must retain an evidence map to the exact input artifact IDs and must not silently replace a newer manuscript version.

Do not call another LLM API, read unrelated projects, submit externally, or overwrite finalized artifacts. Do not place base64 images in manuscript JSON. Request user input for unresolved authorship, venue, claims, or disclosure decisions.
