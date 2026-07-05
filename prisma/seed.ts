import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.source.upsert({
    where: { id: "default-cash" },
    update: {},
    create: {
      id: "default-cash",
      userId: null,
      sourceName: "Tiền mặt",
    },
  });

  await prisma.category.upsert({
    where: { id: "default-uncategorized" },
    update: {},
    create: {
      id: "default-uncategorized",
      userId: null,
      categoryName: "Chưa phân loại",
    },
  });

  console.log("Seeded default data");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
