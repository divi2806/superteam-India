import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface SEOProps {
  title?: string;
  description?: string;
  keywords?: string;
  imageUrl?: string;
  type?: 'website' | 'article' | 'event';
  schemaData?: Record<string, any>;
}

const SEO: React.FC<SEOProps> = ({
  title,
  description,
  keywords,
  imageUrl = '/og-image.jpg',
  type = 'website',
  schemaData,
}) => {
  const location = useLocation();
  const currentUrl = `https://superteam.in${location.pathname}`;
  const pageTitle = title ? `${title} | Superteam India Events` : 'Superteam India Events - Events Platform for India';
  
  // Default schema data
  const defaultSchemaData = {
    "@context": "https://schema.org",
    "@type": type === 'event' ? 'Event' : type === 'article' ? 'Article' : 'WebPage',
    "url": currentUrl,
    "name": title,
    "description": description,
    "image": imageUrl,
  };
  
  const finalSchemaData = schemaData || defaultSchemaData;
  
  return (
    <Helmet>
      <title>{pageTitle}</title>
      {description && <meta name="description" content={description} />}
      {keywords && <meta name="keywords" content={keywords} />}
      <link rel="canonical" href={currentUrl} />
      
      {/* Open Graph */}
      <meta property="og:title" content={pageTitle} />
      {description && <meta property="og:description" content={description} />}
      <meta property="og:url" content={currentUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:image" content={imageUrl} />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={pageTitle} />
      {description && <meta name="twitter:description" content={description} />}
      <meta name="twitter:image" content={imageUrl} />
      
      {/* JSON-LD Schema */}
      <script type="application/ld+json">
        {JSON.stringify(finalSchemaData)}
      </script>
    </Helmet>
  );
};

export default SEO; 