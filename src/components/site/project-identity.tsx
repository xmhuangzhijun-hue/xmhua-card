import Image from "next/image";
import { Bot, CodeXml, Network, Package, Sparkles, Layers, type LucideIcon } from "lucide-react";
import type { Product } from "@/lib/content-types";

const identities: Record<string, { icon: LucideIcon; tone: string }> = {
  "XMHUA Card": { icon: CodeXml, tone: "blue" },
  "Hermes Agent": { icon: Bot, tone: "amber" },
  "若曦 Shell": { icon: Sparkles, tone: "rose" },
  "Organic Agent OS": { icon: Network, tone: "mint" },
  "pnpm": { icon: Package, tone: "gold" },
};

export function ProjectIdentity({ product }: { product: Product }) {
  const { icon: Icon, tone } = identities[product.name] ?? { icon: Layers, tone: "blue" };
  const custom = product.image && !product.image.endsWith("xmhua-mark.svg");
  return <div className={`project-identity project-identity--${tone}`} aria-hidden="true">
    <div className="project-identity__grid" /><div className="project-identity__orbit" />
    <span className="project-identity__symbol">{custom ? <Image src={product.image} alt="" width={48} height={48} unoptimized /> : <Icon size={44} strokeWidth={1.3} />}</span>
    <span className="project-identity__name">{product.name}</span>
  </div>;
}
