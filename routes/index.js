var express = require('express');
var router = express.Router();
var api_key = require('../credentials').hotwire_api_key;
var api_base = 'http://api.hotwire.com/v1/search/car';
var Promise = require('promise');
var request = Promise.denodeify(require('request'));
var xml2js = require('xml2js');
var parseString = Promise.denodeify(xml2js.parseString);

router.get('/', function(req, res, next) {
  res.render('index');
});

router.get('/api', function(req, res, next) {
  var requiredParams = ['dest', 'start', 'end', 'pickup', 'dropoff'];
  var err;
  requiredParams.every(function(field) {// make sure every field is in the request
    if(req.query[field]) {
      return true;
    }
    err = new Error('Missing required parameter: "' + field + '"');
    err.status = 400;
    return false;
  });
  if(err) {// missing required field, skip to error handlers
    return next(err);
  }
//  dest, req
//    You may specify a three letter airport code, such as JFK or LAX
//    You may specify a lat,lon pair.
//    You may specify a string that we can geocode into a lat,lon pair.   You can try addresses, city names, and points of interest.  
//  startdate, req
//    stays up to 330 days from the current date, with a maximum rental duration of 60 days
//  enddate, req
//    stays up to 330 days from the current date, with a maximum rental duration of 60 days
//  pickuptime, req
//    'HH:mm', HH = 00-23, mm = 00 or 30
//  dropofftime, req 'HH:mm'
//  resultType, opt
//    ['O', 'N', 'A']
//  includeResultsLink, opt
//    ['true', 'false']
  var dest = req.query.dest;
  var start = req.query.start;
  var end = req.query.end;
  var pickup = req.query.pickup;
  var dropoff = req.query.dropoff;
  var result = req.query.result;
  var incResults = req.query.incResults || false;
  var qs = 'dest=' + dest
    + '&startdate=' + start
    + '&enddate=' + end
    + '&pickuptime=' + pickup
    + '&dropofftime=' + dropoff;
  var endpoint = api_base + '?apikey=' + api_key + '&' + qs;
  request(endpoint)
    .then(function(resp) {
      if(resp.statusCode !== 200) {
        err = new Error('Error with Hotwire API.');
        err.status = 500;
        return next(err);
      }
      return parseString(resp.body, { explicitArray: false, emptyTag: undefined, valueProcessors: [ xml2js.processors.parseNumbers ] });
    })
    .then(function(jsonResp) {
      var result = [];// parse through converted XML response or return empty array
      var metadataMap = {};
      if(jsonResp.Hotwire.StatusDesc === 'success') {
        jsonResp.Hotwire.MetaData.CarMetaData.CarTypes.CarType.forEach(function(carType) {
          metadataMap[carType.CarTypeCode] = carType;
        });
        result = jsonResp.Hotwire.Result.CarResult.map(function (car) {
          car.CarType = metadataMap[car.CarTypeCode];
          return car;
        });
        
      } else if (jsonResp.Hotwire.Errors) {
        result = { err: jsonResp.Hotwire.Errors.Error.ErrorMessage };
      }
      res.end(JSON.stringify(result));
    });
});

module.exports = router;
