import fs from 'fs';
import path from 'path';

/**
 * Loads documents from local JSON files
 * @returns {Array<Object>} List of documents { text, metadata }
 */
export function loadDocuments() {
  const documents = [];
  
  try {
    // Load Crops Data
    const cropsPath = path.resolve('data/crops.json');
    if (fs.existsSync(cropsPath)) {
      const cropsData = JSON.parse(fs.readFileSync(cropsPath, 'utf8'));
      cropsData.forEach(item => {
        documents.push({
          text: item.content,
          metadata: {
            title: item.crop,
            category: item.category,
            source: 'crops.json'
          }
        });
      });
    } else {
      console.warn('crops.json not found at', cropsPath);
    }

    // Load Schemes Data
    const schemesPath = path.resolve('data/schemes.json');
    if (fs.existsSync(schemesPath)) {
      const schemesData = JSON.parse(fs.readFileSync(schemesPath, 'utf8'));
      schemesData.forEach(item => {
        documents.push({
          text: item.content,
          metadata: {
            title: item.scheme,
            category: item.category,
            source: 'schemes.json'
          }
        });
      });
    } else {
      console.warn('schemes.json not found at', schemesPath);
    }

    // Load Seasonal Weather Data
    const seasonalPath = path.resolve('data/seasonal_weather.json');
    if (fs.existsSync(seasonalPath)) {
      const seasonalData = JSON.parse(fs.readFileSync(seasonalPath, 'utf8'));
      seasonalData.forEach(item => {
        documents.push({
          text: item.content,
          metadata: {
            title: item.state,
            category: item.category,
            source: 'seasonal_weather.json'
          }
        });
      });
    } else {
      console.warn('seasonal_weather.json not found at', seasonalPath);
    }

    // Also look in backend/documents/ for custom .txt files if any exist
    const docsDir = path.resolve('documents');
    if (fs.existsSync(docsDir)) {
      const files = fs.readdirSync(docsDir);
      files.forEach(file => {
        if (file.endsWith('.txt')) {
          const content = fs.readFileSync(path.join(docsDir, file), 'utf8');
          documents.push({
            text: content,
            metadata: {
              title: file.replace('.txt', ''),
              category: 'General',
              source: file
            }
          });
        }
      });
    }
  } catch (error) {
    console.error("Error loading documents:", error);
  }

  return documents;
}
