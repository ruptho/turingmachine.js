// ------------------------------- Position -------------------------------

// @object Position: Abstraction for Position at Tape.
function Position(idx)
{
  // @member Position.idx
  require((idx % 1) < 0.01);

  // @method Position.equals: Equality comparison for Position objects
  this.equals = function (other) {
    if (isPosition(other))
      return this.toJSON() === other.toJSON();
    else
      return idx === other;
  };

  // @method Position.add: Returns Position instance at pos this+summand
  this.add = function (summand) {
    return position(idx + summand);
  };

  // @method Position.sub: Returns Position instance at pos this+subtrahend
  this.sub = function (subtrahend) {
    return position(idx - subtrahend);
  };

  // @method Position.diff: Return integer diff between this and given Position
  this.diff = function (other) {
    return other.idx - this.idx;
  };

  // @method Position.toString: String representation of Position objects
  this.toString = function () {
    return idx.toString();
  };

  // @method Position.toJSON: JSON representation of Position objects
  this.toJSON = function () {
    return idx;
  };

  // @method Position.fromJSON: Retrieve object from JSON representation
  this.fromJSON = function (j) {
    idx = j;
  };

  this.index = idx;
  this.isPosition = true;
}

// Default mapping for some arbitrary value to a position
//   returns undefined in case of an error
function normalizePosition(val) {
  val = parseInt(val);
  if (isNaN(val))
    return undefined;
  else
    return val;
}

// Test whether or not the given parameter `obj` is a Position object
function isPosition(obj)
{
  try {
    return obj.isPosition === true;
  } catch (e) {
    return false;
  }
}

// Throw exception if `obj` is not a Position object
function requirePosition(obj)
{
  if (!isPosition(obj))
    throw AssertionException("Is not a position");
}

// Convenient function to create position objects
function position(val, norm_fn)
{
  norm_fn = def(norm_fn, normalizePosition);

  var value = norm_fn(val);
  require(typeof value !== 'undefined',
    "Cannot create Position instance from " + repr(val));

  return new Position(value);
}
