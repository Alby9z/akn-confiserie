import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const appUrl = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/compte", "/api", "/panier", "/commande", "/connexion", "/inscription", "/media/requests"] }],
    sitemap: `${appUrl}/sitemap.xml`,
    host: appUrl,
  };
}
