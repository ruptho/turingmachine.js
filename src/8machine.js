// -------------------------------- Machine -------------------------------

function defaultTuringMachine(symbol_norm_fn, state_norm_fn) {
  symbol_norm_fn = def(symbol_norm_fn, normalizeSymbol);
  state_norm_fn = def(state_norm_fn, normalizeState);

  var s = function (v) { return state(v, state_norm_fn) };
  return new TuringMachine(defaultProgram(),
    defaultUserFriendlyTape(symbol_norm_fn),
    [s("End"), s("Ende")], s("Start"));
}

// @object TuringMachine: Putting together Program, Tape and state handling.
// This is the actual Turingmachine abstraction.

function TuringMachine(program, tape, final_states, initial_state)
{
  // @member TuringMachine.program
  require(typeof program !== 'undefined', 'TuringMachine requires Program');

  // @member TuringMachine.tape
  require(typeof tape !== 'undefined', 'TuringMachine requires some Tape');
  require(tape.isTape);

  // @member TuringMachine.final_states
  require(final_states.length > 0);
  for (var key in final_states)
    requireState(final_states[key]);

  // @member TuringMachine.initial_state
  requireState(initial_state);

  // @member TuringMachine.initial_tape
  var initial_tape = tape.toJSON();

  // @member TuringMachine.state_history
  var state_history = [initial_state];

  // @member TuringMachine.name
  var _names = ['Dolores', 'Aileen', 'Margarette', 'Donn', 'Alyce', 'Buck',
    'Walter', 'Malik', 'Chantelle', 'Ronni', 'Will', 'Julian', 'Cesar',
    'Hyun', 'Porter', 'Herta', 'Kenyatta', 'Tajuana', 'Marvel', 'Sadye',
    'Terresa', 'Kathryne', 'Madelene', 'Nicole', 'Quintin', 'Joline',
    'Brady', 'Luciano', 'Turing', 'Marylouise', 'Sharita', 'Mora',
    'Georgene', 'Madalene', 'Iluminada', 'Blaine', 'Louann', 'Krissy',
    'Leeanna', 'Mireya', 'Refugio', 'Glenn', 'Heather', 'Destiny',
    'Billy', 'Shanika', 'Franklin', 'Shaunte', 'Dirk', 'Elba'];
  var name = _names[parseInt(Math.random() * (_names.length))] + ' ' +
    new Date().toISOString().slice(0, 10);

  // @member TuringMachine.step_id
  var step_id = 0;

  // NOTE tm state changed

  // @method TuringMachine.getProgram: Getter for Program instance
  // @method TuringMachine.setProgram: Setter for Program instance
  this.getProgram = function () { return program; };
  this.setProgram = function (p) {
    program = p;
    // NOTE tm state changed
  };

  // @method TuringMachine.getTape: Getter for Tape instance
  // @method TuringMachine.setTape: Setter for Tape instance
  this.getTape = function () { return tape; };
  this.setTape = function(t) {
    tape = t;
    // NOTE tm state changed
  };

  // @method TuringMachine.getInitialTape: Getter for initial tape as JSON
  this.getInitialTape = function () { return deepCopy(initial_tape); };
  this.setInitialTape = function (t) {
    require(typeof t.data.length !== 'undefined');
    initial_tape = t;
    // NOTE tm state changed
  };

  // @method TuringMachine.isAFinalState: Is the given state a final state?
  this.isAFinalState = function (st) {
    requireState(st);
    for (var i = 0; i < final_states.length; i++)
      if (final_states[i].equals(st))
        return true;
    return false;
  };

  // @method TuringMachine.getFinalStates: Getter for final states
  this.getFinalStates = function () {
    return final_states;
  };

  // @method TuringMachine.addFinalState
  this.addFinalState = function (state) {
    requireState(state);
    final_states.push(state);
    // NOTE tm state changed
  };

  // @method TuringMachine.setFinalStates
  this.setFinalStates = function (states) {
    for (var k in states)
      require(isState(states[k]),
        "Cannot add non-State object as final state");
    final_states = states;
    // NOTE tm state changed
  };

  // @method TuringMachine.getInitialState: Get initial state
  this.getInitialState = function () {
    if (state_history.length === 0)
      throw AssertionException("No state assigned to machine");
    return state_history[0];
  };

  // @method TuringMachine.setInitialState: Set initial state
  this.setInitialState = function (st) {
    require(isState(st), "Initial state must be state object");
    require(state_history.length === 1, "state history must be at least 1 element long");
    state_history[0] = st;
    // NOTE tm state changed
  };

  // @method TuringMachine.getState: Get current state
  this.getState = function () {
    if (state_history.length === 0)
      throw AssertionException("No state assigned to machine");
    return state_history[state_history.length - 1];
  };

  // @method TuringMachine.setState: Set current state
  this.setState = function (st) {
    if (isState(st))
      state_history = [st];
    else
      state_history = [state(st)];
    // NOTE tm state changed
  };

  // @method TuringMachine.getCursor: Return the current cursor Position
  this.getCursor = function () {
    return tape.cursor();
  };

  // @method TuringMachine.getStep: Get number of operations performed so far
  this.getStep = function () {
    return step_id;
  };

  // @method TuringMachine.getMachineName: Return the machine name
  this.getMachineName = function () {
    return name;
  };

  // @method TuringMachine.setMachineName: Give the machine a specific name
  this.setMachineName = function (machine_name) {
    name = machine_name;
    // NOTE tm state changed
  };

  // @method TuringMachine.finalStateReached: Is the current state a final state?
  this.finalStateReached = function () {
    return this.isAFinalState(this.getState());
  };

  // @method TuringMachine.undefinedInstruction
  //   Does the current (symbol, state) not have an corresponding instruction?
  this.undefinedInstruction = function () {
    return !program.exists(tape.read(), this.getState());
  };

  // @method TuringMachine.finished: Was a final state reached or
  //   was some instruction not found?
  this.finished = function () {
    return this.finalStateReached() || this.undefinedInstruction();
  };

  // @method TuringMachine.back: Undo last `steps` operation(s)
  this._back = function () {
    var outofhistory = function (e) {
      if (e === undefined || e.name === "OutOfHistoryException")
        throw new OutOfHistoryException(this.getStep());
    };

    // basic checks
    if (step_id <= 0 || state_history.length <= 0)
      outofhistory.call(this);

    // undo state
    var old_state = state_history.pop();
    var new_state = state_history[state_history.length - 1];

    // undo tape
    try {
      var old_value = tape.read();
      var tapeevents = tape.undo();
    } catch (e) {
      console.error(e);
      outofhistory(e);
    }

    // expect as tape events
    //   0-1 write operation
    //   0-1 movement operation of length 1
    //   and nothing else

    var written_value = null;
    var move_undo = null;
    for (var i = 0; i < tapeevents.length; i++) {
      if (written_value === null && tapeevents[i][0] === "w")
        written_value = tapeevents[i][2];
      else if (move_undo === null && tapeevents[i][0] === -1)
        move_undo = mot.RIGHT;
      else if (move_undo === null && tapeevents[i][0] === 1)
        move_undo = mot.LEFT;
      else if (tapeevents[i][0] === 0)
        move_undo = mot.STOP;
      else
        throw new AssertionException("Tape events of history do not "
          + "describe one iteration");
    }

    // undo step_id
    step_id -= 1;

    return [old_value, old_state, written_value, move_undo, new_state,
      step_id, this.undefinedInstruction(), this.finalStateReached()];
  };
  this.back = function (steps) {
    var steps = def(steps, 1);
    var results = [];

    for (var i = 0; i < steps; i++) {
      var result = this._back();
      if (!result)
        return results;
      results.push(result);
    }

    return results;
    // NOTE tm state changed
  };

  // @method TuringMachine.forth: run `steps` step(s)
  this._forth = function () {
    if (this.finalStateReached())
      return false;
    if (this.undefinedInstruction())
      return false;

    require(typeof this.getTape().move !== 'undefined',
      'Tape must support "move" method');

    // save current tape configuration
    if (tape.snapshot)
      tape.snapshot();

    // lookup
    var old_value = tape.read();
    var old_state = this.getState();
    var instr = program.get(old_value, old_state);
    //console.debug(old_value.toString(), old_state.toString());

    if (typeof instr === 'undefined')
      throw new Error("Internal error: could not find instruction, "
        + "but instruction is defined");

    var new_value = instr.write;
    var move = instr.move;
    var new_state = instr.state;
    //console.debug(new_value.toString(), move.toString(), new_state.toString());

    // process write
    tape.write(instr.write);
    var diff = this.getCursor().diff(position(0));

    // process movement
    this.getTape().move(instr.move);

    // process state transition
    var old_state = this.getState();
    state_history.push(instr.state);

    step_id += 1;

    return [old_value, old_state, new_value, move, new_state,
            step_id, this.undefinedInstruction(), this.finalStateReached()];
  };
  this.forth = function (steps) {
    // next `steps` iterations
    steps = def(steps, 1);
    var results = [];

    for (var i = 0; i < steps; i++) {
      var result = this._forth();
      if (!result)
        return false;
      results.push(result);
    }

    return results;
    // NOTE tm state changed
  };

  // @method TuringMachine.reset: Reset machine to initial state
  //   Event listeners are not removed
  this.reset = function () {
    tape.fromJSON(initial_tape);
    state_history = [this.getInitialState()];
    step_id = 0;
    // NOTE tm state changed
  };

  // @method TuringMachine.fromJSON: Import a Machine
  this.fromJSON = function (data) {
    if (data['state_history'].length === 0 ||
        typeof data['state_history'].length === 'undefined' ||
        typeof data['tape'] === 'undefined' ||
        typeof data['program'] === 'undefined' ||
        typeof data['final_states'] === 'undefined')
      throw AssertionException("data parameter is incomplete");

    var convState = function (v) { return state(v); };

    program.fromJSON(data['program']);
    tape.fromJSON(data['tape']);
    final_states = data['final_states'].map(convState);
    initial_state = state(data['state_history'][0]);

    if (typeof data['initial_tape'] !== 'undefined')
      initial_tape = data['initial_tape'];
    if (typeof data['state_history'] !== 'undefined')
      state_history = data['state_history'].map(convState);
    if (typeof data['name'] !== 'undefined')
      name = data['name'];
    if (typeof data['step'] !== 'undefined')
      step_id = parseInt(data['step']);

    require(!isNaN(step_id));
    // NOTE tm state changed
  };

  // @method TuringMachine.toJSON: Get JSON representation
  this.toJSON = function () {
    return {
      program : program.toJSON(),
      tape : tape.toJSON(),
      final_states : final_states.map(toJson),
      initial_state : initial_state.toJSON(),
      initial_tape : initial_tape,
      state_history: state_history.map(toJson),
      name : name,
      step : step_id
    };
  };
};

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

