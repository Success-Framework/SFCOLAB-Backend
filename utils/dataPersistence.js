const fs = require('fs');
const path = require('path');

// Data file path
const DATA_FILE = path.join(__dirname, '..', 'data', 'database.json');

// Ensure data directory exists
const dataDir = path.dirname(DATA_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Default data structure
const defaultData = {
  users: [],
  refreshTokens: [],
  ideas: [],
  comments: [],
  suggestions: [],
  startups: [],
  joinRequests: [],
  knowledgeResources: [],
  knowledgeComments: [],
  resourceViews: [],
  resourceDownloads: [],
  resourceLikes: [],
  stories: [],
  posts: [],
  postLikes: [],
  postComments: [],
  notifications: [],
  lastUpdated: new Date().toISOString()
};

/**
 * Load data from JSON file
 */
function loadData() {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf8');
      return JSON.parse(data);
    }
    return defaultData;
  } catch (error) {
    console.error('Error loading data:', error);
    return defaultData;
  }
}

/**
 * Save data to JSON file
 */
function saveData(data) {
  try {
    data.lastUpdated = new Date().toISOString();
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
    return true;
  } catch (error) {
    console.error('Error saving data:', error);
    return false;
  }
}

/**
 * Get all data
 */
function getAllData() {
  return loadData();
}

/**
 * Get specific collection
 */
function getCollection(collectionName) {
  const data = loadData();
  return data[collectionName] || [];
}

/**
 * Update specific collection
 */
function updateCollection(collectionName, newData) {
  const data = loadData();
  data[collectionName] = newData;
  return saveData(data);
}

/**
 * Add item to collection
 */
function addToCollection(collectionName, item) {
  const data = loadData();
  if (!data[collectionName]) {
    data[collectionName] = [];
  }
  data[collectionName].push(item);
  return saveData(data);
}

/**
 * Update item in collection
 */
function updateItemInCollection(collectionName, itemId, updatedItem) {
  const data = loadData();
  if (!data[collectionName]) {
    return false;
  }
  
  const index = data[collectionName].findIndex(item => item.id === itemId);
  if (index !== -1) {
    data[collectionName][index] = { ...data[collectionName][index], ...updatedItem };
    return saveData(data);
  }
  return false;
}

/**
 * Delete item from collection
 */
function deleteFromCollection(collectionName, itemId) {
  const data = loadData();
  if (!data[collectionName]) {
    return false;
  }
  
  const index = data[collectionName].findIndex(item => item.id === itemId);
  if (index !== -1) {
    data[collectionName].splice(index, 1);
    return saveData(data);
  }
  return false;
}

/**
 * Find item in collection
 */
function findInCollection(collectionName, predicate) {
  const data = loadData();
  if (!data[collectionName]) {
    return null;
  }
  return data[collectionName].find(predicate);
}

/**
 * Filter items in collection
 */
function filterCollection(collectionName, predicate) {
  const data = loadData();
  if (!data[collectionName]) {
    return [];
  }
  return data[collectionName].filter(predicate);
}

/**
 * Get collection count
 */
function getCollectionCount(collectionName) {
  const data = loadData();
  return data[collectionName] ? data[collectionName].length : 0;
}

/**
 * Initialize data file if it doesn't exist
 */
function initializeData() {
  if (!fs.existsSync(DATA_FILE)) {
    console.log('Initializing data file...');
    saveData(defaultData);
    console.log('Data file initialized successfully');
  }
}

module.exports = {
  loadData,
  saveData,
  getAllData,
  getCollection,
  updateCollection,
  addToCollection,
  updateItemInCollection,
  deleteFromCollection,
  findInCollection,
  filterCollection,
  getCollectionCount,
  initializeData
};

