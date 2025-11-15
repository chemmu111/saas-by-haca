import { useState, useEffect } from 'react';

export const useScheduling = () => {
  const [timezone, setTimezone] = useState('');
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Get user's timezone
  useEffect(() => {
    setTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  const validateScheduledTime = (scheduledTimeString, postType, platform) => {
    if (!scheduledTimeString) {
      return { isValid: false, error: 'Please select a scheduled time' };
    }

    const scheduledTime = new Date(scheduledTimeString);
    const now = new Date();

    // Must be in the future
    if (scheduledTime <= now) {
      return { isValid: false, error: 'Scheduled time must be in the future' };
    }

    // Must be within reasonable bounds (not too far in the future)
    const maxFutureDate = new Date();
    maxFutureDate.setFullYear(maxFutureDate.getFullYear() + 1); // 1 year max

    if (scheduledTime > maxFutureDate) {
      return { isValid: false, error: 'Cannot schedule posts more than 1 year in advance' };
    }

    // Platform-specific validations
    if (platform === 'instagram') {
      // Instagram stories cannot be scheduled
      if (postType === 'story') {
        return { isValid: false, error: 'Instagram stories cannot be scheduled - they must be posted immediately' };
      }
    }

    // Business hours validation (optional - can be disabled)
    const hour = scheduledTime.getHours();
    if (hour < 6 || hour > 22) {
      return {
        isValid: true,
        warning: 'Consider scheduling during business hours (6 AM - 10 PM) for better engagement'
      };
    }

    return { isValid: true };
  };

  const formatScheduledTime = (timeString) => {
    if (!timeString) return '';

    const date = new Date(timeString);
    return date.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });
  };

  const getTimeUntilScheduled = (scheduledTimeString) => {
    if (!scheduledTimeString) return null;

    const scheduled = new Date(scheduledTimeString);
    const now = new Date();
    const diffMs = scheduled - now;

    if (diffMs <= 0) return null;

    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    const diffHours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffDays > 0) {
      return `${diffDays}d ${diffHours}h`;
    } else if (diffHours > 0) {
      return `${diffHours}h ${diffMinutes}m`;
    } else {
      return `${diffMinutes}m`;
    }
  };

  const getSuggestedTimes = () => {
    const now = new Date();
    const suggestions = [];

    // Next available business hours
    const nextBusinessHour = new Date(now);
    const currentHour = now.getHours();

    if (currentHour < 9) {
      // Before 9 AM, suggest 9 AM today
      nextBusinessHour.setHours(9, 0, 0, 0);
    } else if (currentHour >= 9 && currentHour < 17) {
      // During business hours, suggest next hour
      nextBusinessHour.setHours(currentHour + 1, 0, 0, 0);
    } else {
      // After 5 PM, suggest 9 AM tomorrow
      nextBusinessHour.setDate(nextBusinessHour.getDate() + 1);
      nextBusinessHour.setHours(9, 0, 0, 0);
    }

    suggestions.push({
      label: 'Next Business Hour',
      value: nextBusinessHour.toISOString().slice(0, 16),
      description: formatScheduledTime(nextBusinessHour.toISOString())
    });

    // Tomorrow at 10 AM
    const tomorrow10AM = new Date(now);
    tomorrow10AM.setDate(tomorrow10AM.getDate() + 1);
    tomorrow10AM.setHours(10, 0, 0, 0);

    suggestions.push({
      label: 'Tomorrow 10 AM',
      value: tomorrow10AM.toISOString().slice(0, 16),
      description: formatScheduledTime(tomorrow10AM.toISOString())
    });

    // This weekend (Saturday 11 AM)
    const saturday = new Date(now);
    const daysUntilSaturday = (6 - now.getDay()) % 7;
    if (daysUntilSaturday === 0 && now.getDay() === 6) {
      // If it's Saturday, get next Saturday
      saturday.setDate(saturday.getDate() + 7);
    } else {
      saturday.setDate(saturday.getDate() + daysUntilSaturday);
    }
    saturday.setHours(11, 0, 0, 0);

    suggestions.push({
      label: 'This Weekend',
      value: saturday.toISOString().slice(0, 16),
      description: formatScheduledTime(saturday.toISOString())
    });

    return suggestions;
  };

  return {
    timezone,
    currentTime,
    validateScheduledTime,
    formatScheduledTime,
    getTimeUntilScheduled,
    getSuggestedTimes
  };
};
