// ------------------------- LockingTuringMachine -------------------------

var LockingTuringMachine = function (program, tape, final_states, initial_state) {
    var tm = inherit(TuringMachine, this, arguments);

    // @member LockingTuringMachine.is_locked: Locking state of TM
    var is_locked = false;

    // @method LockingTuringMachine.lock: Lock this TM to disable it to run any steps
    this.lock = function () {
        is_locked = true;
    };

    // @method LockingTuringMachine.release:
    //   Release this TM to enable it to run any steps again
    this.release = function () {
        is_locked = false;
    };

    // @method LockingTuringMachine.ĺocked:
    //   Is this turingmachine in a locked state?
    this.locked = function () {
        return is_locked;
    };
}