// ------------------------- AnimatedTuringMachine ------------------------

function defaultAnimatedTuringMachine(symbol_norm_fn, state_norm_fn,
  gear_viz, num_viz, ui_tm, ui_meta, ui_data, ui_notes)
{
  symbol_norm_fn = def(symbol_norm_fn, normalizeSymbol);
  state_norm_fn = def(state_norm_fn, normalizeState);

  var s = function (v) { return state(v, state_norm_fn) };

  return new AnimatedTuringMachine(defaultProgram(),
    defaultUserFriendlyTape(symbol_norm_fn),
    [s("End"), s("Ende")], s("Start"), gear_viz, num_viz,
    ui_tm, ui_meta, ui_data, ui_notes);
}

// @object AnimatedTuringMachine: A visualized TuringMachine

var AnimatedTuringMachine = function (program, tape, final_states,
  initial_state, gear, numbers, ui_tm, ui_meta, ui_data, ui_notes)
{
  // @member AnimatedTuringMachine.gear: Animation of gear
  // @member AnimatedTuringMachine.numbers: Animation of numbers

  // TODO: must support any arbitrary number of values to visualize

  ui_tm = $(ui_tm);
  ui_meta = $(ui_meta);
  ui_data = $(ui_data);
  ui_notes = $(ui_notes);

  require(ui_tm.length !== 0, "unknown " + ui_tm.selector);
  require(ui_meta.length !== 0, "unknown " + ui_meta.selector);
  require(ui_data.length !== 0, "unknown " + ui_data.selector);
  require(ui_notes.length !== 0, "unknown " + ui_notes.selector);

  // @member AnimatedTuringMachine.tm: Machine instance
  var tm = inherit(RunningTuringMachine, this, arguments);

  // @member AnimatedTuringMachine.events: Event register
  var events = new EventRegister([
    'loadState', 'valueWritten', 'movementFinished', 'stateUpdated',
    'transitionFinished', 'outOfHistory', 'undefinedInstruction',
    'finalStateReached', 'startRun', 'stopRun'
  ]);

  // @member AnimatedTuringMachine.speed: Animation speed
  var speed = 2000;

  // @member AnimatedTuringMachine.speed_limit: if speed<=speed_limit,
  //   animation behaves like no animation
  var speed_limit = 200;

  // @member AnimatedTuringMachine.animation_enabled: Disable/enable animation
  var animation_enabled = true;

  // @member AnimatedTuringMachine.ui_settings: UI settings
  var ui_settings = {
    'steps_back' : 1,
    'steps_continue' : 1
  };

  // @member AnimatedTuringMachine.self: current instance
  var self = this;

  // @callback loadState(machine name, tape, current state, final states)
  //   [triggered when finished initialization or dump import]
  // @callback valueWritten(old value, new value, position relative to cursor)
  //   [triggered whenever some value on the tape changed]
  // @callback movementFinished(move) [triggered whenever cursor moved]
  // @callback stateUpdated(old state, new state, new state is a final state)
  //   [triggered whenever the current state changed]
  // @callback transitionFinished(old value, old state, new value, movement,
  //   new state, step id, undefined instruction is given for next transition,
  //   a final state has been reached)
  //   [triggered whenever the execution state after some transition has been
  //   reached]
  // @callback outOfHistory(step id) [triggered when running out of history]
  // @callback test_undefinedInstruction(read symbol, state) [triggered whenever some
  //   instruction was not found]
  // @callback test_finalStateReached(state) [triggered whenever some final state
  //   has been reached]
  // @callback startRun() [triggered whenever first transition of a Run]
  // @callback stopRun() [stop running]

  // @member AnimatedTuringMachine.valid_events
  // @member AnimatedTuringMachine.events
  var valid_events = ['loadState', 'valueWritten', 'movementFinished',
    'stateUpdated', 'transitionFinished', 'outOfHistory',
    'test_undefinedInstruction', 'test_finalStateReached', 'startRun', 'stopRun'];
  var events = new EventRegister(valid_events);

  // @method AnimatedTuringMachine.addEventListener: event listener definition
  this.addEventListener = function (evt, callback, how_often) {
    return events.add(evt, callback, how_often);
  };

  // @method AnimatedTuringMachine.triggerEvent: trigger event
  this.triggerEvent = function (evt) {
    return events.trigger.apply(this, arguments);
  };

  // @method AnimatedTuringMachine._triggerTapeInstruction:
  //   trigger events corresponding to a tape instruction
  this._triggerTapeInstruction = function (ins) {
    if (ins[0] === "w") {
      this.triggerEvent('valueWritten', ins[1], ins[2],
        this.getCursor().diff(position(0)));
    } else if (typeof ins === 'number' && ins[0] < 0) {
      for (var i = 0; i < Math.abs(ins[0]); i++)
        this.triggerEvent('movementFinished', mot.LEFT);
    } else if (typeof ins === 'number' && ins[0] > 0) {
      for (var i = 0; i < ins[0]; i++)
        this.triggerEvent('movementFinished', mot.RIGHT);
    } else if (typeof ins === 'number' && ins[0] === 0)
      {}
    else
      throw AssertionException("Unknown instruction");
  };

  // @method AnimatedTuringMachine._triggerStateUpdated
  this._triggerStateUpdated = function (old_state) {
    this.triggerEvent('stateUpdated', old_state, this.getState(),
      this.isAFinalState(this.getState()));
  };

  // @method AnimatedTuringMachine._triggerTransitionFinished
  this._triggerTransitionFinished = function (old_value, old_state, new_value,
    mov, new_state, step)
  {
    new_value = def(new_value, tape.read());
    mov = def(mov, mot.STOP);
    new_state = def(new_state, this.getState());
    step = def(step, this.getStep());

    this.triggerEvent('transitionFinished', old_value, old_state, new_value,
      mov, new_state, step, undefinedInstruction());
  };

  // @method AnimatedTuringMachine._triggerOutOfHistory
  this._triggerOutOfHistory = function (step) {
    step = def(step, this.getStep());
    this.triggerEvent('outOfHistory', step);
  };

  // @method AnimatedTuringMachine._triggerLoadState
  this._triggerLoadState = function (tap, stat) {
    tap = def(tap, tape.toJSON());
    stat = def(stat, deepCopy(this.getState()));
    step_id = 0;
    this.triggerEvent('loadState', deepCopy(this.getMachineName()),
      deepCopy(tap), stat, deepCopy(this.getFinalStates()));
  };

  // HELPERS

  // @method AnimatedTuringMachine._initialize:
  //   Initialize this turingmachine
  this._initialize = function () {
    self.addEventListener('loadState', function () { self.syncToUI() }.bind(self));
    self.addEventListener('transitionFinished', function () {
      // potentially trigger finalStateReached / undefinedInstruction
      if (self.isAFinalState(self.getState()))
        self.triggerEvent('test_finalStateReached', self.getState().toJSON());
      else if (self.undefinedInstruction())
        self.triggerEvent('test_undefinedInstruction', self.getTape().read().toJSON(),
          self.getState().toJSON());

      // update tape tooltip
      ui_tm.find(".drawings .numbers .value").attr("title", self.getTape().toHumanString());
    });
  };

  // @method AnimatedTuringMachine._triggerLoadState:
  //   trigger loadState event
  this._triggerLoadState = function () {
    this.triggerEvent('loadState',
        this.getMachineName(), this.getTape().toJSON(),
        this.getState(), this.getFinalStates());
  };

  // @method AnimatedTuringMachine._triggerLoadState:
  //   if locked, throw error that TM is locked
  this._lockingCheck = function (action) {
    if (this.locked()) {
      action = def(action, "proceed");
      console.warn("Trying to " + action + " but turing machine is locked");
      console.trace();
      throw new Error("Trying to " + action + " but turing machine is locked");
    }
    return true;
  };

  // @method AnimatedTuringMachine._updateStateInUI: update the state on the UI
  this._updateStateInUI = function (state, is_final, is_undefined, undefined_symbol) {
    require(isState(state));
    require(is_final === true || is_final === false, "is_final must be boolean");
    require(is_undefined === true || is_undefined === false, "is_undefined must be boolean");
    require(!is_undefined || isSymbol(undefined_symbol), "Undefined symbol " + repr(undefined_symbol));

    var element = ui_tm.find(".state");
    var text = state.toJSON();
    var new_size = parseInt((-4.0 / 11) * text.length + 22);
    if (new_size < 12)
      new_size = 12;
    else if (new_size > 20)
      new_size = 20;

    // set text
    element.text(text);

    // set font-size
    element.css("font-size", new_size + "px");

    // reset
    element.removeClass("undefined");
    element.removeClass("final");
    element.attr("title", "");

    if (is_final) {
      element.addClass("final");
      element.attr("title", "Final state " + toStr(state) + " reached");

    } else if (is_undefined) {
      element.addClass("undefined");
      element.attr("title", "No instruction defined for symbol "
        + toStr(undefined_symbol) + " and state " + toStr(state));
    }
  };

  // SETTINGS

  // @method AnimatedTuringMachine.addEventListener: event listener definition
  this.addEventListener = function (evt, callback, how_often) {
    return events.add(evt, callback, how_often);
  };

  // @method AnimatedTuringMachine.triggerEvent: trigger event
  this.triggerEvent = function (evt) {
    return events.trigger.apply(this, arguments);
  };

  // @method AnimatedTuringMachine.enableAnimation
  this.enableAnimation = function () {
    animation_enabled = true;
  };

  // @method AnimatedTuringMachine.disableAnimation
  this.disableAnimation = function () {
    animation_enabled = false;
  };

  // @method AnimationTuringMachine.isAnimationEnabled
  this.isAnimationEnabled = function () {
    return animation_enabled;
  };

  // @method AnimatedTuringMachine.speedUp: Increase speed
  this.speedUp = function () {
    if (speed <= 200)
      return false;
    speed = parseInt(speed / 1.2);
    gear.setSpeed(speed);
    numbers.setSpeed(speed);
    this.triggerEvent('speedUpdated', speed);
    return true;
  };

  // @method AnimatedTuringMachine.speedDown: Decrease speed
  this.speedDown = function () {
    speed = parseInt(speed * 1.2);
    gear.setSpeed(speed);
    numbers.setSpeed(speed);
    this.triggerEvent('speedUpdated', speed);
    return true;
  };

  // GUI helpers

  // @method AnimatedTuingMachine.alertNote: write note to the UI as user notification
  this.alertNote = function (note_text) {
    var ui_notes = $("#notes");

    note_text = "" + note_text;

    var note = $('<p></p>').addClass("note").text(note_text);
    ui_notes.show();
    ui_notes.append(note);

    setTimeout(function () {
      if (ui_notes.find(".note").length === 1)
        ui_notes.fadeOut(1000);
      note.fadeOut(1000);
      note.remove();
    }, 5000);
  };

  // @method AnimatedTuingMachine.addExampleProgram: add an example program. The program is
  //   defined by program_id and the program is represented in data
  this.addExampleProgram = function (program_id, data) {
    require(program_id && data);

    try {
      var option = $("<option></option>").attr("value", program_id).text(data['title']);
      ui_meta.find(".example option[data-none]").remove();

      var added = false;
      ui_meta.find(".example option").each(function () {
        var old = $(this).text().match(/^(\d+)/);
        var ref = data.title.match(/^(\d+)/);

        if (added)
          return;

        if ((old && ref && parseInt(old[1]) > parseInt(ref[1])) ||
            ($(this).text() > data.title))
        {
          $(this).before(option);
          added = true;
          return;
        }
      });
      if (!added)
        ui_meta.find(".example").append(option);
    } catch (e) {
      console.error(e);
      this.alertNote(e.message);
    }
  };

  // @method AnimatedTuingMachine.updateTestcaseList:
  //   update the list of testcase for this new program
  this.updateTestcaseList = function (_, data) {
    try {
      ui_meta.find(".testcase option").remove();
      if (!data['testcases'] || data['testcases'].length === 0) {
        var option = $("<option></option>").text("no testcase available");
        ui_meta.find(".testcase").append(option);
      }
      else {
        for (var tc = 0; tc < data['testcases'].length; tc++) {
          var o = $("<option></option>").text(data['testcases'][tc]['name']);
          ui_meta.find(".testcase").append(o);
        }
      }

      ui_meta.find(".example option[selected]").prop("selected", false);
      ui_meta.find(".example option").each(function () {
        if ($(this).text() === data['name'])
          $(this).prop("selected", true);
      });
    } catch (e) {
      console.error(e);
      this.alertNote(e.message);
    }
  };

  // @method AnimatedTuingMachine.showRunningControls: show additional (like 'interrupt')
  //   controls when tm is "running"
  this.showRunningControls = function () {
    try {
      ui_tm.find('.controls .interrupt').show();
    } catch (e) {
      console.error(e);
      this.alertNote(e.message);
    }
  };

  // @method AnimatedTuingMachine.hideRunningControls:
  //   hide additional controls when tm has stopped
  this.hideRunningControls = function () {
    try {
      ui_tm.find('.controls .interrupt').hide();
    } catch (e) {
      console.error(e);
      this.alertNote(e.message);
    }
  };

  // @method AnimatedTuingMachine.setDescriptionText: set the marked-up description text
  this.setDescriptionText = function (description) {
    ui_meta.find(".description_text").empty();
    markup(ui_meta.find(".description_text"), description);
  };

  // @method AnimatedTuingMachine.setDescriptionTitle: set the title of the description
  this.setDescriptionTitle = function (title) {
    var m = title.match(/^(\d+) - (.*)$/);
    if (m) {
      ui_meta.find(".description_title").text(m[2]);
      ui_meta.find(".description_title").attr("title", "with difficulty " + m[1]);
    } else {
      ui_meta.find(".description_title").text(title);
      ui_meta.find(".description_title").attr("title", '');
    }
  };

  // @method AnimatedTuingMachine.setVersion: set the version identifier for the program
  this.setVersion = function (version) {
    ui_meta.find(".description_version span").text(version);
  };

  // @method AnimatedTuingMachine.verifyUIsync: Verify that UI and TM are synchronized
  this.verifyUIsync = function () {
    // verify animation state
    var anen = !ui_tm.find("input[name='wo_animation']").is(":checked");
    require(app.tm().isAnimationEnabled() === anen);

    // verify numbers
    var ui_vals = app.tm().getNumbersFromUI();
    var tm_vals = app.tm().getTape().read(undefined, 7).map(toJson).map(toStr); // TODO non-static 7

    require(ui_vals.length === tm_vals.length);
    for (var i = 0; i < ui_vals.length; i++)
      require(ui_vals[i] === tm_vals[i]);

    // verify state
    require(toStr(toJson(app.tm().getState())) === ui_tm.find(".state").text());

    // ignore steps count

    // verify machine name
    require(app.tm().getMachineName() === ui_meta.find(".machine_name").val());

    // verify 'Load tape'
    var ui_tape = ui_data.find(".tape").val();
    var tm_tape = app.tm().getTape().toHumanString();
    // REMARK this is not a well-defined equality. Damn it.
    require(ui_tape === tm_tape);

    // verify 'Final states'
    var fs_string = ui_data.find(".final_states").val();
    var ui_final_states = fs_string.split(/\s*,\s*/)
        .map(function (s) { return state(s); });  // TODO: normalization function missing
    var tm_final_states = app.tm().getFinalStates();

    require(ui_final_states.length === tm_final_states.length);
    for (var i = 0; i < ui_final_states.length; i++)
      require(ui_final_states[i].equals(tm_final_states[i]));

    // verify 'transition table'
    //throw new Error("TODO");
  };

  // @function AnimatedTuringMachine.readTransitionTable:
  //   read the whole content of the UI transition table
  this.readTransitionTable = function () {
    var data = [];
    ui_data.find(".transition_table tbody tr").each(function () {
      var row = [];
      row.push($(this).find(".tt_read").val());
      row.push($(this).find(".tt_from").val());
      var to = [];
      to.push($(this).find(".tt_write").val());
      to.push($(this).find(".tt_move").val());
      to.push($(this).find(".tt_to").val());
      row.push(to);

      if (row[0] === '' && row[1] === '' && row[2][0] === '' &&
        row[2][1] === 'Stop' && row[2][2] === '')
        return;

      data.push(row);
    });
    return data;
  };

  // @function AnimatedTuringMachine.addNewTransitionTableRow:
  //   append a new empty row to the transition table
  this.addNewTransitionTableRow = function () {
    var last = ui_data.find(".transition_table tbody tr").last().clone();
    last.removeClass("nondeterministic deterministic");
    last.appendTo(".transition_table tbody");
    this.writeTransitionTableRow();
  };

  // @function AnimatedTuringMachine.writeTransitionTableRow:
  //   write given vals (default: empty) to a transition table row (default: last)
  this.writeTransitionTableRow = function (vals, row) {
    vals = def(vals, ['', '', ['', 'Stop', '']]);
    row = def(row, ui_data.find(".transition_table tbody tr").last());
    require(vals.length === 3);

    row.find(".tt_read").val(vals[0]);
    row.find(".tt_from").val(vals[1]);
    row.find(".tt_write").val(vals[2][0]);
    row.find(".tt_move").val(vals[2][1]);
    row.find(".tt_to").val(vals[2][2]);
  };

  // @function AnimatedTuringMachine.isLastTransitionTableRowEmpty:
  //   is the last transition table row empty?
  this.isLastTransitionTableRowEmpty = function () {
    var last = ui_data.find(".transition_table tbody tr").last();
    return last.find(".tt_read").val() === '' &&
           last.find(".tt_from").val() === '' &&
           last.find(".tt_write").val() === '' &&
           last.find(".tt_move").val() === 'Stop' &&
           last.find(".tt_to").val() === '';
  };

  // @function AnimatedTuringMachine.clearTransitionTableRows:
  //   remove all rows from the transition table and keep one empty one
  this.clearTransitionTableRows = function () {
    ui_data.find(".transition_table tbody tr").slice(1).remove();
    ui_data.find(".transition_table tbody td").each(function () {
      $(this).find(".tt_read, .tt_from, .tt_write, .tt_to").val("");
      $(this).find(".tt_move").val("Stop");
    });
  };

  // API

  // @method AnimatedTuringMachine.initializeGUI:
  //   attach events to methods of this instance
  this.initializeGUI = function () {
    this.addEventListener('startRun', function () { self.showRunningControls(); });
    this.addEventListener('stopRun', function () { self.hideRunningControls(); });

    // UI events
    /// UI events - controls
    ui_tm.find(".control_next").click(function () {
      try {
        var how_many_steps = parseInt(ui_tm.find(".steps_next").val());
        if (isNaN(how_many_steps)) {
          self.alertNote("Invalid steps count given. Assuming 1.");
          how_many_steps = 1;
        }
        self.next(how_many_steps);
      } catch (e) {
        self.alertNote(e.message);
      }
    });
    ui_tm.find(".control_prev").click(function () {
      try {
        var how_many_steps = parseInt(ui_tm.find(".steps_prev").val());
        if (isNaN(how_many_steps)) {
          self.alertNote("Invalid steps count given. Assuming 1.");
          how_many_steps = 1;
        }
        self.prev(how_many_steps);
      } catch (e) {
        self.alertNote(e.message);
      }
    });
    ui_tm.find(".control_slower").click(function () {
      try {
        if (self.speedDown())
          self.alertNote("Animation speed updated");
        else
          self.alertNote("I think this is slow enough. Sorry!");
      } catch (e) {
        self.alertNote(e.message);
      }
    });
    ui_tm.find(".control_faster").click(function () {
      try {
        if (self.speedUp())
          self.alertNote("Animation speed updated");
        else
          self.alertNote("I think this is fast enough. Sorry!");
      } catch (e) {
        self.alertNote(e.message);
      }
    });
    ui_tm.find(".control_reset").click(function () {
      try {
        self.reset();
      } catch (e) {
        self.alertNote(e.message);
      }
    });
    ui_tm.find(".control_run").click(function () {
      try {
        if (!self.run(ui_tm, tm))
          self.alertNote("Could not start run of turingmachine. Is it running already?");
      } catch (e) {
        self.alertNote(e.message);
      }
    });
    ui_tm.find(".control_interrupt").click(function () {
      try {
        if (!self.interrupt(ui_tm, tm))
          self.alertNote("Could not interrupt. It is not running.");
      } catch (e) {
        self.alertNote(e.message);
      }
    });

    ui_tm.find("input[name=wo_animation]").change(function () {
      try {
        if ($(this).is(":checked")) {
          self.disableAnimation();
          self.alertNote("Turning off animations");
        } else {
          self.enableAnimation();
          self.alertNote("Turning on animations");
        }
      } catch (e) {
        self.alertNote(e.message);
      }
    });

    /// UI events - overlay, import, export
    var toggle_overlay = function () {
      try {
        if (!$("#overlay").is(':visible')) {
          $("#overlay").show(100);
          $("#overlay_text").delay(150).show(400);
        } else {
          $("#overlay").delay(200).hide(100);
          $("#overlay_text").hide(200);
        }
      } catch (e) {
        self.alertNote(e.message);
      }
    };
    var export_tm = function (format) {
      var text;
      if (format === "json")
        text = JSON.stringify(self.toJSON(),null,2);
      else
        text = foswiki.write(self);
      $("#overlay_text .data").val("" + text);
    };
    var import_tm = function (text, format) {
      require(!!text, "text must not be empty");

      // read data
      var data;
      try {
        if (format === "json")
          data = JSON.parse(text);
        else
          // TODO: normalization functions as parameter: symbol_norm_fn, state_norm_fn
          data = foswiki.read(self, text);
        self.alertNote("Input data parsed. Continue with import.");
      } catch (e) {
        self.alertNote("Failed to parse given input: " + e.message
          + ". Import aborted.");
        if (format === "json" && text.substr(0, 7) === "   $ __")
          self.alertNote("Seems to be Foswiki syntax. Please select Foswiki.");
        if (format === "foswiki" && text.substr(0, 2) === '{"')
          self.alertNote("Seems to be JSON syntax. Please select JSON.");
        console.debug(e);
        return;
      }

      // try to import it
      try {
        if (data)
          app.tm().fromJSON(data);
        app.tm().setInitialTape(app.tm().getTape().toJSON());
        app.tm().syncToUI();
        self.alertNote("Import of " + format + " succeeded.");
      } catch (e) {
        self.alertNote("Import failed. Seems like invalid data was provided.");
        console.debug(e);
        return;
      }
    };


    $("#overlay").click(toggle_overlay);

    ui_tm.find(".import_button").click(function () {
      try {
        toggle_overlay();

        $("#overlay_text .action").text("Import");
        $("#overlay_text .data").attr("readonly", false).val("");
        $("#overlay_text .import").show();
      } catch (e) {
        console.error(e);
        self.alertNote(e.message);
      }
    });
    $("#overlay_text .import").click(function () {
      try {
        var data = $("#overlay_text .data").val();
        var format = $("#overlay_text .export_format").val();
        import_tm(data, format);
      } catch (e) {
        console.error(e);
        self.alertNote(e.message);
      }
    });

    ui_tm.find(".export_button").click(function () {
      try {
        toggle_overlay();

        $("#overlay_text .action").text("Export");
        $("#overlay_text .data").attr("readonly", true);
        $("#overlay_text .import").hide();

        export_tm($("#overlay_text").find(".export_format").val());
      } catch (e) {
        console.error(e);
        self.alertNote(e.message);
      }
    });
    $("#overlay_text .export_format").change(function () {
      try {
        var is_export = $("#overlay_text .action").text().indexOf("Export") !== -1;
        if (is_export)
          export_tm($("#overlay_text").find(".export_format").val());
      } catch (e) {
        console.error(e);
        self.alertNote(e.message);
      }
    });

    /// UI events - meta
    ui_meta.find(".machine_name").change(function () {
      try {
        var new_name = ui_meta.find(".machine_name").val().trim();
        self.setMachineName(new_name);

        self.alertNote("Machine name updated to '" + new_name + "'!");
      } catch (e) {
        console.error(e);
        self.alertNote(e.message);
      }
    });

    /// UI events - data
    ui_data.find(".tape_load").click(function () {
      try {
        self.getTape().fromHumanString(ui_data.find(".tape").val());
        self.setInitialTape(self.getTape().toJSON());
        self.syncToUI();

        self.alertNote("Tape updated!");
      } catch (e) {
        console.error(e);
        self.alertNote(e.message);
      }
    });

    ui_data.find(".final_states_load").click(function () {
      try {
        var fs_string = ui_data.find(".final_states").val();
        var ui_fs = fs_string.split(/\s*,\s*/).filter(function (v) { return !!v });
        // TODO: normalization function missing:
        var fs = ui_fs.map(function (s) { return state(s); });

        self.setFinalStates(fs);
        self._updateStateInUI(self.getState(), self.finalStateReached(),
          self.undefinedInstruction(), self.getTape().read());

        if (fs.length === 0)
          self.alertNote("No final states? This won't play nicely");
        else if (fs.length === 1)
          self.alertNote("Final state '" + ui_fs[0] + "' set");
        else if (fs.length > 1)
          self.alertNote("Final states '" + ui_fs.slice(0, -1).join("', '")
            + "' and '" + ui_fs[ui_fs.length - 1] + "' set");
      } catch (e) {
        console.error(e);
        self.alertNote(e.message);
      }
    });

    ui_data.find(".copy_last_line").click(function () {
      try {
        var rows = self.readTransitionTable();
        var row = rows[rows.length - 1];

        self.addNewTransitionTableRow();
        var prelast = ui_data.find(".transition_table tbody tr").eq(-2);
        self.writeTransitionTableRow(row, prelast);
      } catch (e) {
        console.error(e);
        self.alertNote(e.message);
      }
    });

    $(document).on("change", ".transition_table", function () {
      try {
        // if (!last row empty) add new row
        if (!self.isLastTransitionTableRowEmpty())
          self.addNewTransitionTableRow();

        // if (final state used) warn user that it won't execute
        var row = 0;
        $(this).find("tbody tr").each(function () {
          var state_name = $(this).find(".tt_from").val();
          if (self.isAFinalState(state(state_name))) {
            self.alertNote("Line " + row + " would not executed, "
              + "because a final state '" + state_name + "' will be reached, "
              + "but not executed");
              $(this).addClass("wontexecute");
          } else {
            $(this).removeClass("wontexecute");
          }

          row += 1;
        });

        // if (another row with same input exists), declare as nondeterministic
        var known = [];
        ui_data.find(".transition_table tbody tr").each(function (row_id) {
          var from = [$(this).find(".tt_read").val(), $(this).find(".tt_from").val()];

          var search = [];
          for (var i = 0; i < known.length; i++)
            if (from[0] === known[i][0] && from[1] === known[i][1] && from[0] && from[1])
              search.push(i);

          if (search.length > 0) {
            self.alertNote("Nondeterministic behavior in rows " + search.join(", ")
              + " and " + row_id + ".");
            $(this).addClass("nondeterministic").removeClass("deterministic");
          } else {
            $(this).addClass("deterministic").removeClass("nondeterministic");
            known.push(from);
          }
        });

        // update actual table in ATM
        self.getProgram().fromJSON(self.readTransitionTable());

        // is it still an undefined instruction?
        self._updateStateInUI(self.getState(), self.finalStateReached(),
          self.undefinedInstruction(), self.getTape().read());

        self.alertNote("Transition table updated!");
      } catch (e) {
        console.error(e);
        self.alertNote(e.message);
      }
    });

    // JS events
    this.addEventListener('startRun', function () {
      self.showRunningControls();
    });
    this.addEventListener('stopRun', function () {
      self.hideRunningControls();
    });
  };

  // @method AnimatedTuringMachine.getNumbersFromViz:
  //   get numbers from NumberVisualization
  this.getNumbersFromUI = function () {
    return numbers.getNumbers();
  };

  // @method AnimatedTuringMachine.getCurrentTapeSymbols:
  //   get `count` current tape symbols
  this.getCurrentTapeSymbols = function (count) {
    count = parseInt(count);
    require(!isNaN(count));
    var selection = this.getTape().read(undefined, count);

    require(selection.length === count,
      "Bug: Size of selected elements invalid");

    return selection;
  };

  this._stopRun = function () { this.triggerEvent('stopRun'); };
  this._startRun = function () { this.triggerEvent('startRun'); };

  // @method AnimatedTuringMachine.prev: Undo one step
  this.iteratePrevious = function (done) {
    if (!self._lockingCheck('undo one step'))
      return;

    self.lock();
    try {
      var r = tm.back(1)[0];
    } catch (e) {
      if (e.name === 'OutOfHistoryException') {
        this.alertNote("Cannot go back any further in history");
        self.release();
        return false;
      } else {
        console.error(e);
        this.alertNote(e.message);
        return false;
      }
    }

    var old_value = r[0];
    var old_state = r[1];
    var new_value = r[2];
    var move = r[3];
    var new_state = r[4];
    var step_id = r[5];
    var undefined_instruction = r[6];
    var final_state_reached = r[7];

    var finalize = function () {
      self.release();
      done.call(self);
    };

    var initiateNumberWrite = function () {
      numbers.addEventListener('writeFinished', function () {
        var rel_pos = move.equals(mot.LEFT) ? -1 : 0;
        rel_pos = move.equals(mot.RIGHT) ? 1 : rel_pos;
        self.triggerEvent('valueWritten', old_value, new_value, rel_pos);
        setTimeout(finalize, 30);
      }, 1);

      var new_str_value = toStr(toJson(new_value));
      if (!animation_enabled || speed < speed_limit)
        numbers.writeNumberFast(new_str_value);
      else
        numbers.writeNumber(new_str_value);
    };

    var initiateNumberMotionAndGearMove = function () {
      numbers.addEventListener('moveFinished', function () {
        self.triggerEvent('movementFinished', move);
        setTimeout(initiateNumberWrite, 30);
      }, 1);

      // TODO: non-static 7/9
      if (!animation_enabled || speed < speed_limit) {
        if (move.equals(mot.LEFT))
          numbers.moveLeftFast(toStr(toJson(self.getTape().read(undefined, 9)[1])));
        else if (move.equals(mot.RIGHT))
          numbers.moveRightFast(toStr(toJson(self.getTape().read(undefined, 9)[7])));
        else if (move.equals(mot.HALT) || move.equals(mot.STOP))
          numbers.moveNot();
      } else {
        if (move.equals(mot.LEFT))
          numbers.moveLeft(toStr(toJson(self.getTape().read(undefined, 9)[1])));
        else if (move.equals(mot.RIGHT))
          numbers.moveRight(toStr(toJson(self.getTape().read(undefined, 9)[7])));
        else if (move.equals(mot.HALT) || move.equals(mot.STOP))
          numbers.moveNot();
      }

      // TODO: move gear
    };

    var initiateStateUpdate = function () {
      self._updateStateInUI(new_state, final_state_reached, undefined_instruction, new_value);
      self.triggerEvent('stateUpdated', old_state, new_state, final_state_reached);
      self.triggerEvent('transitionFinished', old_value, old_state, new_value,
          move, new_state, step_id, undefined_instruction, final_state_reached);

      initiateNumberMotionAndGearMove();
    };

    setTimeout(initiateStateUpdate, 30);
  };

  // @method AnimatedTuringMachine.iterateNext: Go on one step
  this.iterateNext = function (done) {
    if (!self._lockingCheck('iterate to next step'))
      return;
    if (self.finalStateReached()) {
      console.warn("final state already reached");
      return;
    }
    if (self.undefinedInstruction()) {
      console.warn("undefined instruction given");
      return;
    }

    self.lock();
    var r = tm.forth(1)[0];

    var old_value = r[0];
    var old_state = r[1];
    var new_value = r[2];
    var move = r[3];
    var new_state = r[4];
    var step_id = r[5];
    var undefined_instruction = r[6];
    var final_state_reached = r[7];

    var initiateNumberWriteAndGearMove = function () {
      numbers.addEventListener('writeFinished', function () {
        var rel_pos = move.equals(mot.LEFT) ? -1 : 0;
        rel_pos = move.equals(mot.RIGHT) ? 1 : rel_pos;
        // TODO: move gear
        /*if (speed >= 2000)
          if (rel_pos > 0)
            gear.addStepsLeft(1)
          else
            gear.addStepsRight(1)*/
        self.triggerEvent('valueWritten', old_value, new_value, rel_pos);
        setTimeout(initiateNumberMotion, 30);
      }, 1);

      var new_str_value = toStr(toJson(new_value));
      if (!animation_enabled || speed < speed_limit)
        numbers.writeNumberFast(new_str_value);
      else
        numbers.writeNumber(new_str_value);
    };

    var initiateNumberMotion = function () {
      numbers.addEventListener('moveFinished', function () {
        self.triggerEvent('movementFinished', move);
        setTimeout(initiateStateUpdate, 30);
      }, 1);

      // TODO: non-static 7/9
      // REMARK be aware that the tape already moved
      if (!animation_enabled || speed < speed_limit) {
        if (move.equals(mot.LEFT))
          numbers.moveRightFast(toStr(toJson(self.getTape().read(undefined, 9)[1])));
        else if (move.equals(mot.RIGHT))
          numbers.moveLeftFast(toStr(toJson(self.getTape().read(undefined, 9)[7])));
        else if (move.equals(mot.HALT) || move.equals(mot.STOP))
          numbers.moveNot();
      } else {
        if (move.equals(mot.LEFT))
          numbers.moveRight(toStr(toJson(self.getTape().read(undefined, 9)[1])));
        else if (move.equals(mot.RIGHT))
          numbers.moveLeft(toStr(toJson(self.getTape().read(undefined, 9)[7])));
        else if (move.equals(mot.HALT) || move.equals(mot.STOP))
          numbers.moveNot();
      }
    };

    var initiateStateUpdate = function () {
      self._updateStateInUI(new_state, final_state_reached, undefined_instruction, new_value);
      self.triggerEvent('stateUpdated', old_state, new_state, final_state_reached);

      self.triggerEvent('transitionFinished', old_value, old_state, new_value,
          move, new_state, step_id, undefined_instruction, final_state_reached);

      self.release();
      done.call(self);
    };

    setTimeout(initiateNumberWriteAndGearMove, 30);
  };

  // @method AnimatedTuringMachine.interrupt: Interrupt running TM
  this.interrupt = function () {
    this.lock();
    // TODO: .call(this) because interrupt uses stupid callback by method via this._stopRun
    tm.interrupt.call(this);
    this.release();
    return true;
  };

  // @method AnimatedTuringMachine.reset: Reset machine to initial state
  this.reset = function () {
    if (!this._lockingCheck('reset'))
      return;
    this.lock();
    tm.reset();
    this.release();
    this.syncToUI();
    return true;
  };

  this.toString = function () {
    return "[AnimatedTuringMachine '" + this.getMachineName() + "']";
  };

  // API - Import & Export

  // @method AnimatedTuringMachine.syncFromUI:
  //   Take all values from the UI and insert them into the TM state
  this.syncFromUI = function () {
    if (!this._lockingCheck('synchronize state from GUI'))
      return;

    var steps_prev = parseInt(ui_tm.find(".steps_prev").val());
    require(!isNaN(steps_prev), "Steps back counter must be number");
    require(steps_prev > 0, "Steps back counter must be non-negative number");

    var steps_next = parseInt(ui_tm.find(".steps_next").val());
    require(!isNaN(steps_next), "Steps continue counter must be number");
    require(steps_next > 0, "Steps continue counter must be non-negative number");

    // animation enabled?
    animation_enabled = !ui_tm.find("input[name='wo_animation']").is(":checked");

    // get numbers
    var vals = numbers.getNumbers();
    require(vals.length % 2 === 1, "Number of shown values must be odd");
    var steps = Math.floor(vals.length / 2);
    this.getTape().left(steps);
    for (var i = 0; i < vals.length; i++) {
      this.getTape().write(symbol(vals[i]));
      if (i !== vals.length - 1)
        this.getTape().right();
    }
    this.getTape().left(steps);

    // get state
    this.setState(state(ui_tm.find(".state").text()));

    // get steps count
    ui_settings['steps_back'] = steps_prev;
    ui_settings['steps_continue'] = steps_next;

    // get machine name
    this.setMachineName(ui_meta.find(".machine_name").val());

    // ignore 'Load tape'

    // get 'Final states'
    var fs_string = ui_data.find(".final_states").val();
    final_states = fs_string.split(/\s*,\s*/)
        .map(function (s) { return state(s); });
    this.setFinalStates(final_states);

    // read 'transition table'
    this.getProgram().clear();
    var self = this;
    ui_data.find(".transition_table tbody tr").each(function () {
      var from_symbol = $(this).find("td:eq(0) input").val();
      var from_state = $(this).find("td:eq(1) input").val();
      var write_symbol = $(this).find("td:eq(2) input").val();
      var move = $(this).find("td:eq(3) select").val();
      var to_state = $(this).find("td:eq(4) input").val();

      self.getProgram().set(
        symbol(from_symbol), state(from_state),
        symbol(write_symbol), mot[move.toUpperCase()], state(to_state)
      );
    });
  };

  // @method AnimatedTuringMachine.syncToUI:
  //   Write the current TM state to the UI
  this.syncToUI = function () {
    if (!this._lockingCheck('synchronize state to GUI'))
      return;

    // animation enabled?
    ui_tm.find("input[name='wo_animation']").prop("checked", !animation_enabled);

    // set numbers
    var vals = this.getTape().read(undefined, 7); // TODO non-static 7
    numbers.setNumbers(vals.map(toJson).map(toStr));

    // set state
    this._updateStateInUI(this.getState(),
      tm.finalStateReached(), tm.undefinedInstruction(),
      this.getTape().read());

    // set steps count
    ui_tm.find(".steps_prev").val(ui_settings['steps_back']);
    ui_tm.find(".steps_next").val(ui_settings['steps_continue']);

    // set machine name
    ui_meta.find(".machine_name").val(this.getMachineName());

    // set 'Load tape'
    ui_data.find(".tape").val(tape.toHumanString());

    // set 'Final states'
    var fs = this.getFinalStates().map(toStr).join(", ");
    ui_data.find(".final_states").val(fs);

    // write 'transition table'
    this.clearTransitionTableRows();
    var prg = this.toJSON()['program'];
    for (var row = 0; row < prg.length; row++) {
      this.writeTransitionTableRow(prg[row]);
      this.addNewTransitionTableRow();
    }
  };

  // @method AnimatedTuringMachine.fromJSON: Import object state from JSON dump
  this.fromJSON = function (data) {
    this.interrupt();
    this.lock();

    if (data['speed'] !== undefined) {
      speed = parseInt(data['speed']);
      require(!isNaN(speed));
      delete data['speed'];
    }
    if (data['animations'] !== undefined) {
      animation_enabled = !!data['animations'];
      delete data['animations'];
    }

    tm.fromJSON(data);
    this.release();
  };

  // @method AnimatedTuringMachine.toJSON: Export object state to JSON dump
  this.toJSON = function () {
    this.interrupt();

    var data = tm.toJSON();
    data['speed'] = speed;
    data['animations'] = animation_enabled;

    return data;
  };

  this._initialize();

  // inherited:
  //   lock, release, locked
  //   finished
  //   isAFinalState
  //   setTape, getTape
  //   setState, getState
  //   setProgram, getProgram
  //   setMachineName, getMachineName
  //   setInitialTape, getInitialTape
  //   setFinalStates, addFinalState, getFinalStates
  //   setCursor, getCursor
  //   setInitialState, getInitialState
  //   getStep
  //   undefinedInstruction, finalStateReached
};

