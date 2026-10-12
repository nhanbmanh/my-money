import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ tableName: string }> }
) {
  try {
    const session = await auth();

    if (!session?.user || session.user.role !== "admin") {
      return NextResponse.json(
        { error: "Access denied. Admin privileges required." },
        { status: 403 }
      );
    }

    const { tableName } = await params;

    // Strict validation to prevent SQL injection on table name
    if (!tableName || !/^[a-zA-Z0-9_]+$/.test(tableName)) {
      return NextResponse.json(
        { error: "Invalid table name format." },
        { status: 400 }
      );
    }

    // Verify table exists in public schema
    const checkTable = await prisma.$queryRawUnsafe<Array<any>>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = '${tableName}'`
    );

    if (!checkTable || checkTable.length === 0) {
      return NextResponse.json(
        { error: `Table '${tableName}' does not exist.` },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
    const search = searchParams.get("search")?.trim() || "";
    const offset = (page - 1) * limit;

    // Fetch column metadata for the table
    const columnsRaw = await prisma.$queryRawUnsafe<
      Array<{
        column_name: string;
        data_type: string;
        is_nullable: string;
        column_default: string | null;
      }>
    >(
      `SELECT column_name, data_type, is_nullable, column_default 
       FROM information_schema.columns 
       WHERE table_schema = 'public' AND table_name = '${tableName}' 
       ORDER BY ordinal_position ASC;`
    );

    const columns = columnsRaw.map((col) => ({
      name: col.column_name,
      type: col.data_type,
      nullable: col.is_nullable === "YES",
      default: col.column_default,
    }));

    let rows: Array<any> = [];
    let totalRows = 0;

    // If search term is present, build a dynamic WHERE clause searching text/varchar columns
    if (search && columns.length > 0) {
      const textColumns = columns.filter((c) =>
        ["text", "character varying", "varchar", "uuid"].includes(c.type.toLowerCase())
      );

      const whereClause = textColumns.length > 0
        ? `WHERE ` + textColumns.map((c) => `"${c.name}"::text ILIKE '%${search.replace(/'/g, "''")}%'`).join(" OR ")
        : "";

      const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(
        `SELECT COUNT(*) as count FROM "${tableName}" ${whereClause}`
      );
      totalRows = Number(countResult[0]?.count || 0);

      rows = await prisma.$queryRawUnsafe<Array<any>>(
        `SELECT * FROM "${tableName}" ${whereClause} LIMIT ${limit} OFFSET ${offset}`
      );
    } else {
      const countResult = await prisma.$queryRawUnsafe<Array<{ count: bigint | number }>>(
        `SELECT COUNT(*) as count FROM "${tableName}"`
      );
      totalRows = Number(countResult[0]?.count || 0);

      rows = await prisma.$queryRawUnsafe<Array<any>>(
        `SELECT * FROM "${tableName}" LIMIT ${limit} OFFSET ${offset}`
      );
    }

    // Convert any BigInt or non-serializable objects in rows
    const sanitizedRows = JSON.parse(
      JSON.stringify(rows, (_, v) => (typeof v === "bigint" ? Number(v) : v))
    );

    // Fetch related users if userId is present
    if (sanitizedRows.length > 0 && columns.some((c) => c.name === "userId")) {
      const userIds = [...new Set(sanitizedRows.map((r: any) => r.userId).filter(Boolean))] as string[];
      if (userIds.length > 0) {
        const usersInfo = await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, email: true, username: true }
        });
        const userMap = new Map(usersInfo.map((u) => [u.id, u.username || u.email]));
        
        sanitizedRows.forEach((row: any) => {
          if (row.userId && userMap.has(row.userId)) {
            row.user_mapping = userMap.get(row.userId);
          }
        });
        
        columns.splice(columns.findIndex((c) => c.name === "userId") + 1, 0, {
          name: "user_mapping",
          type: "virtual",
          nullable: true,
          default: null,
        });
      }
    }

    const totalPages = Math.ceil(totalRows / limit) || 1;

    return NextResponse.json({
      tableName,
      columns,
      rows: sanitizedRows,
      pagination: {
        page,
        limit,
        totalRows,
        totalPages,
      },
    });
  } catch (error: any) {
    console.error(`Error fetching table details for ${params}:`, error);
    return NextResponse.json(
      { error: error?.message || "Failed to fetch table data." },
      { status: 500 }
    );
  }
}
