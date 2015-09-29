// --------------------------------- Tape ---------------------------------

function defaultTape(symbol_norm_fn) {
  symbol_norm_fn = def(symbol_norm_fn, normalizeSymbol);
  return new Tape(symbol(generic_blank_symbol, symbol_norm_fn));
}

// @object Tape: Abstraction for an infinite tape.
function Tape(blank_symbol)
{
  // @member Tape.blank_symbol: value to written if new space is created
  blank_symbol = def(blank_symbol, symbol(generic_blank_symbol));
  requireSymbol(blank_symbol);

  // @member Tape.offset: Offset of position 0 to values index 0
  //   if index 3 at tape contains position 0, then offset=3
  // @domain arbitrary integer
  var offset = 0;
  // @member Tape.cursor: Cursor position
  // @domain Position instance of arbitrary value
  var cur = position(0);
  // @member Tape.tape
  //   stores undefined instead for blank symbols and
  //   replaces them with blank_symbol when represented as string
  //   cursor always points to element which exists here
  // @domain ordered sequence of Symbol instances or undefined
  var tape = [];

  var min = 0, max = 0;

  // Determine the actual index of the cursor inside `tape`
  this._cursorIndex = function () {
    return cur.index + offset;
  };

  // Retrieve some value from the stack by Position
  this._get = function (p) {
    requirePosition(p);
    return tape[p.index + offset];
  };

  // invariants check
  this._testInvariants = function () {
    require(typeof offset === 'number');
    require((offset % 1) < 0.01);  // does not have decimal places
    requirePosition(cur, "cursor is not a position object");
    require(typeof tape === 'object');
    require(all(tape, function (v) { return isSymbol(v) || v === undefined; }));
  };

  // take this JSON and trim blank symbols left and right
  this._simplifyJSON = function (j, only_undefined) {
    only_undefined = def(only_undefined, true);
    var empty = function (v) {
      if (only_undefined)
        return v === undefined;
      else
        return (v === undefined || v === j['blank_symbol']);
    };

    while (j['data'].length > 0 && empty(j['data'][0]))
    {
      j['data'].splice(0, 1);
      j['offset'] -= 1;
    }
    while (j['data'].length > 0 && empty(j['data'][j['data'].length - 1]))
    {
      j['data'].pop();
    }
  };

  // @method Tape.getBlankSymbol: returns blank symbol
  this.getBlankSymbol = function () {
    return blank_symbol;
  };

  // @method Tape.setBlankSymbol: get blank symbol
  this.setBlankSymbol = function (val) {
    requireSymbol(val);
    require(typeof val.toJSON() !== 'undefined',   // disallowed value
      "undefined must not be used as blank symbol");
    blank_symbol = val;
  };

  // @method Tape.clear: Clear values of this tape
  this.clear = function () {
    offset = 0;
    cur = position(0);
    tape = [];
    min = 0;
    max = 0;
  };

  // @method Tape.begin: Get smallest Position at Tape ever accessed
  this.begin = function () {
    return position(min);
  };

  // @method Tape.end: Get largest Position at Tape ever accessed
  this.end = function () {
    return position(max);
  };

  // @method Tape.left: Go left at tape
  this.left = function (positions) {
    cur = cur.sub(def(positions, 1));
    if (cur.index < min)
      min = cur.index;
  };

  // @method Tape.right: Go right at tape
  this.right = function (positions) {
    cur = cur.add(def(positions, 1));
    if (cur.index > max)
      max = cur.index;
  };

  // @method Tape.moveTo: Move to the given position
  this.moveTo = function (pos) {
    requirePosition(pos);
    cur = pos;

    if (cur.index > max)
      max = cur.index;
    if (cur.index < min)
      min = cur.index;
  };

  // @method Tape.write: Write value to tape at current cursor position
  this.write = function (value) {
    requireSymbol(value);
    do {
      var idx = this._cursorIndex();
      if (0 <= idx && idx < tape.length) {
        tape[idx] = value;
        break;
      } else if (idx < 0) {
        tape.splice(0, 0, undefined);
        offset += 1;
      } else {
        tape.push(undefined);
      }
    } while (true);
    this._testInvariants();
  };

  // @method Tape.read: Return `count` values at given position `pos`
  //   if `count` = 1 (default), then the value is returned directly
  //   otherwise an array of `count` elements is returned where
  //   `pos` is at math.floor(return_value.length / 2);
  this.read = function (pos, count) {
    count = def(count, 1);
    require(count >= 1);
    pos = def(pos, position(cur));
    requirePosition(pos);
    this._testInvariants();

    if (pos.index > max)
      max = pos.index;
    if (pos.index < min)
      min = pos.index;

    var norm = function (v) {
      return (v === undefined) ? blank_symbol : v;
    };

    if (count === 1) {
      return norm(this._get(pos));
    } else {
      var values = [];
      for (var i = -Math.floor(count / 2); i <= Math.floor((count - 1) / 2); i++)
        values.push(norm(this._get(pos.add(i))));
      require(values.length === count, "Length must match");
      return values;
    }
  };

  // @method Tape.length: count positions between smallest non-blank
  //                      and largest non-blank symbol
  this.size = function () {
    return tape.length;
  };

  // @method Tape.equals: Tape equivalence
  //  If ignore_blanks, consider the blank symbol and undefined as the same symbol
  //  If ignore_cursor, cursor position does not matter
  this.equals = function (other, ignore_blanks, ignore_cursor) {
    ignore_blanks = def(ignore_blanks, true);
    ignore_cursor = def(ignore_cursor, false);

    if (!other.isTape)
      throw new AssertionException("Can only compare tape with tape");

    if (!other.getBlankSymbol().equals(this.getBlankSymbol()))
      return false; // because are certainly some indices with different values

    var my_json = this.toJSON();
    var other_json = other.toJSON();

    var normVal = function (v, blank) {
      if (!ignore_blanks)
        return v;
      if (v === blank)
        return blank;
      else
        return v;
    };

    var getByIndex = function (json, i) {
      if (i < 0 || i >= json['data'].length)
        return json['blank_symbol'];
      return normVal(json['data'][i], json['blank_symbol']);
    };
    var getMyByIndex = function (i) {
      return getByIndex(my_json, i);
    };
    var getOtherByIndex = function (i) {
      return getByIndex(other_json, i);
    };

    var getByPos = function (json, i) {
      var index = json['cursor'] + json['offset'];
      return getByIndex(json, index);
    };
    var getMyByPos = function (i) {
      return getByPos(my_json, i);
    };
    var getOtherByPos = function (i) {
      return getByPos(other_json, i);
    };

    var compare = function (my, oth) {
      if (!ignore_cursor && my['cursor'] !== oth['cursor'])
        return false;
      var begin1 = 0 - my['offset'];
      var begin2 = 0 - oth['offset'];
      var end1 = my['data'].length - 1 - my['offset'];
      var end2 = oth['data'].length - 1 - oth['offset'];
      for (var p = Math.min(begin1, begin2); p < Math.max(end1, end2); p++)
        if (getMyByPos(p) !== getOtherByPos(p))
          return false;
      return true;
    };

    return compare(my_json, other_json);
  };

  // @method Tape.fromHumanString: Human-readable representation of Tape
  this.fromHumanString = function (str, symbol_norm_fn) {
    symbol_norm_fn = def(symbol_norm_fn, normalizeSymbol);
    this.clear();

    var cursor_index = undefined;
    var parts = str.split(/\s*,\s*/);
    for (var i = 0; i < parts.length; i++) {
      if (parts[i][0] === '*' && parts[i][parts[i].length - 1] === '*') {
        cursor_index = i;
        parts[i] = parts[i].slice(1, parts[i].length - 1);
      }

      this.write(symbol(parts[i], symbol_norm_fn));
      if (i !== parts.length - 1)
        this.right();
    }

    if (cursor_index !== undefined)
      cur = position(cursor_index);
  };

  // @method Tape.toHumanString: Human-readable representation of Tape
  this.toHumanString = function () {
    var dump = this.toJSON();

    var data = dump['data'];
    var cursor_index = dump['cursor'] + dump['offset'];

    // left-strip blank symbols
    while (data.length > 0 && data[0] === dump['blank_symbol']
      && cursor_index > 0)
    {
      data = data.slice(1);
      cursor_index -= 1;
    }

    // extend such that cursor is certainly inside data
    while (cursor_index < 0) {
      data.splice(0, 0, dump["blank_symbol"]);
      cursor_index += 1;
    }
    while (cursor_index >= data.length) {
      data.push(dump["blank_symbol"]);
    }

    data = data.map(function (v) {
      if (v === null || v === undefined)
        return "" + dump['blank_symbol'];
      else
        return toStr(v);
    });
    data[cursor_index] = "*" + data[cursor_index] + "*";
    return data.join(", ");
  };

  // @method Tape.fromJSON: Import Tape data
  // @example
  //   fromJSON({'data': [], 'cursor':0, 'blank_symbol':'0', 'offset': 3})
  this.fromJSON = function (data, symbol_norm_fn) {
    if (typeof data['data'] === 'undefined' ||
        typeof data['cursor'] === 'undefined')
      throw new SyntaxException(
        "Cannot import tape from JSON. " +
        "JSON incomplete (data or cursor missing)."
      );

    this._simplifyJSON(data, true);

    // default values
    symbol_norm_fn = def(symbol_norm_fn, normalizeSymbol);
    if (data['blank_symbol']) {
      blank_symbol = def(data['blank_symbol'], generic_blank_symbol);
      blank_symbol = symbol(blank_symbol, symbol_norm_fn);
    }
    requireSymbol(blank_symbol);

    offset = def(data['offset'], 0);
    require(offset >= 0);

    cur = position(data['cursor']);
    requirePosition(cur);

    tape = data['data'].map(function (v) {
      return (v === null || v === undefined)
        ? undefined
        : symbol(v, symbol_norm_fn);
    });

    min = -offset;
    max = tape.length - 1 - offset;

    this._testInvariants();
  };

  // @method Tape.toJSON: Return JSON representation of Tape
  this.toJSON = function () {
    return {
      blank_symbol : blank_symbol.toJSON(),
      offset : offset,
      cursor : cur.toJSON(),
      data : tape.map(toJson)
    };
  };

  this.cursor = function () {
    return cur;
  };

  this.isTape = true;

  this._testInvariants();
}

