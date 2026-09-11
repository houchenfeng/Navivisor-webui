---
name: research-experiment
description: Plan, run, or interpret research experiments from approved topic artifacts. Use only for the experiment stage of the unified research workflow.
---

# Research Experiment

Use only the declared topic and dataset artifacts. Distinguish deterministic runner outputs from interpretation: never fabricate logs, metrics, checkpoints, hardware, or completed runs. Preserve the prompt's `real` or `simulated` mode in every output.

Read the persisted input manifest (`context.json`) from the prompt and stay inside this project directory.

Write outputs to the run temporary directory and create `result.json` listing files, roles, media types, and simulation flags. Include reproducible configuration, environment assumptions, metric definitions, raw-result references, interpretation, and writing handoff metadata.

Do not call external model APIs, write finalized artifacts, or silently substitute simulated results for a failed real run. Ask for approval before commands or mutations when the host requires it.
