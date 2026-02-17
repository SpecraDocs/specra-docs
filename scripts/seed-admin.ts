import 'dotenv/config';
// specra-docs/scripts/seed-admin.ts
import { prisma } from '../src/lib/server/db';
import bcrypt from 'bcryptjs';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SALT_ROUNDS = 10; // Standard salt rounds for bcrypt

async function seedAdminUser() {
  if (!ADMIN_EMAIL) {
    console.warn('ADMIN_EMAIL environment variable is not set. Skipping admin user seeding.');
    return;
  }

  if (!ADMIN_PASSWORD) {
    console.warn('ADMIN_PASSWORD environment variable is not set. Skipping admin user seeding.');
    return;
  }

  console.log(`Attempting to seed admin user with email: ${ADMIN_EMAIL}`);

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: ADMIN_EMAIL },
    });

    const hashedPassword = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);

    if (existingUser) {
      // Update existing user to ADMIN role and set password
      await prisma.user.update({
        where: { email: ADMIN_EMAIL },
        data: {
          password: hashedPassword,
          role: 'ADMIN',
          emailVerified: new Date(),
        },
      });
      console.log(`Updated user ${ADMIN_EMAIL} to ADMIN role with new password.`);
    } else {
      // Create new admin user
      await prisma.user.create({
        data: {
          email: ADMIN_EMAIL,
          password: hashedPassword,
          name: 'Admin User',
          role: 'ADMIN',
          emailVerified: new Date(),
        },
      });
      console.log(`Successfully created admin user: ${ADMIN_EMAIL}`);
    }

    console.log('Admin user is ready. You can now log in with the credentials from .env file.');

  } catch (error) {
    console.error('Error seeding admin user:', error);
    process.exit(1); // Exit with an error code
  }
}

const plans = [
  {
    slug: 'free',
    name: 'Free',
    priceUsd: 0,
    priceUsdAnnual: 0,
    priceKes: 0,
    priceKesAnnual: 0,
    features: {
      projects: 1,
      seats: 1,
      customDomain: false,
      removeBranding: false,
      aiSearch: false,
      apiDocs: false,
      analytics: false,
      versionHistoryDays: 7,
      passwordPages: false,
      customCssJs: false,
      gitSync: false,
      contactForm: false,
      liveChatWidget: false,
      sso: false,
      rbac: false,
      auditLogs: false,
      sla: false,
      support: 'community',
    },
  },
  {
    slug: 'starter',
    name: 'Starter',
    priceUsd: 1900,
    priceUsdAnnual: 1500,
    priceKes: 2450,
    priceKesAnnual: 2450,
    features: {
      projects: 3,
      seats: 3,
      customDomain: true,
      removeBranding: true,
      aiSearch: false,
      apiDocs: false,
      analytics: 'basic',
      versionHistoryDays: 30,
      passwordPages: true,
      customCssJs: false,
      gitSync: false,
      contactForm: true,
      liveChatWidget: false,
      sso: false,
      rbac: false,
      auditLogs: false,
      sla: false,
      support: 'email',
    },
  },
  {
    slug: 'pro',
    name: 'Pro',
    priceUsd: 4900,
    priceUsdAnnual: 3900,
    priceKes: 6300,
    priceKesAnnual: 6300,
    features: {
      projects: 10,
      seats: 10,
      customDomain: true,
      removeBranding: true,
      aiSearch: true,
      apiDocs: true,
      analytics: 'advanced',
      versionHistoryDays: -1,
      passwordPages: true,
      customCssJs: true,
      gitSync: true,
      contactForm: true,
      liveChatWidget: true,
      sso: false,
      rbac: false,
      auditLogs: false,
      sla: false,
      support: 'priority',
    },
  },
  {
    slug: 'enterprise',
    name: 'Enterprise',
    priceUsd: 14900,
    priceUsdAnnual: 12900,
    priceKes: 19200,
    priceKesAnnual: 19200,
    features: {
      projects: -1,
      seats: -1,
      customDomain: true,
      removeBranding: true,
      aiSearch: true,
      apiDocs: true,
      analytics: 'advanced',
      versionHistoryDays: -1,
      passwordPages: true,
      customCssJs: true,
      gitSync: true,
      contactForm: true,
      liveChatWidget: true,
      sso: true,
      rbac: true,
      auditLogs: true,
      sla: '99.9%',
      support: 'dedicated',
    },
  },
];

async function seedPlans() {
  for (const plan of plans) {
    const data = {
      name: plan.name,
      priceUsd: plan.priceUsd,
      priceUsdAnnual: plan.priceUsdAnnual,
      priceKes: plan.priceKes,
      priceKesAnnual: plan.priceKesAnnual,
      features: plan.features,
    };

    await prisma.plan.upsert({
      where: { slug: plan.slug },
      update: data,
      create: { slug: plan.slug, ...data },
    });
  }
  console.log('Plans seeded.');
}

async function main() {
  try {
    await seedAdminUser();
    await seedPlans();
  } finally {
    await prisma.$disconnect();
  }
}

main();
