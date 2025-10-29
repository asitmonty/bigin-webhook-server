#!/usr/bin/env node

const { Command } = require('commander');
const inquirer = require('inquirer');
const chalk = require('chalk');
const ora = require('ora');
const fs = require('fs-extra');
const path = require('path');

const program = new Command();

program
  .name('video-content-generator')
  .description('Starter Video Content Framework Generator')
  .version('1.0.0');

program
  .command('generate')
  .description('Generate starter video content plan')
  .action(async () => {
    console.log(chalk.blue.bold('\n🎥 Video Content Generator\n'));
    
    try {
      const answers = await promptForVideoContent();
      const spinner = ora('Generating video content plan...').start();
      
      // Generate video content plan
      const videoPlan = await generateVideoContentPlan(answers);
      
      // Generate video scripts
      const scripts = await generateVideoScripts(answers);
      
      // Generate production timeline
      const timeline = await generateProductionTimeline(answers);
      
      // Generate equipment recommendations
      const equipment = await generateEquipmentRecommendations(answers);
      
      // Save video content plan
      await saveVideoContentPlan(videoPlan, answers);
      
      // Save scripts
      await saveVideoScripts(scripts, answers);
      
      spinner.succeed('Video content plan generated successfully!');
      
      console.log(chalk.green.bold('\n✅ Video Content Plan Generated:'));
      console.log(chalk.white(`📹 Total Videos: ${videoPlan.totalVideos}`));
      console.log(chalk.white(`⏱️  Total Duration: ${videoPlan.totalDuration} minutes`));
      console.log(chalk.white(`📅 Production Timeline: ${timeline.totalWeeks} weeks`));
      console.log(chalk.white(`💰 Estimated Budget: $${equipment.totalBudget}`));
      
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Error generating video content:'), error.message);
      process.exit(1);
    }
  });

program
  .command('scripts')
  .description('Generate video scripts')
  .action(async () => {
    console.log(chalk.blue.bold('\n📝 Video Script Generator\n'));
    
    try {
      const answers = await promptForScripts();
      const spinner = ora('Generating video scripts...').start();
      
      const scripts = await generateVideoScripts(answers);
      await saveVideoScripts(scripts, answers);
      
      spinner.succeed('Video scripts generated successfully!');
      
      console.log(chalk.green.bold('\n✅ Scripts Generated:'));
      console.log(chalk.white(`📝 Total Scripts: ${scripts.length}`));
      console.log(chalk.white(`⏱️  Average Length: ${scripts[0]?.estimatedDuration || 0} minutes`));
      
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Error generating scripts:'), error.message);
      process.exit(1);
    }
  });

program
  .command('equipment')
  .description('Generate equipment recommendations')
  .action(async () => {
    console.log(chalk.blue.bold('\n🎬 Equipment Recommendations\n'));
    
    try {
      const answers = await promptForEquipment();
      const spinner = ora('Generating equipment recommendations...').start();
      
      const equipment = await generateEquipmentRecommendations(answers);
      await saveEquipmentRecommendations(equipment, answers);
      
      spinner.succeed('Equipment recommendations generated successfully!');
      
      console.log(chalk.green.bold('\n✅ Equipment Recommendations:'));
      console.log(chalk.white(`💰 Total Budget: $${equipment.totalBudget}`));
      console.log(chalk.white(`📹 Camera: ${equipment.camera.name}`));
      console.log(chalk.white(`🎤 Audio: ${equipment.audio.name}`));
      console.log(chalk.white(`💡 Lighting: ${equipment.lighting.name}`));
      
    } catch (error) {
      console.error(chalk.red.bold('\n❌ Error generating equipment recommendations:'), error.message);
      process.exit(1);
    }
  });

