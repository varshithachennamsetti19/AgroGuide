/**
 * Automated Production Backups Manager
 * Performs daily automated MongoDB data backups, triggers Redis BGSAVE,
 * and packs uploaded image folders (Phase 10)
 */

import fs from 'fs';
import path from 'path';
import cron from 'node-cron';
import mongoose from 'mongoose';
import DiseaseHistory from '../models/DiseaseHistory.js';
import User from '../models/User.js';
import Farm from '../models/Farm.js';
import { getRedisClient, getRedisStatus } from '../cache/redisClient.js';

const BACKUP_DIR = path.resolve('backups');

/**
 * Execute a backup dump of MongoDB records to JSON and trigger Redis BGSAVE
 */
export async function executeBackupDump() {
  console.log(`[Backups] Initializing scheduled data backup task...`);
  
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sessionDir = path.join(BACKUP_DIR, `backup-${timestamp}`);
  fs.mkdirSync(sessionDir);

  try {
    // 1. Export Mongoose models (MongoDB backup)
    const users = await User.find({});
    const farms = await Farm.find({});
    const diagnoses = await DiseaseHistory.find({});

    fs.writeFileSync(path.join(sessionDir, 'users.json'), JSON.stringify(users, null, 2));
    fs.writeFileSync(path.join(sessionDir, 'farms.json'), JSON.stringify(farms, null, 2));
    fs.writeFileSync(path.join(sessionDir, 'diagnoses.json'), JSON.stringify(diagnoses, null, 2));

    console.log(`[Backups] MongoDB collections exported successfully to: ${sessionDir}`);

    // 2. Trigger Redis Snapshotting via BGSAVE (Redis backup)
    const redis = getRedisClient();
    if (redis && getRedisStatus()) {
      console.log('[Backups] Triggering Redis background save snapshot (BGSAVE)...');
      try {
        await redis.bgsave();
        console.log('[Backups] Redis BGSAVE command dispatched successfully.');
      } catch (redisErr) {
        console.warn('[Backups] Redis bgsave request failed:', redisErr.message);
      }
    } else {
      console.warn('[Backups] Redis is not active. Skipping Redis snapshot save.');
    }

    // 3. Compress / Export local uploads folder if it exists
    const uploadsDir = path.resolve('uploads');
    if (fs.existsSync(uploadsDir)) {
      const uploadFiles = fs.readdirSync(uploadsDir);
      const manifest = [];
      
      uploadFiles.forEach(file => {
        const filePath = path.join(uploadsDir, file);
        const destPath = path.join(sessionDir, `image-${file}`);
        // Simply copy image logs to backup folder
        try {
          // Verify it's a file
          if (fs.statSync(filePath).isFile()) {
            fs.copyFileSync(filePath, destPath);
            manifest.push(file);
          }
        } catch (copyErr) {
          console.warn(`[Backups] Skipping copy for file: ${file}`, copyErr.message);
        }
      });
      fs.writeFileSync(path.join(sessionDir, 'images-manifest.json'), JSON.stringify(manifest, null, 2));
      console.log(`[Backups] Copied ${manifest.length} leaf diagnostic images to backup archive.`);
    }

    // Keep only last 5 backups to optimize storage size
    pruneOldBackups();
    return { success: true, path: sessionDir };
  } catch (error) {
    console.error(`[Backups] Backup compilation failed:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Remove old backup directories beyond limit (Max 5)
 */
function pruneOldBackups() {
  try {
    const list = fs.readdirSync(BACKUP_DIR)
      .map(name => ({ name, path: path.join(BACKUP_DIR, name) }))
      .filter(item => fs.statSync(item.path).isDirectory() && item.name.startsWith('backup-'))
      .sort((a, b) => fs.statSync(a.path).mtime.getTime() - fs.statSync(b.path).mtime.getTime());

    if (list.length > 5) {
      const toRemove = list.slice(0, list.length - 5);
      toRemove.forEach(item => {
        fs.rmSync(item.path, { recursive: true, force: true });
        console.log(`[Backups] Pruned expired backup folder: ${item.name}`);
      });
    }
  } catch (err) {
    console.warn(`[Backups] Cleanup failed:`, err.message);
  }
}

/**
 * Initialize backup cron triggers (runs daily at 2:00 AM)
 */
export function startBackupScheduler() {
  console.log(`[Backups] Daily automated backup scheduler is online (0 2 * * *).`);
  cron.schedule('0 2 * * *', () => {
    executeBackupDump();
  });
}
