import React from 'react';
import { NextSeo } from 'next-seo';
import styled from 'styled-components';
import { motion } from 'framer-motion';
import Layout from '../../components/Layout/Layout';
import TeamSection from '../../components/About/TeamSection';
import MissionSection from '../../components/About/MissionSection';
import ValuesSection from '../../components/About/ValuesSection';
import StatsSection from '../../components/About/StatsSection';
import { useAnalytics } from '../../hooks/useAnalytics';

const AboutPage = () => {
  const { trackPageView } = useAnalytics();

  React.useEffect(() => {
    trackPageView('About Page');
  }, [trackPageView]);

  return (
    <>
      <NextSeo
        title="About Us - SaaS Template Framework | Our Story & Mission"
        description="Learn about our mission to democratize SaaS development. We're building tools that help entrepreneurs and developers create enterprise-grade SaaS applications quickly."
        canonical="https://saas-template.com/about"
        openGraph={{
          title: 'About Us - SaaS Template Framework',
          description: 'Learn about our mission to democratize SaaS development.',
          images: [
            {
              url: 'https://saas-template.com/images/about-og.jpg',
              width: 1200,
              height: 630,
              alt: 'About SaaS Template Framework',
            },
          ],
        }}
        additionalMetaTags={[
          {
            name: 'keywords',
            content: 'about SaaS template, company story, mission, team, SaaS development platform',
          },
        ]}
      />

      <Layout>
        <AboutContainer>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <PageHeader>
              <h1>About Us</h1>
              <p>We're on a mission to democratize SaaS development and help entrepreneurs build the next generation of software companies.</p>
            </PageHeader>

            <MissionSection />
            <ValuesSection />
            <StatsSection />
            <TeamSection />
          </motion.div>
        </AboutContainer>
      </Layout>
    </>
  );
};

const AboutContainer = styled.div`
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
    max-width: 800px;
    margin: 0 auto;
    line-height: 1.6;
  }
`;

export default AboutPage;
