import type { Metadata } from "next";
import { getSiteContent } from "@/lib/api-client";
import { HomePage } from "@/components/site/home-page";

export const revalidate = 60;

export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  return {
    title: content.ui.pageTitle,
    description: content.hero.description.replace(/\n/g, " "),
  };
}

export default async function Home() {
  return <HomePage content={await getSiteContent()} />;
}
