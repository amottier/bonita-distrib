(function () {
  'use strict';
  var app = angular.module('autogeneratedForm', [
    'ui.bootstrap',
    'ngResource',
    'gettext',
    'org.bonita.common.resources',
    'ngUpload'
  ]);

  app.controller('MainCtrl', ['$scope', '$location', 'contractSrvc', '$window', 'processAPI', 'gettextCatalog', function ($scope, $location, contractSrvc, $window, processAPI, gettextCatalog) {
    var self = this;
    var processId = $location.search().id;
    $scope.inputArray = [];
    $scope.contract = {};
    $scope.dataToSend = {};
    $scope.autofill = {};
    $scope.process = {};
    $scope.message = undefined;

    $scope.importUrl = '/bonita/API/formFileUpload';
    $scope.filename = '';


    contractSrvc.fetchContract(processId).then(function (result) {
      $scope.contract = result.data;
    });

    processAPI.get({id: processId}, function (result) {
      $scope.process = result;
    });

    $scope.onUploadSuccess = function onUploadSuccess(response, input) {
      if(input.multiple){
        if($scope.dataToSend[input.name] === null){
          $scope.dataToSend[input.name] = [];
        }
        $scope.dataToSend[input.name].push(response);
      }else{
        $scope.dataToSend[input.name] = response;
      }
    };

    $scope.appendNewInput = function appendNewInput(input){
      var newInput = {
          type: input.type,
          description: input.description,
          name: input.name,
          multiple: input.multiple,
          inputs: input.inputs
        };
      $scope.inputArray[input.name].push(newInput);
      $scope.autofill[input.name].push(generateValue(input));
    };

    $scope.removeInput = function removeInput (input, index){
      $scope.inputArray[input.name].splice(index, 1);
      $scope.dataToSend[input.name].splice(index, 1);
      $scope.autofill[input.name].splice(index, 1);
    };

    var jsonify = function (data) {
      var jsonified = {};
      for (var prop in data) {

        if ((typeof data[prop] === 'string') && ((data[prop].lastIndexOf('{', 0) === 0) || (data[prop].lastIndexOf('[', 0) === 0))) {
          console.log('Jsonification of prop: ', data[prop]);
          jsonified[prop] = angular.fromJson(data[prop]);
        } else {
          jsonified[prop] = data[prop];
          console.log('prop', prop, 'jsonified[prop]', jsonified[prop]);
        }

      }
      return jsonified;
    };

    $scope.postData = function postData() {
      $scope.message = undefined;
      var jsonifiedDataToSend = jsonify($scope.dataToSend);
      contractSrvc.startProcess(processId, jsonifiedDataToSend).then(function () {
        
        $window.top.location.href = '/bonita';
      }, function (reason) {
        $scope.message = reason.data.explanations ? reason.data.explanations : reason.data.message;
      });
    };

    $scope.fillData = function fillData() {
      for (var prop in $scope.autofill) {
        $scope.dataToSend[prop] = $scope.autofill[prop];
      }
    };


    var generateValueForChildrenAttribute = function generateValueForChildrenAttribute(input) {
      var result = generateValue(input);
      if (input.type === 'TEXT') {
        return '"' + result + '"';
      }
      return result;
    };

     var generateValue = function generateValue(input) {
      var result = null;

      if (input.type === 'TEXT') {
        result = input.name;
      }
      if (input.type === 'BOOLEAN') {
        result = input.name.length % 2 === 0;
      }
      if (input.type === 'INTEGER') {
        result = input.name.length;
      }
      if (input.type === 'DECIMAL') {
        result = input.name.length + (input.name.length + 1) / 10;
      }
      if (input.type === 'DATE') {
        result = '"' + new Date().toJSON().slice(0, 10) + '"';
      }
      if (input.inputs.length > 0) {
        result = '{';
        for (var i = 0; i < input.inputs.length; i++) {
          if (i > 0) {
            result += ',';
          }
          result += '"' + input.inputs[i].name + '":' + generateValueForChildrenAttribute(input.inputs[i]);
        }
        result += '}';
      }
      /*
      if (input.multiple) {
        if (input.type === 'TEXT') {
          result = '"' + result + '"';
        }
        result = '[' + result + ']';
      }
      */
      return result;
    };

    $scope.isSimpleInput = function isSimpleInput(input) {
      return (input.inputs.length===0);
    };

    $scope.isComplexInput = function isComplexInput(input) {
      return !($scope.isSimpleInput(input));
    };


    $scope.isMultipleInput = function isMultipleInput(input) {
      return (input.multiple);
    };

    $scope.isSingleInput = function isSingleInput(input) {
      return (!$scope.isMultipleInput(input));
    };

    $scope.initMultipleInput = function initMultipleInput(input) {
      $scope.dataToSend[input.name]=[];
      $scope.inputArray[input.name] = [input];
      $scope.autofill[input.name] = [generateValue(input)];
    };

    $scope.initSingleInput = function initSingleInput(input) {
      $scope.dataToSend[input.name] = null;
      $scope.autofill[input.name] = generateValue(input);
    };

    $scope.hasSeveralItemsInCollection = function hasSeveralItemsInCollection(input) {
      return ($scope.inputArray[input.name].length>1);
    };

    /*
    $scope. = function (input) {
      return ($scope.);
    };
*/
    $scope.isComplexInput = function isComplexInput(input) {
      return (input.inputs.length> 0);
    };

    $scope.isFileInput = function isFileInput(input) {
      return (input.type=='FILE');
    };


  }])
    .directive('fileInputAutoSubmit', function () {
      // Utility function to get the closest parent element with a given tag
      function getParentNodeByTagName(element, tagName) {
        element = angular.element(element);
        var parent = element.parent();
        tagName = tagName.toLowerCase();

        if ( parent && parent[0].tagName.toLowerCase() === tagName ) {
            return parent;
        } else {
            return !parent ? null : getParentNodeByTagName(parent, tagName);
        }
      }

      return {
        require: 'ngModel',
        link: function (scope, elem, attr, ngModel) {

          function update(event) {
            var filename = '';
            if (event.target.files && event.target.files.length > 0) {
              filename = event.target.files[0].name;
            } else {
              filename = event.target.value.match(/([^\\|\/]*)$/)[0];
            }

            scope.$apply(function () {
              ngModel.$setViewValue(filename);
              ngModel.$render();
            });
            var form = getParentNodeByTagName(elem, 'form');
            form.triggerHandler('submit');
            form[0].submit();
          }

          elem.on('change', update);

          scope.$on('$destroy', function () {
            elem.off('change', update);
          });

        }
      };
    })
    .config(['$locationProvider', function ($locationProvider) {
      $locationProvider.html5Mode({
        enabled: true,
        requireBase: false
      });
    }]);


})();
