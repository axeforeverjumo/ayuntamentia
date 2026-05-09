# Video plenary ingestion design for trends

Date: 2026-05-09  
Area: dashboard / trends / intel / pipeline  
Task type: exploration

## Status

This file is kept as a **documentation alias** for teams that look for design notes under `docs/`.

The canonical repository artifact for this task is:

- `specs/dashboard/video-plens-ingesta-tendencies.md`

## Summary

The design defines the end-to-end flow for adding plenary videos as a new analytical source:

1. video discovery and cataloguing,
2. media capture and audio preparation,
3. automatic transcription,
4. human review and quality control,
5. analytical segmentation and topic extraction,
6. assimilation into trend scoring and intel workflows.

## Closed decisions

- Plenary videos are a **complementary source** to minutes, not a replacement.
- Raw transcripts must not feed trend scoring without QA.
- The video signal should be ingested as a traceable component for trends.
- The same source can enrich intel analysis, but must **not** reintroduce an `intel stream` block into the dashboard.
- Only transcripts meeting minimum coverage, confidence, linkage and traceability thresholds may be used in analysis.

## Reference

For the full Catalan design, repository-specific context, integration details and quality criteria, see:

- `specs/dashboard/video-plens-ingesta-tendencies.md`
