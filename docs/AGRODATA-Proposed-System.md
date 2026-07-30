# AGRODATA: Integrated Agricultural Data Management System — Manuscript Reference

> **Purpose**: A structured reference for revising the AGRODATA capstone manuscript after the stakeholder added **livestock/poultry and fisheries/aquaculture** to the system scope. It supports manuscript drafting, defense preparation, requirements validation, and implementation planning.
>
> **Status convention**: **Implemented** means present in the current repository. **Proposed expansion** means required by the revised manuscript but not yet implemented. This distinction prevents the paper from claiming unfinished functionality.

---

## 0. Document Identity

| Field | Value |
|---|---|
| Proposed revised title | **AGRODATA: An Integrated Agricultural Data Management System for Crops, Livestock, and Fisheries** |
| Original title | “AGRODATA: An Agricultural Data Management System in Agricultural Offices” |
| Type | Undergraduate Capstone Project |
| Degree / Institution | BS Information Technology, College of Information Technology, Liceo de Cagayan University |
| Authors | Lacang-lacang; Villasis |
| Research site | Office of the Municipal Agriculturalist (OMA), LGU Kinoguitan, Misamis Oriental |
| Beneficiaries | OMA, LGU Kinoguitan, Provincial Agriculture Office, agricultural producers, livestock/poultry raisers, and fisherfolk |
| Methodology | Developmental and applied research using Agile software development |
| Revision status | Crops, livestock/poultry, and fisheries/aquaculture are all implemented; report fields and forms still require stakeholder validation |

> The revised title should be approved by the adviser and stakeholder before it replaces the official title page.

---

## 1. One-Paragraph Summary

