import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Default Sources
  const sources = [
    { id: "default-cash", sourceName: "Tiền mặt" },
    { id: "default-bank", sourceName: "Tài khoản Ngân hàng" },
    { id: "default-ewallet", sourceName: "Ví điện tử (Momo/ZaloPay)" }
  ];

  for (const s of sources) {
    await prisma.source.upsert({
      where: { id: s.id },
      update: { sourceName: s.sourceName },
      create: { id: s.id, userId: null, sourceName: s.sourceName }
    });
  }

  // Default Primary Categories
  const categories = [
    { id: "default-uncategorized", categoryName: "Chưa phân loại" },
    { id: "default-food", categoryName: "Ăn uống" },
    { id: "default-living", categoryName: "Sinh hoạt & Hóa đơn" },
    { id: "default-transport", categoryName: "Di chuyển & Xe cộ" },
    { id: "default-shopping", categoryName: "Mua sắm" },
    { id: "default-entertainment", categoryName: "Giải trí & Du lịch" },
    { id: "default-salary", categoryName: "Lương & Thu nhập" }
  ];

  for (const c of categories) {
    await prisma.category.upsert({
      where: { id: c.id },
      update: { categoryName: c.categoryName },
      create: { id: c.id, userId: null, categoryName: c.categoryName }
    });
  }

  console.log("Seeded default sources and categories successfully!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
