---
name: research-topic
description: Develop and evaluate a research topic from supplied project artifacts and literature evidence. Use only for the topic stage of the unified research workflow.
---

# Research Topic

Turn the run's declared inputs into a traceable topic proposal. Treat OpenAlex or other supplied literature records as evidence; do not invent citations, identifiers, metrics, or retrieval results.

Write machine-consumable outputs only to the run temporary directory named in the prompt. Produce `result.json` describing every output file, its role, media type, and whether it is simulated. The proposal must state the research question, scope, novelty hypothesis, evidence, risks, and experiment handoff requirements.

Do not access another project, publish files, call a model API directly, or modify finalized artifacts. If required evidence or a user decision is missing, request input instead of manufacturing it.
