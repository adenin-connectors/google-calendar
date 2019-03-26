'use strict';
const api = require('./common/api');
const moment = require('moment-timezone');

module.exports = async (activity) => {
  try {
    const response = await api.getTodaysEvents();

    if (Activity.isErrorResponse(response)) return;

    let events = response.body.items;

    let eventStatus = {
      title: T('Events Today'),
      url: 'https://calendar.google.com/calendar',
      urlLabel: T('All events'),
    };

    let eventCount = events.length;

    if (eventCount != 0) {
      let nextEvent = getNexEvent(events);

      let eventFormatedTime = getEventFormatedTimeAsString(nextEvent);
      let eventPluralorNot = eventCount > 1 ? T("events scheduled") : T("event scheduled");
      let description = T(`You have {0} {1} today. The next event '{2}' starts{3}`, eventCount, eventPluralorNot, nextEvent.summary, eventFormatedTime);

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
        description: T(`You have no events today.`),
        actionable: false
      };
    }

    activity.Response.Data = eventStatus;
  } catch (error) {
    Activity.handleError(error);
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
/** calculaes time diference between now(utc0) and next event */
function calculateTimeDiference(nextEventsTime) {
  let d = new Date(); //nowInMilis
  var nowUTC = Date.UTC(d.getFullYear(), d.getMonth(), d.getUTCDate(), d.getHours(), d.getMinutes(), d.getSeconds(), d.getMilliseconds());
  let nextEventMilis = Date.parse(nextEventsTime);

  return new Date(nextEventMilis - nowUTC);
}
//** checks if event is in less then hour, today or tomorrow and returns formated string accordingly */
function getEventFormatedTimeAsString(nextEvent) {
  let timeUntilEvent = calculateTimeDiference(nextEvent.start.dateTime);
  let eventDate = new Date();

  if (timeUntilEvent.getHours() == 0) {
    //events that start in less then 1 hour
    return T(` in {0} minutes.`, timeUntilEvent.getMinutes());
  } else {
    //events that start in more than 1 hour
    let eventClock = moment(eventDate)
      .tz(Activity.Context.UserTimezone)
      .locale(Activity.Context.UserLocale)
      .format('LT');

    let datePrefix = '';
    let momentDate = '';
    if (timeUntilEvent.getDate() == 2) {
      //events that start tomorrow
      datePrefix = ' tomorrow';
    } else if (timeUntilEvent.getDate() > 2) {
      //events that start day after tomorrow and later
      datePrefix = ' on ';
      momentDate = moment(eventDate)
        .tz(Activity.Context.UserTimezone)
        .locale(Activity.Context.UserLocale)
        .format('LL');
    }

    return T(`{0}{1}{2}{3}.`, T(datePrefix), momentDate, T(" at "), eventClock);
  }
}