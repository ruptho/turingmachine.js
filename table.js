



angular.module('turing', [])
    .directive('turingTable', ['$timeout',function ($timeout) {
        return {
            restrict: 'C',
            scope: true,
            templateUrl: 'table.html',
            link: function ($scope, element, attr) {

                window.synced=true;

                $scope.data = []
                $scope.inputs = [];
                $scope.states = [];


                $scope.$watch(function(){
                    return JSON.stringify($scope.data);
                },function(value){
                    console.log("refresh",$scope.data);

                    window.app.tm().getProgram().clear();
                    window.app.tm().getProgram().fromJSON(value);
                    window.synced=false;
                    window.app.tm().syncToUI();
                });

                $scope.load=function(){
                    $scope.data=window.app.tm().getProgram().toJSON();
                    init();
                }


                $scope.addInput = addInput;
                $scope.addState = addState;
                $scope.deleteInput = deleteInput;
                $scope.deleteState = deleteState;
                $scope.getElementAt = getElementAt;
                $scope.updateElementAt = updateElementAt;

                $scope.change = change;


                function init() {

                    $scope.inputs = [];
                    $scope.states = [];
                    for (var i in $scope.data) {
                        var programEntry = $scope.data[i];
                        addToSet($scope.inputs, programEntry[0]);
                        addToSet($scope.states, programEntry[1]);
                    }
                }


                function addToSet(array, element) {
                    array = array || [];

                    if (jQuery.inArray(element, array) === -1) {
                        array.push(element);
                    }
                }

                function removeFromArray(array, element) {
                    for (var i in array) {
                        if (array[i] === element) {
                            array.splice(i, 1);
                        }
                    }
                }


                function addInput() {
                    $scope.inputs.push('');
                }

                function addState() {
                    $scope.states.push('');
                }

                function deleteState(index) {

                    var state = $scope.states[index];

                    for (var i = 0; i < $scope.data.length; i++) {
                        var prog = $scope.data[i];
                        if (prog[1] === state) {
                            $scope.data.splice(i, 1);
                            i--;
                        }
                    }
                    removeFromArray($scope.states, state);
                }

                function deleteInput(index) {

                    var input = $scope.inputs[index];

                    for (var i = 0; i < $scope.data.length; i++) {
                        var prog = $scope.data[i];
                        if (prog[0] === input) {
                            $scope.data.splice(i, 1);
                            i--;
                        }
                    }
                    removeFromArray($scope.inputs, input);
                }


                function deleteElement(state, input) {

                    var input = $scope.inputs[index];

                    for (var i = 0; i < $scope.data.length; i++) {
                        var prog = $scope.data[i];
                        if (prog[0] === input && prog[1] === state) {
                            $scope.data.splice(i, 1);
                            i--;
                        }
                    }
                    removeFromArray($scope.inputs, input);
                }

                function getElementAt(state, input) {
                    for (var i in $scope.data) {
                        var prog = $scope.data[i];
                        if (prog[0] === input && prog[1] === state) {
                            return prog[2];
                        }
                    }
                    return null;
                }

                function updateElementAt(state, input, data) {
                    var element = getElementAt(state, input);
                    if (element == null) {
                        $scope.data.push([input, state, data]);
                    } else {
                        if (data[0] === '' && data[1] === '' && data[2] === '') {
                            deleteElement(state, input);
                        } else {
                            element = [input, state, data];
                        }


                    }

                    console.log($scope.data);
                }



                function change() {
                    //cleanup
                    for (var i = 0; i < $scope.data.length; i++) {
                        var prog = $scope.data[i];

                        var d = prog[3];
                        if (d[0] === '' && d[1] === '' && d[2] === '') {
                            $scope.data.splice(i, 1);
                            i--;
                        }
                    }
                }

            }
        };
    }]).directive("uniqueState", [function () {
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
    }])
    .directive('uniqueInput', [function () {
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
    }])
    .directive('stateEditor', [function () {
        return {
            restrict: 'A',
            scope: {
                stateEditor: '=stateEditor',
                callback: '=callback',
                column: '=',
                row: '='
            },
            template: '<input class="inline" type="text" ng-model="data[0]" size="{{data[0].length+1}}"/>' +
            '<select ng-model="data[1]">' +
            '<option></option>' +
            '<option>Stop</option>' +
            '<option>Left</option>' +
            '<option>Right</option>' +
            '</select>' +
            '<input class="inline" type="text" ng-model="data[2]" size="{{data[2].length+1}}"/>',
            link: function (scope, element, attr) {
                scope.data = scope.stateEditor || [];
                scope.$watchCollection('data', function (data) {
                    if (data.length === 3 && !!data[0] && !!data[1] && !!data[2]) {
                        scope.callback(scope.row, scope.column, data);


                        /* if (!scope.stateEditor) {
                         scope.callback(scope.row, scope.column, data);
                         } else {
                         scope.stateEditor = data;
                         }*/
                    }


                })
            }
        }
    }]);