// Prompt functions
async function promptForVideoContent() {
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
      message: 'Describe your business:',
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
        'Finance',
        'Education',
        'Professional Services',
        'Other'
      ]
    },
    {
      type: 'list',
      name: 'budget',
      message: 'What is your video production budget?',
      choices: [
        { name: 'Low ($0-$5,000)', value: 'low' },
        { name: 'Medium ($5,000-$25,000)', value: 'medium' },
        { name: 'High ($25,000+)', value: 'high' }
      ]
    },
    {
      type: 'checkbox',
      name: 'videoTypes',
      message: 'What types of videos do you want to create?',
      choices: [
        { name: 'Product Demo', value: 'demo' },
        { name: 'Company Introduction', value: 'intro' },
        { name: 'Tutorial/How-to', value: 'tutorial' },
        { name: 'Customer Testimonial', value: 'testimonial' },
        { name: 'Behind the Scenes', value: 'behind-scenes' },
        { name: 'Webinar/Educational', value: 'webinar' },
        { name: 'Social Media Content', value: 'social' },
        { name: 'Marketing/Advertising', value: 'marketing' }
      ],
      default: ['demo', 'intro', 'tutorial']
    },
    {
      type: 'input',
      name: 'targetAudience',
      message: 'Describe your target audience:',
      default: 'Small to medium businesses'
    }
  ];
  
  return await inquirer.prompt(questions);
}

async function promptForScripts() {
  const questions = [
    {
      type: 'input',
      name: 'companyName',
      message: 'What is your company name?',
      validate: (input) => input.length > 0 || 'Company name is required'
    },
    {
      type: 'list',
      name: 'scriptType',
      message: 'What type of script do you want to generate?',
      choices: [
        'Product Demo',
        'Company Introduction',
        'Tutorial',
        'Customer Testimonial',
        'Marketing Video',
        'Educational Content'
      ]
    },
    {
      type: 'input',
      name: 'duration',
      message: 'What is the target duration (minutes)?',
      default: '2',
      validate: (input) => !isNaN(input) && input > 0 || 'Must be a valid number'
    },
    {
      type: 'input',
      name: 'keyPoints',
      message: 'What are the key points to cover (comma-separated)?',
      default: 'Problem, Solution, Benefits, Call to Action'
    }
  ];
  
  return await inquirer.prompt(questions);
}

async function promptForEquipment() {
  const questions = [
    {
      type: 'list',
      name: 'budget',
      message: 'What is your equipment budget?',
      choices: [
        { name: 'Budget ($500-$2,000)', value: 'budget' },
        { name: 'Mid-range ($2,000-$10,000)', value: 'mid-range' },
        { name: 'Professional ($10,000+)', value: 'professional' }
      ]
    },
    {
      type: 'list',
      name: 'productionType',
      message: 'What type of production are you planning?',
      choices: [
        'Indoor Studio',
        'Outdoor/Location',
        'Mixed (Indoor/Outdoor)',
        'Remote/Online'
      ]
    },
    {
      type: 'checkbox',
      name: 'equipmentNeeds',
      message: 'What equipment do you need?',
      choices: [
        { name: 'Camera', value: 'camera' },
        { name: 'Audio Equipment', value: 'audio' },
        { name: 'Lighting', value: 'lighting' },
        { name: 'Tripod/Stabilization', value: 'tripod' },
        { name: 'Editing Software', value: 'editing' },
        { name: 'Storage/Media', value: 'storage' }
      ],
      default: ['camera', 'audio', 'lighting']
    }
  ];
  
  return await inquirer.prompt(questions);
}

// Video content plan generation
async function generateVideoContentPlan(answers) {
  const videoTypes = answers.videoTypes;
  const totalVideos = videoTypes.length * 3; // 3 videos per type
  
  const videoPlan = {
    companyName: answers.companyName,
    businessDescription: answers.businessDescription,
    industry: answers.industry,
    budget: answers.budget,
    targetAudience: answers.targetAudience,
    totalVideos,
    totalDuration: totalVideos * 3, // Average 3 minutes per video
    videoTypes: videoTypes.map(type => ({
      type,
      count: 3,
      duration: 3,
      purpose: getVideoPurpose(type),
      description: getVideoDescription(type)
    })),
    contentCalendar: generateContentCalendar(videoTypes),
    distributionStrategy: generateDistributionStrategy(answers.industry),
    successMetrics: [
      'Views',
      'Engagement Rate',
      'Click-through Rate',
      'Conversion Rate',
      'Brand Awareness'
    ]
  };
  
  return videoPlan;
}

