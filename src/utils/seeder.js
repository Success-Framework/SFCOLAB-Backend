const User = require('../models/User');
const Startup = require('../models/Startup');
const Project = require('../models/Project');
const Knowledge = require('../models/Knowledge');
const bcrypt = require('bcryptjs');

class DatabaseSeeder {
  constructor() {
    this.users = [];
    this.startups = [];
    this.projects = [];
    this.knowledge = [];
  }

  async seed() {
    console.log('🌱 Starting database seeding...');
    
    try {
      // Clear existing data
      await this.clearData();
      
      // Seed users
      await this.seedUsers();
      
      // Seed startups
      await this.seedStartups();
      
      // Seed projects
      await this.seedProjects();
      
      // Seed knowledge resources
      await this.seedKnowledge();
      
      console.log('✅ Database seeding completed successfully!');
      console.log(`📊 Created ${this.users.length} users, ${this.startups.length} startups, ${this.projects.length} projects, and ${this.knowledge.length} knowledge resources`);
      
    } catch (error) {
      console.error('❌ Database seeding failed:', error);
      throw error;
    }
  }

  async clearData() {
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await Startup.deleteMany({});
    await Project.deleteMany({});
    await Knowledge.deleteMany({});
  }

  async seedUsers() {
    console.log('👥 Seeding users...');
    
    const userData = [
      {
        username: 'john_doe',
        email: 'john@example.com',
        password: 'password123',
        profile: {
          name: 'John Doe',
          bio: 'Full-stack developer with 5+ years of experience in React, Node.js, and MongoDB. Passionate about building scalable web applications.',
          role: 'Employee',
          skills: ['React', 'Node.js', 'MongoDB', 'TypeScript', 'AWS'],
          experience: [
            {
              title: 'Senior Developer',
              company: 'TechCorp',
              duration: '2020 - Present',
              description: 'Leading development of enterprise applications'
            }
          ],
          availability: 'Available Now',
          position: 'Full Stack Developer',
          location: 'San Francisco, CA',
          website: 'https://johndoe.dev',
          social: {
            linkedin: 'https://linkedin.com/in/johndoe',
            github: 'https://github.com/johndoe'
          }
        }
      },
      {
        username: 'sarah_smith',
        email: 'sarah@example.com',
        password: 'password123',
        profile: {
          name: 'Sarah Smith',
          bio: 'Product designer and UX researcher with expertise in user-centered design and design systems.',
          role: 'Founder',
          skills: ['UI/UX Design', 'Figma', 'User Research', 'Prototyping', 'Design Systems'],
          experience: [
            {
              title: 'Product Designer',
              company: 'Design Studio',
              duration: '2019 - Present',
              description: 'Creating user-centered design solutions'
            }
          ],
          availability: 'Available Now',
          position: 'Product Designer',
          location: 'New York, NY',
          website: 'https://sarahsmith.design',
          social: {
            linkedin: 'https://linkedin.com/in/sarahsmith',
            twitter: 'https://twitter.com/sarahsmith'
          }
        }
      },
      {
        username: 'mike_chen',
        email: 'mike@example.com',
        password: 'password123',
        profile: {
          name: 'Mike Chen',
          bio: 'Backend engineer specializing in distributed systems and cloud architecture.',
          role: 'Employee',
          skills: ['Python', 'Django', 'PostgreSQL', 'Docker', 'Kubernetes'],
          experience: [
            {
              title: 'Backend Engineer',
              company: 'Data Systems',
              duration: '2018 - Present',
              description: 'Building scalable backend services'
            }
          ],
          availability: 'Available in 1 Week',
          position: 'Backend Developer',
          location: 'Seattle, WA',
          website: 'https://mikechen.dev',
          social: {
            linkedin: 'https://linkedin.com/in/mikechen',
            github: 'https://github.com/mikechen'
          }
        }
      },
      {
        username: 'emma_davis',
        email: 'emma@example.com',
        password: 'password123',
        profile: {
          name: 'Emma Davis',
          bio: 'Marketing specialist with expertise in digital marketing, growth hacking, and brand strategy.',
          role: 'Mentor',
          skills: ['Digital Marketing', 'Growth Hacking', 'Brand Strategy', 'SEO', 'Content Marketing'],
          experience: [
            {
              title: 'Marketing Director',
              company: 'Growth Agency',
              duration: '2017 - Present',
              description: 'Leading marketing strategies for startups'
            }
          ],
          availability: 'Part-time',
          position: 'Marketing Specialist',
          location: 'Austin, TX',
          website: 'https://emmadavis.com',
          social: {
            linkedin: 'https://linkedin.com/in/emmadavis',
            twitter: 'https://twitter.com/emmadavis'
          }
        }
      },
      {
        username: 'alex_wong',
        email: 'alex@example.com',
        password: 'password123',
        profile: {
          name: 'Alex Wong',
          bio: 'Mobile app developer with experience in React Native and iOS development.',
          role: 'Student',
          skills: ['React Native', 'iOS', 'Swift', 'JavaScript', 'Firebase'],
          experience: [
            {
              title: 'Mobile Developer',
              company: 'App Studio',
              duration: '2021 - Present',
              description: 'Developing cross-platform mobile applications'
            }
          ],
          availability: 'Available Now',
          position: 'Mobile Developer',
          location: 'Los Angeles, CA',
          website: 'https://alexwong.dev',
          social: {
            linkedin: 'https://linkedin.com/in/alexwong',
            github: 'https://github.com/alexwong'
          }
        }
      }
    ];

    for (const userInfo of userData) {
      const user = new User(userInfo);
      await user.save();
      this.users.push(user);
    }
  }

