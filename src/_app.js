//
// turingmachine.js
//
// A turing machine web application for educational purposes.
// The main routine is at the end of the document.
//
// Dependencies:
//   - jQuery (tested with 1.11.3)
//
// Remarks:
//   - TODO, NOTE and FEATURE flags are used in the source code.
//   - toJSON and fromJSON can be used to export/import data from every object
//
// Contributions:
// - FelixHOer (design discussion)
// - Martina Tscheckl (zero writer turingmachine)
// - and lots of students and tutors of winter term 2014/15.
// Thank you!
//
// (C) 2013-2015, Public Domain, Lukas Prokop
//

'use strict';

// --------------------------- global variables ---------------------------

var app_name = "turingmachine.js";
var app_version = "1.0.2-gdimod";
var app_author = "Lukas Prokop <admin@lukas-prokop.at>";

// blank symbol for tapes, immutable const
var generic_blank_symbol = '_';

// iterations before possiblyInfinite event is thrown, immutable const
var generic_check_inf_loop = 1000;

// -------------------------------- Helpers -------------------------------

// Default parameters abstraction
function def(arg, val) { return (typeof arg !== 'undefined') ? arg : val; }

// Generic comparison function
function cmp(a, b) { return (a < b) ? -1 : (a === b ? 0 : 1); }

// Get string representation
function toStr(v) { return (v === undefined) ? "" + undefined : v.toString(); }

// Get JSON representation
function toJson(v) { return (v === undefined) ? null : v.toJSON(); }

// Inheritance wrapper
var inherit = function (prot, child, args) {
  require(child !== undefined, "You need to construct objects with the new operator");
  prot.apply(child, args);
  for (var a in args)
    prot = prot.bind({}, args[a]);
  var inst = new prot();
  for (var key in inst) {
    var desc = Object.getOwnPropertyDescriptor(inst, key);
    Object.defineProperty(child, key, desc);
  }
  return inst;
};

// any f(element) of iterable returned true
function any(iter, f) {
  if (iter.length === 0)
    return false;
  return iter.map(f).reduce(
    function (a, b) { return (!!a) || (!!b); }
  );
}

// all f(element) of iterable returned true
function all(iter, f) {
  if (iter.length === 0)
    return true;
  return iter.map(f).reduce(
    function (a, b) { return (!!a) && (!!b); }
  );
}

// Membership test
function isIn(needle, haystack, cmp_fn) {
  cmp_fn = def(cmp_fn, cmp);
  for (var i = 0; i < haystack.length; i++) {
    if (cmp_fn(needle, haystack[i]) === 0)
      return true;
  }
  return false;
}

// Return all keys of given object
var keys = function (obj)
{
  var k = [];
  for (var key in obj)
    k.push(key);
  return k;
}

// Array equivalence
function arrayCmp(array1, array2, cmp_fn) {
  cmp_fn = def(cmp_fn, cmp);
  if (array1.length !== array2.length)
    return cmp(array1.length, array2.length);
  for (var i = 0; i < array1.length; i++) {
    if (cmp_fn(array1[i], array2[i]) < 0)
      return -1;
    else if (cmp_fn(array1[i], array2[i]) > 0)
      return 1;
  }
  return 0;
}

// String repetition as per String.prototype.repeat by ECMAScript 6.0
var repeat = function (str, rep) {
  var result = '';
  for (var i = 0; i < rep; i++)
    result += str;
  return result;
}

// assert statement
function require(cond, msg)
{
  if (!cond)
    throw AssertionException(msg);
}

// user representation which also shows datatype
function repr(value)
{
  if (typeof value === 'string')
    return "'" + value + "'";
  else if (typeof value === 'undefined')
    return 'undefined';
  else if (value === null)
    return 'null';
  else if (typeof value === 'object') {
    if (isState(value))
      return "state<" + value.toString() + ">";
    else if (isSymbol(value))
      return "symbol<" + value.toString() + ">";
    else if (isMotion(value))
      return "motion<" + value.toString() + ">";
    else if (isInstrTuple(value))
      return "instruction<" + value.toString() + ">";
    else if (isPosition(value))
      return "position<" + value.toString() + ">";
    else if (value.isProgram)
      return "program<count=" + value.count() + ">";
    else if (value.isTape)
      return "tape<" + value.toHumanString() + ">";
    else {
      var count_props = 0;
      for (var prop in value)
        count_props += 1;
      if (count_props < 5)
        return "object<" + JSON.stringify(value) + ">";
      else if (!value.toString().match(/Object/))
        return "object<" + value.toString() + ">";
      else
        return "object";
    }
  }
  else if (typeof value === 'boolean')
    return "bool<" + value + ">";
  else if (typeof value === 'number')
    return "" + value;
  else if (typeof value === 'symbol')
    return "symbol<" + value + ">";
  else if (typeof value === 'function') {
    if (value.name === "")
      return "anonymous function";
    else
      return "function<" + value.name + ">";
  } else
    return "unknown value: " + value;
}

