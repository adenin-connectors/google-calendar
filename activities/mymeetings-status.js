'use strict';

const logger = require('@adenin/cf-logger');
const handleError = require('@adenin/cf-activity').handleError;
const api = require('./common/api');

module.exports = async (activity) => {
  try {
    api.initialize(activity);

    const response = await api('/calendar/v3/calendars/primary/events');

    let ticketStatus = {
      title: 'Meetings Today',
      url: 'https://calendar.google.com/calendar',
      urlLabel: 'All meetings',
    };

    let noOfMeetings = response.body.items.length;

    if (noOfMeetings != 0) {
      ticketStatus = {
        description: `You have ${noOfMeetings} meetings today.`,
        color: 'blue',
        value: noOfMeetings,
        actionable: true
      }
    } else {
      ticketStatus = {
        description: `You have no meetings today.`,
        actionable: false
      }
    }

    activity.Response.Data = ticketStatus;

  } catch (error) {
    handleError(error, activity);
  }
};