  async seedStartups() {
    console.log('🚀 Seeding startups...');
    
    const startupData = [
      {
        name: 'TechVision AI',
        description: 'Revolutionary AI platform for predictive analytics in healthcare. Using machine learning to improve patient outcomes and reduce healthcare costs.',
        industry: 'Healthcare',
        stage: 'Growth Stage',
        location: 'San Francisco',
        teamSize: 25,
        founded: new Date('2022-01-15'),
        funding: '$5M',
        founder: this.users[1]._id, // Sarah Smith
        metrics: {
          users: '10K+',
          revenue: '$500K',
          growth: '150%',
          customers: '50+'
        },
        website: 'https://techvision.ai',
        social: {
          linkedin: 'https://linkedin.com/company/techvision-ai',
          twitter: 'https://twitter.com/techvision_ai'
        },
        tags: ['AI', 'Healthcare', 'Machine Learning', 'Analytics']
      },
      {
        name: 'GreenEnergy Solutions',
        description: 'Innovative renewable energy solutions for residential and commercial properties. Making sustainable energy accessible and affordable.',
        industry: 'Energy',
        stage: 'MVP Stage',
        location: 'Berlin',
        teamSize: 15,
        founded: new Date('2023-03-20'),
        funding: '$2M',
        founder: this.users[0]._id, // John Doe
        metrics: {
          users: '5K+',
          revenue: '$200K',
          growth: '80%',
          customers: '200+'
        },
        website: 'https://greenenergy.solutions',
        social: {
          linkedin: 'https://linkedin.com/company/greenenergy-solutions',
          twitter: 'https://twitter.com/greenenergy_sol'
        },
        tags: ['Renewable Energy', 'Sustainability', 'Green Tech']
      },
      {
        name: 'EduTech Pro',
        description: 'Next-generation learning platform using AI to personalize education. Helping students achieve better results through adaptive learning.',
        industry: 'Education',
        stage: 'Scale Stage',
        location: 'London',
        teamSize: 40,
        founded: new Date('2021-06-10'),
        funding: '$8M',
        founder: this.users[2]._id, // Mike Chen
        metrics: {
          users: '50K+',
          revenue: '$1.2M',
          growth: '200%',
          customers: '200+'
        },
        website: 'https://edutech.pro',
        social: {
          linkedin: 'https://linkedin.com/company/edutech-pro',
          twitter: 'https://twitter.com/edutech_pro'
        },
        tags: ['Education', 'AI', 'Learning', 'EdTech']
      }
    ];

    for (const startupInfo of startupData) {
      const startup = new Startup(startupInfo);
      await startup.save();
      this.startups.push(startup);
    }
  }

  async seedProjects() {
    console.log('📋 Seeding projects...');
    
    const projectData = [
      {
        header: 'Smart Parenting Assistant',
        content: 'A comprehensive mobile application designed to help parents manage their daily family activities, track children\'s development, and connect with other parents in their community.',
        stage: 'Idea Stage',
        category: 'Technology',
        author: this.users[0]._id, // John Doe
        tags: ['Parenting', 'Mobile App', 'AI'],
        metrics: {
          impact: 'High',
          complexity: 'Medium',
          timeline: '6 months'
        },
        status: 'Published',
        isPublic: true
      },
      {
        header: 'Eco-Friendly Delivery Network',
        content: 'A sustainable delivery service using electric vehicles and bicycles for last-mile delivery, reducing carbon emissions and promoting eco-friendly transportation solutions.',
        stage: 'Concept Stage',
        category: 'Sustainability',
        author: this.users[1]._id, // Sarah Smith
        tags: ['Green Tech', 'Logistics', 'Transportation'],
        metrics: {
          impact: 'Very High',
          complexity: 'High',
          timeline: '12 months'
        },
        status: 'Published',
        isPublic: true
      },
      {
        header: 'Virtual Reality Education Platform',
        content: 'An immersive learning platform that uses VR technology to create engaging educational experiences, making complex subjects more accessible and interactive.',
        stage: 'Development Stage',
        category: 'Education',
        author: this.users[2]._id, // Mike Chen
        tags: ['VR', 'EdTech', 'Learning'],
        metrics: {
          impact: 'High',
          complexity: 'Very High',
          timeline: '9 months'
        },
        status: 'Published',
        isPublic: true
      },
      {
        header: 'AI-Powered Marketing Analytics',
        content: 'Advanced marketing analytics platform that uses artificial intelligence to provide insights and optimize marketing campaigns for better ROI.',
        stage: 'MVP Stage',
        category: 'Technology',
        author: this.users[3]._id, // Emma Davis
        tags: ['AI', 'Marketing', 'Analytics'],
        metrics: {
          impact: 'Medium',
          complexity: 'High',
          timeline: '8 months'
        },
        status: 'Published',
        isPublic: true
      },
      {
        header: 'Mobile Fitness Companion',
        content: 'A comprehensive fitness app that combines workout tracking, nutrition planning, and social features to help users achieve their fitness goals.',
        stage: 'Growth Stage',
        category: 'Healthcare',
        author: this.users[4]._id, // Alex Wong
        tags: ['Fitness', 'Mobile App', 'Health'],
        metrics: {
          impact: 'Medium',
          complexity: 'Medium',
          timeline: '7 months'
        },
        status: 'Published',
        isPublic: true
      }
    ];

    for (const projectInfo of projectData) {
      const project = new Project(projectInfo);
      await project.save();
      this.projects.push(project);
    }
  }

