/**
 * Admin Controller for AgroGuide
 * Gathers system telemetry, firewall block history, and allows triggering cron tasks.
 */

import User from '../models/User.js';
import QueryLog from '../models/QueryLog.js';
import DiseaseHistory from '../models/DiseaseHistory.js'; // Phase 9
import { getTelemetryMetrics } from '../monitoring/performance.js';
import { triggerDailyCronJobsNow } from '../schedulers/cronJobs.js';

/**
 * GET /api/admin/metrics
 * Gathers server telemetry, crop/scheme search counts, and crop disease stats
 */
export const getAdminMetrics = async (req, res) => {
  try {
    const telemetry = await getTelemetryMetrics();
    const totalUsers = await User.countDocuments();
    const completedProfiles = await User.countDocuments({ isProfileCompleted: true });

    // Aggregate crop searches by checking queries text containing crop names
    const queryLogs = await QueryLog.find().select('query status timestamp');

    const cropsCount = { Tomato: 0, Rice: 0, Cotton: 0, Maize: 0, Groundnut: 0 };
    const schemesCount = { 'PM Kisan': 0, 'Rythu Bharosa': 0, 'Fasal Bima': 0 };

    queryLogs.forEach(log => {
      const q = log.query.toLowerCase();
      // Count crops
      if (q.includes('tomato') || q.includes('टमाटर') || q.includes('టమోటా')) cropsCount.Tomato++;
      if (q.includes('rice') || q.includes('paddy') || q.includes('వరి') || q.includes('धान')) cropsCount.Rice++;
      if (q.includes('cotton') || q.includes('కపాస్') || q.includes('ప్రత్తి') || q.includes('कपास')) cropsCount.Cotton++;
      if (q.includes('maize') || q.includes('మొక్కజొన్న') || q.includes('मक्का')) cropsCount.Maize++;
      if (q.includes('groundnut') || q.includes('వేరుశనగ') || q.includes('मूंगफली')) cropsCount.Groundnut++;

      // Count schemes
      if (q.includes('pm kisan') || q.includes('kisan')) schemesCount['PM Kisan']++;
      if (q.includes('rythu bharosa') || q.includes('bharosa')) schemesCount['Rythu Bharosa']++;
      if (q.includes('fasal bima') || q.includes('bima')) schemesCount['Fasal Bima']++;
    });

    // Retrieve last 10 blocked queries for audit
    const blockedAudit = await QueryLog.find({ status: 'blocked' })
      .sort({ timestamp: -1 })
      .limit(10)
      .select('query intent timestamp');

    // Aggregate Crop Disease Diagnoses (Phase 9) (Part 13)
    const totalDiagnoses = await DiseaseHistory.countDocuments();
    const healthyPlants = await DiseaseHistory.countDocuments({ disease: 'Healthy Plant' });
    const diseasedPlants = Math.max(0, totalDiagnoses - healthyPlants);

    const commonDiseases = await DiseaseHistory.aggregate([
      { $group: { _id: "$disease", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const topCropsDiagnosed = await DiseaseHistory.aggregate([
      { $group: { _id: "$crop", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 }
    ]);

    const avgConf = await DiseaseHistory.aggregate([
      { $group: { _id: null, avg: { $avg: "$confidence" } } }
    ]);
    const averageConf = avgConf.length > 0 ? Math.round(avgConf[0].avg) : 0;

    res.status(200).json({
      success: true,
      metrics: {
        ...telemetry,
        totalUsers,
        completedProfiles,
        cropStats: Object.entries(cropsCount).map(([crop, count]) => ({ crop, count })),
        schemeStats: Object.entries(schemesCount).map(([scheme, count]) => ({ scheme, count })),
        blockedQueriesList: blockedAudit,
        // Phase 9 Diagnostic Statistics
        totalDiagnoses,
        healthyPlants,
        diseasedPlants,
        averageConf,
        commonDiseases: commonDiseases.map(d => ({ disease: d._id, count: d.count })),
        topCropsDiagnosed: topCropsDiagnosed.map(c => ({ crop: c._id, count: c.count }))
      }
    });
  } catch (error) {
    console.error('Error fetching admin metrics:', error.message);
    res.status(500).json({ success: false, error: 'Failed to retrieve admin telemetry metrics.' });
  }
};

/**
 * POST /api/admin/trigger-jobs
 * Forces cron jobs to execute immediately
 */
export const forceTriggerCronJobs = async (req, res) => {
  try {
    const result = await triggerDailyCronJobsNow();
    if (result.success) {
      return res.status(200).json({ success: true, message: 'Farming cron alert tasks triggered.' });
    }
    return res.status(500).json({ success: false, error: result.error });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
