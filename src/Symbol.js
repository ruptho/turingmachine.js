
// -------------------------------- Symbol --------------------------------

// @object Symbol: Symbol on Turing machine tape.
function Symbol(value)
{
  // @member Symbol.value
  require(typeof value !== 'undefined');  // disallowed value
  if (value.isSymbol)
    throw AssertionException("Symbol cannot be created by Symbol instance");

  // @method Symbol.equals: Equality comparison for Symbol objects
  this.equals = function (other) {
    return value === other.toJSON();
  };

  // @method Symbol.cmp: Compare two symbols
  var global_cmp = cmp;
  this.cmp = function (other) {
    if (!isSymbol(other))
      return -1;
    return global_cmp(value, other.toJSON());
  };

  // @method Symbol.copy: Return copy of the Symbol instance
  this.copy = function () {
    return new Symbol(value);
  };

  // @method Symbol.toString: String representation of Symbol objects
  this.toString = function () {
    return repr(value);
  };

  // @method Symbol.toJSON: JSON representation of Symbol objects
  this.toJSON = function() {
    return value;
  };

  // @method Symbol.fromJSON: Get object from JSON
  this.fromJSON = function (j) {
    value = j;
  };

  this.isSymbol = true;
}

// Default mapping for arbitrary values to TM tape values
//  will normalize all values to trimmed strings
function normalizeSymbol(val) {
  if (val === null || typeof val === "undefined")
    return " ";

  val = "" + val;
  val = val.trim();
  if (val === "")
    return ' ';
  else
    return val;
}

// is given `val` a Symbol instance?
function isSymbol(val) {
  try {
    return val.isSymbol === true;
  } catch (e) {
    return false;
  }
}

// require `val` to be a symbol
function requireSymbol(val) {
  if (!isSymbol(val))
    throw AssertionException(
      "Given value is not a tape symbol: " + repr(val)
    );
}

// create Symbol instance from `val`
function symbol(val, norm_fn) {
  norm_fn = def(norm_fn, normalizeSymbol);

  var value = norm_fn(val);
  require(typeof value !== 'undefined',
    "Cannot create symbol from " + repr(value));

  return new Symbol(value);
}

