const mongoose = require('mongoose');
const DatabaseSeeder = require('./src/utils/seeder');
require('dotenv').config();

async function runSeeder() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/sfcolab', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Run seeder
    const seeder = new DatabaseSeeder();
    await seeder.seed();
    
    // Add sample interactions
    await seeder.addSampleInteractions();

    console.log('🎉 Database seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

// Run seeder if this file is executed directly
if (require.main === module) {
  runSeeder();
}

module.exports = runSeeder; 