import type { Metadata } from "next";
import { TenantStudio } from "@/components/tenant-studio";
import "../saas.css";

export const metadata: Metadata = { title: "博客工作台 · XMHUA" };

export default function StudioPage() { return <TenantStudio />; }
