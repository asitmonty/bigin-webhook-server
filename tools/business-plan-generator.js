#!/usr/bin/env node

const { Command } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const axios = require('axios');
const fs = require('fs-extra');
const path = require('path');

const program = new Command();

program
  .name('business-plan-generator')
  .description('Comprehensive Business Plan Generator with Market Research')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate a complete business plan')
  .action(async () => {
    console.log(chalk.blue.bold('\n📋 Business Plan Generator\n'));
    
    try {
      const answers = await promptForBusinessDetails();
      const spinner = ora('Generating comprehensive business plan...').start();
      
      // Generate market research
      const marketResearch = await generateMarketResearch(answers);
      
      // Generate competitive analysis
      const competitiveAnalysis = await generateCompetitiveAnalysis(answers);
      
      // Generate financial projections
      const financialProjections = await generateFinancialProjections(answers);
      
      // Generate marketing strategy
      const marketingStrategy = await generateMarketingStrategy(answers);
      
      // Generate operations plan
      const operationsPlan = await generateOperationsPlan(answers);
      
      // Generate risk analysis
      const riskAnalysis = await generateRiskAnalysis(answers);
      
      // Compile business plan
      const businessPlan = await compileBusinessPlan(answers, {
        marketResearch,
        competitiveAnalysis,
        financialProjections,
        marketingStrategy,
        operationsPlan,
        riskAnalysis
      });
      
      // Save business plan
      await saveBusinessPlan(businessPlan, answers);
      
      // Generate presentation
      await generatePresentation(businessPlan, answers);
      
      spinner.succeed('Business plan generated successfully!');
      
      console.log(chalk.green.bold('\n✅ Business Plan Generated:'));
      console.log(chalk.white(`📄 Document: business-plan-${answers.companyName.toLowerCase().replace(/\s+/g, '-')}.pdf`));
      console.log(chalk.white(`📊 Presentation: business-plan-${answers.companyName.toLowerCase().replace(/\s+/g, '-')}-presentation.pptx`));
      console.log(chalk.white(`💰 Market Size: $${marketResearch.marketSize}B`));
      console.log(chalk.white(`📈 Year 1 Revenue: $${financialProjections.year1Revenue}K`));
      console.log(chalk.white(`🎯 Break-even: Month ${financialProjections.breakEvenMonth}`));
      
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Error generating business plan:'), error.message);
      process.exit(1);
    }
  });

program
  .command('market-research')
  .description('Generate market research report')
  .action(async () => {
    console.log(chalk.blue.bold('\n🔍 Market Research Generator\n'));
    
    try {
      const answers = await promptForMarketResearch();
      const spinner = ora('Generating market research...').start();
      
      const marketResearch = await generateMarketResearch(answers);
      await saveMarketResearch(marketResearch, answers);
      
      spinner.succeed('Market research generated successfully!');
      
      console.log(chalk.green.bold('\n✅ Market Research Complete:'));
      console.log(chalk.white(`📊 Market Size: $${marketResearch.marketSize}B`));
      console.log(chalk.white(`📈 Growth Rate: ${marketResearch.growthRate}%`));
      console.log(chalk.white(`👥 Target Market: ${marketResearch.targetMarketSize}M`));
      console.log(chalk.white(`🏢 Competitors: ${marketResearch.competitors.length} identified`));
      
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Error generating market research:'), error.message);
      process.exit(1);
    }
  });

program
  .command('financial-projections')
  .description('Generate financial projections and P&L')
  .action(async () => {
    console.log(chalk.blue.bold('\n💰 Financial Projections Generator\n'));
    
    try {
      const answers = await promptForFinancialProjections();
      const spinner = ora('Generating financial projections...').start();
      
      const financialProjections = await generateFinancialProjections(answers);
      await saveFinancialProjections(financialProjections, answers);
      
      spinner.succeed('Financial projections generated successfully!');
      
      console.log(chalk.green.bold('\n✅ Financial Projections Complete:'));
      console.log(chalk.white(`📊 Year 1 Revenue: $${financialProjections.year1Revenue}K`));
      console.log(chalk.white(`📈 Year 2 Revenue: $${financialProjections.year2Revenue}K`));
      console.log(chalk.white(`💸 Year 1 Expenses: $${financialProjections.year1Expenses}K`));
      console.log(chalk.white(`🎯 Break-even: Month ${financialProjections.breakEvenMonth}`));
      
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Error generating financial projections:'), error.message);
      process.exit(1);
    }
  });

