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