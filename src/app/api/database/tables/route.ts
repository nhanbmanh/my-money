import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }

    // Get all public base tables from PostgreSQL information schema
    const rawTables = await prisma.$queryRaw<Array<{ table_name: string }>>`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      ORDER BY table_name ASC;
    `;

    const tableNames = rawTables.map((t) => t.table_name);

    // Fetch record counts and column counts for each table
    const tableSummaries = await Promise.all(
      tableNames.map(async (tableName) => {
        try {
          // Count rows
          const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(
            `SELECT COUNT(*) as count FROM "${tableName}"`
          );
          const rowCount = Number(countResult[0]?.count || 0);

          // Count columns
          const columnCountResult = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(
            `SELECT COUNT(*) as count FROM information_schema.columns WHERE table_schema = 'public' AND table_name = '${tableName}'`
          );
          const columnCount = Number(columnCountResult[0]?.count || 0);

          return {
            name: tableName,
            rowCount,
            columnCount,
          };
        } catch (err) {
          console.error(`Error querying info for table ${tableName}:`, err);
          return {
            name: tableName,
            rowCount: 0,
            columnCount: 0,
          };
        }
      })
    );

    const totalRecords = tableSummaries.reduce((sum, t) => sum + t.rowCount, 0);

    return NextResponse.json({
      dbProvider: "PostgreSQL",
      totalTables: tableSummaries.length,
      totalRecords,
      tables: tableSummaries,
    });
  } catch (error: any) {
    console.error("Error in GET /api/database/tables:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch database tables." },
      { status: 500 }
    );
  }
}
