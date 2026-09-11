"use client";
import { usePathname } from "next/navigation";
export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return pathname.startsWith("/admin") ? children : <div className="page-transition">{children}</div>;
}
