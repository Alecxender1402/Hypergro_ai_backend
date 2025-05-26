const fs = require('fs');
const csv = require('csv-parser');
const Property = require('../models/Property');

async function insertPropertiesFromCSV(csvFilePath) {
  try {
    // Check if collection is empty
    const count = await Property.countDocuments();
    if (count > 0) {
      console.log('Properties already exist in DB. Skipping import.');
      return;
    }

    const properties = [];
    
    return new Promise((resolve, reject) => {
      fs.createReadStream(csvFilePath)
        .pipe(csv())
        .on('data', (row) => {
          // Your existing transformations
          row.amenities = row.amenities ? row.amenities.split('|') : [];
          row.tags = row.tags ? row.tags.split('|') : [];
          row.bedrooms = Number(row.bedrooms);
          row.bathrooms = Number(row.bathrooms);
          row.price = Number(row.price);
          row.areaSqFt = Number(row.areaSqFt);
          row.rating = Number(row.rating);
          row.isVerified = row.isVerified === 'TRUE';
          row.availableFrom = new Date(row.availableFrom.split('-').reverse().join('-'));
          properties.push(row);
        })
        .on('end', async () => {
          try {
            await Property.insertMany(properties);
            console.log(`Inserted ${properties.length} properties`);
            resolve();
          } catch (err) {
            reject(err);
          }
        })
        .on('error', reject);
    });
  } catch (err) {
    console.error('Import error:', err);
    throw err;
  }
}

module.exports = insertPropertiesFromCSV;
