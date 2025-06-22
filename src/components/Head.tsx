import React from 'react';
import { Helmet } from 'react-helmet-async';

interface HeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  imageUrl?: string;
  url?: string;
}

const Head: React.FC<HeadProps> = ({
  title = 'Superteam India Events - Events Platform for India',
  description = 'Find and create events across India. Connect with communities, attend workshops, meetups, and conferences.',
  keywords = 'events, India, community, meetups, tech events, workshops, conferences, superteam',
  imageUrl = '/og-image.jpg',
  url = 'https://superteam.in',
}) => {
  const canonicalUrl = url.endsWith('/') ? url.slice(0, -1) : url;
  
  return (
    <Helmet>
      {/* Basic metadata */}
      <title>{title}</title>
      <meta name="description" content={description} />
      <meta name="keywords" content={keywords} />
      <link rel="canonical" href={canonicalUrl} />
      
      {/* Open Graph tags */}
      <meta property="og:title" content={title} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={imageUrl} />
      <meta property="og:url" content={canonicalUrl} />
      <meta property="og:type" content="website" />
      <meta property="og:site_name" content="Superteam India Events" />
      
      {/* Twitter Card tags */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={imageUrl} />
      
      {/* Additional SEO tags */}
      <meta name="robots" content="index, follow" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      <meta httpEquiv="Content-Type" content="text/html; charset=utf-8" />
      <meta name="language" content="English" />
      <meta name="revisit-after" content="7 days" />
      <meta name="author" content="Superteam India Events" />
      
      {/* Structured Data - Organization */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": "Superteam India Events",
          "url": canonicalUrl,
          "logo": `${canonicalUrl}/logo.png`,
          "sameAs": [
            "https://twitter.com/superteamindia",
            "https://www.facebook.com/superteamindia",
            "https://www.linkedin.com/company/superteamindia"
          ]
        })}
      </script>
    </Helmet>
  );
};

export default Head; 