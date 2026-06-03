import { useEffect } from "react";
interface SEOProps { title?: string; description?: string; image?: string; url?: string; }
const D = {
  title: "SkillSwap — Exchange Skills, Grow Together",
  description: "India's peer-to-peer skill exchange. Learn Python, DSA, Design from real experts. Earn credits by teaching. 200 free credits on signup. No money needed.",
  image: "/opengraph.jpg",
  url: "https://skillswap-fawn-mu.vercel.app",
};
export function SEO({ title, description, image, url }: SEOProps) {
  const t = title ? `${title} | SkillSwap` : D.title;
  const d = description ?? D.description;
  const img = image ?? D.image;
  const u = url ?? D.url;
  useEffect(() => {
    document.title = t;
    const set = (name: string, content: string, prop = false) => {
      const attr = prop ? "property" : "name";
      let el = document.querySelector(`meta[${attr}="${name}"]`);
      if (!el) { el = document.createElement("meta"); el.setAttribute(attr, name); document.head.appendChild(el); }
      el.setAttribute("content", content);
    };
    set("description", d);
    set("keywords", "skill exchange, peer learning, mentorship, learn coding, DSA, Python, JavaScript, India, free");
    set("og:title", t, true); set("og:description", d, true);
    set("og:image", img, true); set("og:url", u, true);
    set("og:type", "website", true); set("og:site_name", "SkillSwap", true);
    set("twitter:card", "summary_large_image");
    set("twitter:title", t); set("twitter:description", d); set("twitter:image", img);
    let c = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!c) { c = document.createElement("link") as HTMLLinkElement; c.rel = "canonical"; document.head.appendChild(c); }
    c.href = u;
  }, [t, d, img, u]);
  return null;
}