function getVideoPurpose(type) {
  const purposes = {
    'demo': 'Showcase product features and benefits',
    'intro': 'Introduce company and team',
    'tutorial': 'Educate users on product usage',
    'testimonial': 'Build trust through customer stories',
    'behind-scenes': 'Humanize brand and show company culture',
    'webinar': 'Provide educational content',
    'social': 'Engage audience on social platforms',
    'marketing': 'Drive conversions and sales'
  };
  
  return purposes[type] || 'Engage and inform audience';
}

function getVideoDescription(type) {
  const descriptions = {
    'demo': 'Product demonstration showing key features and benefits',
    'intro': 'Company introduction video with team and mission',
    'tutorial': 'Step-by-step tutorial on how to use the product',
    'testimonial': 'Customer testimonial highlighting success stories',
    'behind-scenes': 'Behind-the-scenes look at company culture and processes',
    'webinar': 'Educational webinar on industry topics',
    'social': 'Short-form content for social media platforms',
    'marketing': 'Marketing video focused on conversion and sales'
  };
  
  return descriptions[type] || 'Engaging video content';
}

function generateContentCalendar(videoTypes) {
  const calendar = [];
  let week = 1;
  
  videoTypes.forEach(type => {
    for (let i = 0; i < 3; i++) {
      calendar.push({
        week,
        videoType: type,
        title: `${type.charAt(0).toUpperCase() + type.slice(1)} Video ${i + 1}`,
        status: 'Planned',
        priority: i === 0 ? 'High' : 'Medium'
      });
      week += 2; // Release every 2 weeks
    }
  });
  
  return calendar;
}

function generateDistributionStrategy(industry) {
  const strategies = {
    'Technology/SaaS': ['YouTube', 'LinkedIn', 'Company Website', 'Product Pages'],
    'E-commerce': ['YouTube', 'Instagram', 'Facebook', 'TikTok'],
    'Healthcare': ['YouTube', 'LinkedIn', 'Professional Networks'],
    'Finance': ['YouTube', 'LinkedIn', 'Professional Networks'],
    'Education': ['YouTube', 'Educational Platforms', 'Social Media'],
    'Professional Services': ['YouTube', 'LinkedIn', 'Company Website'],
    'Other': ['YouTube', 'Social Media', 'Company Website']
  };
  
  return strategies[industry] || ['YouTube', 'Social Media', 'Company Website'];
}

// Video scripts generation
async function generateVideoScripts(answers) {
  const scripts = [];
  
  // Generate main script
  const mainScript = generateMainScript(answers);
  scripts.push(mainScript);
  
  // Generate variations
  const variations = generateScriptVariations(answers);
  scripts.push(...variations);
  
  return scripts;
}

function generateMainScript(answers) {
  const scriptType = answers.scriptType;
  const duration = parseInt(answers.duration);
  const keyPoints = answers.keyPoints.split(',').map(point => point.trim());
  
  const script = {
    title: `${scriptType} Script - ${answers.companyName}`,
    type: scriptType,
    duration: duration,
    keyPoints: keyPoints,
    structure: generateScriptStructure(scriptType, duration),
    content: generateScriptContent(scriptType, keyPoints, answers.companyName),
    estimatedDuration: duration,
    productionNotes: generateProductionNotes(scriptType),
    callToAction: generateCallToAction(scriptType)
  };
  
  return script;
}