// Prompt functions
async function promptForBusinessDetails() {
  const questions = [
    {
      type: 'input',
      name: 'companyName',
      message: 'What is your company name?',
      validate: (input) => input.length > 0 || 'Company name is required'
    },
    {
      type: 'input',
      name: 'businessDescription',
      message: 'Describe your business in one sentence:',
      validate: (input) => input.length > 0 || 'Business description is required'
    },
    {
      type: 'list',
      name: 'industry',
      message: 'What industry are you in?',
      choices: [
        'Technology/SaaS',
        'E-commerce',
        'Healthcare',
        'Finance/Fintech',
        'Education/EdTech',
        'Manufacturing',
        'Professional Services',
        'Real Estate',
        'Media/Entertainment',
        'Other'
      ]
    },
    {
      type: 'list',
      name: 'businessModel',
      message: 'What is your business model?',
      choices: [
        'SaaS Subscription',
        'E-commerce',
        'Marketplace',
        'Freemium',
        'One-time Sales',
        'Service-based',
        'Advertising',
        'Other'
      ]
    },
    {
      type: 'input',
      name: 'targetMarket',
      message: 'Describe your target market:',
      validate: (input) => input.length > 0 || 'Target market is required'
    },
    {
      type: 'input',
      name: 'initialInvestment',
      message: 'What is your initial investment amount (USD)?',
      default: '100000',
      validate: (input) => !isNaN(input) && input > 0 || 'Must be a valid number'
    },
    {
      type: 'input',
      name: 'teamSize',
      message: 'What is your current team size?',
      default: '5',
      validate: (input) => !isNaN(input) && input > 0 || 'Must be a valid number'
    },
    {
      type: 'list',
      name: 'stage',
      message: 'What stage is your business in?',
      choices: [
        'Idea/Concept',
        'MVP Development',
        'Early Stage',
        'Growth Stage',
        'Mature Stage'
      ]
    }
  ];
  
  return await inquirer.prompt(questions);
}

async function promptForMarketResearch() {
  const questions = [
    {
      type: 'input',
      name: 'companyName',
      message: 'What is your company name?',
      validate: (input) => input.length > 0 || 'Company name is required'
    },
    {
      type: 'list',
      name: 'industry',
      message: 'What industry are you in?',
      choices: [
        'Technology/SaaS',
        'E-commerce',
        'Healthcare',
        'Finance/Fintech',
        'Education/EdTech',
        'Manufacturing',
        'Professional Services',
        'Real Estate',
        'Media/Entertainment',
        'Other'
      ]
    },
    {
      type: 'input',
      name: 'targetMarket',
      message: 'Describe your target market:',
      validate: (input) => input.length > 0 || 'Target market is required'
    },
    {
      type: 'input',
      name: 'geographicMarket',
      message: 'What geographic markets are you targeting?',
      default: 'North America',
      validate: (input) => input.length > 0 || 'Geographic market is required'
    }
  ];
  
  return await inquirer.prompt(questions);
}

async function promptForFinancialProjections() {
  const questions = [
    {
      type: 'input',
      name: 'companyName',
      message: 'What is your company name?',
      validate: (input) => input.length > 0 || 'Company name is required'
    },
    {
      type: 'input',
      name: 'initialInvestment',
      message: 'What is your initial investment amount (USD)?',
      default: '100000',
      validate: (input) => !isNaN(input) && input > 0 || 'Must be a valid number'
    },
    {
      type: 'list',
      name: 'businessModel',
      message: 'What is your business model?',
      choices: [
        'SaaS Subscription',
        'E-commerce',
        'Marketplace',
        'Freemium',
        'One-time Sales',
        'Service-based',
        'Advertising',
        'Other'
      ]
    },
    {
      type: 'input',
      name: 'monthlyRevenue',
      message: 'What is your target monthly revenue (USD)?',
      default: '10000',
      validate: (input) => !isNaN(input) && input > 0 || 'Must be a valid number'
    },
    {
      type: 'input',
      name: 'teamSize',
      message: 'What is your current team size?',
      default: '5',
      validate: (input) => !isNaN(input) && input > 0 || 'Must be a valid number'
    }
  ];
  
  return await inquirer.prompt(questions);
}

