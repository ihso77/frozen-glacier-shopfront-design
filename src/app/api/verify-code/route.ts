import { NextResponse } from "next/server";

export async function POST(req: Request) {
    return NextResponse.json(
        { error: "This endpoint has been decommissioned for security optimization." },
        { status: 410 }
    );
}