// ----------------------------- RecordedTape -----------------------------

function defaultRecordedTape(symbol_norm_fn) {
  symbol_norm_fn = def(symbol_norm_fn, normalizeSymbol);
  return new RecordedTape(symbol(generic_blank_symbol, symbol_norm_fn));
}

// @object RecordedTape: A tape with a history (can restore old states).
// invariant: RecordedTape provides a superset API of Tape

// A Tape which also provides a history with the undo and snapshot methods.
// The state is stored whenever method 'snapshot' is called.
// In other words: it can revert back to previous snapshots using 'undo'.
function RecordedTape(blank_symbol, history_size)
{
  // @member RecordedTape.history_size
  history_size = def(history_size, Infinity);
  if (history_size !== Infinity)
    history_size = parseInt(def(history_size, 10));
  require(!isNaN(history_size), "History size must be integer");

  // @member RecordedTape.history
  // Array of humantapes. One string per snapshot. Stores all actions.
  var history = [[]];

  // @member RecordedTape.simple_tape
  var simple_tape = inherit(Tape, this, arguments);

  // @member RecordedTape.logging
  var logging = true;

  // General overview for instruction set:
  //    going $x pos left     -> [-$x]
  //    going $x pos right    -> [$x]
  //    overwrite $x with $y  -> ['w', $x, $y]

  // @method RecordedTape._oppositeInstruction: Get opposite instruction
  this._oppositeInstruction = function (ins) {
    if (ins[0] === 'w')
      return ["w", ins[2], ins[1]];
    else if (isNaN(parseInt(ins[0])))
      throw AssertionException("Unknown VM instruction");
    else if (ins[0] === 0)
      return [0];
    else
      return [-ins[0]];
  };

  // @method RecordedTape._applyInstruction: Run an instruction
  //         This method runs the instruction given
  this._applyInstruction = function (ins) {
    if (ins[0] === "w")
      write(ins[1], ins[2]);
    else if (typeof ins === 'number' && ins[0] < 0)
      left(-ins[0]);
    else if (typeof ins === 'number' && ins[0] > 0)
      right(ins[0]);
    else if (typeof ins === 'number' && ins[0] === 0)
      {}
    else
      throw AssertionException("Unknown instruction");
  };

  // @method RecordedTape._applyNativeInstruction: Run instruction natively
  //         This method runs the instructions when jumping around in history
  this._applyNativeInstruction = function (ins) {
    if (ins[0] === 'w')
      simple_tape.write(ins[2]);
    else if (typeof ins[0] === 'number' && ins[0] < 0)
      simple_tape.left(-ins[0]);
    else if (typeof ins[0] === 'number' && ins[0] > 0)
      simple_tape.right(ins[0]);
    else if (typeof ins[0] === 'number' && ins[0] === 0)
      {}
    else
      throw AssertionException("Unknown instruction");
  };

  // @method RecordedTape._undoOneSnapshot: Undo all actions of latest snapshot
  this._undoOneSnapshot = function (frame) {
    var ops = [];
    for (var i = frame.length - 1; i >= 0; i--) {
      var undo = this._oppositeInstruction(frame[i]);
      this._applyNativeInstruction(undo);
      ops.push(undo);
    }
    return ops;
  };

  // @method RecordedTape.resizeHistory: Shorten history if necessary
  this._resizeHistory = function (size) {
    if (size === Infinity)
      return;
    if (size <= 0)
      return;
    history = history.slice(-size, history.length);
  };

  // @method RecordedTape.enableLogging: Enable logging of actions
  this.enableLogging = function () {
    logging = true;
  };

  // @method RecordedTape.disableLogging: Disable logging of actions
  this.disableLogging = function () {
    logging = false;
  };

  // @method RecordedTape.getHistorySize: returns history_size
  this.getHistorySize = function () {
    return history_size;
  };

  // @method RecordedTape.setHistorySize: get history_size
  this.setHistorySize = function (val) {
    if (val === Infinity)
      val = Infinity;
    else if (!isNaN(parseInt(val)))
      val = parseInt(val);
    else
      throw AssertionException("setHistorySize only accept inf or num");

    simple_tape.setHistorySize(val);
    simple_tape.setBlankSymbol(val);
  };

  // @method RecordedTape.getHistory: Return the stored history
  this.getHistory = function () {
    return history;
  };

  // @method RecordedTape.clearHistory: Clear the history of this tape
  this.clearHistory = function () {
    history = [[]];
  };

  // @method RecordedTape.clear: Clear values of the tape and its history
  this.clear = function () {
    this.clearHistory();
    simple_tape.clear();
  };

  // @method RecordedTape.left: Go left.
  this.left = function (positions) {
    positions = def(positions, 1);
    require(!isNaN(parseInt(positions)));
    history[history.length - 1].push([-positions]);
    this._resizeHistory(history_size);
    simple_tape.left(positions);
  };

  // @method RecordedTape.right: Go right.
  this.right = function (positions) {
    positions = def(positions, 1);
    require(!isNaN(parseInt(positions)));
    history[history.length - 1].push([positions]);
    this._resizeHistory(history_size);
    simple_tape.right(positions);
  };

  // @method RecordedTape.write: Write a value to tape.
  this.write = function (new_value, old_value) {
    old_value = def(old_value, simple_tape.read());
    history[history.length - 1].push(['w', old_value, new_value]);
    this._resizeHistory(history_size);
    simple_tape.write(new_value);
  };

  // @method RecordedTape.undo: Go back to last snapshot.
  //   Returns reversed operations.
  this.undo = function () {
    if (history.length === 1 && history[0].length === 0)
      throw new OutOfHistoryException("Tape history under the limit");

    var frame = history.pop();
    return this._undoOneSnapshot(frame);
  };

  // @method RecordedTape.snapshot: Take a snapshot.
  this.snapshot = function () {
    var last = history.length - 1;
    history.push([]);
    this._resizeHistory(history_size);
  };

  // @method RecordedTape.toString: Return string representation of RecordedTape
  this.toString = function () {
    return simple_tape.toHumanString(false);
  };

  // @method RecordedTape.toJSON: Return JSON representation of RecordedTape
  this.toJSON = function (export_history) {
    var data = simple_tape.toJSON();

    export_history = def(export_history, true);
    if (!export_history)
      return data;

    data['history'] = deepCopy(history);
    if (history_size === Infinity)
      data['history_size'] = null;
    else
      data['history_size'] = history_size;

    return data;
  };

  // @method RecordedTape.fromJSON: Import RecordedTape data
  // @example
  //   fromJSON({'data': [], 'cursor':0, 'blank_symbol':'0',
  //     'offset': 3, 'history': [], 'history_size': 0})
  this.fromJSON = function (data) {
    this.clearHistory();
    if (typeof data['history'] !== 'undefined')
      if (data['history'].length > 0)
        history = data['history'];
      else
        history = [[]];
    if (typeof data['history_size'] !== 'undefined')
      if (data['history_size'] === null)
        history_size = Infinity;
      else {
        history_size = parseInt(data['history_size']);
        require(!isNaN(history_size));
      }
    this._resizeHistory(history_size);
    delete data['history_size'];
    delete data['history'];

    return simple_tape.fromJSON(data);
  };

  this.isRecordedTape = true;
}

