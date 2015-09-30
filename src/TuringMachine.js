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