import type { Service } from "@/types";
import { supportChannels } from "@/data/support";
import { BRAND } from "@/lib/brand";

/** Canonical origin, used by metadata, the sitemap, robots and structured data. */
export const SITE_URL = `https://${BRAND.domain}`;
export const SITE_NAME = BRAND.name;

const ORG_ID = `${SITE_URL}/#organization`;

type Ld = Record<string, unknown>;

/**
 * Structured data (schema.org JSON-LD) rendered as a script tag, per the
 * Next.js guide: `<` is escaped so content can never close the tag.
 */
export function JsonLd({ data }: Readonly<{ data: Ld | Ld[] }>) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

export const organizationLd = (): Ld => ({
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": ORG_ID,
  name: SITE_NAME,
  url: SITE_URL,
  slogan: BRAND.tagline,
  email: supportChannels.email,
  telephone: supportChannels.phone,
  address: { "@type": "PostalAddress", streetAddress: "2nd Floor, Indiranagar", addressLocality: "Bengaluru", postalCode: "560038", addressCountry: "IN" },
  contactPoint: { "@type": "ContactPoint", contactType: "customer support", telephone: supportChannels.phone, email: supportChannels.email, areaServed: "IN", availableLanguage: ["en"] },
});

export const websiteLd = (): Ld => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: SITE_URL,
  publisher: { "@id": ORG_ID },
  inLanguage: "en-IN",
});

const serviceNode = (s: Service): Ld => ({
  "@type": "Service",
  "@id": `${SITE_URL}/services/${s.slug}#service`,
  name: s.title,
  description: s.description,
  url: `${SITE_URL}/services/${s.slug}`,
  serviceType: s.title,
  provider: { "@id": ORG_ID },
  areaServed: { "@type": "Country", name: "India" },
  hasOfferCatalog: {
    "@type": "OfferCatalog",
    name: `${s.title} — what's included`,
    itemListElement: s.includes.map((inc) => ({ "@type": "Offer", itemOffered: { "@type": "Service", name: inc.title, description: inc.text } })),
  },
});

export const serviceLd = (s: Service): Ld => ({ "@context": "https://schema.org", ...serviceNode(s) });

export const serviceListLd = (list: Service[]): Ld => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  name: `${SITE_NAME} publishing services`,
  itemListElement: list.map((s, i) => ({ "@type": "ListItem", position: i + 1, item: serviceNode(s) })),
});
