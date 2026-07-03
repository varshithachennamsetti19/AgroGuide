import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, X, AlertTriangle } from 'lucide-react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '../services/api';

export default function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchList = async () => {
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err.message);
    }
  };

  useEffect(() => {
    fetchList();
    // Poll notifications every 30 seconds for live updates
    const timer = setInterval(fetchList, 30000);
    return () => clearInterval(timer);
  }, []);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkRead = async (e, id) => {
    e.stopPropagation();
    try {
      await markNotificationRead(id);
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (err) {
      console.error(err);
    }
  };

  const getPriorityStyle = (priority) => {
    if (priority === 'high') {
      return { borderLeft: '4px solid #ef4444', background: 'rgba(239, 68, 68, 0.05)' };
    }
    if (priority === 'medium') {
      return { borderLeft: '4px solid #f59e0b', background: 'rgba(245, 158, 11, 0.05)' };
    }
    return { borderLeft: '4px solid #10b981', background: 'rgba(16, 185, 129, 0.05)' };
  };

  const formatTime = (timeStr) => {
    const d = new Date(timeStr);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' - ' + d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="notification-center-container" ref={dropdownRef} style={{ position: 'relative', display: 'inline-block' }}>
      {/* Bell Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#fff',
          cursor: 'pointer',
          padding: '8px',
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.2s'
        }}
        className="nav-btn"
        title="Notifications"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '0px',
            right: '0px',
            background: '#ef4444',
            color: '#fff',
            borderRadius: '50%',
            padding: '2px 5px',
            fontSize: '0.65rem',
            fontWeight: 'bold',
            minWidth: '15px',
            textAlign: 'center',
            boxShadow: '0 0 6px #ef4444'
          }}>
            {unreadCount}
          </span>
        )}
      </button>

      {/* Glassmorphic Dropdown Panel */}
      {isOpen && (
        <div style={{
          position: 'absolute',
          top: '40px',
          right: '0',
          width: '320px',
          maxHeight: '400px',
          overflowY: 'auto',
          background: 'rgba(20, 30, 45, 0.95)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '12px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column'
        }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
          }}>
            <span style={{ fontWeight: 'bold', fontSize: '0.9rem', color: '#fff' }}>
              Notifications ({unreadCount} unread)
            </span>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: 'var(--accent-cyan)',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <CheckCheck size={14} />
                <span>Mark all read</span>
              </button>
            )}
          </div>

          {/* List Content */}
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {notifications.length === 0 ? (
              <div style={{
                padding: '24px 16px',
                textAlign: 'center',
                color: 'var(--text-muted)',
                fontSize: '0.8rem'
              }}>
                No notifications alerts today.
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    opacity: notif.isRead ? 0.6 : 1,
                    transition: 'all 0.2s',
                    ...getPriorityStyle(notif.priority)
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 'bold', fontSize: '0.85rem', color: '#fff' }}>
                      {notif.title}
                    </span>
                    {!notif.isRead && (
                      <button
                        onClick={(e) => handleMarkRead(e, notif._id)}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: 'none',
                          color: 'var(--accent-cyan)',
                          borderRadius: '4px',
                          padding: '2px 4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Mark read"
                      >
                        <Check size={12} />
                      </button>
                    )}
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#cbd5e1', margin: 0, lineHeight: '1.4' }}>
                    {notif.message}
                  </p>
                  <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                    {formatTime(notif.createdAt)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
