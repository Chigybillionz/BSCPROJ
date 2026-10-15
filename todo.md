# UniClear Project Tracker & Todo List

## 1. Proposal Alignment Check
Your proposal outlines a **Multi-tenant SaaS-based online clearance management system** for the Faculty of Physical Sciences. 
After reviewing the existing codebase, here is how the application matches your proposal:

✅ **Multi-Tenancy & SaaS Architecture:** The database schema correctly uses `universityId` to isolate data among institutions.
✅ **Role-Based Access Control (RBAC):** Roles (Platform Owner, Super Admin, Officer, Student) are fully defined in the Prisma schema.
✅ **Configurable Workflows:** You have `ClearanceStage` and `ClearanceCampaign` models, perfectly matching the dynamic workflow requirement mentioned in Chapter 2.
✅ **Technology Stack:** Next.js, Prisma, PostgreSQL, and JWT are all properly set up and match your methodology chapter.
✅ **PDF Generation:** You already have `pdf-lib` and `react-pdf` in your `package.json`, which aligns with the "Printable Clearance Report" output design.

---

## 2. To-Do List (Expanded for Group Members)

Below is the detailed breakdown of every feature required to finish the system according to Chapter 3 of the proposal. **When creating a GitHub issue, copy the details of the specific task into the issue description.**

### Phase 1: Student Onboarding & Dashboard

**Task 1.1: Student Registration & Profile Setup** — ✅ **DONE**
- **Description:** Allow newly admitted students to register, select their Faculty and Department, and input their JAMB Registration Number.
- **Frontend Tasks:** 
  - [x] Create a registration form (`app/(auth)/register/page.tsx`).
  - [x] Add dropdowns for Faculty and Department selection.
  - [x] Implement form validation using `zod` and `react-hook-form`.
- **Backend Tasks:**
  - [x] Create the API route to handle registration (`api/auth/register`).
  - [x] Hash the password with `bcryptjs` and save the user as a `STUDENT` role in the database.
- **Acceptance Criteria:** A student can create an account and immediately log into the system.

**Task 1.2: Document Upload Module** — ✅ **DONE**
- **Description:** Implement a secure way for students to upload required clearance documents (O-Level, JAMB admission letter, Birth Certificate).
- **Frontend Tasks:**
  - [x] Build a drag-and-drop file upload component in the student dashboard (`ClearanceSubmissionPanel.tsx`).
  - [x] Ensure the UI matches Figure 3.7 (Document Upload Form) from the proposal (format hints, dropzone, preview, progress bar).
- **Backend Tasks:**
  - [x] Set up an endpoint (e.g., `api/v1/documents/upload`) using `multer` to handle file uploads.
  - [x] Integrate local `/uploads` storage provider and Cloudinary option.
  - [x] Save the document URL and metadata into the `Document` table in the database.
- **Acceptance Criteria:** A student can upload a PDF or Image, and the file URL is successfully saved to the database.

**Task 1.3: Student Real-Time Tracking Dashboard** — ✅ **DONE**
- **Description:** Provide a dashboard where the student can see their overall clearance progress across all departments.
- **Frontend Tasks:**
  - [x] Build the dashboard UI (Figure 3.9 from proposal).
  - [x] Create a progress bar showing completion percentage.
  - [x] Display a list of clearance stages (e.g., Library, Bursary) with status badges: `PENDING`, `APPROVED`, or `REJECTED`.
- **Backend Tasks:**
  - [x] Create an endpoint `api/clearance/status` to fetch the student's current stage and all `StageApproval` records.
- **Acceptance Criteria:** The student logs in and instantly sees which departments have cleared them and which are still pending.

---

### Phase 2: Department Officer Workflow

**Task 2.1: Officer Dashboard & Request Queue** — ✅ **DONE**
- **Description:** Clearance officers need a dashboard to see all students who are currently waiting for clearance in their specific department/stage.
- **Frontend Tasks:**
  - [x] Create a data table UI for officers (`app/(tenant)/officer/dashboard/page.tsx`).
  - [x] Show columns: Student Name, Reg Number, Department, and Date Submitted.
