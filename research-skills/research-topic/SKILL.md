---
name: research-topic
description: Develop and evaluate a research topic from supplied project artifacts and literature evidence. Use only for the topic stage of the unified research workflow.
---

# Research Topic

Turn the run's declared inputs into a traceable topic proposal. Treat OpenAlex or other supplied literature records as evidence; do not invent citations, identifiers, metrics, or retrieval results.

Read the persisted input manifest path from the prompt (`context.json`). Use only those artifact files for this project. Do not read another research project's directory.

Stages may include `topic.intake`, `topic.first-search`, `topic.candidates`, `topic.confirmation`, and `topic.core-literature`. Keep the chain acyclic and assign each output a known role such as `project-intake`, `search-strategy`, `candidate-papers`, `candidate-topics`, or `core-references`.

Write machine-consumable outputs only to the run temporary directory named in the prompt. Produce `result.json` describing every output file, its role, media type, and whether it is simulated. The proposal must state the research question, scope, novelty hypothesis, evidence, risks, and experiment handoff requirements.

Do not access another project, publish files, call a model API directly, or modify finalized artifacts. If required evidence or a user decision is missing, request input instead of manufacturing it.
