import Site from "@/components/Site";
import { profile } from "@/data/site";
import { SITE_URL } from "@/lib/site-url";

// Structured data: tells search engines this is a videographer/photographer based in Dubai
const jsonLd = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: `${profile.firstName} ${profile.lastName}`,
  jobTitle: profile.role,
  url: SITE_URL,
  image: `${SITE_URL}/img/og.jpg`,
  email: `mailto:${profile.email}`,
  telephone: profile.phone.replace(/\s/g, ""),
  address: { "@type": "PostalAddress", addressLocality: "Dubai", addressCountry: "AE" },
  knowsAbout: ["Videography", "Photography", "Brand films", "Real estate video", "Food photography", "Colour grading"],
};

export default function Home() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, String.fromCharCode(92) + "u003c") }} />
      <Site />
    </>
  );
}
