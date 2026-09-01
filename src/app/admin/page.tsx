import type { Metadata } from "next";
import { AdminConsole } from "@/components/admin/admin-console";
import "./admin.css";

export const metadata: Metadata = {
  title: "内容后台 · XMHUA",
  // The console must never be indexed or previewed by crawlers.
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AdminConsole />;
}
