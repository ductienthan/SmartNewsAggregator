import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  // Create sample sources
  const sources = await Promise.all([
    prisma.source.upsert({
      where: { url: 'https://feeds.bbci.co.uk/news/rss.xml' },
      update: {},
      create: {
        type: 'rss',
        title: 'BBC News',
        url: 'https://feeds.bbci.co.uk/news/rss.xml',
        country: 'GB',
        reputation: 90,
        enabled: true,
      },
    }),
    prisma.source.upsert({
      where: { url: 'https://rss.cnn.com/rss/edition.rss' },
      update: {},
      create: {
        type: 'rss',
        title: 'CNN',
        url: 'https://rss.cnn.com/rss/edition.rss',
        country: 'US',
        reputation: 85,
        enabled: true,
      },
    }),
    prisma.source.upsert({
      where: { url: 'https://feeds.reuters.com/Reuters/worldNews' },
      update: {},
      create: {
        type: 'rss',
        title: 'Reuters World News',
        url: 'https://feeds.reuters.com/Reuters/worldNews',
        country: 'GB',
        reputation: 88,
        enabled: true,
      },
    }),
    prisma.source.upsert({
      where: { url: 'https://feeds.arstechnica.com/arstechnica/index' },
      update: {},
      create: {
        type: 'rss',
        title: 'Ars Technica',
        url: 'https://feeds.arstechnica.com/arstechnica/index',
        country: 'US',
        reputation: 82,
        enabled: true,
      },
    }),
  ]);

  console.log(`✅ Created ${sources.length} sources`);

  // Create sample users
  const users = await Promise.all([
    prisma.user.upsert({
      where: { email: 'admin@smartnews.com' },
      update: {},
      create: {
        email: 'admin@smartnews.com',
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummy_hash_for_admin', // In real app, hash properly
        role: 'ADMIN',
        timezone: 'America/Los_Angeles',
        preferences: {
          create: {
            topics: ['TECHNOLOGY', 'ECONOMICS'],
            region: 'global',
            preferredPublishers: ['BBC News', 'Ars Technica'],
            blockedPublishers: [],
            digestLength: 'STANDARD',
          },
        },
      },
    }),
    prisma.user.upsert({
      where: { email: 'user@example.com' },
      update: {},
      create: {
        email: 'user@example.com',
        passwordHash: '$argon2id$v=19$m=65536,t=3,p=4$dummy_hash_for_user', // In real app, hash properly
        role: 'USER',
        timezone: 'America/New_York',
        preferences: {
          create: {
            topics: ['POLITICS', 'ECONOMICS'],
            region: 'US',
            preferredPublishers: ['CNN', 'Reuters World News'],
            blockedPublishers: [],
            digestLength: 'SHORT',
          },
        },
      },
    }),
  ]);

  console.log(`✅ Created ${users.length} users`);

  // Create sample entities
  const entities = await Promise.all([
    prisma.entity.upsert({
      where: { type_value: { type: 'person', value: 'Joe Biden' } },
      update: {},
      create: {
        type: 'person',
        value: 'Joe Biden',
        meta: { role: 'President', country: 'US' },
      },
    }),
    prisma.entity.upsert({
      where: { type_value: { type: 'org', value: 'Federal Reserve' } },
      update: {},
      create: {
        type: 'org',
        value: 'Federal Reserve',
        meta: { type: 'Central Bank', country: 'US' },
      },
    }),
    prisma.entity.upsert({
      where: { type_value: { type: 'ticker', value: 'AAPL' } },
      update: {},
      create: {
        type: 'ticker',
        value: 'AAPL',
        meta: { company: 'Apple Inc.', sector: 'Technology' },
      },
    }),
  ]);

  console.log(`✅ Created ${entities.length} entities`);

  // Create sample articles
  const articles = await Promise.all([
    prisma.article.upsert({
      where: { url: 'https://example.com/article1' },
      update: {},
      create: {
        sourceId: sources[0].id, // BBC News
        url: 'https://example.com/article1',
        canonicalUrl: 'https://www.bbc.com/news/article1',
        title: 'Global Tech Giants Face New Regulations',
        author: 'John Smith',
        outlet: 'BBC News',
        publishedAt: new Date('2024-01-15T10:00:00Z'),
        lang: 'en',
        paywalled: false,
        cleanedText: 'Technology companies around the world are facing increased regulatory scrutiny...',
        hash: 'hash_article_1',
      },
    }),
    prisma.article.upsert({
      where: { url: 'https://example.com/article2' },
      update: {},
      create: {
        sourceId: sources[1].id, // CNN
        url: 'https://example.com/article2',
        canonicalUrl: 'https://www.cnn.com/article2',
        title: 'Federal Reserve Signals Potential Rate Changes',
        author: 'Jane Doe',
        outlet: 'CNN',
        publishedAt: new Date('2024-01-15T14:30:00Z'),
        lang: 'en',
        paywalled: false,
        cleanedText: 'The Federal Reserve has indicated possible changes to interest rates...',
        hash: 'hash_article_2',
      },
    }),
  ]);

  console.log(`✅ Created ${articles.length} articles`);

  // Create sample clusters
  const clusters = await Promise.all([
    prisma.cluster.upsert({
      where: { representativeId: articles[0].id },
      update: {},
      create: {
        representativeId: articles[0].id,
        centroidEmbedding: Buffer.from('sample_embedding_1'),
      },
    }),
  ]);

  console.log(`✅ Created ${clusters.length} clusters`);

  // Create sample alerts
  const alerts = await Promise.all([
    prisma.alert.upsert({
      where: { id: 'alert_1' },
      update: {},
      create: {
        id: 'alert_1',
        userId: users[0].id,
        query: 'Federal Reserve OR "interest rates"',
        cooldownMinutes: 30,
        channels: ['email'],
      },
    }),
  ]);

  console.log(`✅ Created ${alerts.length} alerts`);

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 