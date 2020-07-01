'use strict';

const moment = require('moment-timezone');

const api = require('./common/api');

module.exports = async function (activity) {
  try {
    api.initialize(activity);

    const dateRange = $.dateRange(activity, 'today');

    const timeMin = ISODateString(new Date(dateRange.startDate));
    const timeMax = ISODateString(new Date(dateRange.endDate));

    const allEvents = [];

    const path = `/calendar/v3/calendars/primary/events?timeMax=${timeMax}&timeMin=${timeMin}&timeZone=UTC%2B0%3A00&maxResults=2500&singleEvents=true&orderBy=startTime`;
    const response = await api(path);

    if ($.isErrorResponse(activity, response)) return;

    allEvents.push(...response.body.items);

    let nextPageToken = response.body.nextPageToken;

    while (nextPageToken) {
      const nextPagePath = `/calendar/v3/calendars/primary/events?timeMax=${timeMax}&timeMin=${timeMin}&timeZone=UTC%2B0%3A00&maxResults=2500&singleEvents=true&orderBy=startTime&pageToken=${nextPageToken}`;
      const nextPage = await api(nextPagePath);

      if ($.isErrorResponse(activity, nextPage)) return;

      allEvents.push(...nextPage.body.items);
      nextPageToken = nextPage.body.nextPageToken;
    }

    const value = allEvents.length;
    const pagination = $.pagination(activity);
    const paginatedItems = paginateItems(allEvents, pagination);

    activity.Response.Data.items = convertResponse(paginatedItems);

    if (parseInt(pagination.page) === 1) {
      activity.Response.Data.title = T(activity, 'Events Today');
      activity.Response.Data.link = 'https://calendar.google.com/calendar';
      activity.Response.Data.linkLabel = T(activity, 'All events');
      activity.Response.Data.thumbnail = 'https://www.adenin.com/assets/images/wp-images/logo/google-calendar.svg';
      activity.Response.Data.actionable = value > 0;
      activity.Response.Data.integration = 'Google Calendar';
      activity.Response.Data.date = moment().startOf('day').format();

      if (value > 0) {
        const first = activity.Response.Data.items[0];

        activity.Response.Data.value = value;
        activity.Response.Data.date = first.date;
        activity.Response.Data.description = value > 1 ? `You have ${value} events today.` : 'You have 1 event today.';

        const when = moment().to(moment(first.date));

        activity.Response.Data.briefing = activity.Response.Data.description + ` The next is '${first.title}' ${when}`;
      } else {
        activity.Response.Data.description = T(activity, 'You have no events today.');
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

    const start = moment(raw.start.dateTime);
    const end = moment(raw.end.dateTime);

    const duration = moment.duration(start.diff(end)).humanize();

    const item = {
      id: raw.id,
      title: raw.summary,
      description: raw.description,
      date: raw.start.dateTime,
      link: raw.htmlLink,
      duration: duration,
      organizer: raw.organizer,
      attendees: raw.attendees ? raw.attendees : []
    };

    item.organizer.avatar = $.avatarLink(item.organizer.email, item.organizer.email);

    const meetingUrl = parseUrl(raw.location);

    if (meetingUrl) {
      item.onlineMeetingUrl = meetingUrl;
    } else if (raw.location) {
      item.location = {
        title: raw.location
      };
    }

    if (raw.attendees) {
      for (let j = 0; j < raw.attendees.length; j++) {
        raw.attendees[j].avatar = $.avatarLink(raw.attendees[j].email, raw.attendees[j].email);

        if (!raw.attendees[j].self) continue;

        if (raw.organizer.self) {
          item.response = {
            status: 'organizer'
          };

          break;
        }

        item.response = {
          status: raw.attendees[j].responseStatus === 'accepted' ? 'accepted' : 'notaccepted'
        };

        break;
      }
    }

    item.showDetails = false;

    items.push(item);
  }

  return items;
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
  const paginatedItems = [];
  const pageSize = parseInt(pagination.pageSize);
  const offset = (parseInt(pagination.page) - 1) * pageSize;

  if (offset > items.length) return paginatedItems;

  for (let i = offset; i < offset + pageSize; i++) {
    if (i >= items.length) break;

    paginatedItems.push(items[i]);
  }

  return paginatedItems;
}

const urlRegex = /(https?)\:\/\/[A-Za-z0-9\.\-]+(\/[A-Za-z0-9\?\&\=;\+!'\(\)\*\-\._~%]*)*/gi;

function parseUrl(text) {
  if (!text) return null;

  text = text.replace(/\n|\r/g, ' ');

  if (text.search(urlRegex) !== -1) {
    let url = text.substring(text.search(urlRegex), text.length);

    if (url.indexOf(' ') !== -1) url = url.substring(0, url.indexOf(' '));
    if (!url.match(/^[a-zA-Z]+:\/\//)) url = 'https://' + url;

    return url;
  }

  return null;
}
