(function (window, angular, app, undefined) {
    app.directive('turingTable', ['$timeout', function ($timeout) {
        return {
            restrict: 'C',
            scope: true,
            templateUrl: '../../table.html',
            link: function ($scope, element, attr) {

                $(document).on('syncMachine', function () {
                    //use timeout to safe propagation of values to angular
                    $timeout(function () {
                        $scope.load();
                    })
                });

                $scope.data = []
                $scope.inputs = [];
                $scope.states = [];

                $scope.update = function () {
                    console.log("update machine from table");
                    window.app.tm().getProgram().clear();
                    window.app.tm().getProgram().fromJSON($scope.data);
                }

                $scope.load = function () {
                    $scope.data = []
                    $scope.inputs = [];
                    $scope.states = [];
                    $timeout(function () {
                        $scope.data = window.app.tm().getProgram().toJSON();
                        console.log("updated table");
                        init();
                    });
                }

                $scope.addInput = addInput;
                $scope.addState = addState;
                $scope.deleteInput = deleteInput;
                $scope.deleteState = deleteState;
                $scope.getElementAt = getElementAt;
                $scope.updateElementAt = updateElementAt;

                $scope.change = change;

                function init() {
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
                    $scope.update()
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
                    $scope.update()
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
                    // no update since already called from update method
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

                function setElementAt(state, input, value) {
                    for (var i in $scope.data) {
                        var prog = $scope.data[i];
                        if (prog[0] === input && prog[1] === state) {
                            prog[2] = value;
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
                            setElementAt(state, input, data);
                        }
                    }
                    $scope.update();
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
    }]);
})(window, angular, angular.module('turingmachine.js'));