- **Backend Tasks:**
  - [x] Create an endpoint `api/officers/queue` that returns only the students whose `currentStageId` matches the officer's assigned stage.
- **Acceptance Criteria:** An officer logs in and sees a list of students waiting for their approval.

**Task 2.2: Document Verification Interface** — ✅ **DONE**
- **Description:** The core verification screen where officers review uploaded documents and make a decision.
- **Frontend Tasks:**
  - [x] Build a split-screen UI: Document viewer on the left (using `react-pdf`), and student details on the right.
  - [x] Add two main action buttons: "Approve" (Green) and "Reject" (Red).
  - [x] If "Reject" is clicked, require the officer to type a reason (Remarks) in a modal.
- **Backend Tasks:**
  - [x] Create `api/clearance/approve` and `api/clearance/reject` endpoints.
  - [x] Update the `StageApproval` table status and advance the student's `currentStageId` to the next stage in the sequence if approved.
- **Acceptance Criteria:** Officers can successfully approve a student, moving them to the next stage, or reject them with feedback.

**Task 2.3: Digital Officer Stamps / Signatures** — ✅ **DONE**
- **Description:** Officers should be able to append their digital signature/stamp to the student's clearance record upon approval.
- **Frontend Tasks:**
  - [x] Allow officers to upload a PNG of their signature/stamp in their profile settings.
- **Backend Tasks:**
  - [x] Save the stamp image URL to the `OfficerStamp` table.
  - [x] When an officer approves a student, link their stamp ID to the approval record.
- **Acceptance Criteria:** Approved stages show a digital stamp as proof of clearance.

---

### Phase 3: Administrator Configuration

**Task 3.1: Workflow Configuration UI** — ✅ **DONE**
- **Description:** Super Admins must be able to define the sequence of clearance (e.g., Library must be cleared before Bursary).
- **Frontend Tasks:**
  - [x] Build a drag-and-drop list (using `@dnd-kit/core`) to reorder `ClearanceStage` items.
  - [x] Create a form to add new stages (e.g., "Medical Centre").
- **Backend Tasks:**
  - [x] Endpoints to create, update, and reorder stages in the `ClearanceStage` table by updating the `orderIndex` field.
- **Acceptance Criteria:** An admin can add a new stage, change its order, and the system dynamically routes students based on the new sequence.

**Task 3.2: User & Role Management** — ✅ **DONE**
- **Description:** Admins need to register departmental officers and assign them to specific clearance stages.
- **Frontend Tasks:**
  - [x] Create a "Manage Users" data table for admins.
  - [x] Add a form to create a new user account, select the "OFFICER" role, and select which Stage they manage from a dropdown.
- **Backend Tasks:**
  - [x] API endpoint to create users and populate the `StageOfficerAssignment` table.
- **Acceptance Criteria:** Admins can successfully create an officer account and assign them to the "Library" stage.

---

### Phase 4: Notifications & Reporting

**Task 4.1: Automated Email & In-App Notifications** — ✅ **DONE**
- **Description:** Keep students informed about their clearance status in real-time to avoid physical visits.
- **Frontend Tasks:**
  - [x] Add a Notification Bell icon in the navbar with a dropdown showing recent alerts.
- **Backend Tasks:**
  - [x] Use `nodemailer` to send an email via Mailpit/Resend whenever a student's stage is Approved or Rejected.
  - [x] Save the alert to the `Notification` database table.
- **Acceptance Criteria:** A student receives an email and an in-app alert stating "Your Library Clearance was approved!"

**Task 4.2: Printable Final Clearance Report (PDF)** — ✅ **DONE**
- **Description:** Once a student clears all stages, generate an official digitally signed PDF certificate.
- **Frontend Tasks:**
  - [x] Show a "Download Clearance Certificate" button on the student dashboard if their status is `COMPLETED`.
