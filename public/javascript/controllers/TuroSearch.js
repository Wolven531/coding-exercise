'use strict';
/* global angular, moment */

var dateFormat = 'MM/DD/YYYY';
var timeValueFormat = 'HH:mm';
var timeDisplayFormat = 'h:mm A';
angular
  .module('TuroSearchApp', [])
  .directive('datepicker', function() {
    return {
      restrict: 'A',
      require: 'ngModel',
      link: function (scope, element, attrs, ngModelCtrl) {
        $(function() {
          element.datepicker({
            dateFormat: dateFormat,
            onSelect: function (date) {
              scope.$apply(function () {
                ngModelCtrl.$setViewValue(date);
              });
            }
          });
        });
      }
    };
  })
  .controller('TuroSearchController', function($scope, $http) {
    var pickupTime = moment().add(2.5, 'hours').startOf('hour');// minimum pickup time is 2 hours from current
    $scope.timeOptions = getTimeOptions();
    $scope.start = moment().format(dateFormat);
    $scope.end = moment().add(1, 'days').format(dateFormat);
    $scope.pickup = pickupTime.format(timeValueFormat);
    $scope.dropoff = pickupTime.add(30, 'minutes').format(timeValueFormat);// default dropoff is 30 mins after pickup

    $scope.validateParams = function() {
      var result = false;
      if($scope.dest) {// first run check
        result = $scope.dest.length > 0
          $scope.start.length > 0 && moment($scope.start, dateFormat).isValid()
          $scope.end.length > 0 && moment($scope.end, dateFormat).isValid()
          $scope.pickup.length > 0 && moment($scope.pickup, timeValueFormat).isValid()
          $scope.dropoff.length > 0 && moment($scope.dropoff, timeValueFormat).isValid();
      }
      return result;
    };
    $scope.updateResults = function() {
      jQuery('body').addClass('loading');
      if($scope.validateParams()) {
        $scope.results = [];
        $http.get(getApiRequestUrl())
          .then(function(resp) {
            jQuery('body').removeClass('loading');
            if(!resp.data.err) {
              $scope.searchResults = resp.data;
              return;
            }
            $('#error-message').dialog({
              modal: true,
              resizable: false,
              buttons: {
                Ok: function() {
                  $(this).dialog('close');
                }
              }
            });
          }, endpointErr);
      }
    };
    $scope.setMinEnd = function() {
      var start = moment($scope.start, dateFormat);
      var end = moment($scope.end, dateFormat);
      $('#end').datepicker('option', 'minDate', new Date(start.get('year'), start.get('month'), start.get('date') + 1));

      if(end.isBefore(start) || end.isSame(start)) {
        $scope.end = start.add(1, 'day').format(dateFormat);
      }
    };
    $scope.updateDestinationSources = function() {
      if($scope.dest.length > 2) {
        $http.get('//www.hotwire.com/autocomplete?PGoodCode=C&filterType=C&query=' + $scope.dest)
          .then(function(resp) {
            $('#dest')
              .autocomplete('option', 'source',
              resp.data.map(function(curr) {
                return {
                  value: curr.v,
                  label: curr.v + (curr.airportEntry === true ? ' (' + curr.a + ' airport)' : ' (city)')
                };
              }));
          });
      }
    };

    function getTimeOptions() {
      var results = [];
      var beginningOfDay = moment().startOf('day');
      for(var a = 0; a < 48; a++) {// 24 hours in a day * 2 to include half hours
        results.push({
          val: beginningOfDay.format(timeValueFormat),// '15:30'
          display: beginningOfDay.format(timeDisplayFormat)// '3:30 PM'
        });
        beginningOfDay.add(30, 'minutes');
      }
      return results;
    }
    function getApiRequestUrl() {
      return '/api/'
        + '?dest=' + $scope.dest
        + '&start=' + $scope.start
        + '&end=' + $scope.end
        + '&pickup=' + $scope.pickup
        + '&dropoff=' + $scope.dropoff;
    }
    function endpointErr(resp) {// failure callback
      jQuery('body').removeClass('loading');
      if(resp.status !== 200) {// no results were returned, as per REST api
        console.log('There was an error hitting the Hotwire API.');
      }
    }
  });
  