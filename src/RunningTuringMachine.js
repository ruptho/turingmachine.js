// ------------------------ RunningTuringMachine --------------------------

var RunningTuringMachine = function (program, tape, final_states, initial_state) {
    var tm = inherit(LockingTuringMachine, this, arguments);

    // @member RunningTuringMachine.running:
    //   positive while turingmachine should still perform next x steps
    var running = 0;
    // @member RunningTuringMachine.running_last_state:
    //   Logs the last state which was recognized as event
    var running_last_state = false;

    // @method RunningTuringMachine._startRun:
    //   Start the run. Called whenever a run starts.
    this._startRun = function () { };

    // @method RunningTuringMachine._stopRun:
    //   Stop the run. Called whenever a run stops.
    this._stopRun = function () { };

    // @method RunningTuringMachine._invokeNextIter:
    //   Perform all check before actually running one iteration
    this._invokeNextIter = function () {
        if (tm.finalStateReached() || tm.undefinedInstruction())
            running = 0;

        if (running === 0 && !running_last_state) {
            return;
        } else if ((running > 1 || running < -1) && !running_last_state) {
            this._startRun();
            running_last_state = true;
        } else if (running === 0 && running_last_state) {
            this._stopRun();
            running_last_state = false;
            return;
        }

        if (running > 0) {
            running -= 1;
            setTimeout(function () {
                // Call once method which is in the prototype of the current context
                this.iterateNext(this._invokeNextIter);
            }.bind(this), 1);

        } else if (running < 0) {
            running += 1;
            setTimeout(function () {
                // Call once method which is in the prototype of the current context
                this.iteratePrevious(this._invokeNextIter);
            }.bind(this), 1);
        }
    };

    // @method RunningTuringMachine.iterateNext:
    //   Wrapper to compute next step
    this.iterateNext = function (done) {
        this.lock();
        console.log("iterateNext() should be overwritten by a children object");
        this.release();
        done.call(this);
    };

    // @method RunningTuringMachine.iteratePrevious:
    //   Wrapper to compute previous step
    this.iteratePrevious = function (done) {
        this.lock();
        console.log("iteratePrevious() should be overwritten by a children object");
        this.release();
        done.call(this);
    };

    // @method RunningTuringMachine.next: Run operations until a final state is reached
    this.next = function (steps) {
        steps = def(steps, 1);
        if (running === Infinity || running === -Infinity) {
            running = steps;
            console.warn("Interrupt running turingmachine for some steps?"
                + " Awkward happening");
            this._invokeNextIter();
            return true;
        } else if (running === 0) {
            running = steps;
            this._invokeNextIter();
            return true;
        } else {
            console.warn("Overwriting request to compute "
                + running + " steps with " + steps + " steps");
            running = steps;
            this._invokeNextIter();
            return false;
        }
    };

    // @method RunningTuringMachine.prev: Undo operations until we run out of history
    this.prev = function (steps) {
        steps = def(steps, 1);
        if (running === Infinity || running === -Infinity) {
            running = steps;
            console.warn("Interrupt running turingmachine for some steps?"
                + " Awkward happening");
            this._invokeNextIter();
            return true;
        } else if (running === 0) {
            running = -steps;   // REMARK this is negative compared to next()
            this._invokeNextIter();
            return true;
        } else {
            console.warn("Overwriting request to compute "
                + running + " steps with " + -steps + " steps");
            running = -steps;
            this._invokeNextIter();
            return false;
        }
    };

    // @method RunningTuringMachine.run: Run operations until a final state is reached
    this.run = function () {
        if (running === Infinity) {
            console.warn("Cannot run running turingmachine");
            return false;
        } else {
            running = Infinity;
            this._invokeNextIter();
            return true;
        }
    };

    // @method RunningTuringMachine.run: Run operations until a final state is reached
    this.interrupt = function () {
        if (running === Infinity) {
            running = 0;
            this._stopRun();
            running_last_state = false;
            return true;
        } else if (running === 0) {
            return false;
        } else {
            running = 0;
            return true;
        }
    };
}