- **Backend Tasks:**
  - [x] Use `pdf-lib` to dynamically generate a PDF.
  - [x] Inject the student's name, passport photo, Reg Number, and all the digital stamps from the officers who approved them.
- **Acceptance Criteria:** Student can download a visually appealing, official PDF proving they have been fully cleared.

---

## 3. How to Work Together Using GitHub Issues

To coordinate effectively with your group members, follow this standard Agile workflow:

### Step 1: Create an Issue
1. Go to your repository on GitHub.
2. Click on the **Issues** tab, then click the **New Issue** button.
3. Give it a clear title (e.g., `Build Document Verification UI for Officers`).
4. In the description, copy the specific Task details from this file so the developer knows exactly what to do.

### Step 2: Assign Group Members
- On the right side of the Issue page, click **Assignees** and select the group member responsible for that task. 
- You can also add **Labels** like `frontend`, `backend`, or `high-priority` to keep things organized.

### Step 3: Work on Branches
- When a group member starts working on an issue, they should create a new branch named after the feature. For example, if they are working on Task 2.1:
  `git checkout -b feature/officer-dashboard-task2.1`
- Once they finish coding, they push the branch to GitHub and open a **Pull Request (PR)**.
- Other group members review the PR before merging it into the `main` branch. This ensures nobody accidentally breaks the system!

---


# DONE ✅

**Task 1.1: Student Registration & Profile Setup** has been implemented, connected end-to-end, and verified in both backend and frontend.

---

## 🛠️ Summary of Changes

