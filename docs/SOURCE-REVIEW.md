# Source review and provenance

## Primary documents

- Senior Project Proposl - Ali Mohamed Jaafar Mohamed_7584.pdf, 3 pages.
- MyHealthCare_UOB_Academic_Writing_Refined(2).pdf, 61 pages.

All extracted text was read through the document service, retained in the downloads directory, and mapped in CONTENT-COVERAGE.md. PDF images are not part of the text copies. The exact original PDFs were not materialized into this ZIP because the transfer runtime could not run in the current environment.

## GitHub review

Repository: https://github.com/Meftah7/myhealthcare_v2

Latest inspected revision: 65c3466a094697081bb30757875438c28bcdf90b, committed 24 November 2026. The repository tree contained 1,670 entries. This was a read-only source review. A direct Git clone was attempted but failed with a host networking error. No changes were made to the Flutter repository.

Primary files checked in this update:

- README.md: user roles, demo location, technology and release constraints; recognized stale team/count/AI details rather than blindly copying them.
- docs/branding.md: approved lowercase name and original crescent/M logo.
- lib/core/capabilities/capability_registry.dart: disabled live-clinical-ai and no-show-risk capabilities.
- services/report_ai/README.md: optional explanations/chat, grounding, coverage, not-connected behavior, and server-only provider credentials.
- services/shared_api/README.md: supported workflows, authorization boundary, incomplete adapters, desk-record-only payments, and renderer limitations. Older conflicting paragraphs were not treated as current proof.

The report supplies the deeper architecture and workflow review. The website does not claim a fresh exhaustive code audit, current Flutter build, clinical validation, or independent model evaluation.

## Assets

- assets/logo.png: existing official myhealth brand asset from the project.
- assets/home.png, records.png, booking.png: existing real application screenshots from the repository, showing synthetic data.
- assets/doctor.png: user's doctor-red-ghutra-transparent.png, preserved.
- assets/ai-guide.png: user's ai-mascot/myhealth-ai-transparent.png, preserved.
- assets/ai-peek.png: user's ai-mascot/myhealth-chatbot-peek-right.png, preserved.
- assets/staff.png and admin.png: real desktop screenshots from `preview/workforce-doctor-1440-light.png` and `preview/app-admin-1366-en.png` at the inspected GitHub revision. Desktop views were selected for the wide care-team and administrator showcase panels.

No fake testimonials, customer counts, clinical performance claims, or team photos were introduced. The doctor and AI mascot are illustrations, not team portraits.

## Verification

`node check.cjs` validates static page structure, local destinations, fragment anchors, alternative image text, script syntax, standalone asset isolation, and critical content coverage. These are website checks, not Flutter application checks.

Browser automation was attempted with an isolated installed Edge session. The browser did not become available, so screenshot inspection, measured responsive layout, keyboard navigation, and live DOM interactions could not be independently verified. Responsive CSS and accessible native controls are implemented, but do not equate source checks with a completed browser audit.

The Sites source workflow was attempted with the existing project identity. Git source synchronization failed with `getaddrinfo() thread failed to start`; no version was deployed. An expected URL is not a live URL and is not presented as one.
