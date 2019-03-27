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
      link: 'https://calendar.google.com/calendar',
      linkLabel : T('All events')
    };

    let eventCount = events.length;

    if (eventCount != 0) {
      let nextEvent = getNexEvent(events);

      let eventFormatedTime = getEventFormatedTimeAsString(nextEvent);
      let eventPluralorNot = eventCount > 1 ? T("events scheduled") : T("event scheduled");
      let description = T(`You have {0} {1} today. The next event '{2}' starts {3}`, eventCount, eventPluralorNot, nextEvent.summary, eventFormatedTime);

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

//** checks if event is in less then hour, today or tomorrow and returns formated string accordingly */
function getEventFormatedTimeAsString(nextEvent) {
  let eventTime = moment(nextEvent.start.dateTime)
    .tz(Activity.Context.UserTimezone)
    .locale(Activity.Context.UserLocale);
  let timeNow = moment(new Date());

  let diffInHrs = eventTime.diff(timeNow, 'hours');

  if (diffInHrs == 0) {
    //events that start in less then 1 hour
    let diffInMins = eventTime.diff(timeNow, 'minutes');
    return T(`in {0} minutes.`, diffInMins);
  } else {
    //events that start in more than 1 hour
    let diffInDays = eventTime.diff(timeNow, 'days');

    let datePrefix = '';
    let momentDate = '';
    if (diffInDays == 1) {
      //events that start tomorrow
      datePrefix = 'tomorrow ';
    } else if (diffInDays > 1) {
      //events that start day after tomorrow and later
      datePrefix = 'on ';
      momentDate = eventTime.format('LL') + " ";
    }

    return T(`{0}{1}{2}{3}.`, T(datePrefix), momentDate, T("at "), eventTime.format('LT'));
  }
}