function generateScriptStructure(type, duration) {
  const structures = {
    'Product Demo': ['Hook (0-15s)', 'Problem (15-30s)', 'Solution (30-90s)', 'Demo (90-120s)', 'CTA (120-150s)'],
    'Company Introduction': ['Hook (0-15s)', 'Company Story (15-60s)', 'Team (60-90s)', 'Mission (90-120s)', 'CTA (120-150s)'],
    'Tutorial': ['Introduction (0-15s)', 'Step 1 (15-45s)', 'Step 2 (45-75s)', 'Step 3 (75-105s)', 'Summary (105-120s)'],
    'Customer Testimonial': ['Hook (0-15s)', 'Customer Intro (15-30s)', 'Problem (30-60s)', 'Solution (60-90s)', 'Results (90-120s)', 'CTA (120-150s)'],
    'Marketing Video': ['Hook (0-15s)', 'Problem (15-45s)', 'Solution (45-90s)', 'Benefits (90-120s)', 'CTA (120-150s)'],
    'Educational Content': ['Introduction (0-15s)', 'Topic Overview (15-45s)', 'Main Content (45-105s)', 'Summary (105-120s)', 'CTA (120-150s)']
  };
  
  return structures[type] || structures['Product Demo'];
}

function generateScriptContent(type, keyPoints, companyName) {
  const content = {
    hook: `Welcome to ${companyName}! Today, we're going to show you something that will change the way you work.`,
    problem: `Many businesses struggle with [problem]. This leads to [consequences].`,
    solution: `At ${companyName}, we've developed a solution that [benefits].`,
    demo: `Let me show you how it works...`,
    benefits: `With our solution, you can [benefit 1], [benefit 2], and [benefit 3].`,
    callToAction: `Ready to get started? Visit our website or contact us today!`
  };
  
  return content;
}

function generateProductionNotes(type) {
  const notes = {
    'Product Demo': [
      'Use screen recording for product demonstration',
      'Ensure good lighting for presenter',
      'Use external microphone for clear audio',
      'Prepare product screenshots as backup'
    ],
    'Company Introduction': [
      'Film in professional setting',
      'Use company branding in background',
      'Include team members in shots',
      'Use upbeat background music'
    ],
    'Tutorial': [
      'Use clear, step-by-step instructions',
      'Include text overlays for key points',
      'Use zoom features for detailed views',
      'Provide downloadable resources'
    ],
    'Customer Testimonial': [
      'Use natural lighting',
      'Ensure customer comfort',
      'Include company logos',
      'Use professional audio equipment'
    ],
    'Marketing Video': [
      'Use compelling visuals',
      'Include customer success metrics',
      'Use professional voiceover',
      'Include clear call-to-action'
    ],
    'Educational Content': [
      'Use clear, engaging visuals',
      'Include relevant examples',
      'Use professional presentation style',
      'Provide additional resources'
    ]
  };
  
  return notes[type] || notes['Product Demo'];
}

function generateCallToAction(type) {
  const ctas = {
    'Product Demo': 'Try our product free for 14 days!',
    'Company Introduction': 'Learn more about our company!',
    'Tutorial': 'Download our free guide!',
    'Customer Testimonial': 'Join our satisfied customers!',
    'Marketing Video': 'Start your free trial today!',
    'Educational Content': 'Get more resources!'
  };
  
  return ctas[type] || 'Contact us for more information!';
}

function generateScriptVariations(answers) {
  const variations = [];
  
  // Short version (30 seconds)
  variations.push({
    title: `${answers.scriptType} Script - Short Version`,
    type: answers.scriptType,
    duration: 0.5,
    keyPoints: answers.keyPoints.split(',').slice(0, 2),
    structure: ['Hook (0-10s)', 'Main Point (10-25s)', 'CTA (25-30s)'],
    content: generateScriptContent(answers.scriptType, answers.keyPoints.split(',').slice(0, 2), answers.companyName),
    estimatedDuration: 0.5,
    productionNotes: ['Keep it concise', 'Use strong visuals', 'Clear call-to-action'],
    callToAction: generateCallToAction(answers.scriptType)
  });
  
  // Long version (5 minutes)
  variations.push({
    title: `${answers.scriptType} Script - Extended Version`,
    type: answers.scriptType,
    duration: 5,
    keyPoints: answers.keyPoints.split(','),
    structure: ['Hook (0-15s)', 'Introduction (15-60s)', 'Main Content (60-240s)', 'Summary (240-270s)', 'CTA (270-300s)'],
    content: generateScriptContent(answers.scriptType, answers.keyPoints.split(','), answers.companyName),
    estimatedDuration: 5,
    productionNotes: ['Include detailed examples', 'Use multiple camera angles', 'Add graphics and animations'],
    callToAction: generateCallToAction(answers.scriptType)
  });
  
  return variations;
}

