(function (window, angular, app, undefined) {
    app.directive('stateEditor', [function () {
        return {
            restrict: 'A',
            scope: {
                stateEditor: '=stateEditor',
                callback: '=callback',
                column: '=',
                row: '='
            },
            template: '<div ng-class="{\'cell-error\':cellError}"><input class="inline state-input" ng-maxlength="1" type="text" ng-model="data[0]" ng-model-options="{ debounce: 500 }" ng-pattern="/[\\w#$*\\.^]/" />' +
            '<select ng-model="data[1]" class="state-movement">' +
            '<option></option>' +
            '<option>Stop</option>' +
            '<option>Left</option>' +
            '<option>Right</option>' +
            '</select>' +
            '<input class="inline state-nextstate" type="text" ng-model="data[2]" ng-model-options="{ debounce: 500 }"/></div>',
            link: function (scope, element, attr) {
                scope.cellError = false;

                scope.$watch('stateEditor', function () {
                    scope.data = scope.stateEditor || [];
                });

                scope.$watchCollection('data', function (data) {
                    if (data.length === 3 && !!data[0] && !!data[1] && !!data[2]) {
                        scope.callback(scope.row, scope.column, data);
                    } else if (!data[0] && !data[1] && !data[2]) {
                        scope.callback(scope.row, scope.column, null);
                    }

                    scope.cellError=!((!data[0] && !data[1] && !data[2]) || (!!data[0] && !!data[1] && !!data[2]));
                })
            }
        }
    }]);
})(window, angular, angular.module('turingmachine.js'));