// ---------------------------- Testcase Runner ---------------------------

var TestcaseRunner = function (manager) {
  var N_SUCCESS = "(ok) Testcase '%1' succeeded.";
  var N_FAILURE = "(fail) Testcase '%1' failed.";

  // @function TestcaseRunner._createTM: create/overwrite a
  //   TuringMachine instance with the given input configuration
  this._createTM = function (input, tm, transition_table,
    default_final_states, default_initial_state)
  {
    var i_tape_cursor = input['tape']['cursor'];
    var i_tape_blank = input['tape']['blank'];
    var i_tape_data = input['tape']['data'];
    var i_state = input['state'];

    var prg, tape;
    if (tm) {
      prg = tm.getProgram();
      tape = tm.getTape();
    } else {
      if (typeof i_tape_blank === 'undefined')
        tape = new UserFriendlyTape(symbol(i_tape_blank), 0);
      else
        tape = new UserFriendlyTape(symbol("_"), 0);
      prg = new Program();
      tm = new TuringMachine(prg, tape,
        default_final_states.map(function (v) { return state(v) }),
        state(default_initial_state));
    }
    prg.fromJSON(transition_table);

    if (typeof i_tape_blank !== 'undefined')
      tape.setBlankSymbol(symbol(i_tape_blank));

    if (typeof i_state !== 'undefined')
      tm.setState(state(i_state));

    tape.clear();
    if (typeof i_tape_data !== 'undefined') {
      tape.moveTo(position(0));
      for (var i = 0; i < i_tape_data.length; i++) {
        tape.write(symbol(i_tape_data[i])); // TODO comparison function
        tape.right();
      }
      if (typeof i_tape_cursor !== 'undefined')
        tape.moveTo(position(i_tape_cursor));
      else
        tape.moveTo(position(0));
    }

    return tm;
  };

  // @function TestcaseRunner._testTM: test whether a TuringMachine instance
  //   satisfies the given output configuration
  this._testTM = function (tm, output) {
    var o_tapecontent = output['tapecontent'];
    var o_cursorposition = output['cursorposition'];
    var o_state = output['state'];

    if (tm.getStep() >= generic_check_inf_loop)
      return [false, 'steps performed', '<' + generic_check_inf_loop, 'greater'];

    if (typeof o_state !== 'undefined')
      if (!tm.getState().equals(state(o_state)))
        return [false, 'final state', o_state, tm.getState().toJSON()];

    if (typeof o_tapecontent !== 'undefined') {
      var actual_data = tm.getTape().toJSON()['data'];
      var expected_data = o_tapecontent.map(toStr);

      while (actual_data[0] === tm.getTape().getBlankSymbol().toJSON())
        actual_data = actual_data.slice(1);
      while (actual_data[actual_data.length - 1] === tm.getTape().getBlankSymbol().toJSON())
        actual_data = actual_data.slice(0, -1);

      var equals = true, i = 0;
      for (; i < Math.max(actual_data.length, expected_data.length); i++)
        if (actual_data[i] !== expected_data[i]) {
          equals = false;
          break;
        }

      var r = function (v) { return (v === undefined) ? 'blank' : ("'" + v + "'") };

      if (!equals)
        return [false, 'tape content', r(actual_data[i]),
          r(expected_data[i]) + " at index " + i];

      if (typeof o_cursorposition !== 'undefined')
        if (o_cursorposition !== tm.getTape().toJSON()['cursor'])
          return [false, 'cursor', o_cursorposition, tm.getTape().toJSON()['cursor']];
    }

    return [true];
  };

  // @function TestcaseRunner._runTM: run a turingmachine
  //   until a terminating condition is reached
  this._runTM = function (tm) {
    var steps = 0;
    while (!tm.finished() && steps++ < generic_check_inf_loop)
      tm.forth();
  };

  // @function TestcaseRunner.runTestcase: run a specific testcase (or all)
  this.runTestcase = function (testsuite, tc_name, transition_table) {
    require(typeof testsuite !== 'undefined', 'Testsuite required');
    require(typeof transition_table.length !== 'undefined', 'transition table required');

    var report = { 'reports': { }, 'reports_length': 0 };
    if (tc_name)
      var testcases = [tc_name];
    else
      var testcases = manager.get(testsuite).testcases;

    report['program'] = manager.get(testsuite)['title'];
    var default_final_states = manager.get(testsuite)['final_states']
        .map(function (s) { return state(s) } );
    var default_initial_state = state(manager.get(testsuite)['state']);

    var ok = true;
    for (var tc = 0; tc < testcases.length; tc++) {
      var testcase = manager.get(testsuite).testcases[tc];

      var testing_tm = this._createTM(testcase['input'], undefined,
        transition_table, default_final_states, default_initial_state);
      this._runTM(testing_tm);
      var response = this._testTM(testing_tm, testcase['output']);

      var tc_report = { 'ok': response[0] };
      if (!tc_report['ok']) {
        ok = false;
        tc_report['error'] = 'Expected ' + response[1] + ' to be ' + response[2]
          + ' but is actually ' + response[3];
      }

      report.reports[testcase.name] = tc_report;
      report.reports_length += 1;
    }

    report['ok'] = ok;
    return report;
  };

  // @function TestcaseRunner.loadTestcaseToATM:
  //   load a testcase to a given AnimatedTuringMachine
  this.loadTestcaseToATM = function (tc_name, atm) {
    require(tc_name !== undefined, "Testcase must be given");

    var default_final_states = manager.getProgram()['final_states'].map(state);
    var default_initial_state = state(manager.getProgram()['state']);
    var testcase = null;

    for (var i = 0; i < manager.get(testsuite).testcases.length; i++)
      if (manager.get(testsuite).testcases[i].title === tc_name)
        testcase = manager.get(testsuite).testcases[i];

    this._createTM(testcase.input, atm, default_final_states, default_initial_state);
    atm.syncToUI();
  };
};