// ----------------------------- ExtendedTape -----------------------------

function defaultExtendedTape(symbol_norm_fn) {
  symbol_norm_fn = def(symbol_norm_fn, normalizeSymbol);
  return new ExtendedTape(symbol(generic_blank_symbol, symbol_norm_fn));
}

// @object ExtendedTape: An extension of Tape with additional features.
// invariant: ExtendedTape provides a superset API of RecordedTape

function ExtendedTape(blank_symbol, history_size)
{
  // @member ExtendedTape.rec_tape
  var rec_tape = inherit(RecordedTape, this, arguments);

  // @method ExtendedTape.move: Move 1 step in some specified direction
  this.move = function (move) {
    requireMotion(move);

    if (move.equals(mot.RIGHT))
      rec_tape.right();
    else if (move.equals(mot.LEFT))
      rec_tape.left();
    else if (move.equals(mot.STOP) || move.equals(mot.HALT)) {
      // nothing.
    } else
      throw AssertionException("Unknown motion '" + move.toString() + "'");
  };

  // @method ExtendedTape.forEach: Apply f for each element at the tape
  //   f is called as func(pos, val) from begin() to end()
  this.forEach = function (func) {
    var base = rec_tape.cursor();
    rec_tape.moveTo(rec_tape.begin());

    while (!rec_tape.cursor().equals(rec_tape.end())) {
      func(rec_tape.cursor(), rec_tape.read());
      rec_tape.right();
    }
    func(rec_tape.cursor(), rec_tape.read());

    rec_tape.moveTo(base);
  };

  // @method ExtendedTape.getAlphabet: Get alphabet of current Tape
  //         alphabet = OrderedSet of normalized characters at tape
  this.getAlphabet = function () {
    var values = new OrderedSet();

    // remove duplicate entries
    forEach(function (pos, element) {
      values.push(element.toJSON());
    });

    return values;
  };

  this.isExtendedTape = true;
}

