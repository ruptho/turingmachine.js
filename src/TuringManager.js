// ---------------------------- TuringManager -----------------------------

// A turing market holds JSON data of various markets, where the JSON
// represents programs, testcases, etc

var TuringManager = function (default_market, markets, ui_notes, ui_tm, ui_meta, ui_data) {
  // @member TuringManager.default_market: the market used per default

  // UI elements
  var ui_programs = ui_meta.find("select.example");
  var ui_testcases = ui_meta.find("select.testcase");
  var ui_transitiontable = ui_data.find(".transition_table");

  // @callback programLoading(program)
  //   [invoked when the market is about to load]
  // @callback programVerified(program, verification_report)
  //   [invoked whenever the market is verified]
  // @callback programReady(program, data)
  //   [invoked whenever the validated market is available]
  // @callback programActivated(program, data)
  //   [invoked whenever TuringManager.activateProgram(program) was invoked]
  // @callback testcaseActivated(testcase, testcase_data)
  //   [invoked whenever TuringManager.activateTestcase(testcase) was invoked]

  // @member TuringManager.events: EventRegister for events of this object
  var events = new EventRegister([
    'programLoading', 'programVerified', 'programReady',
    'programActivated', 'testcaseActivated'
  ]);

  // @member TuringManager.programs: The actual loaded markets
  var programs = {};

  // @member TuringManager.auto_activate_program:
  //    markets to activate after calling activateWhenReady with a program
  var autoactivate_program = {};

  // @member TuringManager.auto_activate_testcase:
  //    markets to activate after calling activateWhenReady with a testcase
  var autoactivate_testcase = {};

  // @member TuringManager.last_activated: last activated program
  var last_activated = '';

  // @member TuringManager.loading_timeout: maximum loading timeout
  var loading_timeout = 7000;


  // @method TuringManager._normId: Split an identifier
  this._normId = function (id) {
    // TODO: fails if testcase name contains "/"
    require(id, "Market identifier must not be undefined");
    if (id.indexOf(':') === -1 && id.indexOf('/') === -1)
      return [default_market, id, undefined];
    else if (id.indexOf(':') === -1) {
      var parts = id.split('/');
      return [default_market, parts[0], parts[1]];
    } else if (id.indexOf('/') === -1) {
      var parts = id.split(':');
      return [parts[0], parts[1], undefined];
    } else {
      var parts1 = id.split(':');
      var parts2 = parts1[1].split('/');
      return [parts1[0], parts1[0], parts1[1]];
    }
  };

  // @method TuringManager.addEventListener: event listener definition
  this.addEventListener = function (evt, callback, how_often) {
    return events.add(evt, callback, how_often);
  };

  // @method TuringManager.triggerEvent: trigger event
  this.triggerEvent = function (evt) {
    return events.trigger.apply(this, arguments);
  };

  // @method TuringManager.loaded: Was given program loaded?
  this.loaded = function (program_id) {
    var id = this._normId(program_id).slice(0, 2).join(":");
    return programs[id] !== undefined;
  };

  // @method TuringManager.get: Get the defined program (or undefined)
  this.get = function (program_id) {
    var id = this._normId(program_id).slice(0, 2).join(":");
    return programs[id];
  };

  // @method TuringManager.get: Get the title of the last activated program (or null)
  this.getActivated = function () {
    if (this.last_activated)
      return this.last_activated;
    else
      return null;
  };

  // @method TuringManager.add: Synchronously add a market
  this.add = function (program_id, data) {
    var normalized = this._normId(program_id);
    var id = normalized.slice(0, 2).join(":");
    require(normalized[2] === undefined, "ID must not refer to a testcase");

    this.triggerEvent('programLoading', id);
    var report = verifyProgram(data);
    this.triggerEvent('programVerified', id, report);
    if (report)
      return false;

    programs[id] = data;
    this.triggerEvent('programReady', id, data);

    if (autoactivate_program[id])
      this.activateProgram(id);
    else if (autoactivate_testcase[id] && autoactivate_testcase[id].length > 0)
      for (var i = 0; i < autoactivate_testcase[id].length; i++)
        this.activateTestcase(autoactivate_testcase[id][i]);
  };

  // @method TuringManager.load: Asynchronously add a market
  this.load = function (program_id) {
    var normalized = this._normId(program_id);
    var id = normalized.slice(0, 2).join(":");
    var market = normalized[0];
    var program = normalized[1];
    var self = this;

    if (programs[id] !== undefined) {
      console.warn(id + " already loaded");
      return;
    }

    this.triggerEvent('programLoading', id);

    var loaded = false;
    setTimeout(function () {
      if (!loaded)
        console.error("seems like " + id + " was not loaded in time");
    }, loading_timeout);

    $.get("" + markets[market] + program + ".json", function (data) {
      loaded = true;
      console.info("program " + id + " was loaded");

      // verify data
      var report = verifyProgram(data);
      self.triggerEvent('programVerified', id, report);
      if (report) {
        console.warn("Program " + id + " is not correctly formatted");
        console.debug(report);
        return;
      }

      // set ready
      programs[id] = data;
      self.triggerEvent('programReady', id, data);

      if (autoactivate_program[id])
        self.activateProgram(id);
      else if (autoactivate_testcase[id] && autoactivate_testcase[id].length > 0)
        for (var i = 0; i < autoactivate_testcase[id].length; i++)
          self.activateTestcase(autoactivate_testcase[id][i]);
    }, "json");
  };

  // @method TuringManager.activateWhenReady: The next time the given market
  //   is available, activate it
  this.activateWhenReady = function (program_id) {
    var normalized = this._normId(program_id);
    var program_id = normalized.slice(0, 2).join(":");
    var testcase_id = normalized.slice(0, 3).join(":");

    if (normalized[2] === undefined) {
      // refers to program
      if (programs[program_id] !== undefined)
        this.activateProgram(program_id);
      else
        autoactivate_program[program_id] = true;
    } else {
      // refers to testcase
      if (programs[program_id] !== undefined)
        this.activateTestcase(testcase_id);
      else
        autoactivate_testcase[program_id].push(testcase_id);
    }
  };

  // @method TuringManager.activateProgram: Activate a given program
  //   meaning a programActivated event will be fired and the
  //   program JSON will be passed over
  this.activateProgram = function (program_id) {
    var normalized = this._normId(program_id);
    var id = normalized.slice(0, 2).join(":");
    require(normalized[2] === undefined,
      "Market ID must refer to program, not testcase");

    require(programs[id] !== undefined, "Program " + id
      + " is not yet available");

    this.triggerEvent('programActivated', id, programs[id]);
    autoactivate_program[id] = false;
  };

  // @method TuringManager.activateTestcase: Activate a given testcase
  //   meaning a testcaseActivated event will be fired and the
  //   testcase JSON will be passed over
  this.activateTestcase = function (testcase_id) {
    var normalized = this._normId(testcase_id);
    var program_id = normalized.slice(0, 2).join(":");
    var testcase_id = normalized.slice(0, 3).join(":");
    require(normalized[2] !== undefined,
      "Market ID must refer to testcase, not program");

    require(programs[program_id] !== undefined, "Program " + program_id
      + " is not yet available");

    var data = undefined;
    for (var i = 0; i < programs[program_id]['testcases']; i++)
      if (programs[program_id]['testcases'][i]['title'] === normalized[2])
        data = programs[program_id]['testcases'][i];
    require(data !== undefined, "Testcase " + testcase_id
      + " not found in program " + program_id);

    this.triggerEvent('testcaseActivated', testcase_id, data);
    autoactivate_testcase[program_id] = autoactivate_testcase[program_id].filter(
      function (v) { return v !== testcase_id; }
    );
  };

  var self = this;
  this.addEventListener('programActivated', function (program_id, data) {
    self.last_activated = program_id;
  });
};


