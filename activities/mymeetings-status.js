'use strict';

const logger = require('@adenin/cf-logger');
const handleError = require('@adenin/cf-activity').handleError;
const api = require('./common/api');

module.exports = async (activity) => {
  try {
    api.initialize(activity);

    const response = await api.getTodaysEvents();

    let events = response.body.items;

    let eventStatus = {
      title: 'Events Today',
      url: 'https://calendar.google.com/calendar',
      urlLabel: 'All events',
    };

    if (events.length != 0) {
      let nextEvent = getNexEvent(events);
      let eventTimer = getTimeDiference(nextEvent.start.dateTime);

      eventStatus = {
        ...eventStatus,
        description: `The next event '${nextEvent.summary}' is scheduled in ${eventTimer.getHours()} hours and  ${eventTimer.getMinutes()} minutes.`,
        color: 'blue',
        value: events.length,
        actionable: true
      }
    } else {
      eventStatus = {
        ...eventStatus,
        description: `You have no events today.`,
        actionable: false
      }
    }

    activity.Response.Data = eventStatus;

  } catch (error) {
    handleError(error, activity);
  }
};

/**filters out first upcoming event in google calendar*/
function getNexEvent(events) {
  let nextEvent = null;
  let nextEventMilis = 0;

  for (let i = 0; i < events.length; i++) {
    let tempDate = Date.parse(events[i].start.dateTime);

    if (nextEventMilis == 0) {
      nextEventMilis = tempDate;
      nextEvent = events[i];
    }

    if (nextEventMilis > tempDate) {
      nextEventMilis = tempDate;
      nextEvent = events[i];
    }
  }

  return nextEvent;
}

/**calculates diference between now and next event*/
function getTimeDiference(nextEventsTime) {
  let nowInMilis = new Date();
  let nextEventMilis = Date.parse(nextEventsTime);

  return new Date(nextEventMilis - nowInMilis);
}