---
name: research-writing
description: Draft, revise, translate, render, or illustrate a paper from finalized research artifacts through the unified research workflow. Use only for writing stages; use the account-provided image generation capability for requested paper figures when available. Whenever a user provides an experiment-plan Markdown file and asks for an algorithm/framework/pipeline figure, use the generate-algorithm-flowchart action defined in references/algorithm-flowchart-generation.md.
---

# Research Writing

Ground every empirical and bibliographic claim in the declared input artifacts. Keep missing evidence explicit; do not invent citations, results, significance, or author metadata. Propagate simulated provenance visibly into the manuscript and metadata.

Treat each request as one immutable writing run. Read only the files listed in the persisted input manifest (`context.json`) and the input artifact IDs declared in the run prompt. Never locate a newer artifact implicitly. Write all outputs into the supplied run temporary directory and produce `result.json` listing each output file, role, media type, simulation flag, and useful metadata. Preserve stable citation keys and make the submission handoff self-contained.

Use these output roles:

- `paper-outline` for an evidence-mapped outline.
- `paper-source` for a manuscript source bundle or structured source file.
- `paper-metadata` for title, abstract, authorship decisions, keywords, venue, and provenance.
- `paper-translation` for translated content; never overwrite the source language artifact.
- `paper-figure` for generated, edited, or uploaded figures.
- `paper-pdf` only after a deterministic renderer actually succeeds.

For a figure request, use the image generation capability supplied by the current Codex account. For algorithm/framework/pipeline figures, first read `references/algorithm-flowchart-generation.md` and perform its evidence extraction and deterministic draft checks before calling the image tool. Prefer `gpt-image-2.5-sunburst` for draft-to-final precision editing when the tool permits model selection; otherwise use the account-provided image tool and record the actual model only when reported. Do not call an HTTP model endpoint, read an API key, or create a substitute image. Save returned images as regular PNG or WebP files under the run temporary directory and declare them as `paper-figure`. Include `figureKey`, caption, prompt purpose, input artifact IDs, reference image IDs, generation source, requested model, actual model when reported, size, quality, topology/spec hash, and tool-call identifier in output metadata. If no image generation tool is available, do not claim success: report the limitation so the workflow can surface `unavailable` or `needs_credentials`.

## Algorithm flowchart action

When the instructions contain `ACTION: generate-algorithm-flowchart`, treat the declared experiment Markdown/artifacts (or the explicitly marked user-provided Markdown context from the legacy editor) as the only scientific source of truth. Produce the structured flowchart specification and prompt first, then a deterministic SVG/PNG draft, then (only after structural validation) use the image generation capability to polish the draft into a CVPR-style paper figure. Preserve topology: never add, remove, rename, reorder, or redirect nodes and edges during visual polishing. Use the style references only for layout and visual language; never copy their research content. Exact labels and formulas must be corrected or overlaid deterministically when image generation renders them inaccurately. If evidence is insufficient, return `needs_input`; if the tool or permission is unavailable, return `unavailable` or `needs_credentials`. Do not describe a generated image as successful until the image and `result.json` pass validation.

For translation and text generation, use only the current Codex turn. Do not invoke another language model or translation service. A requested section update must retain an evidence map to the exact input artifact IDs and must not silently replace a newer manuscript version.

Do not call another LLM API, read unrelated projects, submit externally, or overwrite finalized artifacts. Do not place base64 images in manuscript JSON. Request user input for unresolved authorship, venue, claims, or disclosure decisions.
