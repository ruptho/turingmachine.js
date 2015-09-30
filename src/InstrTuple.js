
// ------------------------------ InstrTuple ------------------------------

// @object InstrTuple: Instruction tuple (value, movement, to state)
function InstrTuple(write, move, state)
{
  // @member InstrTuple.write
  // @member InstrTuple.move
  // @member InstrTuple.state

  requireSymbol(write);
  requireMotion(move);
  requireState(state);

  this.write = write;
  this.move = move;
  this.state = state;

  // @method InstrTuple.equals: Equality comparison for InstrTuple objects
  this.equals = function (other) {
    require(isInstrTuple(other), "InstrTuple object required for comparison");
    if (!other)
      return false;
    return write.equals(other.write) && move.equals(other.move) &&
        state.equals(other.state);
  };

  // @method InstrTuple.toString: String representation of InstrTuple objects
  this.toString = function () {
    return "{instruction: write " + write + ", move "
      + move + " and goto state "
      + state + "}";
  };

  // @method InstrTuple.toJSON: JSON representation of InstrTuple objects
  this.toJSON = function () {
    return [write.toJSON(), move.toJSON(), state.toJSON()];
  };

  // @method InstrTuple.fromJSON: Import JSON representation
  this.fromJSON = function (obj, symbol_norm_fn, state_norm_fn) {
    symbol_norm_fn = def(symbol_norm_fn, normalizeSymbol);
    state_norm_fn = def(state_norm_fn, normalizeState);

    var it_symbol = symbol(obj[0], symbol_norm_fn);
    var it_move = motion(obj[1]);
    var it_state = state(obj[2], state_norm_fn);

    write = it_symbol;
    move = it_move;
    state = it_state;
  };

  this.isInstrTuple = true;
}

// Test whether or not the given parameter `obj` is an InstrTuple object
function isInstrTuple(obj)
{
  try {
    return obj.isInstrTuple === true;
  } catch (e) {
    return false;
  }
}

// Throw exception if `obj` is not a Instruction object
function requireInstrTuple(obj)
{
  if (!isInstrTuple(obj))
    throw AssertionException("Is not an instruction");
}

// Convenient function to create Instruction objects
function instrtuple(w, m, s)
{
  return new InstrTuple(w, m, s);
}