// --------------------------- UserFriendlyTape ---------------------------

function defaultUserFriendlyTape(symbol_norm_fn) {
  symbol_norm_fn = def(symbol_norm_fn, normalizeSymbol);
  return new UserFriendlyTape(symbol(generic_blank_symbol), 5);
}

// @object UserFriendlyTape: Tape adding awkward & special but handy methods.
// invariant: UserFriendlyTape provides a superset API of ExtendedTape

function UserFriendlyTape(blank_symbol, history_size)
{
  // @method UserFriendlyTape.ext_tape
  var rec_tape = inherit(ExtendedTape, this, arguments);

  // @method UserFriendlyTape.setByString
  // Clear tape, store values of `array` from left to right starting with
  // position 0. Go back to position 0.
  this.fromArray = function (array, symbol_norm_fn) {
    symbol_norm_fn = def(symbol_norm_fn, normalizeSymbol);

    rec_tape.clear();
    rec_tape.moveTo(position(0));
    for (var i = 0; i < array.length; i++) {
      rec_tape.write(symbol(array[i]));
      rec_tape.right();
    }
    rec_tape.moveTo(position(0));
  };

  // @method UserFriendlyTape.readBinaryValue
  //   Assume that the tape only contains values 0 and 1.
  //   Consider this value as binary value and return
  //     [binary value as number, bitstring, number of bits]
  //   if anything fails, return null
  this.readBinaryValue = function () {
    var values = [];
    ext_tape.forEach(function (pos, val) {
      values.push(val);
    });
    var binstring = '';
    for (var i = 0; i < values.length; i++) {
      var val = ("" + values[i]).strip();
      if (val !== '0' && val !== '1')
        return false;
      else
        binstring += val;
    }
    var num = parseInt(binstring.split('').reverse().join(''), 2);
    return [num, binstring, values.length];
  };

  this.isUserFriendlyTape = true;
}


