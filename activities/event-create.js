'use strict';
const api = require('./common/api');
const path = require('path');
const yaml = require('js-yaml');
const fs = require('fs');

module.exports = async (activity) => {
  try {
    var data = {};

    // extract _action from Request
    var _action = getObjPath(activity.Request, "Data.model._action");
    if (_action) {
      activity.Request.Data.model._action = {};
    } else {
      _action = {};
    }

    switch (activity.Request.Path) {

      case "create":
      case "submit":
        const form = _action.form;
        api.initialize(activity);
        let endDateTime = new Date(form.startdatetime);
        endDateTime.setMinutes(endDateTime.getMinutes() + parseInt(form.duration));
        var response = await api.post("/calendar/v3/calendars/primary/events", {
          json: true,
          body: {
            summary: form.subject,
            description: form.description,
            start: {
              dateTime: form.startdatetime
            },
            end: {
              dateTime: endDateTime.toISOString()
            }
          }
        });


        var comment = T(activity,"Event {0} created", response.body.id);
        data = getObjPath(activity.Request, "Data.model");
        data._action = {
          response: {
            success: true,
            message: comment
          }
        };
        break;

      default:
        var fname = __dirname + path.sep + "common" + path.sep + "event-create.form";
        var schema = yaml.safeLoad(fs.readFileSync(fname, 'utf8'));

        data.title = T(activity,"Create Google Event");
        data.formSchema = schema;
        // initialize form subject with query parameter (if provided)
        if (activity.Request.Query && activity.Request.Query.query) {
          data = {
            form: {
              subject: activity.Request.Query.query
            }
          }
        }
        data._actionList = [{
          id: "create",
          label: T(activity,"Create Event"),
          settings: {
            actionType: "a"
          }
        }];
        break;
    }

    activity.Response.Data = data;
  } catch (error) {
    $.handleError(activity,error);
  }

  function getObjPath(obj, path) {

    if (!path) return obj;
    if (!obj) return null;

    var paths = path.split('.'),
      current = obj;

    for (var i = 0; i < paths.length; ++i) {
      if (current[paths[i]] == undefined) {
        return undefined;
      } else {
        current = current[paths[i]];
      }
    }
    return current;
  }
};