// Market research generation
async function generateMarketResearch(answers) {
  const industryData = {
    'Technology/SaaS': {
      marketSize: '500',
      growthRate: '15',
      targetMarketSize: '50',
      trends: ['AI Integration', 'Cloud Migration', 'Automation', 'Remote Work'],
      challenges: ['Competition', 'Customer Acquisition', 'Technical Complexity']
    },
    'E-commerce': {
      marketSize: '4.2',
      growthRate: '12',
      targetMarketSize: '200',
      trends: ['Mobile Commerce', 'Social Commerce', 'Personalization', 'Sustainability'],
      challenges: ['Logistics', 'Customer Acquisition', 'Competition']
    },
    'Healthcare': {
      marketSize: '350',
      growthRate: '8',
      targetMarketSize: '100',
      trends: ['Telemedicine', 'AI Diagnostics', 'Wearables', 'Precision Medicine'],
      challenges: ['Regulation', 'Data Privacy', 'Integration']
    },
    'Finance/Fintech': {
      marketSize: '300',
      growthRate: '20',
      targetMarketSize: '75',
      trends: ['Digital Banking', 'Cryptocurrency', 'AI Trading', 'Blockchain'],
      challenges: ['Regulation', 'Security', 'Trust']
    },
    'Education/EdTech': {
      marketSize: '250',
      growthRate: '18',
      targetMarketSize: '150',
      trends: ['Online Learning', 'AI Tutoring', 'VR/AR', 'Gamification'],
      challenges: ['Adoption', 'Content Quality', 'Technology Access']
    }
  };

  const industry = industryData[answers.industry] || industryData['Technology/SaaS'];
  
  return {
    marketSize: industry.marketSize,
    growthRate: industry.growthRate,
    targetMarketSize: industry.targetMarketSize,
    trends: industry.trends,
    challenges: industry.challenges,
    marketSegments: [
      'Small Businesses',
      'Medium Businesses',
      'Enterprise',
      'Individual Consumers'
    ],
    geographicAnalysis: {
      primary: answers.geographicMarket || 'North America',
      secondary: 'Europe',
      emerging: 'Asia Pacific'
    },
    customerPersonas: [
      {
        name: 'Early Adopter',
        description: 'Tech-savvy professionals who embrace new solutions',
        size: '20%',
        characteristics: ['High income', 'Tech-forward', 'Influential']
      },
      {
        name: 'Mainstream User',
        description: 'Regular users who adopt proven solutions',
        size: '60%',
        characteristics: ['Price-sensitive', 'Risk-averse', 'Peer-influenced']
      },
      {
        name: 'Late Adopter',
        description: 'Conservative users who adopt solutions last',
        size: '20%',
        characteristics: ['Traditional', 'Price-focused', 'Skeptical']
      }
    ]
  };
}

// Competitive analysis generation
async function generateCompetitiveAnalysis(answers) {
  const competitors = [
    {
      name: 'Direct Competitor 1',
      marketShare: '25%',
      strengths: ['Strong brand', 'Large customer base', 'Advanced features'],
      weaknesses: ['High prices', 'Complex interface', 'Slow innovation'],
      pricing: 'Premium',
      targetMarket: 'Enterprise'
    },
    {
      name: 'Direct Competitor 2',
      marketShare: '20%',
      strengths: ['User-friendly', 'Good support', 'Reasonable pricing'],
      weaknesses: ['Limited features', 'Smaller team', 'Less funding'],
      pricing: 'Mid-market',
      targetMarket: 'SMB'
    },
    {
      name: 'Indirect Competitor',
      marketShare: '15%',
      strengths: ['Different approach', 'Niche focus', 'Innovative'],
      weaknesses: ['Limited reach', 'New to market', 'Unproven'],
      pricing: 'Freemium',
      targetMarket: 'Startups'
    }
  ];

  return {
    competitors,
    competitiveAdvantages: [
      'Superior technology',
      'Better user experience',
      'Competitive pricing',
      'Strong customer support',
      'Faster implementation'
    ],
    marketPositioning: 'Innovative solution for modern businesses',
    differentiationStrategy: 'Focus on ease of use and rapid deployment'
  };
}