// Equipment recommendations generation
async function generateEquipmentRecommendations(answers) {
  const budget = answers.budget;
  const productionType = answers.productionType;
  const equipmentNeeds = answers.equipmentNeeds;
  
  const equipment = {
    budget: budget,
    productionType: productionType,
    equipmentNeeds: equipmentNeeds,
    camera: getCameraRecommendation(budget),
    audio: getAudioRecommendation(budget),
    lighting: getLightingRecommendation(budget, productionType),
    tripod: getTripodRecommendation(budget),
    editing: getEditingRecommendation(budget),
    storage: getStorageRecommendation(budget),
    totalBudget: 0
  };
  
  // Calculate total budget
  equipment.totalBudget = Object.values(equipment)
    .filter(item => typeof item === 'object' && item.price)
    .reduce((total, item) => total + item.price, 0);
  
  return equipment;
}

function getCameraRecommendation(budget) {
  const cameras = {
    'budget': {
      name: 'Smartphone (iPhone 13/14 or Samsung Galaxy S22)',
      price: 0,
      description: 'Use existing smartphone with good camera',
      pros: ['No additional cost', 'Easy to use', 'Good quality'],
      cons: ['Limited control', 'Battery life', 'Storage limitations']
    },
    'mid-range': {
      name: 'Canon EOS M50 Mark II',
      price: 600,
      description: 'Mirrorless camera with 4K video capability',
      pros: ['4K video', 'Good autofocus', 'Compact size'],
      cons: ['Limited battery life', 'Small sensor']
    },
    'professional': {
      name: 'Sony A7S III',
      price: 3500,
      description: 'Professional mirrorless camera with excellent low-light performance',
      pros: ['4K 60fps', 'Excellent low-light', 'Professional features'],
      cons: ['Expensive', 'Complex menu system']
    }
  };
  
  return cameras[budget] || cameras['budget'];
}

function getAudioRecommendation(budget) {
  const audio = {
    'budget': {
      name: 'Rode VideoMic Me-L',
      price: 60,
      description: 'Compact microphone for smartphones',
      pros: ['Affordable', 'Easy to use', 'Good quality'],
      cons: ['Limited range', 'Battery dependent']
    },
    'mid-range': {
      name: 'Rode Wireless GO II',
      price: 300,
      description: 'Wireless microphone system',
      pros: ['Wireless', 'Good range', 'Dual channel'],
      cons: ['Requires charging', 'Setup complexity']
    },
    'professional': {
      name: 'Sennheiser MKE 600',
      price: 400,
      description: 'Professional shotgun microphone',
      pros: ['Excellent quality', 'Directional', 'Professional grade'],
      cons: ['Requires boom pole', 'More setup']
    }
  };
  
  return audio[budget] || audio['budget'];
}

function getLightingRecommendation(budget, productionType) {
  const lighting = {
    'budget': {
      name: 'Neewer 660 LED Panel',
      price: 50,
      description: 'Basic LED panel for indoor lighting',
      pros: ['Affordable', 'Easy to use', 'Adjustable brightness'],
      cons: ['Limited power', 'Basic features']
    },
    'mid-range': {
      name: 'Godox SL-60W',
      price: 200,
      description: 'Professional LED light with softbox',
      pros: ['High power', 'Professional quality', 'Adjustable'],
      cons: ['Requires setup', 'More expensive']
    },
    'professional': {
      name: 'Aputure 300D II',
      price: 800,
      description: 'Professional LED light with advanced features',
      pros: ['High power', 'Advanced features', 'Professional quality'],
      cons: ['Expensive', 'Complex setup']
    }
  };
  
  return lighting[budget] || lighting['budget'];
}

