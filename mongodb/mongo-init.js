db = db.getSiblingDB('agroguide');

// Create collections and indices
db.createCollection('users');
db.users.createIndex({ "email": 1 }, { unique: true });

db.createCollection('farms');
db.farms.createIndex({ "userId": 1 });

db.createCollection('diseasehistories');
db.diseasehistories.createIndex({ "userId": 1 });
db.diseasehistories.createIndex({ "createdAt": -1 });

print("AgroGuide MongoDB initialization completed successfully!");