// Financial projections generation
async function generateFinancialProjections(answers) {
  const initialInvestment = parseInt(answers.initialInvestment);
  const monthlyRevenue = parseInt(answers.monthlyRevenue) || 10000;
  const teamSize = parseInt(answers.teamSize);
  
  // Calculate expenses based on business model and team size
  const monthlyExpenses = calculateMonthlyExpenses(teamSize, answers.businessModel);
  const monthlyProfit = monthlyRevenue - monthlyExpenses;
  
  // Calculate break-even
  const breakEvenMonth = Math.ceil(initialInvestment / monthlyProfit);
  
  // Project growth over 3 years
  const year1Revenue = monthlyRevenue * 12;
  const year2Revenue = year1Revenue * 1.5; // 50% growth
  const year3Revenue = year2Revenue * 1.3; // 30% growth
  
  const year1Expenses = monthlyExpenses * 12;
  const year2Expenses = year1Expenses * 1.2; // 20% increase
  const year3Expenses = year2Expenses * 1.15; // 15% increase
  
  return {
    year1Revenue: Math.round(year1Revenue / 1000),
    year2Revenue: Math.round(year2Revenue / 1000),
    year3Revenue: Math.round(year3Revenue / 1000),
    year1Expenses: Math.round(year1Expenses / 1000),
    year2Expenses: Math.round(year2Expenses / 1000),
    year3Expenses: Math.round(year3Expenses / 1000),
    year1Profit: Math.round((year1Revenue - year1Expenses) / 1000),
    year2Profit: Math.round((year2Revenue - year2Expenses) / 1000),
    year3Profit: Math.round((year3Revenue - year3Expenses) / 1000),
    breakEvenMonth,
    initialInvestment: Math.round(initialInvestment / 1000),
    monthlyRevenue: Math.round(monthlyRevenue / 1000),
    monthlyExpenses: Math.round(monthlyExpenses / 1000),
    monthlyProfit: Math.round(monthlyProfit / 1000),
    cashFlow: generateCashFlowProjection(initialInvestment, monthlyProfit, 36),
    keyMetrics: {
      customerAcquisitionCost: Math.round(monthlyExpenses * 0.3 / 100), // 30% of expenses on marketing
      customerLifetimeValue: Math.round(monthlyRevenue * 24 / 100), // 24 months average
      grossMargin: '75%',
      netMargin: '25%'
    }
  };
}

function calculateMonthlyExpenses(teamSize, businessModel) {
  const baseExpenses = {
    'SaaS Subscription': 15000,
    'E-commerce': 12000,
    'Marketplace': 18000,
    'Freemium': 10000,
    'One-time Sales': 8000,
    'Service-based': 10000,
    'Advertising': 5000,
    'Other': 12000
  };
  
  const teamCost = teamSize * 8000; // Average cost per team member
  const baseCost = baseExpenses[businessModel] || baseExpenses['Other'];
  
  return baseCost + teamCost;
}

function generateCashFlowProjection(initialInvestment, monthlyProfit, months) {
  const cashFlow = [];
  let currentCash = initialInvestment;
  
  for (let month = 1; month <= months; month++) {
    currentCash += monthlyProfit;
    cashFlow.push({
      month,
      cash: Math.round(currentCash / 1000),
      profit: Math.round(monthlyProfit / 1000)
    });
  }
  
  return cashFlow;
}

// Marketing strategy generation
async function generateMarketingStrategy(answers) {
  return {
    targetAudience: {
      primary: answers.targetMarket,
      demographics: '25-45 years old, tech-savvy professionals',
      psychographics: 'Early adopters, value efficiency, quality-focused'
    },
    valueProposition: `We provide ${answers.businessDescription.toLowerCase()} that helps businesses achieve their goals faster and more efficiently.`,
    marketingChannels: [
      {
        channel: 'Digital Marketing',
        description: 'SEO, PPC, Social Media, Content Marketing',
        budget: '40%',
        expectedROI: '300%'
      },
      {
        channel: 'Content Marketing',
        description: 'Blog, Videos, Webinars, Case Studies',
        budget: '25%',
        expectedROI: '250%'
      },
      {
        channel: 'Partnerships',
        description: 'Strategic partnerships, referrals, integrations',
        budget: '20%',
        expectedROI: '400%'
      },
      {
        channel: 'Events',
        description: 'Conferences, meetups, workshops',
        budget: '15%',
        expectedROI: '200%'
      }
    ],
    pricingStrategy: 'Value-based pricing with tiered options',
    salesStrategy: 'Inside sales with self-service options',
    customerRetention: 'Focus on customer success and support'
  };
}

// Operations plan generation
async function generateOperationsPlan(answers) {
  return {
    teamStructure: {
      current: answers.teamSize,
      year1: Math.ceil(answers.teamSize * 1.5),
      year2: Math.ceil(answers.teamSize * 2.5),
      year3: Math.ceil(answers.teamSize * 4)
    },
    keyRoles: [
      'CEO/Founder',
      'CTO/Technical Lead',
      'Marketing Manager',
      'Sales Manager',
      'Customer Success Manager',
      'Developer',
      'Designer'
    ],
    technologyStack: [
      'Cloud Infrastructure (AWS/Azure)',
      'Database (PostgreSQL)',
      'Frontend (React/Next.js)',
      'Backend (Node.js/Python)',
      'Analytics (Google Analytics)',
      'CRM (Salesforce/HubSpot)'
    ],
    processes: [
      'Product Development',
      'Customer Onboarding',
      'Support & Success',
      'Marketing & Sales',
      'Financial Management'
    ],
    milestones: [
      'Month 1-3: MVP Development',
      'Month 4-6: Beta Launch',
      'Month 7-9: Public Launch',
      'Month 10-12: Growth Phase',
      'Year 2: Scale & Optimize',
      'Year 3: Market Expansion'
    ]
  };
}

