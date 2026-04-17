import 'dotenv/config';
import * as path from 'node:path';
import * as argon2 from 'argon2';
import { PrismaClient, FeedSource, ProducerStatus } from '@prisma/client';

const prisma = new PrismaClient();

const ESPORTS = [
  { feedId: 'sr:sport:cs2', name: 'Counter-Strike 2' },
  { feedId: 'sr:sport:dota2', name: 'Dota 2' },
  { feedId: 'sr:sport:lol', name: 'League of Legends' },
  { feedId: 'sr:sport:valorant', name: 'Valorant' },
] as const;

// Oddin exposes multiple producers (live + prematch). The exact IDs used by the
// integration environment will be confirmed in Phase 2 when credentials are
// available. These placeholders let Phase 2 overwrite via upsert without a
// migration.
const PRODUCERS = [
  { id: 1, name: 'live', description: 'Live odds producer (placeholder)' },
  { id: 3, name: 'prematch', description: 'Prematch odds producer (placeholder)' },
] as const;

async function seedSportsAndCategories() {
  for (const sport of ESPORTS) {
    const s = await prisma.sport.upsert({
      where: { source_feedId: { source: FeedSource.oddin, feedId: sport.feedId } },
      update: { name: sport.name },
      create: { source: FeedSource.oddin, feedId: sport.feedId, name: sport.name },
    });

    // Synthetic category per sport - required because Oddin's esports feed has
    // no category level but our hierarchy does.
    await prisma.category.upsert({
      where: {
        source_sportId_feedId: {
          source: FeedSource.manual,
          sportId: s.id,
          feedId: `synthetic:${sport.feedId}`,
        },
      },
      update: { name: sport.name, synthetic: true },
      create: {
        source: FeedSource.manual,
        sportId: s.id,
        feedId: `synthetic:${sport.feedId}`,
        name: sport.name,
        synthetic: true,
      },
    });

    console.log(`seeded sport + synthetic category: ${sport.name}`);
  }
}

async function seedProducers() {
  for (const p of PRODUCERS) {
    await prisma.producer.upsert({
      where: { id: p.id },
      update: { name: p.name, description: p.description },
      create: {
        id: p.id,
        name: p.name,
        description: p.description,
        active: true,
        status: ProducerStatus.unknown,
      },
    });
    console.log(`seeded producer ${p.id} (${p.name})`);
  }
}

async function seedAdminSettings() {
  const defaults: Array<{ key: string; value: unknown }> = [
    { key: 'default_payback_margin', value: 0.05 },
    { key: 'default_bet_delay_seconds', value: 0 },
  ];
  for (const s of defaults) {
    await prisma.adminSetting.upsert({
      where: { key: s.key },
      update: {},
      create: { key: s.key, value: s.value as never },
    });
    console.log(`seeded admin setting: ${s.key}`);
  }
}

async function seedAdminUser() {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn(
      'ADMIN_EMAIL or ADMIN_PASSWORD not set; skipping admin seed. Set them in .env and re-run `pnpm db:seed`.',
    );
    return;
  }

  const passwordHash = await argon2.hash(password, { type: argon2.argon2id });

  await prisma.user.upsert({
    where: { email },
    update: {
      role: 'admin',
      status: 'active',
    },
    create: {
      email,
      passwordHash,
      displayName: 'Admin',
      role: 'admin',
      status: 'active',
      mustChangePassword: true,
    },
  });
  console.log(`seeded admin user: ${email} (mustChangePassword=true)`);
}

async function main() {
  console.log(`seeding database at ${process.env.DATABASE_URL ?? '(no DATABASE_URL)'}`);
  await seedSportsAndCategories();
  await seedProducers();
  await seedAdminSettings();
  await seedAdminUser();
  console.log('seed complete');
}

main()
  .catch((err) => {
    console.error('seed failed:', err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

// keep path import so tsx tree-shaking does not drop dotenv side-effects
void path;
