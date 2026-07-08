import { NextRequest, NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";

// Public endpoint — used from the public application form (applicant photo
// upload) so no auth is required. Deliberately restricted: images only,
// 5MB cap, fixed destination folder — this is not a general file-upload
// endpoint.
const MAX_BYTES = 5 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const formData = await req.formData();
  const file = formData.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are accepted" }, { status: 400 });
  }

  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "Image must be under 5MB" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString("base64");
  const dataUri = `data:${file.type};base64,${base64}`;

  try {
    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "grantispro/applicant-photos",
      resource_type: "image",
      transformation: [{ width: 600, height: 600, crop: "limit" }],
    });
    return NextResponse.json({ url: result.secure_url });
  } catch (err) {
    console.error("Cloudinary upload failed", err);
    return NextResponse.json({ error: "Upload failed. Please try again." }, { status: 500 });
  }
}
