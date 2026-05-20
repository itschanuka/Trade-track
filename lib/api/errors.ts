import { NextResponse } from "next/server";

export const unauthorized = () => NextResponse.json({ error: "Unauthorized" }, { status: 401 });

export const forbidden = (msg = "Forbidden") =>
  NextResponse.json({ error: msg }, { status: 403 });

export const notFound = () => NextResponse.json({ error: "Not found" }, { status: 404 });

export const badRequest = (msg: string) => NextResponse.json({ error: msg }, { status: 400 });

export const conflict = (msg: string) => NextResponse.json({ error: msg }, { status: 409 });

export const serverError = () =>
  NextResponse.json({ error: "Internal server error" }, { status: 500 });
