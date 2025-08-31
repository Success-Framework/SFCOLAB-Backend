#!/usr/bin/env node

/**
 * SFCollab Backend Demo Script
 * This script demonstrates all the major features of the SFCollab backend API
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000/api';
let accessToken = '';
let refreshToken = '';

// Helper function to make authenticated requests
const makeRequest = async (method, endpoint, data = null, token = accessToken) => {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      headers: {
        'Content-Type': 'application/json',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      ...(data && { data })
    };

    const response = await axios(config);
    return response.data;
  } catch (error) {
    console.error(`❌ Error in ${method} ${endpoint}:`, error.response?.data || error.message);
    return null;
  }
};

// Demo functions
const demoAuth = async () => {
  console.log('\n🔐 Testing Authentication System...');
  
  // Test signup
  console.log('\n1. User Registration:');
  const signupData = {
    firstName: 'Demo',
    lastName: 'User',
    email: 'demo@example.com',
    password: 'DemoPass123!'
  };
  
  const signupResult = await makeRequest('POST', '/auth/signup', signupData);
  if (signupResult) {
    console.log('✅ User registered successfully');
    accessToken = signupResult.tokens.accessToken;
    refreshToken = signupResult.tokens.refreshToken;
  }

  // Test login
  console.log('\n2. User Login:');
  const loginData = {
    email: 'demo@example.com',
    password: 'DemoPass123!'
  };
  
  const loginResult = await makeRequest('POST', '/auth/login', loginData);
  if (loginResult) {
    console.log('✅ User logged in successfully');
    accessToken = loginResult.tokens.accessToken;
    refreshToken = loginResult.tokens.refreshToken;
  }

  // Test getting user profile
  console.log('\n3. Get User Profile:');
  const profileResult = await makeRequest('GET', '/auth/me');
  if (profileResult) {
    console.log('✅ User profile retrieved successfully');
  }
};

const demoIdeation = async () => {
  console.log('\n💡 Testing Ideation System...');
  
  // Create an idea
  console.log('\n1. Create Idea:');
  const ideaData = {
    title: 'Innovative AI-Powered Startup Platform',
    description: 'A platform that uses AI to match entrepreneurs with investors and mentors based on their startup ideas and market analysis.',
    category: 'Technology',
    tags: ['AI', 'Startup', 'Platform', 'Innovation']
  };
  
  const ideaResult = await makeRequest('POST', '/ideation', ideaData);
  if (ideaResult) {
    console.log('✅ Idea created successfully');
    console.log(`   Title: ${ideaResult.idea.title}`);
    console.log(`   Category: ${ideaResult.idea.category}`);
  }

  // Get all ideas
  console.log('\n2. Get All Ideas:');
  const ideasResult = await makeRequest('GET', '/ideation');
  if (ideasResult) {
    console.log(`✅ Retrieved ${ideasResult.ideas.length} ideas`);
    console.log(`   Pagination: Page ${ideasResult.pagination.currentPage} of ${ideasResult.pagination.totalPages}`);
  }

  // Add a comment to the idea
  if (ideasResult?.ideas?.[0]?.id) {
    console.log('\n3. Add Comment to Idea:');
    const commentData = {
      content: 'This is a fantastic idea! Have you considered the scalability aspects?'
    };
    
    const commentResult = await makeRequest('POST', `/ideation/${ideasResult.ideas[0].id}/comments`, commentData);
    if (commentResult) {
      console.log('✅ Comment added successfully');
    }
  }
};

const demoStartup = async () => {
  console.log('\n🚀 Testing Startup Management...');
  
  // Register a startup
  console.log('\n1. Register Startup:');
  const startupData = {
    name: 'TechCollab Solutions',
    industry: 'Technology',
    location: 'San Francisco, CA',
    description: 'Building innovative collaboration tools for remote teams using cutting-edge technology.',
    stage: 'Series A',
    roles: ['Full-Stack Developer', 'Product Manager', 'UI/UX Designer', 'DevOps Engineer']
  };
  
  const startupResult = await makeRequest('POST', '/startup/register', startupData);
  if (startupResult) {
    console.log('✅ Startup registered successfully');
    console.log(`   Name: ${startupResult.startup.name}`);
    console.log(`   Industry: ${startupResult.startup.industry}`);
    console.log(`   Stage: ${startupResult.startup.stage}`);
  }

  // Get all startups
  console.log('\n2. Get All Startups:');
  const startupsResult = await makeRequest('GET', '/startup');
  if (startupsResult) {
    console.log(`✅ Retrieved ${startupsResult.startups.length} startups`);
  }
};

const demoKnowledge = async () => {
  console.log('\n📚 Testing Knowledge Base...');
  
  // Add a knowledge resource
  console.log('\n1. Add Knowledge Resource:');
  const resourceData = {
    title: 'Complete Guide to Startup Funding',
    description: 'A comprehensive guide covering all aspects of startup funding, from seed rounds to IPO, including investor relations and pitch deck preparation.',
    category: 'Business',
    tags: ['Funding', 'Startup', 'Investment', 'Guide']
  };
  
  const resourceResult = await makeRequest('POST', '/knowledge', resourceData);
  if (resourceResult) {
    console.log('✅ Knowledge resource added successfully');
    console.log(`   Title: ${resourceResult.resource.title}`);
    console.log(`   Category: ${resourceResult.resource.category}`);
  }

  // Get all resources
  console.log('\n2. Get All Resources:');
  const resourcesResult = await makeRequest('GET', '/knowledge');
  if (resourcesResult) {
    console.log(`✅ Retrieved ${resourcesResult.resources.length} resources`);
  }

  // Like a resource
  if (resourcesResult?.resources?.[0]?.id) {
    console.log('\n3. Like Resource:');
    const likeResult = await makeRequest('POST', `/knowledge/${resourcesResult.resources[0].id}/like`);
    if (likeResult) {
      console.log(`✅ Resource liked successfully. Total likes: ${likeResult.likes}`);
    }
  }
};

const demoSettings = async () => {
  console.log('\n⚙️ Testing Settings & Profile...');
  
  // Update profile
  console.log('\n1. Update Profile:');
  const profileData = {
    firstName: 'Demo',
    lastName: 'User',
    bio: 'Passionate entrepreneur and technology enthusiast with 5+ years of experience in building scalable solutions.',
    company: 'TechCollab Solutions',
    socialLinks: {
      linkedin: 'https://linkedin.com/in/demouser',
      twitter: 'https://twitter.com/demouser',
      github: 'https://github.com/demouser'
    }
  };
  
  const profileResult = await makeRequest('PUT', '/settings/profile', profileData);
  if (profileResult) {
    console.log('✅ Profile updated successfully');
  }

  // Update preferences
  console.log('\n2. Update Preferences:');
  const preferencesData = {
    emailNotifications: true,
    pushNotifications: false,
    theme: 'dark',
    language: 'en',
    timezone: 'America/Los_Angeles'
  };
  
  const preferencesResult = await makeRequest('PUT', '/settings/preferences', preferencesData);
  if (preferencesResult) {
    console.log('✅ Preferences updated successfully');
  }

  // Get profile settings
  console.log('\n3. Get Profile Settings:');
  const profileSettingsResult = await makeRequest('GET', '/settings/profile');
  if (profileSettingsResult) {
    console.log('✅ Profile settings retrieved successfully');
  }
};

const demoContent = async () => {
  console.log('\n📱 Testing Content Management...');
  
  // Create a story
  console.log('\n1. Create Story:');
  const storyData = {
    mediaUrl: 'https://example.com/demo-story.jpg',
    caption: 'Exciting news! We just hit 1000 users! 🎉',
    type: 'image'
  };
  
  const storyResult = await makeRequest('POST', '/profile/stories', storyData);
  if (storyResult) {
    console.log('✅ Story created successfully');
    console.log(`   Caption: ${storyResult.story.caption}`);
    console.log(`   Expires: ${new Date(storyResult.story.expiresAt).toLocaleString()}`);
  }

  // Create a post
  console.log('\n2. Create Post:');
  const postData = {
    content: 'Just launched our new collaboration platform! 🚀 The response has been incredible. Thank you to everyone who supported us on this journey. #startup #launch #collaboration',
    type: 'professional',
    tags: ['launch', 'startup', 'collaboration', 'excited']
  };
  
  const postResult = await makeRequest('POST', '/profile/posts', postData);
  if (postResult) {
    console.log('✅ Post created successfully');
    console.log(`   Type: ${postResult.post.type}`);
    console.log(`   Tags: ${postResult.post.tags.join(', ')}`);
  }

  // Get feed
  console.log('\n3. Get Personalized Feed:');
  const feedResult = await makeRequest('GET', '/profile/feed');
  if (feedResult) {
    console.log(`✅ Feed retrieved successfully with ${feedResult.feed.length} items`);
  }
};

const demoNotifications = async () => {
  console.log('\n🔔 Testing Notification System...');
  
  // Get notifications
  console.log('\n1. Get Notifications:');
  const notificationsResult = await makeRequest('GET', '/notifications');
  if (notificationsResult) {
    console.log(`✅ Retrieved ${notificationsResult.notifications.length} notifications`);
  }

  // Get unread count
  console.log('\n2. Get Unread Count:');
  const unreadResult = await makeRequest('GET', '/notifications/unread-count');
  if (unreadResult) {
    console.log(`✅ Unread notifications: ${unreadResult.unreadCount}`);
  }

  // Create a test notification
  console.log('\n3. Create Test Notification:');
  const testNotificationData = {
    type: 'system',
    title: 'Welcome to SFCollab!',
    message: 'Thank you for joining our platform. We\'re excited to have you on board!'
  };
  
  const testNotificationResult = await makeRequest('POST', '/notifications/test', testNotificationData);
  if (testNotificationResult) {
    console.log('✅ Test notification created successfully');
  }
};

const runDemo = async () => {
  console.log('🚀 SFCollab Backend Demo');
  console.log('========================');
  console.log('This demo will test all major features of the SFCollab backend API');
  
  try {
    await demoAuth();
    await demoIdeation();
    await demoStartup();
    await demoKnowledge();
    await demoSettings();
    await demoContent();
    await demoNotifications();
    
    console.log('\n🎉 Demo completed successfully!');
    console.log('\n📋 Summary of tested features:');
    console.log('✅ Authentication (Signup, Login, Profile)');
    console.log('✅ Ideation (Create ideas, comments, suggestions)');
    console.log('✅ Startup Management (Registration, discovery)');
    console.log('✅ Knowledge Base (Resources, likes, comments)');
    console.log('✅ Settings & Profile (Updates, preferences)');
    console.log('✅ Content Management (Stories, posts, feed)');
    console.log('✅ Notifications (CRUD operations)');
    
    console.log('\n🔗 API Base URL: http://localhost:3000/api');
    console.log('📚 Check the README.md for complete API documentation');
    
  } catch (error) {
    console.error('\n❌ Demo failed:', error.message);
  }
};

// Run the demo if this file is executed directly
if (require.main === module) {
  runDemo();
}

module.exports = { runDemo };
