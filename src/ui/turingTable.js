(function (window, angular, app, undefined) {
    app.directive('turingTable', ['$timeout', function ($timeout) {
        return {
            restrict: 'C', //restrict to css class
            scope: true, //directive has own scope
            templateUrl: 'table.html', //external template for maintainability
            link: function ($scope, element, attr) {
                //variables:
                $scope.data = []
                $scope.inputs = [];
                $scope.states = [];

                //methods:
                $scope.addInput = addInput;
                $scope.addState = addState;
                $scope.deleteInput = deleteInput;
                $scope.deleteState = deleteState;
                $scope.getElementAt = getElementAt;
                $scope.updateElementAt = updateElementAt;
                $scope.change = change;
                $scope.update = update;
                $scope.load = load;


                //events;
                $(document).on('syncMachine', function () {
                    $scope.load();
                });

                //clear history when program is loaded
                window.app.manager().addEventListener('programActivated', function (a, b) {
                    $scope.load();
                });


                ///UNDO: undo related things are at the end.

                var machineUpdate = null;

                function update() {
                    undoStep();

                    //update 10ms after last update occured
                    $timeout.cancel(machineUpdate);
                    machineUpdate = $timeout(function () {
                        window.app.tm().getProgram().clear();
                        window.app.tm().getProgram().fromJSON($scope.data);
                        console.log("updated machine from table", $scope.data);
                    }, 10);
                }

                function load() {
                    var prog = window.app.tm().getProgram().toJSON();
                    if (!angular.equals(prog, $scope.data)) {
                        //use timeout to safe propagation of values to angular (timeout fires digest cycle)
                        $timeout(function () {
                            init(prog);
                            $scope.undoHistory = [];
                        });
                    }
                }

                function init(data) {
                    $scope.inputs = [];
                    $scope.states = [];
                    $scope.data = data;
                    console.log("updated table");

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
                    var div = $("#edittable");
                    div.parent().animate({
                            scrollLeft: div.width()
                        },
                        'slow');
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

                    $scope.states.splice(index, 1);
                    //removeFromArray($scope.states, state);
                    $scope.update()
                }

                function deleteInput(index) {
                    var input = $scope.inputs[index];
                    for (var i = 0; i < $scope.data.length; i++) {
                        var prog = $scope.data[i];
                        if (prog[0] === input) {
                            deleteElement(prog[1], prog[0])
                        }
                    }
                    //removeFromArray($scope.inputs, input);
                    $scope.inputs.splice(index, 1);
                    $scope.update()
                }

                function deleteElement(state, input) {
                    for (var i = 0; i < $scope.data.length; i++) {
                        var prog = $scope.data[i];
                        if (prog[0] === input && prog[1] === state) {
                            $scope.data.splice(i, 1);
                            return;
                        }
                    }
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
                    if (element == null && data != null) {
                        $scope.data.push([input, state, data]);
                    } else {
                        if (data == null || (!data[0] && !data[1] && !data[2])) {
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

                //undo mechanism
                $scope.undoHistory = [];
                $scope.undo = undo;

                //timeouts;
                var undoTimeout = null;


                $scope.$watch(function () {
                    return JSON.stringify($scope.states) + JSON.stringify($scope.inputs)
                }, function () {
                    undoStep();
                })

                $scope.canUndo = function () {
                    return !($scope.undoHistory.length > 1);
                }

                function undo() {
                    //remove current
                    $scope.undoHistory.pop();
                    var d = $scope.undoHistory.pop();
                    if (!!d) {
                        $scope.states = d.states;
                        $scope.inputs = d.inputs;
                        $scope.data = d.data;
                    }
                }

                function undoStep() {
                    //accept undo change just when no change within 50ms occured.
                    $timeout.cancel(undoTimeout);
                    undoTimeout = $timeout(function () {

                        console.log("undo", $scope.undoHistory)


                        if ($scope.states.length >= 0 && $scope.inputs.length >= 0 && $scope.data.length >= 0) {
                            $scope.undoHistory.push({
                                //use deep copys to prevent changing of history
                                states: deepCopy($scope.states),
                                inputs: deepCopy($scope.inputs),
                                data: deepCopy($scope.data)
                            });
                        }
                    }, 50);
                }
            }
        };
    }]);
})(window, angular, angular.module('turingmachine.js'));