import type { Metadata } from "next";
import { ContentAdmin } from "@/components/admin/content-admin";
import "./admin.css";

export const metadata: Metadata = { title: "内容工作台 · XMHUA" };

export default function AdminPage() { return <ContentAdmin />; }