// Deep copy implementation
var deepCopy = function (val)
{
  require(!(val instanceof Date));
  if (Array.isArray(val))
    return val.slice().map(function (v) { return deepCopy(v); });
  else if (val === null)
    return null;
  else if (typeof val === 'object') {
    var copy = {};
    for (var attr in val)
      if (val.hasOwnProperty(attr))
        copy[attr] = deepCopy(val[attr]);
    return copy;
  } else if (typeof val === 'function')
    return val;  // no useful way; wait for Function.bind
  else
    // should be immutable value
    return val;
}

// --------------------------- data structures ----------------------------

// a set implementation with ordering
function OrderedSet(initial_values, cmp_fn) {
  cmp_fn = def(cmp_fn, cmp);
  // @member values
  var values = [];

  this._findIndex = function (value) {
    if (values.length === 0)
      return 0;
    else if (cmp_fn(values[values.length - 1], value) === -1)
      return values.length;
    else
      // linear search
      for (var i = 0; i < values.length; i++)
        if (cmp_fn(value, values[i]) < 1)
          return i;
  };

  // @method OrderedSet.push: append some value to the set
  this.push = function (value) {
    var index = this._findIndex(value);
    var found = (index < values.length) && (cmp_fn(values[index], value) === 0);
    if (!found)
      values.splice(index, 0, value);
    return !found;
  };

  // @method OrderedSet.remove: remove some value from the set
  this.remove = function (value) {
    var index = this._findIndex(value);
    if (index < values.length && cmp_fn(values[index], value) === 0) {
      values.splice(index, 1);
      return true;
    } else
      return false;
  };

  // @method OrderedSet.contains: Does this OrderedSet contain this value?
  this.contains = function (value) {
    var idx = this._findIndex(value);
    return idx < values.length && cmp_fn(values[idx], value) === 0;
  };

  // @method OrderedSet.size: Returns size of the set
  this.size = function () {
    return values.length;
  };

  // @method OrderedSet.equals: Do this set equal with the given parameter?
  this.equals = function (other) {
    var o = other.toJSON();
    if (o.length !== values.length)
      return false;
    for (var i = 0; i < o.length; i++) {
      if (cmp_fn(values[i], o[i]) !== 0)
        return false;
    }
    return true;
  };

  // @method OrderedSet.toString: returns OrderedSet in string repr
  this.toString = function () {
    return "set[" + values.join(",") + "]";
  };

  // @method OrderedSet.toJSON: export set into JSON data structure
  this.toJSON = function () {
    return values.slice(0);
  };

  // @method OrderedSet.fromJSON: import set from JSON data structure
  this.fromJSON = function (data) {
    values = data;
  };

  if (typeof initial_values !== 'undefined')
    for (var i = 0; i < initial_values.length; i++)
      this.push(initial_values[i]);
}

// a set implementation
function UnorderedSet(initial_values, cmp_fn) {
  cmp_fn = def(cmp_fn, cmp);
  // @member values
  var values = [];

  // @method UnorderedSet.push: append some value to the set
  this.push = function (value) {
    if (this.contains(value))
      return false;
    values.push(value);
    return true;
  };

  // @method UnorderedSet.remove: remove some value from the set
  this.remove = function (value) {
    for (var i = 0; i < values.length; i++)
      if (cmp_fn(values[i], value) === 0) {
        values.splice(i, 1);
        return true;
      }
    return false;
  };

  // @method UnorderedSet.contains: Does this UnorderedSet contain this value?
  this.contains = function (value) {
    for (var i = 0; i < values.length; i++)
      if (cmp_fn(value, values[i]) === 0)
        return true;
    return false;
  };

  // @method UnorderedSet.size: Returns size of the set
  this.size = function () {
    return values.length;
  };

  // @method UnorderedSet.equals: Do this set equal with the given parameter?
  this.equals = function (other) {
    if (typeof other.toJSON === 'undefined' && typeof other.length !== 'undefined')
      other = new UnorderedSet(other, cmp_fn);
    else if (typeof other !== 'object')
      return false;

    var o = other.toJSON();
    var m = this.toJSON();
    if (o.length !== m.length)
      return false;

    var compare = function (a, b) {
      if (!a.equals)
        return cmp(a, b);
      return (a.equals(b))
        ? 0
        : cmp_fn(a.toString(), b.toString());
    };
    o.sort(compare);
    m.sort(compare);
    for (var i = 0; i < o.length; i++) {
      if (cmp_fn(m[i], o[i]) !== 0)
        return false;
    }
    return true;
  };

  // @method UnorderedSet.toString: returns UnorderedSet in string repr
  this.toString = function () {
    return "uset[" + values.join(",") + "]";
  };

  // @method UnorderedSet.toJSON: export set into JSON data structure
  this.toJSON = function () {
    return values.slice(0).map(function (v) {
      if (v.toJSON)
        return v.toJSON();
      else
        return v;
    });
  };

  // @method UnorderedSet.fromJSON: import set from JSON data structure
  this.fromJSON = function (data) {
    values = data;
  };

  if (typeof initial_values !== 'undefined')
    for (var i = 0; i < initial_values.length; i++)
      this.push(initial_values[i]);
}

