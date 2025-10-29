import React from 'react';
import Head from 'next/head';
import { DefaultSeo } from 'next-seo';
import { ThemeProvider } from 'styled-components';
import { QueryClient, QueryClientProvider } from 'react-query';
import { AnalyticsProvider } from '../components/Analytics/AnalyticsProvider';
import { SEOProvider } from '../components/SEO/SEOProvider';
import GlobalStyles from '../styles/GlobalStyles';
import theme from '../styles/theme';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function MyApp({ Component, pageProps }) {
  return (
    <>
      <DefaultSeo
        title="SaaS Template Framework - Build Your SaaS in Minutes"
        description="Comprehensive SaaS template framework with automated deployment, multi-tenancy, and digital marketing setup. Build enterprise-grade SaaS applications quickly."
        canonical="https://saas-template.com"
        openGraph={{
          type: 'website',
          locale: 'en_US',
          url: 'https://saas-template.com',
          siteName: 'SaaS Template Framework',
          images: [
            {
              url: 'https://saas-template.com/images/og-image.jpg',
              width: 1200,
              height: 630,
              alt: 'SaaS Template Framework',
            },
          ],
        }}
        twitter={{
          handle: '@saastemplate',
          site: '@saastemplate',
          cardType: 'summary_large_image',
        }}
        additionalMetaTags={[
          {
            name: 'viewport',
            content: 'width=device-width, initial-scale=1',
          },
          {
            name: 'theme-color',
            content: '#0066cc',
          },
          {
            name: 'robots',
            content: 'index, follow',
          },
          {
            name: 'googlebot',
            content: 'index, follow',
          },
        ]}
      />
      
      <Head>
        <link rel="icon" href="/favicon.ico" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="true" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </Head>

      <QueryClientProvider client={queryClient}>
        <ThemeProvider theme={theme}>
          <AnalyticsProvider>
            <SEOProvider>
              <GlobalStyles />
              <Component {...pageProps} />
            </SEOProvider>
          </AnalyticsProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </>
  );
}

export default MyApp;