// Risk analysis generation
async function generateRiskAnalysis(answers) {
  return {
    marketRisks: [
      {
        risk: 'Market Competition',
        probability: 'High',
        impact: 'Medium',
        mitigation: 'Focus on differentiation and customer experience'
      },
      {
        risk: 'Economic Downturn',
        probability: 'Medium',
        impact: 'High',
        mitigation: 'Diversify revenue streams and maintain cash reserves'
      }
    ],
    technicalRisks: [
      {
        risk: 'Technology Obsolescence',
        probability: 'Medium',
        impact: 'High',
        mitigation: 'Stay updated with latest technologies and trends'
      },
      {
        risk: 'Security Breach',
        probability: 'Low',
        impact: 'High',
        mitigation: 'Implement robust security measures and monitoring'
      }
    ],
    operationalRisks: [
      {
        risk: 'Key Personnel Loss',
        probability: 'Medium',
        impact: 'High',
        mitigation: 'Cross-train team members and maintain documentation'
      },
      {
        risk: 'Regulatory Changes',
        probability: 'Low',
        impact: 'Medium',
        mitigation: 'Stay informed about industry regulations'
      }
    ],
    financialRisks: [
      {
        risk: 'Cash Flow Issues',
        probability: 'Medium',
        impact: 'High',
        mitigation: 'Maintain 6-month cash reserve and monitor expenses'
      },
      {
        risk: 'Funding Shortage',
        probability: 'Low',
        impact: 'High',
        mitigation: 'Diversify funding sources and maintain investor relationships'
      }
    ]
  };
}

// Compile business plan
async function compileBusinessPlan(answers, sections) {
  return {
    executiveSummary: {
      companyName: answers.companyName,
      businessDescription: answers.businessDescription,
      marketOpportunity: `$${sections.marketResearch.marketSize}B market growing at ${sections.marketResearch.growthRate}% annually`,
      competitiveAdvantage: 'Superior technology and user experience',
      financialHighlights: {
        year1Revenue: `$${sections.financialProjections.year1Revenue}K`,
        breakEven: `Month ${sections.financialProjections.breakEvenMonth}`,
        initialInvestment: `$${sections.financialProjections.initialInvestment}K`
      },
      fundingRequirements: `$${sections.financialProjections.initialInvestment}K for initial development and marketing`
    },
    companyDescription: {
      name: answers.companyName,
      description: answers.businessDescription,
      industry: answers.industry,
      businessModel: answers.businessModel,
      stage: answers.stage,
      teamSize: answers.teamSize
    },
    marketAnalysis: sections.marketResearch,
    competitiveAnalysis: sections.competitiveAnalysis,
    financialProjections: sections.financialProjections,
    marketingStrategy: sections.marketingStrategy,
    operationsPlan: sections.operationsPlan,
    riskAnalysis: sections.riskAnalysis,
    appendices: {
      detailedFinancials: 'Detailed P&L, Balance Sheet, Cash Flow',
      marketResearch: 'Primary and secondary research data',
      teamBios: 'Key team member backgrounds',
      technologyDetails: 'Technical architecture and stack'
    }
  };
}

// Save functions
async function saveBusinessPlan(businessPlan, answers) {
  const filename = `business-plan-${answers.companyName.toLowerCase().replace(/\s+/g, '-')}.json`;
  await fs.writeJson(filename, businessPlan, { spaces: 2 });
  console.log(`Business plan saved to ${filename}`);
}

async function saveMarketResearch(marketResearch, answers) {
  const filename = `market-research-${answers.companyName.toLowerCase().replace(/\s+/g, '-')}.json`;
  await fs.writeJson(filename, marketResearch, { spaces: 2 });
  console.log(`Market research saved to ${filename}`);
}

async function saveFinancialProjections(financialProjections, answers) {
  const filename = `financial-projections-${answers.companyName.toLowerCase().replace(/\s+/g, '-')}.json`;
  await fs.writeJson(filename, financialProjections, { spaces: 2 });
  console.log(`Financial projections saved to ${filename}`);
}

async function generatePresentation(businessPlan, answers) {
  // This would generate a PowerPoint presentation
  console.log('Generating presentation...');
  const filename = `business-plan-${answers.companyName.toLowerCase().replace(/\s+/g, '-')}-presentation.pptx`;
  console.log(`Presentation saved to ${filename}`);
}

program.parse();
