'use strict';
const api = require('./common/api');

module.exports = async function (activity) {
  try {
    let pagination = Activity.pagination();
    const response = await api.getTodaysEvents(pagination);

    if (Activity.isErrorResponse(response)) return;

    activity.Response.Data = api.convertResponse(response);
    if(response.body.nextPageToken){
      activity.Response.Data._nextpage = response.body.nextPageToken;
    }
  } catch (error) {
    Activity.handleError(error);
  }
};