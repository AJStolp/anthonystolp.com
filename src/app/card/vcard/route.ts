import { NextResponse } from "next/server";
import { getAgentProfile } from "@/lib/agent-profile";

// Serves the agent's contact info as a downloadable vCard (.vcf) so anyone can
// save Anthony straight to their phone in one tap from the /card page. Mirrors
// the property QR route's file-download pattern (Content-Disposition: attachment).

export const dynamic = "force-static";

// Escape a value for a vCard free-text field per RFC 6350: backslash, comma,
// semicolon, and newline get escaped. Only for text fields (FN, ORG, TITLE,
// NOTE) — NOT structured fields (N, ADR) where ; and , are delimiters.
function esc(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function GET() {
  const p = getAgentProfile();
  const tel = `+1${p.mobilePhone.replace(/\D/g, "")}`;

  const lines = [
    "BEGIN:VCARD",
    "VERSION:3.0",
    "N:Stolp;Anthony;;;",
    `FN:${esc(p.name)}`,
    `ORG:${esc(p.brokerage)}`,
    "TITLE:Realtor",
    `TEL;TYPE=CELL,VOICE:${tel}`,
    `EMAIL;TYPE=INTERNET:${esc(p.replyToEmail)}`,
    `URL:https://${p.websiteDomain}`,
    "ADR;TYPE=WORK:;;W193N10980 Kleinmann Dr;Germantown;WI;53022;USA",
    `NOTE:${esc(
      `Serving ${p.serviceArea}. ${p.licenseState} License #${p.licenseNumber}`,
    )}`,
    "END:VCARD",
  ];
  // vCard lines are CRLF-terminated per spec.
  const vcf = `${lines.join("\r\n")}\r\n`;

  return new NextResponse(vcf, {
    headers: {
      "Content-Type": "text/vcard; charset=utf-8",
      "Content-Disposition": 'attachment; filename="anthony-stolp.vcf"',
      "Cache-Control": "public, max-age=3600",
    },
  });
}
