'use strict';
const got = require('got');
const isPlainObj = require('is-plain-obj');
const HttpAgent = require('agentkeepalive');
const HttpsAgent = HttpAgent.HttpsAgent;

let _activity = null;

function api(path, opts) {
  if (typeof path !== 'string') {
    return Promise.reject(new TypeError(`Expected \`path\` to be a string, got ${typeof path}`));
  }

  opts = Object.assign({
    json: true,
    token: _activity.Context.connector.token,
    endpoint: 'https://www.googleapis.com',
    agent: {
      http: new HttpAgent(),
      https: new HttpsAgent()
    }
  }, opts);

  opts.headers = Object.assign({
    accept: 'application/json',
    'user-agent': 'adenin Now Assistant Connector, https://www.adenin.com/now-assistant'
  }, opts.headers);

  if (opts.token) {
    opts.headers.Authorization = `Bearer ${opts.token}`;
  }

  const url = /^http(s)\:\/\/?/.test(path) && opts.endpoint ? path : opts.endpoint + path;

  if (opts.stream) {
    return got.stream(url, opts);
  }

  return got(url, opts).catch(err => {
    throw err;
  });
}
// convert response from /issues endpoint to 
api.convertResponse = function (response) {
  let items = [];
  let meetings = response.body.items;

  // iterate through each issue and extract id, title, etc. into a new array
  for (let i = 0; i < meetings.length; i++) {
    let raw = meetings[i];
    let item = { id: raw.id, title: raw.summary, description: raw.description, link: raw.htmlLink, raw: raw };
    items.push(item);
  }

  return { items: items };
};
const helpers = [
  'get',
  'post',
  'put',
  'patch',
  'head',
  'delete'
];

api.stream = (url, opts) => apigot(url, Object.assign({}, opts, {
  json: false,
  stream: true
}));

api.initialize = function (activity) {
  _activity = activity;
}

for (const x of helpers) {
  const method = x.toUpperCase();
  api[x] = (url, opts) => api(url, Object.assign({}, opts, { method }));
  api.stream[x] = (url, opts) => api.stream(url, Object.assign({}, opts, { method }));
}

/**returns all events from now until midnight*/
api.getTodaysEvents = function () {
  var dateRange = cfActivity.dateRange(_activity, "today");
  let timeMin = ISODateString(new Date(new Date().toUTCString())); //time now in UTC+0
  let timeMax = ISODateString(new Date(dateRange.endDate));

  let path = '/calendar/v3/calendars/primary/events' + "?timeMax=" + timeMax + "&timeMin=" + timeMin + "&timeZone=UTC%2B0%3A00";
  return api(path);
};

/**formats string to match google api requirements*/
function ISODateString(d) {
  function pad(n) { return n < 10 ? '0' + n : n }
  return d.getUTCFullYear() + '-'
    + pad(d.getUTCMonth() + 1) + '-'
    + pad(d.getUTCDate()) + 'T'
    + pad(d.getUTCHours()) + ':'
    + pad(d.getUTCMinutes()) + ':'
    + pad(d.getUTCSeconds()) + 'Z'
}

module.exports = api;