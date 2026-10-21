import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";
import "dotenv/config";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const db = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Platform Owner (role-based user, no university)
  const platformOwner = await db.user.upsert({
    where: { email: "admin@uniclear.ng" },
    update: {},
    create: {
      email: "admin@uniclear.ng",
      passwordHash: await bcrypt.hash("Admin@1234", 12),
      passwordSetAt: new Date(),
      role: "PLATFORM_OWNER",
    },
  });
  console.log("✅ Platform owner created:", platformOwner.email);

  // University: UNN
  const unn = await db.university.upsert({
    where: { slug: "unn" },
    update: {},
    create: {
      name: "University of Nigeria, Nsukka",
      slug: "unn",
      abbreviation: "UNN",
      primaryColor: "#1B4F72",
      accentColor: "#2980B9",
      address: "Nsukka, Enugu State, Nigeria",
      contactEmail: "registrar@unn.edu.ng",
    },
  });

  await db.contractPlan.upsert({
    where: { universityId: unn.id },
    update: {},
    create: {
      universityId: unn.id,
      tier: "STANDARD",
      contractRef: "UNN-2025-001",
    },
  });

  // Super Admin for UNN
  const superAdminUser = await db.user.upsert({
    where: { email: "superadmin@unn.edu.ng" },
    update: {},
    create: {
      email: "superadmin@unn.edu.ng",
      role: "SUPER_ADMIN",
      universityId: unn.id,
      passwordHash: await bcrypt.hash("Admin@1234", 12),
      passwordSetAt: new Date(),
    },
  });
  console.log("✅ UNN super admin created:", superAdminUser.email);

  // Stable seed UUIDs
  const IDS = {
    session: "00000000-0000-0000-0000-000000000001",
    session2526: "00000000-0000-0000-0000-000000000011",
    session2627: "00000000-0000-0000-0000-000000000012",
    stages: Array.from(
      { length: 5 },
      (_, i) => `00000000-0000-0000-0001-${String(i).padStart(12, "0")}`,
    ),
    docTypes: Array.from(
      { length: 4 },
      (_, i) => `00000000-0000-0000-0002-${String(i).padStart(12, "0")}`,
    ),
    faculty: "00000000-0000-0000-0003-000000000000",
    department: "00000000-0000-0000-0004-000000000000",
    officer: "00000000-0000-0000-0005-000000000000",
    student: "00000000-0000-0000-0006-000000000000",
  };

  // Academic Session
  const session = await db.academicSession.upsert({
    where: { id: IDS.session },
    update: {},
    create: {
      id: IDS.session,
      universityId: unn.id,
      name: "2024/2025",
      startDate: new Date("2024-09-01"),
      endDate: new Date("2025-08-31"),
      isActive: true,
    },
  });
  console.log("✅ Academic session created:", session.name);

  // Additional academic sessions (2025 and later are the "active" ones by year rule)
  const session2526 = await db.academicSession.upsert({
    where: { id: IDS.session2526 },
    update: {},
    create: {
      id: IDS.session2526,
      universityId: unn.id,
      name: "2025/2026",
      startDate: new Date("2025-09-01"),
      endDate: new Date("2026-08-31"),
      isActive: false,
    },
  });
  const session2627 = await db.academicSession.upsert({
    where: { id: IDS.session2627 },
    update: {},
    create: {
      id: IDS.session2627,
      universityId: unn.id,
      name: "2026/2027",
      startDate: new Date("2026-09-01"),
      endDate: new Date("2027-08-31"),
      isActive: false,
    },
  });
  console.log(
    "✅ Additional academic sessions created:",
    session2526.name,
    ",",
    session2627.name,
  );

  // Clearance Campaign
  const campaignSeedId = "00000000-0000-0000-0009-000000000000";
  const campaign = await db.clearanceCampaign.upsert({
    where: { id: campaignSeedId },
    update: { name: "Faculty Clearance" },
    create: {
      id: campaignSeedId,
      universityId: unn.id,
      sessionId: session.id,
      name: "Faculty Clearance",
    },
  });
  console.log("✅ Clearance campaign created");

  // Clearance Stages
  const stageNames = [
    "Library Clearance",
    "Bursary / Finance",
    "Medical Centre",
    "Hostel",
    "Faculty Officer",
  ];
  for (let i = 0; i < stageNames.length; i++) {
    await db.clearanceStage.upsert({
      where: { id: IDS.stages[i] },
      update: { name: stageNames[i], orderIndex: i + 1 },
      create: {
        id: IDS.stages[i],
        universityId: unn.id,
        campaignId: campaign.id,
        name: stageNames[i],
        orderIndex: i + 1,
      },
    });
  }
  console.log("✅ UNN stages created");

  // Document Types
  const docTypes = [
    {
      name: "JAMB Admission Letter",
      description: "Upload both Institution and Candidate copies as one PDF",
    },
    {
      name: "Birth Certificate",
      description: "Original or certified true copy",
    },
    {
      name: "Medical Fitness Certificate",
      description: "Signed by a licensed medical doctor",
    },
    { name: "O-Level Result", description: "WAEC or NECO result" },
  ];
  for (let i = 0; i < docTypes.length; i++) {
    await db.documentType.upsert({
      where: { id: IDS.docTypes[i] },
      update: {},
      create: {
        id: IDS.docTypes[i],
        universityId: unn.id,
        ...docTypes[i],
        order: i + 1,
      },
    });
  }
  console.log("✅ UNN document types created");

  // Assign document types to first stage
  const firstStageSeed = IDS.stages[0];
  for (let i = 0; i < IDS.docTypes.length; i++) {
    const existingReq = await db.stageDocumentRequirement.findFirst({
      where: { stageId: firstStageSeed, documentTypeId: IDS.docTypes[i] },
    });

    if (!existingReq) {
      await db.stageDocumentRequirement.create({
        data: {
          universityId: unn.id,
          stageId: firstStageSeed,
          documentTypeId: IDS.docTypes[i],
          isRequired: true,
        },
      });
    }
  }
  console.log("✅ Stage document requirements created");

  // Faculty & Department (Faculty of Physical Sciences)
  const faculty = await db.faculty.upsert({
    where: { id: IDS.faculty },
    update: { name: "Faculty of Physical Sciences" },
    create: {
      id: IDS.faculty,
      universityId: unn.id,
      name: "Faculty of Physical Sciences",
    },
  });

  const physicalScienceDepts = [
    { name: "Computer Science", id: IDS.department },
    { name: "Mathematics", id: "00000000-0000-0000-0004-000000000001" },
    { name: "Statistics", id: "00000000-0000-0000-0004-000000000002" },
    {
      name: "Pure and Industrial Chemistry",
      id: "00000000-0000-0000-0004-000000000003",
    },
    { name: "Geology", id: "00000000-0000-0000-0004-000000000004" },
    { name: "Nuclear Science", id: "00000000-0000-0000-0004-000000000005" },
    {
      name: "Physics and Astronomy",
      id: "00000000-0000-0000-0004-000000000006",
    },
    {
      name: "Science Laboratory Technology",
      id: "00000000-0000-0000-0004-000000000007",
    },
  ];

  for (const dept of physicalScienceDepts) {
    await db.department.upsert({
      where: { id: dept.id },
      update: { name: dept.name, facultyId: faculty.id },
      create: {
        id: dept.id,
        facultyId: faculty.id,
        name: dept.name,
        availableLevels: ["100", "200", "300", "400"],
      },
    });
  }

  const department = await db.department.findUniqueOrThrow({
    where: { id: IDS.department },
  });
  console.log("✅ Faculty of Physical Sciences and departments created");

  // Officer user
  const officerUser = await db.user.upsert({
    where: { email: "officer@unn.edu.ng" },
    update: {},
    create: {
      email: "officer@unn.edu.ng",
      role: "OFFICER",
      universityId: unn.id,
      passwordHash: await bcrypt.hash("Admin@1234", 12),
      passwordSetAt: new Date(),
    },
  });

  // Get first stage to assign officer
  const firstStage = await db.clearanceStage.findFirst({
    where: { universityId: unn.id },
    orderBy: { orderIndex: "asc" },
  });

  const officer = await db.officer.upsert({
    where: { userId: officerUser.id },
    update: {},
    create: {
      id: IDS.officer,
      universityId: unn.id,
      userId: officerUser.id,
      firstName: "Chukwuemeka",
      lastName: "Obi",
    },
  });
  console.log("✅ Officer created:", officerUser.email);

  if (firstStage) {
    const existingAssignment = await db.stageOfficerAssignment.findFirst({
      where: { officerId: officer.id, stageId: firstStage.id },
    });
    if (!existingAssignment) {
      await db.stageOfficerAssignment.create({
        data: {
          officerId: officer.id,
          stageId: firstStage.id,
          universityId: unn.id,
        },
      });
    }
  }

  // Student user
  const studentUser = await db.user.upsert({
    where: { email: "student@unn.edu.ng" },
    update: {},
    create: {
      email: "student@unn.edu.ng",
      role: "STUDENT",
      universityId: unn.id,
      passwordHash: await bcrypt.hash("Admin@1234", 12),
      passwordSetAt: new Date(),
    },
  });

  await db.student.upsert({
    where: { userId: studentUser.id },
    update: {},
    create: {
      id: IDS.student,
      universityId: unn.id,
      userId: studentUser.id,
      jambRegNo: "12345678AB",
      firstName: "Adaeze",
      lastName: "Nwosu",
      facultyId: faculty.id,
      departmentId: department.id,
      level: "100",
    },
  });
  console.log("✅ Student created:", studentUser.email);

  console.log("\n🎉 Seed complete!");
  console.log("Platform Owner  — admin@uniclear.ng         / Admin@1234");
  console.log("UNN Super Admin — superadmin@unn.edu.ng     / Admin@1234");
  console.log("UNN Officer     — officer@unn.edu.ng        / Admin@1234");
  console.log("UNN Student     — student@unn.edu.ng        / Admin@1234");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
