
// -------------------------------- Motion --------------------------------

// @object Motion: Abstraction for moving operation.
function Motion(value)
{
  // @member Motion.value
  require(typeof value !== 'undefined');  // disallowed value

  // @method Motion.equals: Equality comparison for Motion objects
  this.equals = function (other) {
    if (isMotion(other))
      return value === other.toString();
    else
      return value === other;
  };

  // @method Motion.copy: Copy this motion object
  this.copy = function () {
    return new Motion(value);
  };

  // @method Motion.toString: String representation of Motion objects
  this.toString = function () {
    return value;
  };

  // @method Motion.toJSON: JSON representation of Motion objects
  this.toJSON = function () {
    return value;
  };

  // @method Motion.fromJSON: Get object from JSON
  this.fromJSON = function (j) {
    value = j;
  };

  this.isMotion = true;
};

function normalizeMotion(move) {
  var norm = { 'r': 'Right', 'l': 'Left', 'h': 'Halt', 's': 'Stop' };

  if (typeof move !== 'undefined' && move.isMotion)
    return move;
  if (typeof move === 'string')
    move = move.toLowerCase();

  if (isIn(move, ['l', 'left']) || move === norm['l'].toLowerCase())
    move = norm['l'];
  else if (isIn(move, ['r', 'right']) || move === norm['r'].toLowerCase())
    move = norm['r'];
  else if (isIn(move, ['s', 'stop']) || move === norm['s'].toLowerCase())
    move = norm['s'];
  else if (isIn(move, ['h', 'halt']) || move === norm['h'].toLowerCase())
    move = norm['h'];
  else
    move = undefined;
  return move;
}

// Test whether or not the given parameter `obj` describes a motion
function isMotion(obj)
{
  return typeof normalizeMotion(obj) !== 'undefined';
}

// Throw exception if `obj` is not a Motion object
function requireMotion(obj)
{
  if (!(isMotion(obj)))
    throw AssertionException("Is not a valid motion: " + obj);
}

// Convenient function to create Motion objects
function motion(m)
{
  var move = normalizeMotion(m);
  require(typeof move !== 'undefined', "Unknown motion " + repr(m));
  return new Motion(move);
}

// Motion values, immutable const
var mot = {
  LEFT  : motion("Left"),
  RIGHT : motion("Right"),
  STOP  : motion("Stop"),
  HALT : motion("Halt")  // implemented, but please do not use
};