### 1. Backend (`uniclear-backend`)
- **Registration Schema ([`auth.schema.ts`](file:///c:/Users/User/Desktop/BSCPROJ/uniclear-backend/src/modules/auth/auth.schema.ts))**:
  - Expanded `registerSchema` to accept and validate: `universitySlug`, `firstName`, `lastName`, `email`, `jambRegNo`, `facultyId`, `departmentId`, `password` (min 8 chars), and optional `phone` / `level`.
- **Registration Service Logic ([`auth.service.ts`](file:///c:/Users/User/Desktop/BSCPROJ/uniclear-backend/src/modules/auth/auth.service.ts))**:
  - Validates that the university exists and is active.
  - Validates that the selected `facultyId` and `departmentId` belong to the university.
  - Checks for duplicate email or already-claimed JAMB Reg No.
  - Securely hashes the password with `bcryptjs` (cost factor 12).
  - Creates the `User` account with role `STUDENT`.
  - Creates the student profile in the `Student` table linked to `userId`, saving their faculty and department.
  - Issues signed JWT access and refresh tokens, saving the session refresh token.
- **Academic Structure Endpoints ([`structure/route.ts`](file:///c:/Users/User/Desktop/BSCPROJ/uniclear-backend/src/app/api/v1/structure/route.ts))**:
  - Added public `GET /api/v1/structure/public` endpoint returning faculties and nested departments for registration without requiring prior authentication.
- **Automated Backend Tests ([`auth.spec.ts`](file:///c:/Users/User/Desktop/BSCPROJ/uniclear-backend/src/modules/auth/auth.spec.ts))**:
  - Added unit test suite covering student registration success, missing university, invalid faculty, invalid department, duplicate email, and already-claimed JAMB Reg No. (15/15 tests passing).

### 2. Frontend (`uniclear-frontend`)
- **Next.js Auth Registration Route ([`app/api/auth/register/route.ts`](file:///c:/Users/User/Desktop/BSCPROJ/uniclear-frontend/app/api/auth/register/route.ts))**:
  - Added the server-side API proxy route that forwards registration to the backend, sets `access_token` and `refresh_token` in secure `httpOnly` cookies, sets `tenant_slug`, and returns the user object.
- **UI Components & API Clients**:
  - Created reusable [`Select`](file:///c:/Users/User/Desktop/BSCPROJ/uniclear-frontend/components/ui/select.tsx) component supporting labels, error feedback, icons, and styling consistent with design tokens.
  - Updated [`auth.api.ts`](file:///c:/Users/User/Desktop/BSCPROJ/uniclear-frontend/lib/api/auth.api.ts) with `RegisterDto`.
  - Updated [`structure.api.ts`](file:///c:/Users/User/Desktop/BSCPROJ/uniclear-frontend/lib/api/structure.api.ts) with `getPublicStructure`.
  - Created [`useRegister.ts`](file:///c:/Users/User/Desktop/BSCPROJ/uniclear-frontend/features/auth/hooks/useRegister.ts) React Query mutation hook.
- **Student Registration Page ([`app/(auth)/register/page.tsx`](file:///c:/Users/User/Desktop/BSCPROJ/uniclear-frontend/app/(auth)/register/page.tsx))**:
  - Full registration UI with university branding, First Name, Last Name, JAMB Registration Number, Faculty dropdown, cascading Department dropdown, Email, Password, Confirm Password, and optional Phone number.
  - Integrated `zod` and `react-hook-form` validation with inline error feedback.
  - Password show/hide toggle.
  - Automatically signs in the student upon registration and redirects straight to the student dashboard (`/student/dashboard`).

---

## 🧪 How to Test It

### Method 1: Interactive Browser Test (Recommended)
1. Ensure both dev servers are running:
   - Backend: `http://localhost:5001`
   - Frontend: `http://localhost:3000`
2. Open your browser and navigate to:
   ```
   http://localhost:3000/register?tenant=unn
   ```
3. **Verify UI & Form Elements**:
   - Check that the left branding panel displays **"University of Nigeria, Nsukka"**.
   - Check the inputs: First Name, Last Name, JAMB Registration Number, Phone, Faculty, Department, Email, Password, Confirm Password.
4. **Test Dynamic Cascading Dropdowns**:
   - Notice the **Department** dropdown is initially disabled prompting *"Select faculty first"*.
   - Click the **Faculty** dropdown and select **"Faculty of Engineering"**.
   - Notice the **Department** dropdown automatically enables and populates with **"Computer Engineering"**. Select it.
5. **Test Form Validation**:
   - Try submitting with empty fields or mismatched passwords to verify the red validation errors.
6. **Submit a New Student Registration**:
   - **First Name:** `Emeka`
   - **Last Name:** `Nwankwo`
   - **JAMB Reg No:** `2024778899EN`
   - **Faculty:** `Faculty of Engineering`
   - **Department:** `Computer Engineering`
   - **Email:** `emeka.nwankwo@unn.edu.ng`
   - **Password:** `StudentPass@123`
   - **Confirm Password:** `StudentPass@123`
   - Click **"Complete Registration & Sign In"**.
7. **Verify Acceptance Criteria**:
   - A success toast notification will appear: *"Registration successful! Welcome to UniClear."*
   - The browser will instantly authenticate and redirect you to the student clearance tracking dashboard at:
     ```
     http://localhost:3000/student/dashboard
     ```
8. **Test Immediate Re-Login**:
   - Log out or open an incognito tab and navigate to `http://localhost:3000/login?tenant=unn`.
   - Enter `emeka.nwankwo@unn.edu.ng` and `StudentPass@123`.
   - Verify you can log straight back into the student dashboard.

---

### Method 2: Automated Unit Tests
To verify all unit tests in the backend:
```powershell
cd uniclear-backend
npm test -- src/modules/auth/auth.spec.ts
```
Expected output:
```
PASS src/modules/auth/auth.spec.ts
  AuthService
    login ...
    register
      √ should successfully register a new student and return tokens
      √ should throw NotFoundError if university is not found
      √ should throw ValidationError if faculty is not found in university
      √ should throw ValidationError if department is not found in faculty
      √ should throw AuthError if email already exists
      √ should throw AuthError if JAMB Reg No is already claimed
```