AGRODATA is a web-based municipal agricultural data platform that replaces paper records with a centralized PostgreSQL database covering three production domains: **crops**, **livestock and poultry**, and **fisheries and aquaculture**. OMA Staff maintain a unified agricultural-producer profile and encode land, crop planting and harvest, animal inventory and production, fisherfolk activity, fish catch, and aquaculture records. The Municipal Agriculturalist reviews descriptive dashboards and generates crop, livestock, fisheries, and consolidated municipal reports through authenticated Supabase Edge Functions. Validation, duplicate prevention, role-based access, audit logging, and backup/recovery protect data quality and accountability. All three domains are implemented in the current React, TypeScript, Vite, Supabase, and PostgreSQL application (see [Section 4](#4-implementation-status-this-repository)); what remains outstanding is validation of report fields and forms with the OMA and receiving offices, not the software itself.

---

## 2. Chapter 1 — The Problem and Its Scope

### 2.1 Revised Introduction (key points)

- OMA agricultural responsibility is broader than crop production. The revised system must organize municipal information on crop growers, livestock/poultry raisers, fisherfolk, aquaculture operators, production sites, inventories, and production outputs.
- Philippine statistical systems support this three-domain treatment. The PSA’s [Philippine Food Security Information System (PhilFSIS)](https://openstat.psa.gov.ph/Featured/philfsis) groups covered commodities into **crops**, **livestock and poultry**, and **fisheries**.
- The PSA’s [Agriculture, Forestry and Fisheries database](https://openstat.psa.gov.ph/Database/Agriculture-Forestry-Fisheries) publishes crop, animal inventory/production, and fisheries data, supporting a harmonized but sector-specific local data design.
- A single producer may participate in more than one sector. AGRODATA should therefore use one identity/profile and attach one or more sector activities rather than create unrelated duplicate profiles.
- The original four problems remain: no centralized data bank, slow/error-prone reporting, difficult retrieval, and weak validation. The stakeholder expansion adds a fifth problem: **livestock and fisheries records cannot be represented by crop-only tables, forms, reports, and analytics**.
- The system remains descriptive and administrative. It records verified activities and production; it does not diagnose animal/fish disease, forecast production, manage commercial accounting, or replace DA, PSA, BFAR, or provincial systems.

### 2.2 Revised Conceptual Framework (IPO)

| Input | Process | Output |
|---|---|---|
| User credentials; producer and sector enrollment; farms/plots; crop planting and harvest; animal species, inventory, births/hatches, deaths, slaughter/disposition and products; fisherfolk activity, fishing area, gear/vessel references, catch by species; aquaculture sites, stocking cycles and harvests; official report parameters; backup files | Authentication and role checks; cross-sector profile matching; validated CRUD; duplicate and range checks; server-side report aggregation; descriptive SQL statistics; dashboards; audit logging; backup/restore | Unified agricultural producer registry; crop, livestock/poultry, fisheries and aquaculture records; searchable histories; sector and consolidated compliance reports; descriptive dashboards and trends; audit records; recovery files |

### 2.3 Revised Statement of the Problem

The paper-based process prevents the OMA from maintaining complete, consistent, and rapidly retrievable information across crops, livestock/poultry, and fisheries/aquaculture. A crop-only digital system would improve crop management but would not satisfy the stakeholder’s expanded requirement for municipality-wide agricultural monitoring.

**Revised research questions:**

1. How can an integrated agricultural registry be developed in terms of: (1.1) unified producer profiling, (1.2) farm/production-site records, and (1.3) assignment of crop, livestock/poultry, fisheries, and aquaculture activities?
2. How can production records be managed in terms of: (2.1) crop planting and harvest, (2.2) livestock/poultry inventory, events, and products, and (2.3) fish catch and aquaculture stocking/harvest?
3. How can validation and consistency checks detect errors, prevent duplicate producer and production records, enforce valid dates/quantities/units, and preserve cross-sector referential integrity?
4. How can the Municipal Agriculturalist generate stakeholder-approved crop, livestock/poultry, fisheries/aquaculture, and consolidated municipal reports through server-side database functions?
5. How can descriptive analytics provide totals, counts, rates, distributions, barangay comparisons, and historical production trends for all three sectors without predictive analytics or machine learning?

### 2.4 Revised Objectives

**General objective**: Develop an integrated agricultural data management system for the OMA of LGU Kinoguitan that centralizes crop, livestock/poultry, and fisheries/aquaculture records and improves validation, reporting, analytics, and evidence-based municipal planning.

**Specific objectives:**

1. Develop a unified producer registry supporting one or more agricultural sectors per person or household.
2. Maintain crop planting/harvest, livestock and poultry inventory/production, municipal fish catch, and aquaculture production records.
3. Implement sector-appropriate validation, duplicate detection, reference data, units, and consistency rules.
4. Generate crop, livestock/poultry, fisheries/aquaculture, and annual consolidated reports through Supabase Edge Functions using stakeholder-approved formats.
5. Present descriptive statistical summaries, charts, barangay comparisons, and historical trends across all sectors.
6. Apply authentication, role-based authorization, audit logging, and backup/recovery to the expanded data set.

### 2.5 Revised Significance of the Study

- **Municipal Agriculturalist and OMA Staff** — one operational view of crop, animal, and fisheries production; less duplicate encoding; faster retrieval and reporting.
- **Crop farmers, livestock/poultry raisers, and fisherfolk** — better identification of sector participation and more evidence-based targeting of local programs and interventions.
- **LGU Kinoguitan** — municipality-wide descriptive indicators for food production, resource planning, and program allocation.
- **Provincial Agriculture Office and partner agencies** — more consistent local summaries, subject to agreement on official report fields and formats.
- **Future researchers** — a reference for integrated local agricultural information systems rather than crop-only record systems.

### 2.6 Revised Output of the Study

The proposed output is a secure, web-based integrated AGRODATA platform with:

- a unified producer profile and multi-sector enrollment;
- crop, livestock/poultry, fisheries, and aquaculture record modules;
- validated reference lists for commodities, species, production systems, events, and units;
- server-generated sector reports and a consolidated annual municipal agriculture summary;
- descriptive sector dashboards and historical trends;
- user administration, audit logs, and backup/recovery.

**Current implementation status**: implemented. Crop/farm/planting/harvest, livestock/poultry, fisherfolk and fish catch, aquaculture sites and cycles, cross-sector analytics and stored statistics, six reports, users, audit, and backup all exist in the database and UI. Remaining work is stakeholder validation of official report fields and forms, plus the optional items listed in [Section 4.5](#45-deferred--not-yet-implemented).

### 2.7 Revised Scope and Delimitation

- **Site and users**: OMA of LGU Kinoguitan; authorized OMA Staff and Municipal Agriculturalist only. Producers and fisherfolk do not directly operate the system.
- **Crop scope**: producer/farm/plot records, crop catalog, planting cycles, harvest inventory, crop reports, and descriptive trends.
- **Livestock/poultry scope**: species and production-purpose reference data; holding/site; periodic inventory by classification; births/hatches, deaths, sale/transfer/slaughter/disposition events; meat/liveweight, milk, egg, or other stakeholder-approved production quantities.
- **Fisheries scope**: fisherfolk activity profile; municipal fisheries classification (marine/inland); catch records by date, species, barangay/area, quantity, unit, and optional gear/vessel reference.
- **Aquaculture scope**: pond/cage/tank or stakeholder-approved site type; water environment; species; stocking date/quantity; culture cycle status; harvest date/quantity.
- **Reporting scope**: final names, fields, units, frequency, and signatories must be validated using actual OMA, Provincial Agriculture Office, PSA, BAI, and BFAR forms. Research-derived templates are design baselines, not claims of official compliance.
- **Analytics scope**: descriptive totals, counts, percentages, averages, rates, distributions, comparisons, and historical trends only.
- **Excluded**: forecasting/ML; veterinary diagnosis; laboratory and biosecurity case management; animal individual-tag traceability unless requested; vessel licensing; enforcement; GPS vessel tracking; market/accounting; public portal; mobile app; automatic synchronization with national systems.
- **Dependencies**: reliable connectivity, trained encoders, current species/commodity references, stakeholder-approved forms, and accurate source records.

### 2.8 Revised Definition of Terms

| Term | Operational definition in AGRODATA |
|---|---|
| Agricultural Producer | A person or household engaged in one or more of crop farming, livestock/poultry raising, capture fishing, or aquaculture. |
| Unified Producer Profile | One identity record linked to multiple sector enrollments, preventing separate duplicate profiles for a farmer who is also a raiser or fisherfolk. |
| Livestock | Domesticated farm animals such as carabao, cattle, swine, and goats, subject to stakeholder-approved species lists. |
| Poultry | Domesticated birds such as chicken and duck maintained for meat, eggs, breeding, or other production purposes. |
| Animal Inventory | Number of animals recorded on a reference date, classified by species and stakeholder-required age/sex/purpose class. |
| Animal Event | A dated change in a holding, such as birth/hatch, death, sale, transfer, slaughter, or other approved disposition. |
| Animal Production Record | A dated quantity of livestock/poultry output such as liveweight, meat, milk, or eggs, recorded with a standard unit. |
| Fisherfolk Profile | Sector-specific information attached to a producer profile describing participation in municipal fishing or aquaculture. |
| Municipal Fisheries | Fishing conducted within the municipal fisheries context; records distinguish marine and inland activity where applicable. |
| Fish Catch Record | A dated record of species caught, fisheries subsector/area, quantity, and unit, with optional gear or vessel reference. |
| Aquaculture | Farming of aquatic organisms through managed stocking/rearing in ponds, cages, tanks, or other culture facilities. |
| Aquaculture Cycle | A managed period from stocking to harvest for a species at an aquaculture site. |
| Integrated Agricultural Report | A report combining crop, livestock/poultry, and fisheries/aquaculture indicators for a defined municipality and period. |
| Descriptive Analytics | Statistical summaries of recorded facts; it does not predict future output. |

---

## 3. Chapter 2 — Revised Review of Related Literature and Systems

### 3.1 Integrated Crop–Livestock–Fisheries Information Coverage

The PSA [PhilFSIS](https://openstat.psa.gov.ph/Featured/philfsis) is the strongest Philippine precedent for organizing food-security information under crops, livestock/poultry, and fisheries. The PSA [Agriculture, Forestry and Fisheries database](https://openstat.psa.gov.ph/Database/Agriculture-Forestry-Fisheries) likewise publishes cross-sector statistics. These systems justify AGRODATA’s shift from a crop-only inventory to a common municipal platform with sector-specific records. The DA’s [Farmers Information Management System for RSBSA](https://fims-rsbsa.da.gov.ph/) and farmers/fisherfolk registry context support using a common identity layer rather than disconnected sector lists.

### 3.2 Livestock and Poultry Information Requirements

The PSA [technical notes for livestock and poultry statistics](https://psa.gov.ph/content/technical-notes-livestock-and-poultry-statistics-philippines-2021-2025) identify core measures including production volume, inventory by classification, slaughtered/dressed animals, and farmgate prices. PSA survey documentation also covers births/hatches, deaths, and slaughter/disposition. For AGRODATA, the defensible minimum is periodic inventory plus dated inflow/outflow/production events. Prices are optional because the stakeholder requested production management, not market accounting.

**Proposed livestock data groups:** holder/site, species, animal classification, inventory date/head count, births/hatches, deaths, sale/transfer/slaughter/disposition, product type, quantity, unit, remarks, source document, and encoder/timestamp.

### 3.3 Fisheries and Aquaculture Information Requirements

PSA fisheries reporting distinguishes **commercial fisheries, municipal fisheries, and aquaculture**, while municipal fisheries may be divided into **marine and inland** components, as demonstrated in the PSA [Fisheries Situationer](https://rsso01.psa.gov.ph/content/fisheries-situationer-la-union-2025). AGRODATA should not store all fisheries production in one undifferentiated table. Capture-fisheries records need catch date, species, fishing classification/area, quantity, and unit; aquaculture needs a managed site and stocking-to-harvest cycle.

FAO defines aquaculture around managed intervention in rearing and ownership of cultivated stock and documents [integration of fish with crop and livestock farming](https://www.fao.org/3/x7156e/x7156e02.htm). FAO also describes regular pond monitoring and recordkeeping as the basis for feed, fertilization, and harvest decisions in [freshwater fish-culture management](https://www.fao.org/fishery/static/FAO_Training/FAO_Training/General/x6709e/x6709e16.htm). These sources support separate capture-fisheries and aquaculture workflows.

### 3.4 Philippine Fisheries Development Context

The DA-BFAR [FishCoRe project](https://fishcore.bfar.da.gov.ph/) emphasizes climate-resilient fisheries and aquaculture investment, reduced postharvest losses, expanded aquaculture production, and value addition. AGRODATA will not reproduce FishCoRe, but local species/subsector production records can improve the evidence base for identifying communities and activities relevant to such programs.

### 3.5 Data Validation, Reporting, and Analytics

Cross-sector expansion increases validation needs: one person can have several activities; animal inventory cannot be negative; event counts must not silently exceed available inventory; aquaculture harvest cannot precede stocking; catch and production must have a known species and unit; and all records need an accountable encoder. Reports should be generated server-side from validated records and show their period, generation time, filters, and signatories. Analytics remain descriptive.

### 3.6 Revised Synthesis

The reviewed systems do not imply that crop, livestock, and fisheries use identical data. They support a **shared producer/identity layer and shared governance controls**, with separate sector transaction models. This is the recommended AGRODATA architecture: common profiles, users, locations, units, audit and reports; specialized crop, animal, capture-fisheries, and aquaculture records.

> **Licensing note**: Online-source content in Sections 2–3 was rephrased for compliance with licensing restrictions. Links identify the original sources; no extended source text is reproduced.

---

## 4. Chapter 3 — Revised Methods and Materials

### 4.1 Research Design

The study retains a **developmental and applied research design**. Because livestock and fisheries were added after the original crop-centered design, the revision requires a new requirements-validation cycle before implementation. The additional modules must be based on the OMA’s actual forms, reporting schedules, responsible personnel, terminology, and approval process rather than assumptions from online sources alone.

### 4.2 Revised Agile Development Plan

| Sprint group | Deliverable |
|---|---|
| 1 — Discovery and validation | Interview the Municipal Agriculturalist and sector focal persons; collect livestock, poultry, fisherfolk, catch, aquaculture, and provincial report forms; agree on units, species, classifications, and report frequency. |
| 2 — Shared producer foundation | Decide whether to migrate `farmers` to `producers` or retain it as a legacy identity table; add multi-sector enrollment and cross-sector duplicate checks. |
| 3 — Livestock/poultry | Species/reference data, holdings, inventory snapshots, animal events, production records, validation, CRUD pages, and audit actions. |
| 4 — Fisheries/aquaculture | Fisherfolk activity, fishing areas, species, catch records, aquaculture sites/cycles/harvests, validation, CRUD pages, and audit actions. |
| 5 — Reports and analytics | Edge Functions for livestock, fisheries, and consolidated reports; sector KPIs, charts, filters, and historical descriptive trends. |
| 6 — Security and quality | RLS review, backup version update, migration tests, ISO/IEC 25010 evaluation, user acceptance testing, and documentation revision. |

### 4.3 Research Setting and Participants

The setting remains the OMA of LGU Kinoguitan. The revised requirements process should include the Municipal Agriculturalist, crop-record encoders, the personnel responsible for livestock/poultry records, and the personnel responsible for fisherfolk/fisheries/aquaculture records. If one staff member performs several functions, the study should document that actual workflow instead of inventing extra system roles.

### 4.4 Revised Research Instruments

1. **Semi-structured interview guide** expanded with livestock and fisheries questions.
2. **Document-analysis checklist** for current livestock inventory, animal production, fisherfolk registration, fish catch, aquaculture, and provincial submission forms.
3. **Data-field validation matrix** recording field name, definition, source, allowed values, unit, frequency, responsible encoder, approver, and report destination.
4. **ISO/IEC 25010 evaluation questionnaire** covering the completed expanded system.
5. **User acceptance scenarios** for crop, livestock, fisheries, cross-sector search, reports, and access control.

### 4.5 Required Data-Gathering Questions Before Coding

- Which animal species and poultry types does the OMA monitor?
- Is inventory recorded per farm, household, barangay, species, classification, or individual animal?
- Which animal movements/events are required: birth/hatch, purchase, sale, transfer, death, slaughter, dressing, or vaccination?
- Which animal products and units are required: heads, kilograms liveweight, kilograms dressed weight, liters of milk, trays/pieces of eggs?
- Does the OMA maintain a fisherfolk registry, and which fields come from FishR/RSBSA or local forms?
- Are local fisheries records capture-based, aquaculture-based, or both?
- Which fisheries classifications are used locally: marine municipal, inland municipal, commercial, aquaculture?
- Are vessel and gear details required for reporting, or only for reference?
- Which fish/aquatic species, landing areas, aquaculture site types, seasons, and units are used?
- What official report names, columns, schedules, filters, signatories, and recipients are required?
- Who may create, edit, approve, archive, export, and restore each sector’s data?

### 4.6 Revised Current-System Flow

Field and producer information for crops, livestock, and fisheries is collected through paper forms, logbooks, spreadsheets, or separate office records → OMA staff encode or manually summarize records by sector → staff reconcile names, locations, species, quantities, and periods → reports are compiled for local/provincial use → physical/digital copies are archived separately. The revised study must confirm this flow through interviews; it should not state that every sector uses the same paper process unless observed.

### 4.7 Revised Proposed-System Flow

1. An authorized OMA user signs in.
2. Staff searches for an existing producer before creating a profile.
3. Staff assigns one or more sector activities: crop, livestock/poultry, capture fisheries, aquaculture.
4. Staff records the appropriate production site and sector transaction:
   - crop: farm/plot → planting → harvest;
   - livestock/poultry: holding → inventory/event/product;
   - capture fisheries: fisherfolk activity → catch record;
   - aquaculture: site → stocking cycle → harvest.
5. The system validates required references, dates, quantities, units, duplicates, and parent-child relationships.
6. Records are stored in PostgreSQL and actions are written to the audit log.
7. The Municipal Agriculturalist filters and reviews sector data.
8. A Supabase Edge Function queries and aggregates the requested report.
9. The frontend previews and exports the report to PDF, Excel, or CSV.
10. Dashboards display descriptive indicators and historical recorded trends only.

### 4.8 Revised Three-Tier Architecture

| Tier | Revised responsibility |
|---|---|
| **Presentation** | Existing React/TypeScript SPA plus proposed Producer Sectors, Livestock/Poultry, Fisheries, Aquaculture, and expanded Reports/Analytics pages. Shared page components remain role-aware; separate duplicate admin/staff pages are unnecessary. |
| **Application/API** | Supabase REST for validated CRUD; Edge Functions for crop/livestock/fisheries/consolidated reporting and statistical computation; TanStack Query for caching; TypeScript feature modules for domain access. |
| **Data** | PostgreSQL with RLS, foreign keys, checks, indexes, reference data, audit logs, backup functions, and sector-specific normalized tables. |

**Server-side boundary**: record CRUD may use Supabase REST under RLS. Official report aggregation and persisted statistical-summary recomputation should run in Edge Functions. PDF/Excel/CSV packaging may remain in the browser after the server returns verified report data.

### 4.9 Revised Conceptual ERD

```text
Auth User ── App User ── User Role
                    │
                    └── Audit Log

Producer ──< Producer Sector >── Sector Type
   │
   ├──< Farm ──< Farm Plot ──< Planting Record ──< Harvest Inventory
   │                                  └── Crop
   │
   ├──< Livestock Holding ──< Livestock Inventory Record
   │             │          ├──< Livestock Event
   │             │          └──< Livestock Production Record
   │             └── Animal Species
   │
   ├── Fisherfolk Detail ──< Fish Catch Record >── Aquatic Species
   │                              └── Fishing Area / Activity
   │
   └──< Aquaculture Site ──< Aquaculture Cycle ──< Aquaculture Harvest
                                      └── Aquatic Species
```

Shared `producer`, location, unit, sector, audit, and user references prevent duplication; crop, animal, capture-fisheries, and aquaculture tables preserve each domain’s distinct workflow.

### 4.10 Database Structure — Current and Proposed

#### A. Current implemented tables

| Table | Status | Purpose |
|---|---|---|
| `user_roles`, `users` | Implemented | Authentication-linked profiles and roles |
| `farmers` | Implemented | Current crop-centered producer profile |
| `farms`, `farm_plots` | Implemented | Land and plot records |
| `crops` | Implemented | Crop reference catalog |
| `planting_records`, `harvest_inventory` | Implemented | Crop production cycle and harvest |
| `yield_statistics` | Implemented | Crop summary records by period |
| `audit_logs` | Implemented | Accountability and traceability |

#### B. Proposed shared-schema changes

| Proposed table/change | Key fields and purpose |
|---|---|
| `producers` or semantic migration of `farmers` | Common identity: producer ID, names, sex, birthdate, contact, address, barangay, registration date/status. Preferred manuscript term is **producer** because not every fisherfolk is a crop farmer. |
| `sector_types` | Controlled values: CROP, LIVESTOCK_POULTRY, CAPTURE_FISHERIES, AQUACULTURE. |
| `producer_sectors` | Many-to-many link between producer and sector; enrollment/reference number, start date, status, source. Unique `(producer_id, sector_type)` prevents duplicate enrollment. |
| `measurement_units` | Controlled units and dimension (HEAD, PIECE, KG, MT, LITER, TRAY, HECTARE, etc.); prevents inconsistent free-text units. |
| `barangays` / location references | Standardized municipality/barangay codes instead of spelling variants. |

#### C. Proposed livestock/poultry tables

| Table | Minimum fields / constraints |
|---|---|
| `animal_species` | `species_id`, common name, category (LIVESTOCK/POULTRY), active flag; unique normalized name. |
| `livestock_holdings` | `holding_id`, producer, farm/location, species, production purpose, management/farm type, status. |
| `livestock_inventory_records` | holding, inventory date, classification, head count, source; unique holding/classification/date; count ≥ 0. |
| `livestock_events` | holding, event date, event type (BIRTH_HATCH, PURCHASE, SALE, TRANSFER_IN/OUT, DEATH, SLAUGHTER/DRESSED, OTHER), count, remarks; count > 0. |
| `livestock_production_records` | holding, date/period, product type, quantity, unit, remarks; quantity ≥ 0; compatible unit required. |

A later stakeholder decision may add individual animal tags or health/treatment records. These should not be included by default because the revised scope is municipal production monitoring, not a veterinary clinical system.

#### D. Proposed fisheries/aquaculture tables

| Table | Minimum fields / constraints |
|---|---|
| `fisherfolk_details` | producer, registration/reference number if used, involvement type, years active, organization, status. One-to-one or one-to-many as validated. |
| `aquatic_species` | species ID, common/local/scientific name where available, category, active flag; unique normalized reference. |
| `fishing_areas` | area name, barangay, classification (MARINE_MUNICIPAL, INLAND_MUNICIPAL, COMMERCIAL if in scope), optional notes. |
| `fishing_activities` | producer, fishing classification, involvement, optional gear/vessel reference, start/status. |
| `fish_catch_records` | activity, species, catch/landing date, area, quantity, unit, landing barangay, source; quantity > 0. |
| `aquaculture_sites` | producer, site name/type (pond/cage/tank/etc.), barangay, area/capacity, water environment, status. |
| `aquaculture_cycles` | site, species, stocking date, stocking quantity/unit, expected/actual end date, status; end date cannot precede stocking. |
| `aquaculture_harvests` | cycle, harvest date, quantity, unit; quantity > 0 and harvest date ≥ stocking date. |

#### E. Proposed derived statistics and reporting

Do not create one generic transaction table for all sectors. Use sector tables as sources and expose consistent report responses through Edge Functions. If persisted summaries are required, use separate or typed summary tables such as `livestock_statistics` and `fisheries_statistics`, or a carefully constrained `sector_statistics` table with a JSON breakdown. Raw transactions remain the source of truth.

### 4.11 Core Validation and Consistency Rules

1. Normalize names for duplicate matching, but retain display spelling.
2. Flag possible duplicate producers using name + birthdate + barangay; allow authorized review rather than silent duplicate creation.
3. Require at least one active `producer_sector` before encoding a sector record.
4. Use reference tables for species, classifications, event types, and units; do not rely on arbitrary text.
5. Quantities and counts cannot be negative; event and production quantities must be greater than zero where applicable.
6. Validate chronology: planting before harvest, inventory/event date within valid record period, stocking before aquaculture harvest.
7. Prevent duplicate reports/transactions based on stakeholder-defined natural keys (producer/site/species/date/source reference).
8. Track created/updated timestamps and responsible user for all new sector tables.
9. Prefer archive/status changes over destructive deletion of submitted production records.
10. Apply RLS to every new table before deployment and update backup/restore allowlists and schema-version validation.

### 4.12 Revised Reports

The following are **proposed report templates**. Exact titles and columns require documentary confirmation from the OMA and receiving agencies.

| Domain | Proposed report | Suggested aggregation |
|---|---|---|
| Crops | Quarterly Crop Production Report | Barangay + crop + quarter: area planted, harvested quantity, average yield/ha |
| Crops | Seasonal Farm Inventory Report | Farm/plot, land characteristics, planting activities by season |
| Livestock/Poultry | Quarterly Livestock and Poultry Inventory | Barangay + species + classification: opening/current head count and period |
| Livestock/Poultry | Livestock/Poultry Production and Disposition Summary | Species + period: births/hatches, deaths, sales/transfers, slaughter/dressed, product quantity |
| Fisheries | Municipal Fisheries Production Report | Barangay/area + marine/inland + species + period: catch quantity |
| Aquaculture | Aquaculture Stocking and Harvest Summary | Site type + species + period: stocked quantity, harvested quantity, active cycles |
| Consolidated | Annual Municipal Agriculture, Livestock and Fisheries Summary | Annual crop area/yield, animal inventory/production, fisheries catch, aquaculture output, and producer counts |
| Registry | Agricultural Producers Registry | Producer identity, barangay, active sectors, registration status; sensitive fields omitted from public/external exports |

Every report response should include report type/version, reporting period, applied filters, generation timestamp, data-as-of timestamp, rows, totals, unit labels, and signatory slots. Edge Functions must validate the caller and report parameters before querying.

### 4.13 Revised Descriptive Analytics

**Cross-sector KPIs**: unique producers; producers by sector; barangay distribution; multi-sector producer count; records updated in selected period.

**Crop indicators**: area planted, harvested quantity, yield/ha, crop distribution, barangay and historical trends.

**Livestock/poultry indicators**: inventory by species/classification/barangay; births/hatches; deaths; slaughter/disposition; product volume; descriptive mortality percentage where inputs are complete and definition is disclosed.

**Fisheries indicators**: catch volume by species, barangay/area, marine/inland classification and period; top recorded species; historical catch trend.

**Aquaculture indicators**: active sites/cycles, stocked quantity, harvest volume by species/site type/barangay, completed-cycle descriptive yield where compatible area/capacity and unit data exist.

No predictive alerts, harvest forecasts, disease predictions, or machine-learning recommendations are included.

### 4.14 Revised Use Cases

#### OMA Staff / Encoder

| Use case | Main outcome |
|---|---|
| Search/Register Producer | Reuse an existing identity or create a validated producer profile; assign one or more sectors. |
| Manage Crop Records | Maintain farms, plots, crops, planting, and harvest records. |
| Manage Livestock/Poultry Holding | Link producer, site, species, purpose, and status. |
| Record Animal Inventory | Encode dated head counts by approved classification. |
| Record Animal Event/Production | Encode birth/hatch, death, sale/transfer/slaughter/disposition, and product quantities. |
| Manage Fisherfolk Activity | Record local registration/activity, fisheries classification, area, and optional gear/vessel reference. |
| Record Fish Catch | Encode species, date, area/subsector, quantity, unit, and landing barangay. |
| Manage Aquaculture Cycle | Register site, stocking, status, and harvest. |
| Search/Filter/View/Update | Retrieve records across sectors using producer, barangay, species/commodity, sector, and date filters. |
| View Descriptive Dashboard | View permitted sector summaries; no report approval or administration. |

#### Municipal Agriculturalist / Administrator

| Use case | Main outcome |
|---|---|
| Review Sector Records | Search, inspect, and validate crop, livestock, fisheries, and aquaculture records. |
| Generate Sector Report | Select report, period, sector, species/commodity, barangay, and format; invoke Edge Function; preview/export. |
| Generate Consolidated Annual Report | Compile the municipality’s three production domains into one descriptive summary. |
| Manage Reference Data | Activate/deactivate approved species, classifications, event types, units, site types, and report versions. |
| Manage Users | Create accounts, assign roles, activate/deactivate access. |
| Review Audit Logs | Filter user and sector actions and export audit information. |
| Backup and Restore | Create a schema-versioned backup and restore only after integrity and compatibility checks. |

#### Shared security use cases

Login, password reset, session expiration, logout, unauthorized-route handling, and audit recording remain shared. Staff and administrator use the same reusable pages where capabilities overlap; role guards hide or disable administrator actions. Separate copies of every page are unnecessary.

### 4.15 Revised Sequence/Activity Diagrams Required

The paper’s diagrams should be redrawn to include:

1. OMA Staff — Search/register producer and assign sectors.
2. OMA Staff — Record livestock inventory and animal event.
3. OMA Staff — Record municipal fish catch.
4. OMA Staff — Create aquaculture cycle and harvest.
5. Municipal Agriculturalist — Generate sector report through Edge Function.
6. Municipal Agriculturalist — Generate consolidated annual report.
7. Administrator — Manage reference data.
8. System — Validate duplicate producer and sector transaction.

---

## 5. Revised GUI and Navigation Plan

### 5.1 Current implemented routes

`/`, `/analytics`, `/farmers`, `/farms`, `/plots`, `/crops`, `/planting`, `/harvest`, `/reports`, `/users`, `/backup`, `/audit-logs`, `/login`, `/reset-password`.

### 5.2 Proposed route expansion

| Navigation section | Screen / route | Staff | Municipal Agriculturalist | Status |
|---|---|---:|---:|---|
| Overview | Integrated Dashboard `/` | View | View | Existing page must be expanded |
| Overview | Analytics `/analytics` | View | View/recompute approved summaries | Crop implemented; other sectors proposed |
| Registry | Producers `/producers` | CRUD | Review/CRUD | Proposed migration from `/farmers` |
| Crop Records | Farms, Plots, Crops, Planting, Harvest | CRUD | Review/CRUD | Implemented |
| Livestock | Holdings `/livestock/holdings` | CRUD | Review/CRUD | Proposed |
| Livestock | Inventory `/livestock/inventory` | CRUD | Review/CRUD | Proposed |
| Livestock | Events & Production `/livestock/records` | CRUD | Review/CRUD | Proposed |
| Fisheries | Fisherfolk Activities `/fisheries/fisherfolk` | CRUD | Review/CRUD | Proposed |
| Fisheries | Catch Records `/fisheries/catches` | CRUD | Review/CRUD | Proposed |
| Fisheries | Aquaculture `/fisheries/aquaculture` | CRUD | Review/CRUD | Proposed |
| Office | Reports `/reports` | No | Generate/export | Crop reports implemented; expansion proposed |
| Administration | Reference Data `/reference-data` | View | Manage | Proposed |
| Administration | Users, Backup, Audit | No | Manage | Implemented |

Recommended UX: keep a single sidebar but group records under **Producer Registry**, **Crops**, **Livestock & Poultry**, **Fisheries & Aquaculture**, and **Office**. Show sector badges on producer profiles and provide a producer-detail view with tabs rather than duplicating identity data on each sector page.

---

## 6. Revised Actors and Permissions

| Actor | Revised responsibility |
|---|---|
| **OMA Staff / Encoder** | Encode and maintain validated producer and sector records; search/filter; view permitted descriptive dashboards. |
| **Municipal Agriculturalist / Admin** | Oversight, report generation, reference-data governance, user administration, audit review, backup/restore. |
| **Crop Farmer / Livestock Raiser / Fisherfolk / Aquaculture Operator** | Data subject and indirect beneficiary; no direct login in the defined scope. A person may belong to several categories. |
| **Provincial/partner agency** | Report recipient, not a direct system user unless the scope is formally changed. |

The system needs capability differences, not separate duplicate staff/admin pages. The current role approach remains appropriate, but every proposed table and action must be covered by both frontend guards and RLS policies.

---

## 7. Technology and Deployment

| Layer | Technology / revised use |
|---|---|
| Frontend | React 18, TypeScript, Vite, React Router, Tailwind, shadcn/ui |
| Server state | TanStack Query |
| Validation | HTML constraints plus proposed Zod schemas and database checks |
| Charts | Recharts; descriptive charts only |
| Backend | Supabase Auth, REST, PostgreSQL, RLS, Storage if approved documents are added |
| Edge Functions | Existing `generate-report` and `compute-statistics` must be extended or versioned for livestock/fisheries; server validates JWT and parameters |
| Export | PDF, Excel-compatible file, CSV; template version and units included |
| Deployment | Vercel frontend + Supabase Cloud; Edge Functions deployed separately |
| Security | Auth, active-profile requirement, least privilege, RLS on every table, audit logs, schema-versioned backup/restore |

---

## 8. Research Sources Added for the Revision

1. Philippine Statistics Authority. [Philippine Food Security Information System (PhilFSIS)](https://openstat.psa.gov.ph/Featured/philfsis). Official precedent for crops, livestock/poultry, and fisheries commodity coverage.
2. Philippine Statistics Authority. [Agriculture, Forestry and Fisheries database](https://openstat.psa.gov.ph/Database/Agriculture-Forestry-Fisheries). Official cross-sector statistical database and commodity indicators.
3. Philippine Statistics Authority. [Technical Notes for the Livestock and Poultry Statistics of the Philippines, 2021–2025](https://psa.gov.ph/content/technical-notes-livestock-and-poultry-statistics-philippines-2021-2025). Defines major livestock/poultry statistical measures.
4. Philippine Statistics Authority. [Livestock and Poultry Quarterly Bulletin, April–June 2024](https://psa.gov.ph/content/livestock-and-poultry-quarterly-bulletin-april-june-2024). Demonstrates quarterly production, inventory classification, and price reporting.
5. Philippine Statistics Authority RSSO I. [Fisheries Situationer: La Union 2025](https://rsso01.psa.gov.ph/content/fisheries-situationer-la-union-2025). Demonstrates municipal marine/inland production classification.
6. Department of Agriculture. [Farmers Information Management System — RSBSA](https://fims-rsbsa.da.gov.ph/). Philippine producer-registry system context.
7. Bureau of Fisheries and Aquatic Resources. [Philippine Fisheries and Coastal Resiliency Project (FishCoRe)](https://fishcore.bfar.da.gov.ph/). Fisheries/aquaculture development and resilience context.
8. Food and Agriculture Organization. [Integrating Fish with Crop and Livestock Farming](https://www.fao.org/3/x7156e/x7156e02.htm). Basis for distinguishing and integrating agricultural/aquaculture activities.
9. Food and Agriculture Organization. [Management for Freshwater Fish Culture](https://www.fao.org/fishery/static/FAO_Training/FAO_Training/General/x6709e/x6709e16.htm). Recordkeeping and monitoring context for managed fish production.
10. Food and Agriculture Organization. [FarmOS: free and open-source farm management platform](https://www.fao.org/family-farming/detail/en/c/1633160/). Example of adaptable management tools across production systems.

These sources supplement—not replace—the original manuscript references. All online-source descriptions were paraphrased. **Content was rephrased for compliance with licensing restrictions.**

---

## 9. Dynamic Gap Analysis: Revised Manuscript vs. Current Code

| Priority | Gap | Current state | Required action |
|---:|---|---|---|
| Critical | Stakeholder requirements not documented | “Livestock and fisheries” is broad and undefined | Conduct interviews and collect actual forms before locking schema/report claims. |
| Critical | Unified producer model | Current `farmers` table assumes crop-farmer semantics | Approve a migration to `producers` or document a compatible identity abstraction; add `producer_sectors`. |
| Critical | Livestock/poultry data model | No animal tables, types, feature modules, pages, routes, RLS, audit actions, or backup support | Add normalized tables and full CRUD after field validation. |
| Critical | Fisheries/aquaculture data model | No fisherfolk, catch, species, fishing area, aquaculture site/cycle/harvest support | Implement capture fisheries and aquaculture as separate workflows. |
| Critical | Official report compliance | Current functions generate crop-centered templates; no supplied livestock/fisheries forms | Obtain and version approved report templates; add Edge Function report types and tests. |
| High | Reference-data governance | Crop list exists; no units, animal/aquatic species, event types, fisheries classifications | Add managed reference tables and admin UI; seed only verified local values. |
| High | Cross-sector duplicate detection | Farmer uniqueness only | Add producer search/matching and unique sector-enrollment constraints. |
| High | Analytics | Current dashboard and `yield_statistics` are crop-centered | Add sector KPIs and historical descriptive summaries; keep forecasting absent. |
| High | RLS and permissions | New tables do not exist | Add select/insert/update/archive policies and admin-only reference/report controls. |
| High | Backup/restore | Backup schema covers current tables | Version backup format and add new tables in dependency-safe export/restore order. |
| Medium | Audit vocabulary | Existing actions are crop/user focused | Add events such as CREATE_LIVESTOCK_INVENTORY, RECORD_FISH_CATCH, and CREATE_AQUACULTURE_HARVEST. |
| Medium | Navigation and terminology | UI says Farmers and crop records | Introduce Producers and sector navigation without duplicating staff/admin pages. |
| Medium | Test/evaluation coverage | No expanded UAT scenarios | Add requirement-linked test cases and evaluate completed modules using ISO/IEC 25010. |

### Current completion statement suitable for the paper

> At the time of this revision, the implemented prototype supports crop-centered agricultural data management, including producer/farmer profiles, farms, plots, crops, planting, harvest, crop analytics, server-generated reports, audit logging, and backup/restore. Livestock/poultry and fisheries/aquaculture were subsequently requested by the stakeholder and are specified as an expansion in the revised design. These modules must not be presented as implemented or evaluated until their database, interfaces, reports, security policies, and acceptance tests are completed.

---

## 10. Recommended Manuscript Revision Checklist

### Chapter 1

- Change crop-only language such as “farmer and crop yield inventory” to “integrated agricultural producer and production inventory,” then explicitly enumerate the three sectors.
- Add livestock raisers and fisherfolk to the significance section.
- Replace crop-only research questions/objectives with the revised aligned questions in Sections 2.3–2.4.
- Keep exclusions explicit so the scope does not expand into veterinary diagnosis, vessel licensing, enforcement, accounting, or prediction.

### Chapter 2

- Add separate subsections for integrated systems, livestock/poultry information management, and fisheries/aquaculture information management.
- Use the authoritative sources in Section 8 and retain the original data-banking/reporting/analytics literature where still applicable.
- Do not describe PhilFSIS, RSBSA/FIMS, or FishCoRe as identical to AGRODATA; use them only as national/system-context precedents.
- Perform a reference audit and use the institution’s required citation style.

### Chapter 3

- Redraw IPO, proposed flow, architecture, ERD, use-case, sequence, and activity diagrams.
- Replace the crop-only data dictionary with current + proposed tables after stakeholder validation.
- Add the new interview questions, document-analysis checklist, and Agile expansion plan.
- Update report descriptions only after obtaining official forms.
- Make the software requirements consistently state PostgreSQL/Supabase and Supabase Edge Functions, not MySQL or a standalone Node.js backend.

### Evaluation and defense

- Do not evaluate unimplemented livestock/fisheries modules as functional.
- Either complete the expansion before final evaluation or explicitly present it as future work/approved next iteration.
- Demonstrate one end-to-end scenario per implemented sector: profile → activity/site → production record → dashboard → Edge Function report → audit log.

---

## 11. Suggested Next Implementation Order

1. Stakeholder interview and form collection.
2. Signed field/report validation matrix.
3. Schema migration design and ERD approval.
4. Unified producer/sector enrollment migration.
5. Livestock/poultry module.
6. Capture-fisheries module.
7. Aquaculture module.
8. Edge Function report and analytics expansion.
9. RLS, audit, backup/restore, and data migration updates.
10. Targeted tests, UAT, ISO/IEC 25010 evaluation, and final manuscript alignment.

This order prevents the team from coding assumptions that conflict with the OMA’s real livestock and fisheries records.

---

## 4. Implementation Status (this repository)

The livestock/poultry and fisheries/aquaculture expansion has been implemented in code, following the existing crop-module patterns (one primary table per page, shared producer registry, RLS, audit logging, server-side reports).

### 4.1 Database (migration `0006_livestock_fisheries.sql`)

New enums: `livestock_category`, `animal_product_type`, `fishing_involvement`, `fisheries_subsector`, `aqua_site_type`, `water_environment`, `aqua_cycle_status`.

New tables (all referencing `farmers` as the unified producer registry):

| Table | Purpose | Key constraints |
|---|---|---|
| `livestock_species` | Animal species catalog | `species_name` unique; `category` enum |
| `livestock_records` | Periodic inventory + births/deaths/disposed + production | FK `farmer_id`, `species_id`; non-negative checks |
| `fisherfolk` | Fishing sector profile | FK `farmer_id` **unique** (one profile per producer) |
| `fish_catch` | Municipal catch by species/subsector | FK `fisherfolk_id`; `subsector` enum |
| `aquaculture_sites` | Ponds/cages/tanks/pens | FK `farmer_id`; `site_type`, `water_environment` enums |
| `aquaculture_cycles` | Stocking → harvest cycles | FK `site_id`; check `harvest_date >= stocking_date` |

RLS mirrors migration `0002` (authenticated OMA users may read/write). Reference species are seeded. The all-in-one `setup_all.sql` was updated accordingly.

### 4.2 Frontend

- **Types**: `src/types/database.ts` extended with all sector interfaces and enums.
- **Feature modules**: `src/features/livestock.ts`, `src/features/fisheries.ts`, `src/features/aquaculture.ts` (plus `fetchFarmerOptions` in `farmers.ts`).
- **Pages / routes**: `/livestock-species`, `/livestock`, `/fisherfolk`, `/fish-catch`, `/aquaculture-sites`, `/aquaculture-cycles` (all authenticated; encoders and admin).
- **Navigation**: sidebar reorganized into **Crops**, **Livestock & Poultry**, and **Fisheries & Aquaculture** sections.

### 4.3 Reports (Edge Function `generate-report`)

Two new server-side compliance reports added alongside the crop reports:

- **Livestock & Poultry Inventory Report** — per species: recorded inventory, births, deaths, dispositions, and production (year + quarter).
- **Municipal Fisheries Catch Report** — total catch per species and subsector, marine/inland (year + quarter).

Report generation remains Municipal-Agriculturalist-only (`/reports` guarded by `RequireAdmin`).

### 4.4 Analytics & stored statistics (all sectors)

- **Dashboard** now shows sector KPIs (livestock/poultry inventory, fish catch, aquaculture harvest) plus charts for *Livestock & Poultry Inventory by Species* and *Fish Catch by Subsector*, alongside the existing crop charts.
- **Stored statistics** were extended beyond crops. Migration `0007_sector_statistics.sql` adds `livestock_statistics` and `fisheries_statistics` (mirroring `yield_statistics`). The `compute-statistics` Edge Function now computes and persists **crops, livestock, and fisheries** summaries in one call, grouped by species/subsector/barangay and period (monthly/quarterly/yearly).
- The Analytics page renders three stored-summary tables (crop, livestock, fisheries); a single "Compute & store" refreshes all three.

### 4.5 Authorization hardening (migration `0009_sector_rls_hardening.sql`)

- **RLS parity**: migrations `0006`/`0007` created the sector policies with the pre-`0004` rule `auth.role() = 'authenticated'`, so the eight sector tables were reachable by any authenticated identity — including a bare signup with no OMA profile — while the crop tables required an ACTIVE `public.users` row. Migration `0009` rebuilds all sector policies on `public.has_active_profile()`, and `setup_all.sql` now creates them that way for fresh installs.
- **Server-side role checks**: `requireAdmin()` in `supabase/functions/_shared/client.ts` verifies the caller has an ACTIVE profile with the Municipal Agriculturalist role. Both `generate-report` and `compute-statistics` call it, so reporting and statistics recomputation can no longer be invoked directly by an encoder bypassing the `RequireAdmin` router guard. Unauthorized calls return 401/403.
- **UI parity**: the Analytics "Compute & store" control is now admin-only, so staff are not shown an action the server would reject.

### 4.6 Backup & restore coverage (migration `0008_backup_sector_support.sql`)

Backup/restore originally covered only the crop-era tables, so sector data would have been lost on restore. Two fixes were applied:

- `src/features/backup.ts` now exports and restores all eight sector tables (`livestock_species`, `livestock_records`, `fisherfolk`, `fish_catch`, `aquaculture_sites`, `aquaculture_cycles`, `livestock_statistics`, `fisheries_statistics`) in parent-before-child order. The backup format version is now **2**; version 1 files still restore, and the UI warns that they predate the sector modules.
- Migration `0008` switches the sector identity columns to `generated by default` (they were `generated always`, which would have rejected a restore of original primary keys) and extends `resync_identity_sequences()` to cover them.

### 4.7 Sample data

`supabase/sample_data.sql` seeds all sectors: livestock/poultry records across six reference dates, fisherfolk profiles with 18 months of catch records, aquaculture sites with completed and ongoing cycles, and stored livestock/fisheries yearly statistics, so every dashboard KPI, chart, and report renders with content.

### 4.8 Deferred / not yet implemented

- **Official-form validation**: report fields/units are design baselines and must be validated against actual OMA, PAO, PSA, BAI, and BFAR forms before claiming compliance.
- Aquaculture and fisheries **species reference catalogs** (species are free-text; a catalog like `livestock_species` could be added if the stakeholder requires controlled lists).
- **Aquaculture stored statistics** (harvest per site/species/period) — currently aquaculture harvest appears as a dashboard KPI only; a persisted summary table could be added if required.

> Cross-reference: [Section 4.6](#46-backup--restore-coverage-migration-0008_backup_sector_supportsql) covers backup parity for the sector tables.

### 4.9 Verification

`npm run typecheck` and `npm run build` both pass. Edge Functions must be deployed (`supabase functions deploy generate-report` and `supabase functions deploy compute-statistics`) for report generation and statistics computation to run in a live environment.
