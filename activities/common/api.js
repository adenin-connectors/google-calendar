'use strict';
const got = require('got');
const isPlainObj = require('is-plain-obj');
const HttpAgent = require('agentkeepalive');
const HttpsAgent = HttpAgent.HttpsAgent;

let _activity = null;

function api(path, opts, timeMin, timeMax) {
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

  const url = /^http(s)\:\/\/?/.test(path) && opts.endpoint ? path : opts.endpoint + path + "?timeMax=" + timeMax + "&timeMin=" + timeMin;

  if (opts.stream) {
    return got.stream(url, opts);
  }

  return got(url, opts).catch(err => {

    throw err;
  });
}
// convert response from /issues endpoint to 
api.convertIssues = function (response) {
  let items = [];
  let meetings = response.body.items;

  // iterate through each issue and extract id, title, etc. into a new array
  for (let i = 0; i < meetings.length; i++) {
    let raw = meetings[i];
    let item = { id: raw.id, title: raw.summary, description: raw.description, link: raw.htmlLink, raw: raw }
    items.push(item);
  }

  return { items: items };
}
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

/**returns all events for today until midnight*/
api.getTodaysEvents = function (path) {
  let now = getUTCTime(); 
  let midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 0);

  let timeMin = ISODateString(now);
  let timeMax = ISODateString(midnight);

  return api(path, null, timeMin, timeMax);
}

/**returns UTCNow  time*/
function getUTCTime() {
  let d = new Date();
  //this is where i tried to add 12 hrs and api didnt work (nowUTC is miliseconds so '+(10*60*60*1000)' should be added)
  var nowUTC = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), d.getUTCHours(), d.getUTCMinutes(), d.getUTCSeconds());
  
  return new Date(nowUTC);
}
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