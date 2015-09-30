(function (window, angular, app, undefined) {
    app.directive("uniqueState", [function () {
        return {
            restrict: 'A',
            scope: {
                states: '=uniqueState',
                program: '=program',
                index: '=index'
            },
            require: 'ngModel',
            link: function (scope, element, attr, ngModel) {
                ngModel.$validators.uniqueValidator = function (modelValue, viewValue) {
                    var value = modelValue || viewValue || '';
                    if (!value || value === '') {
                        return false;
                    }
                    var valueLower = value.toLowerCase();
                    for (var i in scope.states) {
                        if (!!scope.states[i] && scope.states[i].toLowerCase() === valueLower && i != scope.index) {
                            return false;
                        }
                    }

                    var input = scope.states[scope.index];

                    for (var i in scope.program) {
                        var prog = scope.program[i];
                        if (prog[1] === input) {
                            prog[1] = value;
                        }
                    }
                    scope.states[scope.index] = value;

                    return true;
                };
            }
        };
    }]);
})(window, angular, angular.module('turingmachine.js'));