  async seedKnowledge() {
    console.log('📚 Seeding knowledge resources...');
    
    const knowledgeData = [
      {
        title: 'Building Scalable Web Applications',
        content: 'A comprehensive guide to building scalable web applications using modern technologies. Learn about architecture patterns, database design, and deployment strategies.',
        category: 'Development',
        type: 'Guide',
        author: this.users[0]._id, // John Doe
        tags: ['Web Development', 'Scalability', 'Architecture'],
        difficulty: 'Intermediate',
        estimatedTime: '45 minutes',
        status: 'Published',
        isPublic: true,
        featured: true
      },
      {
        title: 'User-Centered Design Principles',
        content: 'Essential principles and best practices for creating user-centered designs. Learn how to conduct user research, create personas, and design intuitive interfaces.',
        category: 'Design',
        type: 'Article',
        author: this.users[1]._id, // Sarah Smith
        tags: ['UX Design', 'User Research', 'Design Principles'],
        difficulty: 'Beginner',
        estimatedTime: '20 minutes',
        status: 'Published',
        isPublic: true
      },
      {
        title: 'Database Optimization Techniques',
        content: 'Advanced techniques for optimizing database performance. Learn about indexing strategies, query optimization, and database scaling approaches.',
        category: 'Development',
        type: 'Tutorial',
        author: this.users[2]._id, // Mike Chen
        tags: ['Database', 'Performance', 'Optimization'],
        difficulty: 'Advanced',
        estimatedTime: '60 minutes',
        status: 'Published',
        isPublic: true
      },
      {
        title: 'Growth Hacking Strategies for Startups',
        content: 'Proven growth hacking strategies that startups can use to rapidly scale their user base and revenue. Learn about viral marketing, referral programs, and conversion optimization.',
        category: 'Marketing',
        type: 'Case Study',
        author: this.users[3]._id, // Emma Davis
        tags: ['Growth Hacking', 'Marketing', 'Startups'],
        difficulty: 'Intermediate',
        estimatedTime: '30 minutes',
        status: 'Published',
        isPublic: true,
        featured: true
      },
      {
        title: 'Mobile App Development Best Practices',
        content: 'Best practices for developing high-quality mobile applications. Learn about performance optimization, user experience design, and platform-specific considerations.',
        category: 'Development',
        type: 'Guide',
        author: this.users[4]._id, // Alex Wong
        tags: ['Mobile Development', 'Best Practices', 'Performance'],
        difficulty: 'Intermediate',
        estimatedTime: '40 minutes',
        status: 'Published',
        isPublic: true
      }
    ];

    for (const knowledgeInfo of knowledgeData) {
      const knowledge = new Knowledge(knowledgeInfo);
      await knowledge.save();
      this.knowledge.push(knowledge);
    }
  }

  async addSampleInteractions() {
    console.log('🤝 Adding sample interactions...');
    
    // Add likes to projects
    for (const project of this.projects) {
      const randomUsers = this.getRandomUsers(3);
      for (const user of randomUsers) {
        await project.toggleLike(user._id);
      }
    }

    // Add likes to knowledge resources
    for (const knowledge of this.knowledge) {
      const randomUsers = this.getRandomUsers(2);
      for (const user of randomUsers) {
        await knowledge.toggleLike(user._id);
      }
    }

    // Add likes to startups
    for (const startup of this.startups) {
      const randomUsers = this.getRandomUsers(4);
      for (const user of randomUsers) {
        await startup.toggleLike(user._id);
      }
    }

    // Add some comments to projects
    const comments = [
      'Great idea! This could really help parents.',
      'I love the sustainability aspect of this project.',
      'The VR approach is innovative and engaging.',
      'This analytics platform looks promising.',
      'The fitness app concept is well thought out.'
    ];

    for (let i = 0; i < this.projects.length; i++) {
      const randomUser = this.getRandomUsers(1)[0];
      await this.projects[i].addComment(randomUser._id, comments[i]);
    }
  }

  getRandomUsers(count) {
    const shuffled = [...this.users].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }
}

module.exports = DatabaseSeeder; 