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
      let eventTime = new Date(Date.parse(nextEvent.start.dateTime));
      let hrs = eventTime.getHours();
      let mins = eventTime.getMinutes();
      let eventCount = events.length;

      eventStatus = {
        ...eventStatus,
        description: `You have ${eventCount > 1 ? eventCount + " events" : eventCount + " event"} today.The next event '${nextEvent.summary}' is scheduled at ${hrs > 9 ? hrs : "0" + hrs}:${mins > 9 ? mins : "0" + mins}.`,
        color: 'blue',
        value: eventCount,
        actionable: true
      };
    } else {
      eventStatus = {
        ...eventStatus,
        description: `You have no events today.`,
        actionable: false
      };
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