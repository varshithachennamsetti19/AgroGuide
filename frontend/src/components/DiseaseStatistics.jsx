import React from 'react';
import { Leaf, Award, ShieldAlert, Cpu } from 'lucide-react';

export default function DiseaseStatistics({ stats }) {
  if (!stats) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', width: '100%' }}>
      {/* Overview Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        
        {/* Total Diagnoses */}
        <div className="weather-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>TOTAL DIAGNOSES</span>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff', margin: '8px 0' }}>
            {stats.totalDiagnoses}
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>Leaf samples uploaded</span>
        </div>

        {/* Healthy Percentage */}
        <div className="weather-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>HEALTHY PLANTS RATIO</span>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#10b981', margin: '8px 0' }}>
            {stats.healthyPercentage}%
          </div>
          <span style={{ fontSize: '0.7rem', color: '#10b981' }}>{stats.healthyPlants} healthy / {stats.totalDiagnoses} total</span>
        </div>

        {/* Average Match Confidence */}
        <div className="weather-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>AVG DIAGNOSIS CONFIDENCE</span>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--accent-cyan)', margin: '8px 0' }}>
            {stats.averageConfidence}%
          </div>
          <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>YOLO Classification accuracy</span>
        </div>

        {/* Diseased count */}
        <div className="weather-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', padding: '16px' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: '600' }}>DISEASED CROPS DETECTED</span>
          <div style={{ fontSize: '2rem', fontWeight: 'bold', color: '#ef4444', margin: '8px 0' }}>
            {stats.diseasedPlants}
          </div>
          <span style={{ fontSize: '0.7rem', color: '#ef4444' }}>Require immediate remedies</span>
        </div>

      </div>

      {/* Breakdowns Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
        
        {/* Common Diseases distribution */}
        <div className="weather-card">
          <h3 style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
            <ShieldAlert size={16} style={{ color: '#ef4444' }} />
            <span>Diagnosed Diseases Distribution</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stats.diseasesBreakdown && stats.diseasesBreakdown.length > 0 ? (
              stats.diseasesBreakdown.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: '#fff', fontWeight: '500' }}>{item.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{item.count} occurrences</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${(item.count / stats.totalDiagnoses) * 100}%`,
                      height: '100%',
                      background: 'var(--accent-gradient)'
                    }}></div>
                  </div>
                </div>
              ))
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No disease records logged.</span>
            )}
          </div>
        </div>

        {/* Affected Crops Distribution */}
        <div className="weather-card">
          <h3 style={{ fontSize: '0.9rem', color: '#fff', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 'bold' }}>
            <Leaf size={16} style={{ color: '#10b981' }} />
            <span>Affected Crops Breakdown</span>
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {stats.cropsBreakdown && stats.cropsBreakdown.length > 0 ? (
              stats.cropsBreakdown.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem' }}>
                    <span style={{ color: '#fff', fontWeight: '500' }}>{item.name}</span>
                    <span style={{ color: 'var(--text-muted)' }}>{item.count} times</span>
                  </div>
                  <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.05)', borderRadius: '3px', overflow: 'hidden' }}>
                    <div style={{
                      width: `${(item.count / stats.totalDiagnoses) * 100}%`,
                      height: '100%',
                      background: 'linear-gradient(90deg, #10b981 0%, #059669 100%)'
                    }}></div>
                  </div>
                </div>
              ))
            ) : (
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No crop logs.</span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
