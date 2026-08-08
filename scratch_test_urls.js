const { PrismaClient } = require('@prisma/client');

async function testUrl(urlName, connectionString) {
  const client = new PrismaClient({
    datasources: { db: { url: connectionString } }
  });
  try {
    const userCount = await client.user.count();
    const holdingCount = await client.holding.count();
    console.log(`URL [${urlName}]: userCount=${userCount}, holdingCount=${holdingCount}`);
  } catch (err) {
    console.log(`URL [${urlName}] ERROR:`, err.message);
  } finally {
    await client.$disconnect();
  }
}

async function main() {
  const env = process.env;
  await testUrl("DATABASE_URL", env.DATABASE_URL);
  await testUrl("DATABASE_URL_UNPOOLED", env.DATABASE_URL_UNPOOLED);
  await testUrl("POSTGRES_PRISMA_URL", env.POSTGRES_PRISMA_URL);
  await testUrl("POSTGRES_URL_NON_POOLING", env.POSTGRES_URL_NON_POOLING);
}

main();
