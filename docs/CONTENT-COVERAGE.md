# Proposal and report coverage

Reviewed 26 November 2026. The supplied 61-page report is the main source. The supplied three-page proposal takes precedence for the complete team list. Repository review: `65c3466a094697081bb30757875438c28bcdf90b` (24 November 2026).

The website translates relevant information into simple product language. Full extracted source text, including references and academic administration, is retained in `dist/downloads/`. These text copies do not reproduce the PDF illustrations. Use cases, ERDs, DFDs, and class diagrams are excluded from the marketing pages, as required in the website assignment.

## Required website pages

| Requirement | Location |
| --- | --- |
| Home, overview, branding, key features | `index.html` |
| Team, mission, vision, objectives | `about.html` |
| Services and solutions | `services.html` |
| Benefits, capabilities, audience, product focus | `features.html` |
| Mandatory demo | `demo.html`: three interactive walkthroughs, app link, video area |
| Contact, form, LinkedIn | `contact.html`: confirmed email; draft-email form; honest LinkedIn icon placeholder |
| Detailed report coverage | `project-details.html` |
| Future walkthrough video | Home and Demo, with local preview and a configurable published MP4 |

## Proposal

| Source section | Website coverage |
| --- | --- |
| Title, institution, academic year, three team members, supervisor | About |
| Problem statement | Home, About, Solutions |
| Objective 1: records, appointments, documents | Home, Features, Solutions, guided Demo |
| Objective 2: PDF AI chatbot and simple explanations | Home AI section, Features `#ai`, Project details `#ai-evidence` |
| Objective 3: staff and administrator work | Solutions, Features, About objectives |
| Significance for patients, staff, clinics, society | About and Project details `#objectives` |
| Literature review and three supportive references | Project details `#research` |
| Weeks 1–16 plan | Project details `#plan` |
| Authenticity, submission metadata, committee/department fields | Preserved in proposal source text; not product claims |

## Report chapters

| Source | Website coverage |
| --- | --- |
| Abstract and project scope | Home overview; Project details `#scope` |
| Chapter 1 problem, objectives, significance, scope | About; Solutions; Project details `#objectives` |
| Chapter 2 records, portals, mHealth, appointments, reminders, AI, staff coordination, interoperability, security, bilingual accessibility | Project details `#research`; relevant Features explanations |
| Chapter 3 iterative process, risk management, planned work | Project details `#plan`, `#quality`, `#roadmap` |
| Chapter 4 stakeholders and illustrative personas | Solutions and role selector; no invented interviews or personas presented as actual research |
| Chapter 4 functional requirements FR01–FR24 | Feature catalogue and the detailed mapping below |
| Chapter 4 nonfunctional requirements NFR01–NFR14 | Project details `#scope`, `#technology`, `#quality`, `#verification`, `#roadmap` |
| Chapter 5 architecture and storage modes | Project details `#technology` in plain language, without engineering diagrams |
| Chapter 5 workflow and database integrity | Project details workflow accordions and `#verification` |
| Chapter 5 user interface | Real screenshots in Home/Solutions; bilingual/accessibility feature entries |
| Chapter 6 technology inventory | Project details technology table |
| Chapter 6 identity, booking, records, signed notes, rules, documents, billing, reminders | Features, Solutions, Project details workflow accordions |
| Chapter 6 AI/no-show model and evaluation | Project details `#ai-evidence`, exact report metrics with synthetic-data attribution |
| Chapter 6 testing and results, T01–T25 | Project details `#verification`; direct/historical/partial/open evidence distinguished |
| Chapter 6 strengths and weaknesses | Product focus, status labels, scope table, roadmap |
| Chapter 7 findings, limits, implications, future work | Project details `#scope`, `#verification`, `#roadmap` |
| References, acknowledgments, detailed academic models and source material | Complete extracted report text download; key references linked in Project details |

## Functional requirements

| IDs | Coverage |
| --- | --- |
| FR01–02 identity, role routes, accounts | Project details scope/quality/technology; administrator feature |
| FR03–04 history and document import | Patient history and import/review features; record guided demo |
| FR05 linked family subject | Family access feature; patient solution |
| FR06–08 clinician discovery, booking, changes | Appointment feature, booking guided demo, technical workflow |
| FR09 medicines, vitals, invoices, notifications | Health history, messages, everyday tools, invoices features |
| FR10 service/document requests | Medical documents feature, document workflow |
| FR11 bilingual responsive navigation | English/Arabic and screen-size features |
| FR12 staff schedule and charts | Staff solution and daily schedule feature |
| FR13 import acceptance/rejection | Review feature and report guided demo |
| FR14–15 consultation, draft, signing, medicines | Consultation feature, visit guided demo, technical accordion |
| FR16 tasks and flags | Task feature, research flags, task guided demo |
| FR17 nursing, desk, pharmacy work | Five-role section and staff feature |
| FR18 users, roles, departments, settings | Administrator solution and features |
| FR19 billing, audit, requests | Administrator activity feature and payment limitations |
| FR20 immutable issued documents | Document approval feature and issuance accordion |
| FR21 shared-service access | Partial pilot feature, scope table, roadmap |
| FR22 app-closed external notifications | Explicit incomplete-delivery feature and demo FAQ |
| FR23 live clinical recommendations | Explicit disabled/unvalidated status |
| FR24 operational no-show ranking | Research-only feature and synthetic evaluation section |

## Important reconciliation decisions

1. **Three team members:** the two-name repository README is incomplete relative to both supplied PDFs. All three are included. No invented titles, portraits, or LinkedIn profiles.
2. **AI:** preserve the report's disabled clinical-AI status while describing newer optional report-explanation endpoints as configured, unvalidated draft support. Do not claim a connected live service was tested.
3. **Shared mode:** current source supports selected workflows; old README paragraphs are internally stale. Use a bounded partial-pilot description, not “everything syncs.”
4. **Dataset counts:** the report's snapshot counts are included only as historical synthetic data. They are not homepage adoption statistics.
5. **Testing:** report checks are attributed to the report, not presented as tests executed while building this website.
6. **Future work:** telehealth, wearables, hospital interoperability, validated external reminders, and approved clinical AI stay in the roadmap.
7. **Colors/assets:** navy #102D51, blue #246BFD, teal #20BFA9, white; actual logo/screenshots and the user's supplied doctor/AI characters.
8. **Contact:** use only myhealthcare.bh@gmail.com. LinkedIn and custom domain remain honest placeholders. No fake phone number or social profile.
