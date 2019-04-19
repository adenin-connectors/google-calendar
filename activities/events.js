'use strict';
const api = require('./common/api');

module.exports = async function (activity) {
  try {
    let pagination = $.pagination(activity);
    api.initialize(activity);
    const response = await api.getTodaysEvents(pagination);

    if ($.isErrorResponse(activity, response)) return;

    activity.Response.Data = convertResponse(response);
    if (response.body.nextPageToken) activity.Response.Data._nextpage = response.body.nextPageToken;

  } catch (error) {
    $.handleError(activity, error);
  }
};

// convert response from /issues endpoint to
function convertResponse(response) {
  const items = [];
  const meetings = response.body.items;

  // iterate through each issue and extract id, title, etc. into a new array
  for (let i = 0; i < meetings.length; i++) {
    const raw = meetings[i];
    const item = {
      id: raw.id,
      title: raw.summary,
      description: raw.description,
      link: raw.htmlLink,
      raw: raw
    };

    items.push(item);
  }

  return {
    items: items
  };
}