# DEFENSE_MANUAL.md — Official University BSc/MSc Computer Science Project Defense Manual

**Project Title:** Design and Implementation of a Multi-Tenant Automated University Clearance Platform with Cryptographic Verification and Dynamic Audit Trails  
**Software Name:** UniClear  
**Case Study:** University of Nigeria, Nsukka (UNN)  
**Target Degree:** Bachelor of Science (B.Sc. / B.Eng.) / Master of Science (M.Sc.) in Computer Science  
**Defense Protocol:** Strict 20-Minute Defense Protocol with Individual Candidate Scoring  
**Tech Stack:** Next.js 15 (App Router), Node.js/Express (TypeScript), Prisma ORM, PostgreSQL, Redis/In-Memory Cache, PDF-Lib Dynamic Cryptographic Engine, Docker & Adminer  

---

## TABLE OF CONTENTS
1. [The 20-Minute Defense Timetable & Pre-Defense Warmup](#1-the-20-minute-defense-timetable--pre-defense-warmup)
2. [Verbatim PowerPoint Slide Deck (Exact 6-Slide Script)](#2-verbatim-powerpoint-slide-deck-exact-6-slide-script)
3. [Member 1 Demonstration Script: Database Architecture & Live Ingestion](#3-member-1-demonstration-script-database-architecture--live-ingestion)
4. [Member 2 Demonstration Script: Objectives Verification](#4-member-2-demonstration-script-objectives-verification)
5. [Member 3 Demonstration Script: Software Architecture & Modular Engineering](#5-member-3-demonstration-script-software-architecture--modular-engineering)
6. [Docker Setup, 1-Click Automation Scripts & Post-Defense Submission Protocol](#6-docker-setup-1-click-automation-scripts--post-defense-submission-protocol)
7. [Defense Day Cheat Sheet](#7-defense-day-cheat-sheet)

---

# 1. THE 20-MINUTE DEFENSE TIMETABLE & PRE-DEFENSE WARMUP

University defense boards grade each student **individually** across defined rubrics:
* **Understanding of Theoretical Principles (System Analysis & Design)**
* **Mastery of Database Schema & Data Integrity**
* **Competence in Software Architecture & Code Organization**
* **Live System Execution & Edge-Case Handling**
* **Technical Eloquence during Defense Q&A**

```
┌───────────────────────────────────────────────────────────────────────────────────────┐
│                    STRICT 20-MINUTE DEFENSE TIME ALLOCATION TABLE                     │
├───────────────┬─────────────────┬─────────────────────────────────────────────────────┤
│ TIME (MM:SS)  │ RESPONSIBILITY  │ ACTIVITY                                            │
├───────────────┼─────────────────┼─────────────────────────────────────────────────────┤
│ 00:00 - 05:00 │ Group (Slides)  │ Verbatim PowerPoint Slide Presentation (6 Slides)   │
│ 05:00 - 08:20 │ Member 1 Demo   │ Database Architecture, Schema Inventory & Live Insert│
│ 08:20 - 11:40 │ Member 2 Demo   │ Verification of the 4 Specific Study Objectives     │
│ 11:40 - 15:00 │ Member 3 Demo   │ Software Architecture, Unit Modules & System Engine │
│ 15:00 - 20:00 │ All (Individual)│ Individual Defense Panel Q&A and Final Scoring      │
└───────────────┴─────────────────┴─────────────────────────────────────────────────────┘
```

### The Hallway Checklist (Execute 20 Minutes Before Entering Defense Room)
* [ ] **Power Management:** Connect the laptop directly to AC wall power. Set Power & Battery settings to **"Screen & Sleep: Never"** on AC power.
* [ ] **Network Independence:** Run completely on `localhost` (127.0.0.1) or an offline WiFi hotspot. **Do not rely on institutional Wi-Fi.**
* [ ] **Pre-Warmed Services:** Both frontend (`localhost:3000`), backend API (`localhost:5000`), and Adminer DB GUI (`localhost:8080`) must already be active.
* [ ] **Seeded Test Records:** Run test seeding beforehand. Have 1 completed student (`12345678AB`), 1 in-progress student, and 1 fresh student account ready.
* [ ] **Browser Arrangement (Tabs Pre-Authenticated):**
  * **Window 1 (Left Screen 50%):** Browser Tab 1: Student Portal (`http://localhost:3000/student/dashboard`).
  * **Window 1 (Tab 2 - Incognito):** Officer Clearance Queue (`http://localhost:3000/officer/queue`).
  * **Window 1 (Tab 3):** Super Admin Dashboard (`http://localhost:3000/admin/dashboard`).
  * **Window 2 (Right Screen 50%):** Adminer PostgreSQL DB Viewer (`http://localhost:8080/?pgsql=db&username=uniclear&db=uniclear&ns=public&select=ClearanceRequest`).
* [ ] **Screen Resolution & Zoom:** Browser zoom set to 100% or 110% for projector readability. Terminal font increased to 16pt.
* [ ] **Close Background Noise:** Exit Discord, WhatsApp, Telegram, Slack, Steam, and turn off all OS banner notifications (Do Not Disturb enabled).

> [!CAUTION]
> **THE GOLDEN RULE OF DEFENSE DAY:**  
> **NEVER run `npm install`, `yarn add`, `git pull`, `prisma migrate reset`, or `docker build` inside the defense hall.**  
> Any build command executed inside the hall introduces unexpected network timeouts, dependency tree breaks, or migration locks that can fail your defense instantly. Everything must be pre-built and pre-tested before stepping past the door.

---

# 2. VERBATIM POWERPOINT SLIDE DECK (EXACT 6-SLIDE SCRIPT)

*(Each slide must be read or spoken verbatim in the designated sequence within 5 minutes).*

---

### SLIDE 1: TITLE & CANDIDATE PARTICULARS
* **Project Title:** Design and Implementation of a Multi-Tenant Automated University Clearance Platform 
* **Platform Name:** UniClear
* **Case Study:** University of Nigeria, Nsukka (UNN)
* **Candidates:**
  * Member 1: **[Candidate 1 Name]** — Reg No: **[202X/XXXXXX]** (Database & Security Specialist)
  * Member 2: **[Candidate 2 Name]** — Reg No: **[202X/XXXXXX]** (Workflow & Frontend Engineer)
  * Member 3: **[Candidate 3 Name]** — Reg No: **[202X/XXXXXX]** (Software Architecture & API Lead)
* **Supervisor:** **[Supervisor Title, Name, Post-Nominals]** (e.g., Dr. E. C. Okoronkwo, Department of Computer Science)
* **Spoken Script (00:00 - 00:45):**  
  *"Good day, respected Chairman and distinguished members of the defense panel. We are candidate group [Number], presenting our final-year research project titled 'Design and Implementation of a Multi-Tenant Automated University Clearance Platform with Cryptographic Verification and Dynamic Audit Trails', using the University of Nigeria, Nsukka as our case study. I am [Member 1], alongside my colleagues [Member 2] and [Member 3], under the academic supervision of [Supervisor Name]. We will present our study within the allotted 5 minutes and immediately proceed to our live technical demonstration."*

---

### SLIDE 2: ACADEMIC ABSTRACT
* **Background:** Graduating from Nigerian tertiary institutions requires comprehensive institutional clearance spanning multiple administrative departments (Faculty, Bursary, Library, Student Affairs, Sports Council, Security).
* **Problem Statement:** The conventional clearance methodology relies on manual paper clearance booklets, physical queues, prone to document mutilation, record loss across sessions, bureaucratic officer availability bottlenecks, and widespread forgery of official stamps and signatures.
* **Proposed Solution:** UniClear: A cloud-native, multi-tenant digital clearance platform featuring automated campaign eligibility evaluation, multi-stage approval pipelines, asynchronous document ingestion, and cryptographically tamper-evident digital certificates equipped with 2D dynamic QR verification codes.
* **Methodology & Implementation:** Built utilizing the Agile Software Development Life Cycle (SDLC) and Object-Oriented Analysis and Design (OOAD). Implemented with Next.js 15, Node.js/Express, TypeScript, Prisma ORM, PostgreSQL, and PDF-Lib binary stream transformations.
* **Key Findings/Results:** Eliminates physical clearance queues by 100%, compresses clearance turnaround time from an average of 21 business days to under 48 hours, guarantees zero document loss through redundant cloud and local storage, and enables instantaneous third-party verification of student clearance authenticity without requiring portal credentials.
* **Spoken Script (00:45 - 01:30):**  
  *"Historically, the transition of students out of tertiary institutions has been marred by an arduous paper-based clearance bottleneck. Students spend weeks traversing geographically dispersed departments, navigating bureaucratic friction, and risking document misplacement. Moreover, employers and NYSC mobilization boards face acute difficulties distinguishing authentic clearance dockets from forged rubber stamps. UniClear mitigates these systemic failures by delivering a multi-tenant platform where institutional campaigns, staged workflows, and digital document stamping are executed with immutable audit logs and public cryptographic verification."*

---

### SLIDE 3: OBJECTIVES OF THE STUDY
* **General Objective:**  
  To design, develop, and deploy an automated, multi-tenant university clearance workflow system that transitions tertiary institutions from paper-dependent clearance protocols to a secure, cryptographically verifiable, and auditable digital environment.
* **Specific Measurable Objectives:**
  1. **Objective 1 (Multi-Stage Workflow Configuration):** To design and implement a flexible stage and document prerequisite builder enabling institutions to dynamically define department-specific clearance sequences and file requirements per academic session.
  2. **Objective 2 (Asynchronous Ingestion & Document Verification):** To engineer a multi-format document upload subsystem with automated mime-type validation, size constraints, and secure storage dispatch.
  3. **Objective 3 (Role-Based Queue & Digital Stamping Engine):** To construct an administrative and officer clearance dashboard supporting multi-stage assignment, parallel queue inspection, approval velocity tracking, and automated digital stamp overlays on student credentials.
  4. **Objective 4 (Tamper-Resistant Certificate Generation & Instant Verification):** To formulate an automated certificate generation service that produces PDF clearance certificates with embedded SHA-256 tamper-evident metadata and dynamic QR code resolution for instant zero-knowledge public verification.
* **Spoken Script (01:30 - 02:20):**  
  *"To solve this problem systematically, our research defined four specific, measurable technical objectives. First, allowing administrators to dynamically configure sequential clearance stages and criteria. Second, providing students a streamlined interface to upload prerequisites with validation. Third, equipping clearing officers with a queue management dashboard and digital stamping mechanism. And fourth, issuing a tamper-proof digital clearance certificate with an embedded dynamic QR code that guarantees instantaneous verification."*

---

### SLIDE 4: LEVEL-1 / LEVEL-2 DATA FLOW DIAGRAM (DFD)

```
                    ┌────────────────────────────────────────────────────────┐
                    │               LEVEL-1 DATA FLOW DIAGRAM                │
                    └────────────────────────────────────────────────────────┘

 [Student] ──(1. Matric/JAMB & Credentials)──▶ [ 1.0 Identity & Tenant ] ──▶ [D1: User/Tenant Registry]
                                               [    Resolution Engine   ] 
                                                        │ (Auth Token)
                                                        ▼
 [Student] ──(2. Document Uploads)──────────▶ [ 2.0 Document Ingestion ] ──▶ [D3: Documents Store]
                                               [    & Storage Dispatch  ]
                                                        │ (Ready for Review)
                                                        ▼
 [Officer] ──(3. Review & Stamp Decision)───▶ [ 3.0 Multi-Stage Workflow] ──▶ [D2: Clearance Requests &]
                                               [    Approval Engine     ]     [    Stage Approvals     ]
                                                        │ (All Stages Approved)
                                                        ▼
 [System] ───(4. Compile & Sign)─────────────▶ [ 4.0 Dynamic Certificate] ──▶ [D4: Audit & Cryptographic]
                                               [    & QR Engine (PDF)   ]     [    Certificates Ledger ]
                                                        │ (Verified URL)
                                                        ▼
 [Public /] ──(5. Scan QR / Input Code)──────▶ [ 5.0 Zero-Knowledge     ] ◀── [D4: Certificates Ledger ]
 [Verifier] ◀─(6. Validation Report & Status)─ [    Verification Engine ]
```

* **(i) External Entities:**
  * **`E1: Student Candidate`** (Submits credentials, tracks stage progress, downloads final clearance certificate).
  * **`E2: Departmental Clearing Officer`** (Inspects submitted PDFs/images, affixes official digital stamps/signatures, issues approvals or rejections with feedback).
  * **`E3: University Administrator`** (Configures academic sessions, campaigns, clearance stages, document requirements, and staff assignments).
  * **`E4: External Verifier / Employer / NYSC`** (Scans clearance certificate QR code or inputs clearance number to verify authenticity).
* **(ii) Processes:**
  * **`1.0 Identity & Tenant Resolution:`** Validates domain/subdomain, authenticates user JWT, extracts active session, enforces role-based access.
  * **`2.0 Campaign Eligibility & Request Initialization:`** Verifies student graduation status against campaign faculty/department rules and spawns clearance request records.
  * **`3.0 Document Ingestion & Storage Dispatch:`** Streams binary files through Multer, calculates checksums, validates file signatures, and persists to storage.
  * **`4.0 Multi-Stage Clearance & Digital Stamping:`** Enforces stage prerequisites, overlays officer digital stamps onto submitted documents, records immutable stage approval timestamps.
  * **`5.0 Cryptographic Certificate Compilation:`** Asynchronously triggered upon final stage approval; stamps student metadata, institutional crest, issuing dates, and generated 2D QR barcode.
  * **`6.0 Zero-Knowledge Public Verification:`** Decodes public verification URLs without exposing sensitive database keys, confirming certificate integrity and issue history.
* **(iii) Relational Data Stores:**
  * **`D1: User, University & Role Registry`** (`University`, `User`, `Student`, `Officer`, `Faculty`, `Department`).
  * **`D2: Workflow, Campaigns & Sessions`** (`AcademicSession`, `ClearanceCampaign`, `ClearanceStage`, `StageOfficerAssignment`).
  * **`D3: Document & Clearance Records`** (`DocumentType`, `Document`, `ClearanceRequest`, `StageApproval`).
  * **`D4: Audit Logs & Cryptographic Certificates`** (`AuditLog`, `OfficerStamp`, `Notification`).
* **Spoken Script (02:20 - 03:15):**  
  *"Slide 4 depicts our Level-1 Data Flow Diagram. The architecture decouples external actors into four distinct entities: Student, Clearing Officer, System Administrator, and External Verifier. Data flows sequentially through six distinct computational processes: from identity and tenant resolution, into document ingestion, advancing through the multi-stage approval engine, triggering the cryptographic PDF compiler, and terminating at the zero-knowledge verification endpoint against our four core database stores."*

---

### SLIDE 5: INPUT DESIGN SPECIFICATIONS (TABULAR SPECIFICATIONS)

*(Note: Screen captures are strictly prohibited in formal academic input design. Data structures are specified via field layout tables).*

| Form / Interface Identifier | Input Field Name | Input Component Type | Technical Data Type | Constraints, Validation Rules & Boundary Limits |
|---|---|---|---|---|
| **FORM-01:** Student Clearance Initiation | `matricNo` | Text Input Box | `VARCHAR(30)` | Required; Unique per tenant; Regex: `^[0-9]{8}[A-Z]{2}$` |
| | `sessionId` | Dropdown Select | `UUID (FK)` | Required; Must reference an open `AcademicSession.id` |
| | `campaignId` | Dropdown Select | `UUID (FK)` | Required; Must match student's faculty & department |
| **FORM-02:** Credential Document Upload | `documentTypeId` | Dropdown Select | `UUID (FK)` | Required; Must belong to student's pending clearance stage |
| | `file` | File Upload Picker | `BINARY/STREAM` | Allowed: `application/pdf`, `image/jpeg`, `image/png`; Max file size: 5.0 MB; Zero-byte files rejected |
| **FORM-03:** Clearance Stage Configuration | `name` | Text Input Box | `VARCHAR(100)` | Required; Min: 3 chars, Max: 100 chars; E.g., 'Library Clearance' |
| | `orderIndex` | Integer Number Input | `INTEGER` | Positive integer `>= 1`; Unique sequence index per tenant |
| | `assignedOfficerId`| Multi-Select Dropdown | `UUID (FK)[]` | Must reference active staff with `Role: OFFICER` |
| **FORM-04:** Officer Review & Stamping | `decision` | Radio Button Group | `ENUM` | Strict Enum: `APPROVED` or `REJECTED` |
| | `rejectionReason`| Textarea Input Box | `TEXT` | Required if `decision === REJECTED`; Min: 10 chars, Max: 500 chars |
| | `stampId` | Dropdown Picker | `UUID (FK)` | Optional; References officer's pre-uploaded official seal |

* **Spoken Script (03:15 - 04:05):**  
  *"Slide 5 details the Input Design Specifications for all primary transaction boundaries. Each form enforces strict edge validation utilizing Zod schemas before persistence. For instance, in Form 02, document ingestion restricts uploads strictly to PDF, JPEG, and PNG formats, capped at 5 Megabytes with zero-byte rejections. In Form 04, rejections conditionally mandate explanatory feedback to prevent arbitrary student disenfranchisement."*

---

### SLIDE 6: OUTPUT DESIGN SPECIFICATIONS (TABULAR SPECIFICATIONS)

| Output Document / Interface | Output Data Fields Displayed | Output Destination / Medium | Generation Trigger & Underlying Business Logic |
|---|---|---|---|
| **OUT-01:** Officer Clearance Worklist | Student Full Name, Matric Number, Stage Name, Uploaded Files Count, Submission Timestamp, Current Status Badge | Responsive Web Table (`/officer/queue`) | Polled on page load filtered by `stageAssignments` of authenticated officer; Paginated (20 per page). |
| **OUT-02:** Clearance Progress Summary | Overall Progress Bar (%), Stage Status Stepper, Officer Feedback Notes, Approved-At Timestamps | Student Dashboard UI (`/student/clearance`) | Dynamic aggregation of `StageApproval` join queries scoped to the student's active `ClearanceRequest`. |
| **OUT-03:** Digital Clearance Certificate | Institutional Header & Crest, Student Identity (Name, Matric, Faculty, Dept), Clearance Number, Issue Date, Digital Signatures, Embedded Dynamic QR Code | Downloadable Vector PDF (`application/pdf`) | Fired automatically when `ClearanceRequest.status` transitions to `APPROVED` (all stages satisfied). |
| **OUT-04:** Public Verification Audit Card | University Name, Student Name (Masked for privacy), Matric No, Clearance Certificate Status (`VALID` / `REVOKED`), Timestamp Issued | Public Web Page (`/verify/[clearanceNumber]`) | Real-time fetch against `ClearanceRequest` by unique UUID/Clearance Number without requiring user authentication. |

* **Spoken Script (04:05 - 05:00):**  
  *"Finally, Slide 6 encapsulates our Output Design Specifications. The hallmark output is Output 03: the official Digital Clearance Certificate rendered directly via binary stream compilation. The certificate embeds student details, institutional branding, approved stage signatures, and an indelible cryptographic verification QR code. This concludes our formal slide presentation. We now invite the panel to observe the live demonstration, beginning with Member 1 on Database Architecture."*

---

# 3. MEMBER 1 DEMONSTRATION SCRIPT: DATABASE ARCHITECTURE & LIVE INGESTION
**Allocated Time:** 05:00 – 08:20 (3 Minutes 20 Seconds)  
**Presenter:** Candidate 1 (Database & Security Lead)

### 3.1 Relational Table Inventory (All 23 Prisma Models in PostgreSQL)
Before touching the keyboard, state:  
*"Distinguished panel, the UniClear persistence layer is modeled in PostgreSQL via Prisma ORM, comprising exactly 23 relational entities enforcing ACID compliance, multi-tenant row-level isolation via university foreign keys, and cascading relational integrity."*

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│               UNICLEAR RELATIONAL TABLE INVENTORY (23 ENTITIES)                        │
├────┬───────────────────────────┬──────────────┬──────────────┬─────────────────────────┤
│ #  │ Table Name                │ Primary Key  │ Foreign Keys │ Functional Purpose      │
├────┼───────────────────────────┼──────────────┼──────────────┼─────────────────────────┤
│ 1  │ University                │ id (UUID)    │ —            │ Multi-tenant root store │
│ 2  │ UniversityBranding        │ univId (UUID)│ universityId │ Per-tenant UI styles    │
│ 3  │ ContractPlan              │ id (UUID)    │ universityId │ SaaS tier & quotas      │
│ 4  │ User                      │ id (UUID)    │ universityId │ Core auth credentials   │
│ 5  │ RefreshToken              │ id (UUID)    │ userId       │ JWT silent rotation     │
│ 6  │ PasswordResetToken        │ id (UUID)    │ userId       │ Recovery tokens         │
│ 7  │ Faculty                   │ id (UUID)    │ universityId │ Academic faculties      │
│ 8  │ Department                │ id (UUID)    │ facultyId    │ Academic departments    │
│ 9  │ Student                   │ id (UUID)    │ user, deptId │ Student profiles        │
│ 10 │ Officer                   │ id (UUID)    │ user, univId │ Clearing staff profiles │
│ 11 │ ClearanceCampaign         │ id (UUID)    │ univ, sessId │ Cohort clearance rules  │
│ 12 │ CampaignEligibilityRule   │ id (UUID)    │ campaignId   │ Faculty/dept filters    │
│ 13 │ ClearanceStage            │ id (UUID)    │ campaignId   │ Clearance checkpoints   │
│ 14 │ StageOfficerAssignment    │ id (UUID)    │ stage, offId │ Multi-stage assignments │
│ 15 │ DocumentType              │ id (UUID)    │ universityId │ Document master catalog │
│ 16 │ StageDocumentRequirement  │ id (UUID)    │ stage, docTyp│ Per-stage requirements  │
│ 17 │ AcademicSession           │ id (UUID)    │ universityId │ Academic school years   │
│ 18 │ ClearanceRequest          │ id (UUID)    │ stud, campId │ Central clearance docket│
│ 19 │ StageApproval             │ id (UUID)    │ req, stg, off│ Immutable approval logs │
│ 20 │ OfficerStamp              │ id (UUID)    │ officer, univ│ Official graphic stamps │
│ 21 │ Document                  │ id (UUID)    │ req, docTypId│ File metadata & paths   │
│ 22 │ Notification              │ id (UUID)    │ userId       │ In-app student alerts   │
│ 23 │ AuditLog                  │ id (UUID)    │ actor, univId│ Tamper-evident trace    │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Step-by-Step Split-Screen Live Demo Protocol
1. **Prepare Split Screen:**
   * Left Half: Browser on Student Upload Form (`http://localhost:3000/student/clearance`).
   * Right Half: Adminer PostgreSQL Table Viewer open to `Document` table (`http://localhost:8080/?pgsql=db&username=uniclear&db=uniclear&ns=public&select=Document`).
2. **Execute Ingestion:**
   * On the Left Screen, select the pending requirement: *"O'Level Statement of Result"*.
   * Attach a sample test PDF file (`sample_waec_result.pdf`).
   * Click **[Submit Document for Stage]**.
   * Show the UI displaying: *"Document uploaded successfully. Clearance status updated."*
3. **Execute Live DB Verification:**
   * Immediately switch to the Right Screen (Adminer).
   * Press **F5 (Refresh)** or click **[Select]** in Adminer.
   * Point the laser pointer / cursor to the brand new row at the top of the `Document` table.
   * Highlight the live fields:
     * `id`: Fresh UUIDv4 generated.
     * `filePath`: Saved path under `/uploads/clearance/...`.
     * `mimeType`: `application/pdf`.
     * `fileSizeBytes`: Matches exact file size on disk.
     * `createdAt`: Synchronized server timestamp.
4. **Demonstrate Cascading State Mutation:**
   * Click into table `ClearanceRequest`. Show how `updatedAt` on the student's clearance request was automatically touched by Prisma.

### 3.3 Top 3 Examiner Questions & Rehearsed Answers for Member 1

* **Q1: "Why did you use UUIDv4 instead of auto-incrementing integers (1, 2, 3...) for your Primary Keys?"**  
  * **Answer:** *"Sir/Ma, we deliberately opted for UUIDv4 to satisfy three core enterprise requirements: First, in a multi-tenant architecture, auto-incrementing integers expose predictable enumerable ID sequences (e.g., `/student/1`, `/student/2`), which creates an Insecure Direct Object Reference (IDOR) vulnerability. Second, UUIDs allow distributed client-side and worker generation without central database lock contention. Third, UUIDs enable seamless database partitioning and cross-institution data synchronization without primary key collision."*

* **Q2: "How do you guarantee that a Student from UNN cannot view or query clearance data belonging to another university (e.g., UNILAG) in the same database?"**  
  * **Answer:** *"We enforce strict Tenant Isolation at two complementary layers: At the edge, our Express/Next.js middleware extracts the tenant slug from the hostname or request header and resolves the corresponding `universityId`. At the persistence layer, our Prisma queries and repository patterns unconditionally inject `where: { universityId }` into every find, update, and delete operation. Without a matching `universityId`, PostgreSQL returns zero records even if a malicious actor specifies a valid record UUID."*

* **Q3: "Where are uploaded student documents stored, and how does the database handle storage bloat?"**  
  * **Answer:** *"The PostgreSQL database stores only structured metadata, file checksums, and storage pointer URIs—never binary large objects (BLOBs) inside the relational engine. The raw binary streams are handled through our storage abstraction interface: in local development, they stream to an isolated filesystem directory, while in production, they stream to S3-compatible cloud object storage (e.g., Supabase/Cloudinary). This prevents database page fragmentation and memory bloat."*

---

# 4. MEMBER 2 DEMONSTRATION SCRIPT: OBJECTIVES VERIFICATION
**Allocated Time:** 08:20 – 11:40 (3 Minutes 20 Seconds)  
**Presenter:** Candidate 2 (Workflow & Frontend Engineer)

### 4.1 Step-by-Step Mapping of the 4 Specific Study Objectives

#### Verification of Objective 1: Dynamic Clearance Stage & Requirement Builder
1. Navigate to Super Admin Portal: `http://localhost:3000/admin/stages`.
2. Demonstrate the Stage List: Point to stages ordered by sequence (`1: Departmental`, `2: Faculty`, `3: Library`, `4: Bursary`, `5: Student Affairs`).
3. Click **[+ Add Clearance Stage]**:
   * Name: `Security Division Clearance`
   * Order Index: `6`
   * Required Document: Select `Police Character Clearance`.
4. Click **[Create Stage]**: Show the new stage immediately appearing in the workflow list.

#### Verification of Objective 2: Asynchronous Multi-Format Ingestion & Boundary Testing
1. Switch to Student Portal: `http://localhost:3000/student/clearance`.
2. Show that the student clearance progress displays the newly mandated requirement.
3. **Execute Boundary/Negative Test (Crucial for scoring):**
   * Attempt to upload an invalid executable or dummy text file renamed to `.exe` or an oversized 15MB file.
   * Show the system instantly blocking the submission with a clear client-side validation toast:  
     *"File size exceeds 5MB limit. Please upload an accepted document format (PDF, JPG, PNG)."*
4. Upload an authentic 2.1MB PDF file. Observe progress indicator update from `In Progress` to `Pending Review`.

#### Verification of Objective 3: Role-Based Officer Queue & Digital Stamping Engine
1. Switch to Incognito Window (Officer Queue): `http://localhost:3000/officer/queue`.
2. Show the newly submitted student application appearing in the Officer's review queue.
3. Click **[Review Student Credentials]**:
   * Inspect the submitted PDF directly in the built-in PDF viewer.
   * Select Officer Digital Seal / Stamp from the stamp selector dropdown.
   * Click **[Approve Stage]**.
4. Show that the queue refreshes, decrementing pending reviews and incrementing the officer's daily clearance velocity counter.

#### Verification of Objective 4: Cryptographic Certificate & Zero-Knowledge Verification
1. Return to Student Window: `http://localhost:3000/student/dashboard`.
2. Refresh: Observe status banner transitions to: **"Clearance Completed — 100% Approved"**.
3. Click **[Download Official Clearance Certificate]**:
   * Open the generated PDF: Display the student name, matric number, issuing faculty, clearance serial number, digital stamps, and dynamic 2D QR Code.
4. Open a clean browser window (simulating an external employer or NYSC officer):
   * Navigate to `http://localhost:3000/verify` (or input the clearance UUID).
   * Submit: Show the instant official verification card displaying: **"Status: OFFICIALLY CLEARED & VALID"**, confirming zero manual phone calls or paper verification needed.

### 4.2 Top 3 Examiner Questions & Rehearsed Answers for Member 2

* **Q1: "What prevents a student from skipping Stage 1 (Department) and jumping straight to Stage 4 (Bursary)?"**  
  * **Answer:** *"Our workflow engine enforces sequential dependency constraints. In the backend `clearance.service.ts`, before an officer can approve Stage $N$, the service executes an integrity query verifying that all prerequisite stages where `orderIndex < N` possess an existing status of `APPROVED`. If a student attempts to bypass a preceding stage via direct API calls, the backend throws a `403 Forbidden - Preceding Clearance Stage Pending` error."*

* **Q2: "If an officer rejects a document, does the student have to restart the entire clearance process from Stage 1?"**  
  * **Answer:** *"No, sir. Our system implements a localized stage-rejection model. Only the specific stage marked `REJECTED` is unlocked for student re-submission. All previously approved stages retain their immutable `APPROVED` status with their existing timestamps. The officer is mandated to provide an explanatory rejection note, enabling the student to rectify and re-upload solely the deficient document."*

* **Q3: "How does the QR Code guarantee authenticity if someone copies the image and pastes it on another document?"**  
  * **Answer:** *"The QR Code does not contain static verification claims. It encodes a secure dynamic URL containing the unique cryptographic identifier of that specific clearance transaction. When scanned by any standard mobile camera, it resolves to our server's `/verify/[id]` endpoint, which queries the database in real-time. If an impostor pastes the QR code on a fraudulent document bearing a different student's name, the scanner immediately displays the authentic student's original details, exposing the forgery instantly."*

---

# 5. MEMBER 3 DEMONSTRATION SCRIPT: SOFTWARE ARCHITECTURE & MODULAR ENGINEERING
**Allocated Time:** 11:40 – 15:00 (3 Minutes 20 Seconds)  
**Presenter:** Candidate 3 (Software Architecture & API Lead)

### 5.1 Unit Modules vs. Integrated Subsystems Architecture
Open VS Code / Project Directory and explain the architectural hierarchy:

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                        UNICLEAR MULTI-TIER ARCHITECTURE                                │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. PRESENTATION LAYER (Next.js 15 App Router Frontend)                                │
│    ├── UI Components (Atomic Design): Button, Dialog, CustomDropdown, DataTable        │
│    ├── Feature Hooks: useClearance(), useOfficers(), useSession()                      │
│    └── Backend-For-Frontend (BFF) Proxy: app/api/v1/[...path]/route.ts                 │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 2. APPLICATION / SERVICE LAYER (Node.js/Express Backend)                               │
│    ├── Middleware Pipeline: Helmet -> Tenant -> Auth (JWT) -> RBAC -> RateLimiter      │
│    ├── Feature Modules: /auth, /clearance, /documents, /stages, /officers              │
│    └── Pure Unit Helper Functions:                                                     │
│        ├── Token Parser: Decodes and verifies bearer claims without DB lookup          │
│        ├── Dynamic QR Matrix Generator: Compiles QR vectors using `qrcode` library    │
│        ├── PDF Stamp Matrix Overlay: Computes X/Y coordinate stamp placements          │
│        └── Error Normalizer: Maps Prisma/Zod exceptions into RFC-7807 problem details  │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 3. PERSISTENCE & DATA INTEGRITY LAYER (Prisma ORM & PostgreSQL)                        │
│    ├── Repository Pattern: clearance.repository.ts, officers.repository.ts             │
│    └── Connection Pooling: Configured with pool limits preventing exhaustion           │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

#### Explanation of Unit Modules (Pure Functions):
1. **`generateQrCodeBuffer(url: string): Promise<Buffer>`:**  
   A standalone unit utility that accepts a sanitized verification URL and returns a high-resolution PNG buffer stream without depending on HTTP or database state.
2. **`embedDigitalStamp(pdfDoc, stampImage, coordinates): Promise<void>`:**  
   A pure computational function utilizing `pdf-lib` to overlay the officer's signature bitmap onto precise Cartesian coordinates $(X, Y)$ on the student's submission.
3. **`validateFileSignature(buffer: Buffer): boolean`:**  
   A unit security function that inspects the file's binary magic numbers (e.g., `%PDF-1.` for PDF, `FF D8 FF` for JPEG) to prevent malicious executable files disguised with fake file extensions.

#### Explanation of Integrated Subsystems:
1. **The Backend-For-Frontend (BFF) Proxy (`uniclear-frontend/app/api/v1/[...path]/route.ts`):**  
   Acts as a security gateway. It extracts the sensitive `httpOnly` authentication cookies from incoming browser requests, securely appends the `Bearer` token and active `tenant_slug` headers, and proxies requests to the Express backend. This shields the browser JavaScript from token theft via Cross-Site Scripting (XSS).
2. **The Asynchronous Event-Driven Notification Pipeline:**  
   When an approval occurs in `ClearanceService`, it triggers domain events (`NOTIFICATION_CREATED`) that concurrently create in-app notification records and dispatch transactional emails without blocking the officer's HTTP response.

### 5.2 Top 3 Examiner Questions & Rehearsed Answers for Member 3

* **Q1: "Explain the difference between your Route, Controller, Service, and Repository layers."**  
  * **Answer:** *"Sir, we enforce strict Separation of Concerns:  
    * **The Route Layer** binds the HTTP verb and path to security middleware (Auth, Tenant, and Role guards).  
    * **The Controller Layer** parses incoming request parameters, validates input payloads against Zod schemas, and maps responses to standard HTTP status codes.  
    * **The Service Layer** encapsulates pure business logic, state machines, permission checks, and domain events. It has zero knowledge of Express `req` or `res`.  
    * **The Repository Layer** is the only layer permitted to execute Prisma queries, completely isolating our business logic from database query syntax."*

* **Q2: "What happens if 1,000 students submit clearance requests at the exact same second? How does your system prevent race conditions and crashes?"**  
  * **Answer:** *"First, our database engine employs atomic PostgreSQL transactions (`prisma.$transaction`) with strict unique compound constraints (`@@unique([stageId, officerId])`), guaranteeing that simultaneous submissions cannot create duplicate clearance dockets. Second, our Express server utilizes connection pooling configured with `pg-pool` to queue queries without overflowing database memory. Third, file ingestion writes to disk or cloud asynchronously via streaming buffers, avoiding high memory footprint during concurrency spikes."*

* **Q3: "Why did you implement a BFF Proxy in Next.js instead of letting the React frontend call Express directly?"**  
  * **Answer:** *"Calling the backend directly from browser JavaScript requires storing access tokens in `localStorage` or JavaScript-readable cookies, leaving the system vulnerable to Cross-Site Scripting (XSS) token exfiltration. By implementing a Next.js BFF proxy, our tokens remain encapsulated in encrypted, `httpOnly`, `sameSite: 'lax'` cookies. The browser never directly touches the raw JWT token, ensuring enterprise-grade defense-in-depth."*

---

# 6. DOCKER SETUP, 1-CLICK AUTOMATION SCRIPTS & POST-DEFENSE SUBMISSION PROTOCOL

### 6.1 `docker-compose.yml` Configuration
This configuration containerizes PostgreSQL and the Adminer Database Management GUI for turnkey offline execution.

```yaml
version: '3.8'

services:
  db:
    image: postgres:16-alpine
    container_name: uniclear-postgres
    restart: always
    environment:
      POSTGRES_USER: uniclear
      POSTGRES_PASSWORD: uniclear_password_2026
      POSTGRES_DB: uniclear
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U uniclear -d uniclear"]
      interval: 5s
      timeout: 5s
      retries: 5

  adminer:
    image: adminer:latest
    container_name: uniclear-adminer
    restart: always
    ports:
      - "8080:8080"
    depends_on:
      db:
        condition: service_healthy

volumes:
  pgdata:
    driver: local
```

---

### 6.2 1-Click Startup & Shutdown Scripts

#### Linux / macOS: `start_all.sh`
```bash
#!/bin/bash
echo "========================================================"
echo "    UNICLEAR DEFENSE SYSTEM: 1-CLICK STARTUP SCRIPT     "
echo "========================================================"

# 1. Start Docker Containers
echo "[1/4] Starting PostgreSQL and Adminer containers..."
docker compose up -d

# 2. Wait for Database Readiness
echo "[2/4] Waiting for database healthcheck..."
until docker exec uniclear-postgres pg_isready -U uniclear -d uniclear > /dev/null 2>&1; do
    sleep 1
done
echo "Database is ready!"

# 3. Start Backend API
echo "[3/4] Launching UniClear Express Backend (Port 5000)..."
cd uniclear-backend
npm run dev > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

# 4. Start Frontend
echo "[4/4] Launching UniClear Next.js Frontend (Port 3000)..."
cd uniclear-frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "========================================================"
echo " SYSTEM ACTIVE & READY FOR DEFENSE!"
echo " - Student & Admin Portal: http://localhost:3000"
echo " - Backend API Server:     http://localhost:5000"
echo " - Adminer Database GUI:   http://localhost:8080"
echo " (Press Ctrl+C to terminate or run ./stop_all.sh)"
echo "========================================================"
wait
```

#### Linux / macOS: `stop_all.sh`
```bash
#!/bin/bash
echo "Stopping UniClear defense services..."
killall node 2>/dev/null || true
docker compose down
echo "All defense services terminated safely."
```

#### Windows: `start_all.bat`
```bat
@echo off
title UNICLEAR DEFENSE SYSTEM - STARTUP
echo ========================================================
echo     UNICLEAR DEFENSE SYSTEM: 1-CLICK STARTUP SCRIPT     
echo ========================================================

echo [1/4] Starting PostgreSQL and Adminer via Docker...
docker compose up -d

echo [2/4] Waiting 5 seconds for database initialization...
timeout /t 5 /nobreak >nul

echo [3/4] Launching Backend API in new window...
start "UniClear Backend API (Port 5000)" cmd /k "cd uniclear-backend && npm run dev"

echo [4/4] Launching Frontend UI in new window...
start "UniClear Frontend Portal (Port 3000)" cmd /k "cd uniclear-frontend && npm run dev"

echo ========================================================
echo  SYSTEM ACTIVE & READY FOR DEFENSE!
echo  - Frontend Portal:  http://localhost:3000
echo  - Backend API:      http://localhost:5000
echo  - Adminer DB GUI:   http://localhost:8080
echo ========================================================
pause
```

#### Windows: `stop_all.bat`
```bat
@echo off
title UNICLEAR DEFENSE SYSTEM - SHUTDOWN
echo Stopping all running Node processes and Docker containers...
taskkill /f /im node.exe >nul 2>&1
docker compose down
echo All defense services stopped successfully.
pause
```

---

### 6.3 Post-Defense Submission Protocol (Mandatory Academic Regulations)

Following successful defense conclusion and individual score announcement:

1. **Panel Copy Retrieval:**
   * Immediately collect all marked soft-bound (spiral/comb bound) project copies from the defense panel members and external examiner.
   * Review examiner annotations and marginal critique notes.
2. **3-Day Supervisor Rectification Window:**
   * Within **72 hours (3 days)** of defense, complete every typographical, architectural, diagrammatic, and citation correction highlighted by the panel.
   * Schedule a formal review meeting with your Project Supervisor to verify that all corrections comply with panel requirements. Obtain the Supervisor's signature on the official Certification Page.
3. **Hard-Binding Specifications:**
   * Produce exactly **four (4) copies** bound in standard university **Black Hard-Bound Covers** with gold foil lettering on spine and cover:
     * Copy 1: Departmental Library.
     * Copy 2: University Main Library (Nnamdi Azikiwe Library).
     * Copy 3: Project Supervisor.
     * Copy 4: Group Archive / Personal Candidate Copy.
4. **Digital Archive Media Submission (CD-ROMs):**
   * Prepare **two (2) CD-Rs** labeled with permanent CD marker:
     * Content: Full PDF report, complete clean source code (`uniclear-frontend`, `uniclear-backend`, `docker-compose.yml`), seed datasets, high-resolution output screenshots, and the 6-slide PowerPoint presentation.
     * Affixing Protocol: Enclose each CD in a durable transparent jewel sleeve and firmly tape it to the inside back cover of Copies 1 and 2 using industrial-grade transparent tape (cellotape).
5. **Final Submission Deadline:**
   * Submit all 4 signed hard-bound volumes and 2 taped CD archives to the Departmental Project Coordinator within **strictly seven (7) calendar days** of defense.

---

# 7. DEFENSE DAY CHEAT SHEET

```
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                              DEFENSE DAY CHEAT SHEET                                   │
├────────────────────────────────────────────────────────────────────────────────────────┤
│ 1. 20 Mins Before Entering:                                                            │
│    - Plug in laptop AC power and set screen to "Never Sleep".                          │
│    - Start system: ./start_all.sh (Linux/Mac) OR double-click start_all.bat (Windows).│
│                                                                                        │
│ 2. Browser Tabs Pre-Opened in Chrome:                                                  │
│    - Tab 1: http://localhost:3000                 (Student Portal)                     │
│    - Tab 2: http://localhost:3000/officer/queue   (Officer Review Portal - Incognito)  │
│    - Tab 3: http://localhost:8080                 (Adminer DB GUI)                     │
│    - Tab 4: http://localhost:3000/verify          (Public Certificate Verification)    │
│                                                                                        │
│ 3. The 20-Minute Defense Execution:                                                    │
│    - 00:00 - 05:00: PowerPoint Slides (6 Slides strictly as written in Section 2)      │
│    - 05:00 - 08:20: Member 1 demonstrates Table Schema & Form-to-DB live insertion     │
│    - 08:20 - 11:40: Member 2 demonstrates the 4 Study Objectives on the running UI     │
│    - 11:40 - 15:00: Member 3 demonstrates Unit Functions, BFF Auth & System Modules     │
│    - 15:00 - 20:00: Individual Examiner Q&A and Individual Scoring                     │
└────────────────────────────────────────────────────────────────────────────────────────┘
```