// a queue implementation
var Queue = function (initial_values) {
  var values = [];

  this.push = function (val) {
    values.splice(0, 0, val);
  };

  this.pop = function () {
    return values.pop();
  };

  this.clear = function () {
    values = [];
  };

  this.isEmpty = function () {
    return values.length === 0;
  };

  if (typeof initial_values !== 'undefined')
    for (var i = 0; i < initial_values.length; i++)
      this.push(initial_values[i]);
}

// EventRegister adds event handlers and triggers event
var EventRegister = function (valid_events) {
  var events = {};

  // @method EventRegister.add: event listener definition
  //   Call `clbk` at most `max_calls` times whenever `evt` is triggered
  this.add = function (evt, clbk, max_calls) {
    require(clbk, "callback must be given");
    require(evt, "event name must be given");
    max_calls = def(max_calls, Infinity);
    if (valid_events === undefined || isIn(evt, valid_events)) {
      if (typeof events[evt] === 'undefined')
        events[evt] = [];
      events[evt].push([clbk, max_calls]);
    } else
      throw new Error("Unknown event " + evt);
  };

  // @method EventRegister.trigger: trigger event
  //   Trigger event `evt` and call `clbk` with the result of every event handler
  this.trigger = function (evt) {
    var args = [];
    for (var i = 1; i < arguments.length; i++)
      args.push(arguments[i]);

    for (var e = 0; events[evt] !== undefined && e < events[evt].length; e++) {
      var event_listener = events[evt][e][0];
      events[evt][e][1] -= 1;
      if (events[evt][e][1] === 0)
        events[evt].splice(e, 1);
      setTimeout(function (event_listener, events_evt, args) {
        return function () {
          event_listener.apply(events_evt, args);
        };
      }(event_listener, events[evt], args), 10);
    }
  };

  // @method EventRegister.clear: clear all registered event callbacks
  this.clear = function () {
    events = {};
  };

  // @method EventRegister.toString: string representation
  this.toString = function () {
    var out = "EventRegister with\n";
    var keys = Object.getOwnPropertyNames(events);
    for (var e in keys) {
      var len = events[keys[e]].length;
      out += "  " + keys[e] + " slot with " + len + " callback(s)\n";
    }
    if (keys.length === 0)
      out += "  no events\n";
    return out;
  };
}

// ------------------------------ exceptions ------------------------------

// @exception thrown if number of undos exceeds history size
function OutOfHistoryException(step_id)
{
  var err = new Error();
  err.name = "OutOfHistoryException";
  err.message = "Cannot step any further back in history "
      + "(bounds are 0 and history_size).";
  err.stack = (new Error()).stack;
  Error.call(err);
  if (typeof console.trace === 'function')
    console.trace();
  return err;
}

// @exception thrown, if an assertion goes wrong
function AssertionException(msg)
{
  var err = new Error();
  err.name = "AssertionException";
  err.message = msg
    ? "Condition is not satisfied: \n" + msg
    : "Condition not satisfied";
  err.stack = (new Error()).stack;
  Error.call(err);
  if (typeof console.trace === 'function')
    console.trace();
  return err;
}

// @exception thrown, if invalid JSON data is given
function SyntaxException(msg)
{
  var err = new Error();
  err.name = "SyntaxException";
  err.message = msg;
  err.stack = (new Error()).stack;
  Error.call(err);
  if (typeof console.trace === 'function')
    console.trace();
  return err;
}

