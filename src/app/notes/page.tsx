import type { Metadata } from "next";
import { NotesLibrary } from "@/components/notes-library";
import "./notes.css";

export const metadata: Metadata = {
  title: "公开笔记 | XMHUA",
  description: "XMHUA 关于 AI 产品、Agent、数据系统与独立开发的公开工作笔记。",
};

export default function NotesPage() {
  return <NotesLibrary />;
}
