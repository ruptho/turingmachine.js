(function (window, angular, app, undefined) {
    app.directive('uniqueInput', [function () {
        return {
            restrict: 'A',
            scope: {
                inputs: '=uniqueInput',
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
                    for (var i in scope.inputs) {
                        if (!!scope.inputs[i] && scope.inputs[i].toLowerCase() === valueLower && i != scope.index) {
                            return false;
                        }
                    }

                    var input = scope.inputs[scope.index];

                    for (var i in scope.program) {
                        var prog = scope.program[i];
                        if (prog[0] === input) {
                            prog[0] = value;
                        }
                    }
                    scope.inputs[scope.index] = value;

                    return true;
                };
            }
        };
    }]);
})(window, angular, angular.module('turingmachine.js'));