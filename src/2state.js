
// --------------------------------- State --------------------------------

// @object State: State of the Turing machine.
function State(name)
{
  // @member State.name
  require(typeof name !== 'undefined');  // disallowed value

  if (isState(name))
    name = name.toJSON();

  // @method State.equals: Equality comparison for State objects
  this.equals = function (other) {
    return this.toJSON() === other.toJSON();
  };

  // @method State.copy: Return a copy from the current state
  this.copy = function () {
    return new State(name);
  };

  // @method State.toString: String representation of State objects
  this.toString = function () {
    return name.toString();
  };

  // @method State.toJSON: JSON representation of State objects
  this.toJSON = function() {
    return name;
  };

  // @method State.fromJSON: Get object from JSON
  this.fromJSON = function (j) {
    value = j;
  };

  this.isState = true;
}

// Default mapping for arbitrary values to state names
//  will normalize all values to strings
function normalizeState(val) {
  if (val === null || typeof val === 'undefined')
    return ' ';
  val = ("" + val).trim();
  if (val === "")
    return " ";
  else
    return val;
}

// Test whether or not the given parameter `obj` is a State object
function isState(obj)
{
  try {
    return obj.isState === true;
  } catch (e) {
    return false;
  }
}

// Throw exception if `obj` is not a State object
function requireState(obj)
{
  if (!isState(obj))
    throw AssertionException("Is not a valid state: " + obj);
}

// create State instance from `name`
function state(name, norm_fn)
{
  norm_fn = def(norm_fn, normalizeState);

  var value = norm_fn(name);
  require(typeof value !== 'undefined',
    "Cannot create state from " + repr(value));

  return new State(value);
}

