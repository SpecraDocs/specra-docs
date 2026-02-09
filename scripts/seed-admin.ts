import 'dotenv/config';
// specra-docs/scripts/seed-admin.ts
import { prisma } from '../lib/db';
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
  } finally {
    await prisma.$disconnect(); // Disconnect Prisma client
  }
}

seedAdminUser();
