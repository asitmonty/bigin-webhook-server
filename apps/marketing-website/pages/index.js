import React from 'react';
import Head from 'next/head';
import { NextSeo } from 'next-seo';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import Layout from '../components/Layout/Layout';
import Hero from '../components/Home/Hero';
import Features from '../components/Home/Features';
import Templates from '../components/Home/Templates';
import Pricing from '../components/Home/Pricing';
import Testimonials from '../components/Home/Testimonials';
import CTA from '../components/Home/CTA';
import FAQ from '../components/Home/FAQ';
import BlogPreview from '../components/Home/BlogPreview';
import { useAnalytics } from '../hooks/useAnalytics';

const HomePage = () => {
  const { trackPageView } = useAnalytics();

  React.useEffect(() => {
    trackPageView('Home Page');
  }, [trackPageView]);

  return (
    <>
      <NextSeo
        title="SaaS Template Framework - Build Your SaaS in Minutes | Home"
        description="Build enterprise-grade SaaS applications in minutes with our comprehensive template framework. Includes multi-tenancy, authentication, payments, and digital marketing automation."
        canonical="https://saas-template.com"
        openGraph={{
          title: 'SaaS Template Framework - Build Your SaaS in Minutes',
          description: 'Build enterprise-grade SaaS applications in minutes with our comprehensive template framework.',
          images: [
            {
              url: 'https://saas-template.com/images/home-og.jpg',
              width: 1200,
              height: 630,
              alt: 'SaaS Template Framework Homepage',
            },
          ],
        }}
        additionalMetaTags={[
          {
            name: 'keywords',
            content: 'SaaS template, SaaS framework, multi-tenant, authentication, payments, digital marketing, Azure deployment',
          },
        ]}
      />

      <Layout>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          <Hero />
          <Features />
          <Templates />
          <Pricing />
          <Testimonials />
          <BlogPreview />
          <FAQ />
          <CTA />
        </motion.div>
      </Layout>
    </>
  );
};

export default HomePage;
