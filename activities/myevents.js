'use strict';
const api = require('./common/api');
const moment = require('moment-timezone');

module.exports = async function (activity) {
  try {
    api.initialize(activity);
    const dateRange = $.dateRange(activity, 'today');
    const timeMin = ISODateString(new Date(new Date().toUTCString())); //time now in UTC+0
    const timeMax = ISODateString(new Date(dateRange.endDate));

    let allEvents = [];

    let path = '/calendar/v3/calendars/primary/events?timeMax=' + timeMax + '&timeMin=' + timeMin + '&timeZone=UTC%2B0%3A00&maxResults=2500' +
      '&singleEvents=true&orderBy=startTime';
    const response = await api(path);
    if ($.isErrorResponse(activity, response)) return;
    allEvents.push(...response.body.items);

    let nextPageToken = response.body.nextPageToken;

    while (nextPageToken) {
      let nextPagePath = '/calendar/v3/calendars/primary/events?timeMax=' + timeMax + '&timeMin=' + timeMin + '&timeZone=UTC%2B0%3A00&maxResults=2500' +
        `&pageToken=${nextPageToken}&singleEvents=true&orderBy=startTime`;
      const nextPage = await api(nextPagePath);
      if ($.isErrorResponse(activity, nextPage)) return;
      allEvents.push(...nextPage.body.items);
      nextPageToken = nextPage.body.nextPageToken;
    }

    let value = allEvents.length;
    let pagination = $.pagination(activity);
    let pagiantedItems = paginateItems(allEvents, pagination);

    activity.Response.Data.items = convertResponse(pagiantedItems);
    if (parseInt(pagination.page) == 1) {

      activity.Response.Data.title = T(activity, 'Events Today');
      activity.Response.Data.link = `https://calendar.google.com/calendar`;
      activity.Response.Data.linkLabel = T(activity, 'All events');
      activity.Response.Data.actionable = value > 0;

      if (value > 0) {
        let nextEvent = getNexEvent(allEvents);

        let eventFormatedTime = getEventFormatedTimeAsString(activity, nextEvent);
        let eventPluralorNot = value > 1 ? T(activity, "events scheduled") : T(activity, "event scheduled");
        let description = T(activity, `You have {0} {1} today. The next event '{2}' starts {3}`, value, eventPluralorNot, nextEvent.summary, eventFormatedTime);

        activity.Response.Data.value = value;
        activity.Response.Data.date = allEvents[0].start.dateTime;
        activity.Response.Data.color = 'blue';
        activity.Response.Data.description = description;
      } else {
        activity.Response.Data.description = T(activity, `You have no events today.`);
      }
    }
  } catch (error) {
    $.handleError(activity, error);
  }
};
// convert response from /issues endpoint to
function convertResponse(events) {
  const items = [];

  // iterate through each issue and extract id, title, etc. into a new array
  for (let i = 0; i < events.length; i++) {
    const raw = events[i];
    const item = {
      id: raw.id,
      title: raw.summary,
      description: raw.description,
      date: raw.start.dateTime,
      link: raw.htmlLink,
      raw: raw
    };

    items.push(item);
  }

  return { items };
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
//** checks if event is in less then hour, today or tomorrow and returns formated string accordingly */
function getEventFormatedTimeAsString(activity, nextEvent) {
  let eventTime = moment(nextEvent.start.dateTime)
    .tz(activity.Context.UserTimezone)
    .locale(activity.Context.UserLocale);
  let timeNow = moment(new Date());

  let diffInHrs = eventTime.diff(timeNow, 'hours');

  if (diffInHrs == 0) {
    //events that start in less then 1 hour
    let diffInMins = eventTime.diff(timeNow, 'minutes');
    return T(activity, `in {0} minutes.`, diffInMins);
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

    return T(activity, `{0}{1}{2}{3}.`, T(activity, datePrefix), momentDate, T(activity, "at "), eventTime.format('LT'));
  }
}
/**formats string to match google api requirements*/
function ISODateString(d) {
  function pad(n) {
    return n < 10 ? '0' + n : n;
  }

  return d.getUTCFullYear() + '-' +
    pad(d.getUTCMonth() + 1) + '-' +
    pad(d.getUTCDate()) + 'T' +
    pad(d.getUTCHours()) + ':' +
    pad(d.getUTCMinutes()) + ':' +
    pad(d.getUTCSeconds()) + 'Z';
}
//** paginate items[] based on provided pagination */
function paginateItems(items, pagination) {
  let pagiantedItems = [];
  const pageSize = parseInt(pagination.pageSize);
  const offset = (parseInt(pagination.page) - 1) * pageSize;

  if (offset > items.length) return pagiantedItems;

  for (let i = offset; i < offset + pageSize; i++) {
    if (i >= items.length) {
      break;
    }
    pagiantedItems.push(items[i]);
  }
  return pagiantedItems;
}