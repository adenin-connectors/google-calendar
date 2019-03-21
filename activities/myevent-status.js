'use strict';

const cfActivity = require('@adenin/cf-activity');
const api = require('./common/api');
const moment = require('moment-timezone');

module.exports = async (activity) => {
  try {
    api.initialize(activity);
    const response = await api.getTodaysEvents();

    if (!cfActivity.isResponseOk(activity, response)) {
      return;
    }

    let events = response.body.items;

    let eventStatus = {
      title: 'Events Today',
      url: 'https://calendar.google.com/calendar',
      urlLabel: 'All events',
    };

    let eventCount = events.length;

    if (eventCount != 0) {
      let nextEvent = getNexEvent(events);
      let eventTimer = calculateTimeDiference(nextEvent.start.dateTime);

      let description = `You have ${formatEvents(eventCount)} today. The next event '${nextEvent.summary}' is scheduled`;

      if (eventTimer < (60 * 60 * 1000)) {
        let mins = new Date(eventTimer).getMinutes();
        description += ` in ${formatMinutes(mins)}.`;
      } else {
        let temptime = moment(nextEvent.start.dateTime)
          .tz(activity.Context.UserTimezone)
          .locale(activity.Context.UserLocale)
          .format('LT');

        description += ` at ${temptime}.`;
      }

      eventStatus = {
        ...eventStatus,
        description: description,
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
    cfActivity.handleError(activity, error);
  }
};
/**helper function to format event number string based on number of events */
function formatEvents(eventCount) {
  return eventCount > 1 ? eventCount + " events" : eventCount + " event";
}
/**helper function to format minutes string based on number of minutes */
function formatMinutes(mins) {
  let number = mins > 9 ? mins : "0" + mins;
  return mins != 1 ? number + " minutes" : number + " minute";
}
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
/** calculaes time diference between now(utc0) and next event */
function calculateTimeDiference(nextEventsTime) {
  let d = new Date(); //nowInMilis
  var nowUTC = Date.UTC(d.getFullYear(), d.getMonth(), d.getUTCDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
  let nextEventMilis = Date.parse(nextEventsTime);

  return nextEventMilis - nowUTC;
}