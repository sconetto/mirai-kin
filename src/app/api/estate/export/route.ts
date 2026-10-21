import { getSession } from "@/lib/auth";
import { getEstate } from "@/services/estate";

const quote = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`;

export async function GET() {
  const session = await getSession();
  if (!session) return new Response("Unauthorized", { status: 401 });

  const estate = await getEstate();
  const lines = ["section,type,name,currency,value,status,notes"];

  for (const account of estate.accounts) {
    lines.push(
      `account,${account.type},${quote(account.name)},${account.currency},${account.balance},,`,
    );
  }
  for (const asset of estate.assets) {
    lines.push(
      `asset,${asset.type},${quote(asset.name)},${asset.currency},${asset.value},,${quote(asset.notes ?? "")}`,
    );
  }
  for (const beneficiary of estate.beneficiaries) {
    lines.push(
      `beneficiary,,${quote(beneficiary.name)},,,,${quote(beneficiary.notes ?? "")}`,
    );
  }
  for (const document of estate.documents) {
    lines.push(
      `document,${document.category},${quote(document.name)},,,${document.status},${quote(document.notes ?? "")}`,
    );
  }

  return new Response(lines.join("\n"), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'attachment; filename="estate-export.csv"',
    },
  });
}
