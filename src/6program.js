// -------------------------------- Program -------------------------------

function defaultProgram() {
  // TODO: normalization functions for symbol & state
  var prg = new Program();
  prg.set(symbol(generic_blank_symbol), state('Start'),
    symbol(generic_blank_symbol), mot.RIGHT, state('End'));
  return prg;
}

// @object Program: Abstraction for the program of the Turing machine.
function Program()
{
  // @member Program.program
  // list of [from_symbol, from_state, (to_symbol, motion, to_state)]
  // the parens denote a InstrTuple object
  var program = [];

  this._safeGet = function (from_symbol, from_state) {
    requireSymbol(from_symbol);
    requireState(from_state);
    for (var i = 0; i < program.length; i++)
      if (program[i][0].equals(from_symbol) && program[i][1].equals(from_state))
        return program[i][2];

    return undefined;
  };

  this._safeSet = function (from_symbol, from_state, instr, overwrite) {
    overwrite = def(overwrite, true);
    requireSymbol(from_symbol);
    requireState(from_state);
    requireInstrTuple(instr);

    for (var i = 0; i < program.length; i++)
      if (program[i][0].equals(from_symbol) && program[i][1].equals(from_state))
        if (overwrite) {
          program[i][2] = instr;
          return true;
        } else
          return false;

    program.push([from_symbol, from_state, instr]);
    return true;
  };

  // @method Program.clear: Clear program table
  this.clear = function () {
    program = [];
  };

  // @method Program.exists: Does (from_symbol, from_state) exist in table?
  this.exists = function (from_symbol, from_state) {
    requireSymbol(from_symbol);
    requireState(from_state);
    return typeof this._safeGet(from_symbol, from_state) !== 'undefined';
  };

  // @method Program.set: Set entry in program
  this.set = function (from_symbol, from_state, write, move, to_state) {
    requireSymbol(from_symbol);
    requireState(from_state);
    var value;

    if (isInstrTuple(write)) {
      // InstrTuple was provided instead of (write, move, to_state)
      value = write;
    } else {
      require(typeof move !== 'undefined');
      requireSymbol(write);
      requireMotion(move);
      requireState(to_state);

      value = instrtuple(write, move, to_state);
    }

    this._safeSet(from_symbol, from_state, value, true);
  };

  // @method Program.get: Return InstrTuple for given (symbol, state) or undefined
  this.get = function (from_symbol, from_state) {
    requireSymbol(from_symbol);
    requireState(from_state);
    return this._safeGet(from_symbol, from_state);
  };

  // @method Program.size: Count number of instructions stored in program
  this.size = function () {
    return program.length;
  };

  // @method Program.getFromSymbols: Get UnorderedSet of all from symbols
  this.getFromSymbols = function () {
    var symbol_set = new UnorderedSet([], function (a, b) { return a.equals(b) ? 0 : -1 });
    for (var i in program)
      symbol_set.push(program[i][0]);
    return symbol_set;
  };

  // @method Program.getFromSymbols: Get array of all from symbols
  this.getFromStates = function () {
    var state_set = new UnorderedSet([], function (a, b) { return a.equals(b) ? 0 : -1 });
    for (var i in program)
      state_set.push(program[i][1]);
    return state_set;
  };

  // @method Program.toString: String representation of Program object
  this.toString = function () {
    var repr = "<program>\n";
    for (var i in program) {
      var f = [program[i][0], program[i][1]].map(toStr).join(";");
      var s = program[i][2].toString();
      repr += "  " + f + "  = " + s + "\n";
    }
    repr += "</program>";

    return repr;
  };

  // @method Program.toJSON: JSON representation of Program object
  this.toJSON = function () {
    var data = [];
    for (var i in program)
      data.push([program[i][0].toJSON(), program[i][1].toJSON(),
                 program[i][2].toJSON()]);

    return data;
  };

  // @method Program.fromJSON: Import a program
  // @example
  //    fromJSON([['0', 'Start', ['1', 'RIGHT', 'End']]])
  this.fromJSON = function (data, symbol_norm_fn, state_norm_fn) {
    if (typeof data === "string")
      try {
        data = JSON.parse(data);
      } catch (e) {
        throw new SyntaxException(
          "Cannot import JSON as program. JSON is invalid."
        );
      }

    this.clear();

    for (var i in data) {
      var from_symbol = symbol(data[i][0], symbol_norm_fn);
      var from_state = state(data[i][1], state_norm_fn);
      var write = symbol(data[i][2][0], symbol_norm_fn);
      var move = motion(data[i][2][1]);
      var to_state = state(data[i][2][2], state_norm_fn);

      this.set(from_symbol, from_state, write, move, to_state);
    }
  };

  this.isProgram = true;
};

