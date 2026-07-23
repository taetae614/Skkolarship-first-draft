import AdminUnlockClient from "@/components/admin/admin-unlock-client";

export default function AdminUnlockPage({
  searchParams,
}: {
  searchParams: { callbackUrl?: string };
}) {
  return <AdminUnlockClient callbackUrl={searchParams.callbackUrl ?? "/admin/scholarships"} />;
}