function getTripodRecommendation(budget) {
  const tripods = {
    'budget': {
      name: 'Amazon Basics Tripod',
      price: 30,
      description: 'Basic tripod for stability',
      pros: ['Affordable', 'Lightweight', 'Easy to use'],
      cons: ['Limited features', 'Basic quality']
    },
    'mid-range': {
      name: 'Manfrotto Compact Action',
      price: 100,
      description: 'Compact tripod with good stability',
      pros: ['Good stability', 'Compact', 'Quality build'],
      cons: ['Limited height', 'Basic features']
    },
    'professional': {
      name: 'Gitzo GT3543XLS',
      price: 600,
      description: 'Professional carbon fiber tripod',
      pros: ['Excellent stability', 'Lightweight', 'Professional grade'],
      cons: ['Expensive', 'Complex setup']
    }
  };
  
  return tripods[budget] || tripods['budget'];
}

function getEditingRecommendation(budget) {
  const editing = {
    'budget': {
      name: 'DaVinci Resolve (Free)',
      price: 0,
      description: 'Professional editing software with free version',
      pros: ['Free', 'Professional features', 'Good quality'],
      cons: ['Steep learning curve', 'Resource intensive']
    },
    'mid-range': {
      name: 'Adobe Premiere Pro',
      price: 240,
      description: 'Professional editing software with monthly subscription',
      pros: ['Professional features', 'Good integration', 'Regular updates'],
      cons: ['Monthly cost', 'Subscription model']
    },
    'professional': {
      name: 'Avid Media Composer',
      price: 1200,
      description: 'Industry-standard editing software',
      pros: ['Industry standard', 'Advanced features', 'Professional support'],
      cons: ['Expensive', 'Complex interface']
    }
  };
  
  return editing[budget] || editing['budget'];
}

function getStorageRecommendation(budget) {
  const storage = {
    'budget': {
      name: 'External Hard Drive (1TB)',
      price: 60,
      description: 'Basic external storage for video files',
      pros: ['Affordable', 'Large capacity', 'Portable'],
      cons: ['Slower speeds', 'Basic features']
    },
    'mid-range': {
      name: 'SSD External Drive (1TB)',
      price: 150,
      description: 'Fast SSD storage for video editing',
      pros: ['Fast speeds', 'Reliable', 'Good for editing'],
      cons: ['More expensive', 'Limited capacity']
    },
    'professional': {
      name: 'RAID Storage System',
      price: 1000,
      description: 'Professional RAID storage system',
      pros: ['High capacity', 'Redundancy', 'Professional grade'],
      cons: ['Expensive', 'Complex setup']
    }
  };
  
  return storage[budget] || storage['budget'];
}

// Save functions
async function saveVideoContentPlan(videoPlan, answers) {
  const filename = `video-content-plan-${answers.companyName.toLowerCase().replace(/\s+/g, '-')}.json`;
  await fs.writeJson(filename, videoPlan, { spaces: 2 });
  console.log(`Video content plan saved to ${filename}`);
}

async function saveVideoScripts(scripts, answers) {
  const filename = `video-scripts-${answers.companyName.toLowerCase().replace(/\s+/g, '-')}.json`;
  await fs.writeJson(filename, scripts, { spaces: 2 });
  console.log(`Video scripts saved to ${filename}`);
}

async function saveEquipmentRecommendations(equipment, answers) {
  const filename = `equipment-recommendations-${answers.companyName.toLowerCase().replace(/\s+/g, '-')}.json`;
  await fs.writeJson(filename, equipment, { spaces: 2 });
  console.log(`Equipment recommendations saved to ${filename}`);
}

program.parse();
