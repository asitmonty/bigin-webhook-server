import React from 'react';
import { NextSeo } from 'next-seo';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import ContactForm from '../../components/Contact/ContactForm';
import ContactInfo from '../../components/Contact/ContactInfo';
import Map from '../../components/Contact/Map';
import { useAnalytics } from '../../hooks/useAnalytics';

const ContactPage = () => {
  const { trackPageView } = useAnalytics();

  React.useEffect(() => {
    trackPageView('Contact Page');
  }, [trackPageView]);

  return (
    <>
      <NextSeo
        title="Contact Us - SaaS Template Framework | Get in Touch"
        description="Get in touch with our SaaS template framework team. We're here to help you build your next SaaS application quickly and efficiently."
        canonical="https://saas-template.com/contact"
        openGraph={{
          title: 'Contact Us - SaaS Template Framework',
          description: 'Get in touch with our SaaS template framework team.',
          images: [
            {
              url: 'https://saas-template.com/images/contact-og.jpg',
              width: 1200,
              height: 630,
              alt: 'Contact SaaS Template Framework',
            },
          ],
        }}
        additionalMetaTags={[
          {
            name: 'keywords',
            content: 'contact SaaS template, support, help, consultation, SaaS development',
          },
        ]}
      />

      <Layout>
        <ContactContainer>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <PageHeader>
              <h1>Contact Us</h1>
              <p>Ready to build your SaaS application? Get in touch with our team.</p>
            </PageHeader>

            <ContactGrid>
              <ContactForm />
              <ContactInfo />
            </ContactGrid>

            <MapSection>
              <Map />
            </MapSection>
          </motion.div>
        </ContactContainer>
      </Layout>
    </>
  );
};

const ContactContainer = styled.div`
  min-height: 100vh;
  padding: 2rem 0;
`;

const PageHeader = styled.div`
  text-align: center;
  margin-bottom: 4rem;
  
  h1 {
    font-size: 3rem;
    font-weight: 700;
    color: ${props => props.theme.colors.primary};
    margin-bottom: 1rem;
  }
  
  p {
    font-size: 1.25rem;
    color: ${props => props.theme.colors.textSecondary};
    max-width: 600px;
    margin: 0 auto;
  }
`;

const ContactGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4rem;
  margin-bottom: 4rem;
  
  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

const MapSection = styled.div`
  margin-top: 4rem;
`;

export default ContactPage;
