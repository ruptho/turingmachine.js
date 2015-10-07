// ------------------------- AnimatedTuringMachine ------------------------

function defaultAnimatedTuringMachine(symbol_norm_fn, state_norm_fn,
                                      gear_viz, num_viz, ui_tm, ui_meta, ui_data, ui_notes)
{
    symbol_norm_fn = def(symbol_norm_fn, normalizeSymbol);
    state_norm_fn = def(state_norm_fn, normalizeState);

    var s = function (v) { return state(v, state_norm_fn) };

    return new AnimatedTuringMachine(defaultProgram(),
        defaultUserFriendlyTape(symbol_norm_fn),
        [s("End"), s("Ende")], s("Start"), gear_viz, num_viz,
        ui_tm, ui_meta, ui_data, ui_notes);
}

// @object AnimatedTuringMachine: A visualized TuringMachine

var AnimatedTuringMachine = function (program, tape, final_states,
                                      initial_state, gear, numbers, ui_tm, ui_meta, ui_data, ui_notes)
{
    // @member AnimatedTuringMachine.gear: Animation of gear
    // @member AnimatedTuringMachine.numbers: Animation of numbers

    // TODO: must support any arbitrary number of values to visualize

    ui_tm = $(ui_tm);
    ui_meta = $(ui_meta);
    ui_data = $(ui_data);
    ui_notes = $(ui_notes);

    require(ui_tm.length !== 0, "unknown " + ui_tm.selector);
    require(ui_meta.length !== 0, "unknown " + ui_meta.selector);
    require(ui_data.length !== 0, "unknown " + ui_data.selector);
    require(ui_notes.length !== 0, "unknown " + ui_notes.selector);

    // @member AnimatedTuringMachine.tm: Machine instance
    var tm = inherit(RunningTuringMachine, this, arguments);

    // @member AnimatedTuringMachine.events: Event register
    var events = new EventRegister([
        'loadState', 'valueWritten', 'movementFinished', 'stateUpdated',
        'transitionFinished', 'outOfHistory', 'undefinedInstruction',
        'finalStateReached', 'startRun', 'stopRun'
    ]);

    // @member AnimatedTuringMachine.speed: Animation speed
    var speed = 2000;

    // @member AnimatedTuringMachine.speed_limit: if speed<=speed_limit,
    //   animation behaves like no animation
    var speed_limit = 200;

    // @member AnimatedTuringMachine.animation_enabled: Disable/enable animation
    var animation_enabled = true;

    // @member AnimatedTuringMachine.ui_settings: UI settings
    var ui_settings = {
        'steps_back' : 1,
        'steps_continue' : 1
    };

    // @member AnimatedTuringMachine.self: current instance
    var self = this;

    // @callback loadState(machine name, tape, current state, final states)
    //   [triggered when finished initialization or dump import]
    // @callback valueWritten(old value, new value, position relative to cursor)
    //   [triggered whenever some value on the tape changed]
    // @callback movementFinished(move) [triggered whenever cursor moved]
    // @callback stateUpdated(old state, new state, new state is a final state)
    //   [triggered whenever the current state changed]
    // @callback transitionFinished(old value, old state, new value, movement,
    //   new state, step id, undefined instruction is given for next transition,
    //   a final state has been reached)
    //   [triggered whenever the execution state after some transition has been
    //   reached]
    // @callback outOfHistory(step id) [triggered when running out of history]
    // @callback test_undefinedInstruction(read symbol, state) [triggered whenever some
    //   instruction was not found]
    // @callback test_finalStateReached(state) [triggered whenever some final state
    //   has been reached]
    // @callback startRun() [triggered whenever first transition of a Run]
    // @callback stopRun() [stop running]

    // @member AnimatedTuringMachine.valid_events
    // @member AnimatedTuringMachine.events
    var valid_events = ['loadState', 'valueWritten', 'movementFinished',
        'stateUpdated', 'transitionFinished', 'outOfHistory',
        'test_undefinedInstruction', 'test_finalStateReached', 'startRun', 'stopRun'];
    var events = new EventRegister(valid_events);

    // @method AnimatedTuringMachine.addEventListener: event listener definition
    this.addEventListener = function (evt, callback, how_often) {
        return events.add(evt, callback, how_often);
    };

    // @method AnimatedTuringMachine.triggerEvent: trigger event
    this.triggerEvent = function (evt) {
        return events.trigger.apply(this, arguments);
    };

    // @method AnimatedTuringMachine._triggerTapeInstruction:
    //   trigger events corresponding to a tape instruction
    this._triggerTapeInstruction = function (ins) {
        if (ins[0] === "w") {
            this.triggerEvent('valueWritten', ins[1], ins[2],
                this.getCursor().diff(position(0)));
        } else if (typeof ins === 'number' && ins[0] < 0) {
            for (var i = 0; i < Math.abs(ins[0]); i++)
                this.triggerEvent('movementFinished', mot.LEFT);
        } else if (typeof ins === 'number' && ins[0] > 0) {
            for (var i = 0; i < ins[0]; i++)
                this.triggerEvent('movementFinished', mot.RIGHT);
        } else if (typeof ins === 'number' && ins[0] === 0)
        {}
        else
            throw AssertionException("Unknown instruction");
    };

    // @method AnimatedTuringMachine._triggerStateUpdated
    this._triggerStateUpdated = function (old_state) {
        this.triggerEvent('stateUpdated', old_state, this.getState(),
            this.isAFinalState(this.getState()));
    };

    // @method AnimatedTuringMachine._triggerTransitionFinished
    this._triggerTransitionFinished = function (old_value, old_state, new_value,
                                                mov, new_state, step)
    {
        new_value = def(new_value, tape.read());
        mov = def(mov, mot.STOP);
        new_state = def(new_state, this.getState());
        step = def(step, this.getStep());

        this.triggerEvent('transitionFinished', old_value, old_state, new_value,
            mov, new_state, step, undefinedInstruction());
    };

    // @method AnimatedTuringMachine._triggerOutOfHistory
    this._triggerOutOfHistory = function (step) {
        step = def(step, this.getStep());
        this.triggerEvent('outOfHistory', step);
    };

    // @method AnimatedTuringMachine._triggerLoadState
    this._triggerLoadState = function (tap, stat) {
        tap = def(tap, tape.toJSON());
        stat = def(stat, deepCopy(this.getState()));
        step_id = 0;
        this.triggerEvent('loadState', deepCopy(this.getMachineName()),
            deepCopy(tap), stat, deepCopy(this.getFinalStates()));
    };

    // HELPERS

    // @method AnimatedTuringMachine._initialize:
    //   Initialize this turingmachine
    this._initialize = function () {
        self.addEventListener('loadState', function () { self.syncToUI() }.bind(self));
        self.addEventListener('transitionFinished', function () {
            // potentially trigger finalStateReached / undefinedInstruction
            if (self.isAFinalState(self.getState()))
                self.triggerEvent('test_finalStateReached', self.getState().toJSON());
            else if (self.undefinedInstruction())
                self.triggerEvent('test_undefinedInstruction', self.getTape().read().toJSON(),
                    self.getState().toJSON());

            // update tape tooltip
            ui_tm.find(".drawings .numbers .value").attr("title", self.getTape().toHumanString());
        });
    };

    // @method AnimatedTuringMachine._triggerLoadState:
    //   trigger loadState event
    this._triggerLoadState = function () {
        this.triggerEvent('loadState',
            this.getMachineName(), this.getTape().toJSON(),
            this.getState(), this.getFinalStates());
    };

    // @method AnimatedTuringMachine._triggerLoadState:
    //   if locked, throw error that TM is locked
    this._lockingCheck = function (action) {
        if (this.locked()) {
            action = def(action, "proceed");
            console.warn("Trying to " + action + " but turing machine is locked");
            console.trace();
            throw new Error("Trying to " + action + " but turing machine is locked");
        }
        return true;
    };

    // @method AnimatedTuringMachine._updateStateInUI: update the state on the UI
    this._updateStateInUI = function (state, is_final, is_undefined, undefined_symbol) {
        require(isState(state));
        require(is_final === true || is_final === false, "is_final must be boolean");
        require(is_undefined === true || is_undefined === false, "is_undefined must be boolean");
        require(!is_undefined || isSymbol(undefined_symbol), "Undefined symbol " + repr(undefined_symbol));

        var element = ui_tm.find(".state");
        var text = state.toJSON();
        var new_size = parseInt((-4.0 / 11) * text.length + 22);
        if (new_size < 12)
            new_size = 12;
        else if (new_size > 20)
            new_size = 20;

        // set text
        element.text(text);

        // set font-size
        element.css("font-size", new_size + "px");

        // reset
        element.removeClass("undefined");
        element.removeClass("final");
        element.attr("title", "");

        if (is_final) {
            element.addClass("final");
            element.attr("title", "Final state " + toStr(state) + " reached");

        } else if (is_undefined) {
            element.addClass("undefined");
            element.attr("title", "No instruction defined for symbol "
                + toStr(undefined_symbol) + " and state " + toStr(state));
        }
    };

    // SETTINGS

    // @method AnimatedTuringMachine.addEventListener: event listener definition
    this.addEventListener = function (evt, callback, how_often) {
        return events.add(evt, callback, how_often);
    };

    // @method AnimatedTuringMachine.triggerEvent: trigger event
    this.triggerEvent = function (evt) {
        return events.trigger.apply(this, arguments);
    };

    // @method AnimatedTuringMachine.enableAnimation
    this.enableAnimation = function () {
        animation_enabled = true;
    };

    // @method AnimatedTuringMachine.disableAnimation
    this.disableAnimation = function () {
        animation_enabled = false;
    };

    // @method AnimationTuringMachine.isAnimationEnabled
    this.isAnimationEnabled = function () {
        return animation_enabled;
    };

    // @method AnimatedTuringMachine.speedUp: Increase speed
    this.speedUp = function () {
        if (speed <= 200)
            return false;
        speed = parseInt(speed / 1.2);
        gear.setSpeed(speed);
        numbers.setSpeed(speed);
        this.triggerEvent('speedUpdated', speed);
        return true;
    };

    // @method AnimatedTuringMachine.speedDown: Decrease speed
    this.speedDown = function () {
        speed = parseInt(speed * 1.2);
        gear.setSpeed(speed);
        numbers.setSpeed(speed);
        this.triggerEvent('speedUpdated', speed);
        return true;
    };

    // GUI helpers

    // @method AnimatedTuingMachine.alertNote: write note to the UI as user notification
    this.alertNote = function (note_text) {
        var ui_notes = $("#notes");

        note_text = "" + note_text;

        var note = $('<p></p>').addClass("note").text(note_text);
        ui_notes.show();
        ui_notes.append(note);

        setTimeout(function () {
            if (ui_notes.find(".note").length === 1)
                ui_notes.fadeOut(1000);
            note.fadeOut(1000);
            note.remove();
        }, 5000);
    };

    // @method AnimatedTuingMachine.addExampleProgram: add an example program. The program is
    //   defined by program_id and the program is represented in data
    this.addExampleProgram = function (program_id, data) {
        require(program_id && data);

        try {
            var option = $("<option></option>").attr("value", program_id).text(data['title']);
            ui_meta.find(".example option[data-none]").remove();

            var added = false;
            ui_meta.find(".example option").each(function () {
                var old = $(this).text().match(/^(\d+)/);
                var ref = data.title.match(/^(\d+)/);

                if (added)
                    return;

                if ((old && ref && parseInt(old[1]) > parseInt(ref[1])) ||
                    ($(this).text() > data.title))
                {
                    $(this).before(option);
                    added = true;
                    return;
                }
            });
            if (!added)
                ui_meta.find(".example").append(option);
        } catch (e) {
            console.error(e);
            this.alertNote(e.message);
        }
    };

    // @method AnimatedTuingMachine.updateTestcaseList:
    //   update the list of testcase for this new program
    this.updateTestcaseList = function (_, data) {
        try {
            ui_meta.find(".testcase option").remove();
            if (!data['testcases'] || data['testcases'].length === 0) {
                var option = $("<option></option>").text("no testcase available");
                ui_meta.find(".testcase").append(option);
            }
            else {
                for (var tc = 0; tc < data['testcases'].length; tc++) {
                    var o = $("<option></option>").text(data['testcases'][tc]['name']);
                    ui_meta.find(".testcase").append(o);
                }
            }

            ui_meta.find(".example option[selected]").prop("selected", false);
            ui_meta.find(".example option").each(function () {
                if ($(this).text() === data['name'])
                    $(this).prop("selected", true);
            });
        } catch (e) {
            console.error(e);
            this.alertNote(e.message);
        }
    };

    // @method AnimatedTuingMachine.showRunningControls: show additional (like 'interrupt')
    //   controls when tm is "running"
    this.showRunningControls = function () {
        try {
            ui_tm.find('.controls .interrupt').show();
        } catch (e) {
            console.error(e);
            this.alertNote(e.message);
        }
    };

    // @method AnimatedTuingMachine.hideRunningControls:
    //   hide additional controls when tm has stopped
    this.hideRunningControls = function () {
        try {
            ui_tm.find('.controls .interrupt').hide();
        } catch (e) {
            console.error(e);
            this.alertNote(e.message);
        }
    };

    // @method AnimatedTuingMachine.setDescriptionText: set the marked-up description text
    this.setDescriptionText = function (description) {
        ui_meta.find(".description_text").empty();
        markup(ui_meta.find(".description_text"), description);
    };

    // @method AnimatedTuingMachine.setDescriptionTitle: set the title of the description
    this.setDescriptionTitle = function (title) {
        var m = title.match(/^(\d+) - (.*)$/);
        if (m) {
            ui_meta.find(".description_title").text(m[2]);
            ui_meta.find(".description_title").attr("title", "with difficulty " + m[1]);
        } else {
            ui_meta.find(".description_title").text(title);
            ui_meta.find(".description_title").attr("title", '');
        }
    };

    // @method AnimatedTuingMachine.setVersion: set the version identifier for the program
    this.setVersion = function (version) {
        ui_meta.find(".description_version span").text(version);
    };

    // @method AnimatedTuingMachine.verifyUIsync: Verify that UI and TM are synchronized
    this.verifyUIsync = function () {
        // verify animation state
        var anen = !ui_tm.find("input[name='wo_animation']").is(":checked");
        require(app.tm().isAnimationEnabled() === anen);

        // verify numbers
        var ui_vals = app.tm().getNumbersFromUI();
        var tm_vals = app.tm().getTape().read(undefined, 7).map(toJson).map(toStr); // TODO non-static 7

        require(ui_vals.length === tm_vals.length);
        for (var i = 0; i < ui_vals.length; i++)
            require(ui_vals[i] === tm_vals[i]);

        // verify state
        require(toStr(toJson(app.tm().getState())) === ui_tm.find(".state").text());

        // ignore steps count

        // verify machine name
        require(app.tm().getMachineName() === ui_meta.find(".machine_name").val());

        // verify 'Load tape'
        var ui_tape = ui_data.find(".tape").val();
        var tm_tape = app.tm().getTape().toHumanString();
        // REMARK this is not a well-defined equality. Damn it.
        require(ui_tape === tm_tape);

        // verify 'Final states'
        var fs_string = ui_data.find(".final_states").val();
        var ui_final_states = fs_string.split(/\s*,\s*/)
            .map(function (s) { return state(s); });  // TODO: normalization function missing
        var tm_final_states = app.tm().getFinalStates();

        require(ui_final_states.length === tm_final_states.length);
        for (var i = 0; i < ui_final_states.length; i++)
            require(ui_final_states[i].equals(tm_final_states[i]));

    };


    // @method AnimatedTuingMachine.readTransitionTable: load for testing system
    this.readTransitionTable = function () {
        return this.getProgram().toJSON();
    };


    // API

    // @method AnimatedTuringMachine.initializeGUI:
    //   attach events to methods of this instance
    this.initializeGUI = function () {
        this.addEventListener('startRun', function () { self.showRunningControls(); });
        this.addEventListener('stopRun', function () { self.hideRunningControls(); });

        // UI events
        /// UI events - controls
        ui_tm.find(".control_next").click(function () {
            try {
                var how_many_steps = parseInt(ui_tm.find(".steps_next").val());
                if (isNaN(how_many_steps)) {
                    self.alertNote("Invalid steps count given. Assuming 1.");
                    how_many_steps = 1;
                }
                self.next(how_many_steps);
            } catch (e) {
                self.alertNote(e.message);
            }
        });
        ui_tm.find(".control_prev").click(function () {
            try {
                var how_many_steps = parseInt(ui_tm.find(".steps_prev").val());
                if (isNaN(how_many_steps)) {
                    self.alertNote("Invalid steps count given. Assuming 1.");
                    how_many_steps = 1;
                }
                self.prev(how_many_steps);
            } catch (e) {
                self.alertNote(e.message);
            }
        });
        ui_tm.find(".control_slower").click(function () {
            try {
                if (self.speedDown())
                    self.alertNote("Animation speed updated");
                else
                    self.alertNote("I think this is slow enough. Sorry!");
            } catch (e) {
                self.alertNote(e.message);
            }
        });
        ui_tm.find(".control_faster").click(function () {
            try {
                if (self.speedUp())
                    self.alertNote("Animation speed updated");
                else
                    self.alertNote("I think this is fast enough. Sorry!");
            } catch (e) {
                self.alertNote(e.message);
            }
        });
        ui_tm.find(".control_reset").click(function () {
            try {
                self.reset();
            } catch (e) {
                self.alertNote(e.message);
            }
        });
        ui_tm.find(".control_run").click(function () {
            try {
                if (!self.run(ui_tm, tm))
                    self.alertNote("Could not start run of turingmachine. Is it running already?");
            } catch (e) {
                self.alertNote(e.message);
            }
        });
        ui_tm.find(".control_interrupt").click(function () {
            try {
                if (!self.interrupt(ui_tm, tm))
                    self.alertNote("Could not interrupt. It is not running.");
            } catch (e) {
                self.alertNote(e.message);
            }
        });

        ui_tm.find("input[name=wo_animation]").change(function () {
            try {
                if ($(this).is(":checked")) {
                    self.disableAnimation();
                    self.alertNote("Turning off animations");
                } else {
                    self.enableAnimation();
                    self.alertNote("Turning on animations");
                }
            } catch (e) {
                self.alertNote(e.message);
            }
        });

        /// UI events - overlay, import, export
        var toggle_overlay = function () {
            try {
                if (!$("#overlay").is(':visible')) {
                    $("#overlay").show(100);
                    $("#overlay_text").delay(150).show(400);
                } else {
                    $("#overlay").delay(200).hide(100);
                    $("#overlay_text").hide(200);
                }
            } catch (e) {
                self.alertNote(e.message);
            }
        };
        var export_tm = function (format) {
            var text;
            if (format === "json")
                text = JSON.stringify(self.toJSON(),null,2);
            else
                text = foswiki.write(self);
            $("#overlay_text .data").val("" + text);
        };
        var import_tm = function (text, format) {
            require(!!text, "text must not be empty");

            // read data
            var data;
            try {
                if (format === "json")
                    data = JSON.parse(text);
                else
                // TODO: normalization functions as parameter: symbol_norm_fn, state_norm_fn
                    data = foswiki.read(self, text);
                self.alertNote("Input data parsed. Continue with import.");
                $("#overlay").click();
            } catch (e) {
                self.alertNote("Failed to parse given input: " + e.message
                    + ". Import aborted.");
                if (format === "json" && text.substr(0, 7) === "   $ __")
                    self.alertNote("Seems to be Foswiki syntax. Please select Foswiki.");
                if (format === "foswiki" && text.substr(0, 2) === '{"')
                    self.alertNote("Seems to be JSON syntax. Please select JSON.");
                console.debug(e);
                return;
            }

            // try to import it
            try {
                if (data)
                    app.tm().fromJSON(data);
                app.tm().setInitialTape(app.tm().getTape().toJSON());
                app.tm().syncToUI();
                self.alertNote("Import of " + format + " succeeded.");
            } catch (e) {
                self.alertNote("Import failed. Seems like invalid data was provided.");
                console.debug(e);
                return;
            }
        };


        $("#overlay").click(toggle_overlay);

        ui_tm.find(".import_button").click(function () {
            try {
                toggle_overlay();

                $("#overlay_text .action").text("Import");
                $("#overlay_text .data").attr("readonly", false).val("");
                $("#overlay_text .import").show();
                $("#overlay_text .js-clipboard").hide();
            } catch (e) {
                console.error(e);
                self.alertNote(e.message);
            }
        });
        $("#overlay_text .import").click(function () {
            try {
                var data = $("#overlay_text .data").val();
                var format = $("#overlay_text .export_format").val();
                import_tm(data, format);
            } catch (e) {
                console.error(e);
                self.alertNote(e.message);
            }
        });

        $("#overlay_text .js-clipboard").click(function () {
            try {
                var data = $("#overlay_text .data");
                data.get()[0].select();

                try {
                    var successful = document.execCommand('copy');
                } catch (err) {
                    alert('Oops, unable to copy to clipboard. Press Ctrl/Cmd+C to copy.');
                }
            } catch (e) {
                console.error(e);
                self.alertNote(e.message);
            }
        });

        ui_tm.find(".export_button").click(function () {
            try {
                toggle_overlay();

                $("#overlay_text .action").text("Export");
                $("#overlay_text .data").attr("readonly", true);
                $("#overlay_text .import").hide();
                $("#overlay_text .js-clipboard").show();

                export_tm($("#overlay_text").find(".export_format").val());
            } catch (e) {
                console.error(e);
                self.alertNote(e.message);
            }
        });
        $("#overlay_text .export_format").change(function () {
            try {
                var is_export = $("#overlay_text .action").text().indexOf("Export") !== -1;
                if (is_export)
                    export_tm($("#overlay_text").find(".export_format").val());
            } catch (e) {
                console.error(e);
                self.alertNote(e.message);
            }
        });

        /// UI events - meta
        ui_meta.find(".machine_name").change(function () {
            try {
                var new_name = ui_meta.find(".machine_name").val().trim();
                self.setMachineName(new_name);

                self.alertNote("Machine name updated to '" + new_name + "'!");
            } catch (e) {
                console.error(e);
                self.alertNote(e.message);
            }
        });

        /// UI events - data
        ui_data.find(".tape_load").click(function () {
            try {
                self.getTape().fromHumanString(ui_data.find(".tape").val());
                self.setInitialTape(self.getTape().toJSON());
                self.syncToUI();

                self.alertNote("Tape updated!");
            } catch (e) {
                console.error(e);
                self.alertNote(e.message);
            }
        });

        ui_data.find(".final_states_load").click(function () {
            try {
                var fs_string = ui_data.find(".final_states").val();
                var ui_fs = fs_string.split(/\s*,\s*/).filter(function (v) { return !!v });
                // TODO: normalization function missing:
                var fs = ui_fs.map(function (s) { return state(s); });

                self.setFinalStates(fs);
                self._updateStateInUI(self.getState(), self.finalStateReached(),
                    self.undefinedInstruction(), self.getTape().read());

                if (fs.length === 0)
                    self.alertNote("No final states? This won't play nicely");
                else if (fs.length === 1)
                    self.alertNote("Final state '" + ui_fs[0] + "' set");
                else if (fs.length > 1)
                    self.alertNote("Final states '" + ui_fs.slice(0, -1).join("', '")
                        + "' and '" + ui_fs[ui_fs.length - 1] + "' set");
            } catch (e) {
                console.error(e);
                self.alertNote(e.message);
            }
        });

        ui_data.find(".copy_last_line").click(function () {
            try {
                var rows = self.readTransitionTable();
                var row = rows[rows.length - 1];

                self.addNewTransitionTableRow();
                var prelast = ui_data.find(".transition_table tbody tr").eq(-2);
                self.writeTransitionTableRow(row, prelast);
            } catch (e) {
                console.error(e);
                self.alertNote(e.message);
            }
        });

        // JS events
        this.addEventListener('startRun', function () {
            self.showRunningControls();
        });
        this.addEventListener('stopRun', function () {
            self.hideRunningControls();
        });
    };

    // @method AnimatedTuringMachine.getNumbersFromViz:
    //   get numbers from NumberVisualization
    this.getNumbersFromUI = function () {
        return numbers.getNumbers();
    };

    // @method AnimatedTuringMachine.getCurrentTapeSymbols:
    //   get `count` current tape symbols
    this.getCurrentTapeSymbols = function (count) {
        count = parseInt(count);
        require(!isNaN(count));
        var selection = this.getTape().read(undefined, count);

        require(selection.length === count,
            "Bug: Size of selected elements invalid");

        return selection;
    };

    this._stopRun = function () { this.triggerEvent('stopRun'); };
    this._startRun = function () { this.triggerEvent('startRun'); };

    // @method AnimatedTuringMachine.prev: Undo one step
    this.iteratePrevious = function (done) {
        if (!self._lockingCheck('undo one step'))
            return;

        self.lock();
        try {
            var r = tm.back(1)[0];
        } catch (e) {
            if (e.name === 'OutOfHistoryException') {
                this.alertNote("Cannot go back any further in history");
                self.release();
                return false;
            } else {
                console.error(e);
                this.alertNote(e.message);
                return false;
            }
        }

        var old_value = r[0];
        var old_state = r[1];
        var new_value = r[2];
        var move = r[3];
        var new_state = r[4];
        var step_id = r[5];
        var undefined_instruction = r[6];
        var final_state_reached = r[7];

        var finalize = function () {
            self.release();
            done.call(self);
        };

        var initiateNumberWrite = function () {
            numbers.addEventListener('writeFinished', function () {
                var rel_pos = move.equals(mot.LEFT) ? -1 : 0;
                rel_pos = move.equals(mot.RIGHT) ? 1 : rel_pos;
                self.triggerEvent('valueWritten', old_value, new_value, rel_pos);
                setTimeout(finalize, 30);
            }, 1);

            var new_str_value = toStr(toJson(new_value));
            if (!animation_enabled || speed < speed_limit)
                numbers.writeNumberFast(new_str_value);
            else
                numbers.writeNumber(new_str_value);
        };

        var initiateNumberMotionAndGearMove = function () {
            numbers.addEventListener('moveFinished', function () {
                self.triggerEvent('movementFinished', move);
                setTimeout(initiateNumberWrite, 30);
            }, 1);

            // TODO: non-static 7/9
            if (!animation_enabled || speed < speed_limit) {
                if (move.equals(mot.LEFT))
                    numbers.moveLeftFast(toStr(toJson(self.getTape().read(undefined, 9)[1])));
                else if (move.equals(mot.RIGHT))
                    numbers.moveRightFast(toStr(toJson(self.getTape().read(undefined, 9)[7])));
                else if (move.equals(mot.HALT) || move.equals(mot.STOP))
                    numbers.moveNot();
            } else {
                if (move.equals(mot.LEFT))
                    numbers.moveLeft(toStr(toJson(self.getTape().read(undefined, 9)[1])));
                else if (move.equals(mot.RIGHT))
                    numbers.moveRight(toStr(toJson(self.getTape().read(undefined, 9)[7])));
                else if (move.equals(mot.HALT) || move.equals(mot.STOP))
                    numbers.moveNot();
            }

            // TODO: move gear
        };

        var initiateStateUpdate = function () {
            self._updateStateInUI(new_state, final_state_reached, undefined_instruction, new_value);
            self.triggerEvent('stateUpdated', old_state, new_state, final_state_reached);
            self.triggerEvent('transitionFinished', old_value, old_state, new_value,
                move, new_state, step_id, undefined_instruction, final_state_reached);

            initiateNumberMotionAndGearMove();
        };

        setTimeout(initiateStateUpdate, 30);
    };

    // @method AnimatedTuringMachine.iterateNext: Go on one step
    this.iterateNext = function (done) {
        if (!self._lockingCheck('iterate to next step'))
            return;
        if (self.finalStateReached()) {
            console.warn("final state already reached");
            return;
        }
        if (self.undefinedInstruction()) {
            console.warn("undefined instruction given");
            return;
        }

        self.lock();
        var r = tm.forth(1)[0];

        var old_value = r[0];
        var old_state = r[1];
        var new_value = r[2];
        var move = r[3];
        var new_state = r[4];
        var step_id = r[5];
        var undefined_instruction = r[6];
        var final_state_reached = r[7];

        var initiateNumberWriteAndGearMove = function () {
            numbers.addEventListener('writeFinished', function () {
                var rel_pos = move.equals(mot.LEFT) ? -1 : 0;
                rel_pos = move.equals(mot.RIGHT) ? 1 : rel_pos;
                // TODO: move gear
                /*if (speed >= 2000)
                 if (rel_pos > 0)
                 gear.addStepsLeft(1)
                 else
                 gear.addStepsRight(1)*/
                self.triggerEvent('valueWritten', old_value, new_value, rel_pos);
                setTimeout(initiateNumberMotion, 30);
            }, 1);

            var new_str_value = toStr(toJson(new_value));
            if (!animation_enabled || speed < speed_limit)
                numbers.writeNumberFast(new_str_value);
            else
                numbers.writeNumber(new_str_value);
        };

        var initiateNumberMotion = function () {
            numbers.addEventListener('moveFinished', function () {
                self.triggerEvent('movementFinished', move);
                setTimeout(initiateStateUpdate, 30);
            }, 1);

            // TODO: non-static 7/9
            // REMARK be aware that the tape already moved
            if (!animation_enabled || speed < speed_limit) {
                if (move.equals(mot.LEFT))
                    numbers.moveRightFast(toStr(toJson(self.getTape().read(undefined, 9)[1])));
                else if (move.equals(mot.RIGHT))
                    numbers.moveLeftFast(toStr(toJson(self.getTape().read(undefined, 9)[7])));
                else if (move.equals(mot.HALT) || move.equals(mot.STOP))
                    numbers.moveNot();
            } else {
                if (move.equals(mot.LEFT))
                    numbers.moveRight(toStr(toJson(self.getTape().read(undefined, 9)[1])));
                else if (move.equals(mot.RIGHT))
                    numbers.moveLeft(toStr(toJson(self.getTape().read(undefined, 9)[7])));
                else if (move.equals(mot.HALT) || move.equals(mot.STOP))
                    numbers.moveNot();
            }
        };

        var initiateStateUpdate = function () {
            self._updateStateInUI(new_state, final_state_reached, undefined_instruction, new_value);
            self.triggerEvent('stateUpdated', old_state, new_state, final_state_reached);

            self.triggerEvent('transitionFinished', old_value, old_state, new_value,
                move, new_state, step_id, undefined_instruction, final_state_reached);

            self.release();
            done.call(self);
        };

        setTimeout(initiateNumberWriteAndGearMove, 30);
    };

    // @method AnimatedTuringMachine.interrupt: Interrupt running TM
    this.interrupt = function () {
        this.lock();
        // TODO: .call(this) because interrupt uses stupid callback by method via this._stopRun
        tm.interrupt.call(this);
        this.release();
        return true;
    };

    // @method AnimatedTuringMachine.reset: Reset machine to initial state
    this.reset = function () {
        if (!this._lockingCheck('reset'))
            return;
        this.lock();
        tm.reset();
        this.release();
        this.syncToUI();
        return true;
    };

    this.toString = function () {
        return "[AnimatedTuringMachine '" + this.getMachineName() + "']";
    };

    // API - Import & Export

    // @method AnimatedTuringMachine.syncFromUI:
    //   Take all values from the UI and insert them into the TM state
    this.syncFromUI = function () {
        if (!this._lockingCheck('synchronize state from GUI'))
            return;

        var steps_prev = parseInt(ui_tm.find(".steps_prev").val());
        require(!isNaN(steps_prev), "Steps back counter must be number");
        require(steps_prev > 0, "Steps back counter must be non-negative number");

        var steps_next = parseInt(ui_tm.find(".steps_next").val());
        require(!isNaN(steps_next), "Steps continue counter must be number");
        require(steps_next > 0, "Steps continue counter must be non-negative number");

        // animation enabled?
        animation_enabled = !ui_tm.find("input[name='wo_animation']").is(":checked");

        // get numbers
        var vals = numbers.getNumbers();
        require(vals.length % 2 === 1, "Number of shown values must be odd");
        var steps = Math.floor(vals.length / 2);
        this.getTape().left(steps);
        for (var i = 0; i < vals.length; i++) {
            this.getTape().write(symbol(vals[i]));
            if (i !== vals.length - 1)
                this.getTape().right();
        }
        this.getTape().left(steps);

        // get state
        this.setState(state(ui_tm.find(".state").text()));

        // get steps count
        ui_settings['steps_back'] = steps_prev;
        ui_settings['steps_continue'] = steps_next;

        // get machine name
        this.setMachineName(ui_meta.find(".machine_name").val());

        // ignore 'Load tape'

        // get 'Final states'
        var fs_string = ui_data.find(".final_states").val();
        final_states = fs_string.split(/\s*,\s*/)
            .map(function (s) { return state(s); });
        this.setFinalStates(final_states);

        // read 'transition table'
        this.getProgram().clear();
        var self = this;
        ui_data.find(".transition_table tbody tr").each(function () {
            var from_symbol = $(this).find("td:eq(0) input").val();
            var from_state = $(this).find("td:eq(1) input").val();
            var write_symbol = $(this).find("td:eq(2) input").val();
            var move = $(this).find("td:eq(3) select").val();
            var to_state = $(this).find("td:eq(4) input").val();

            self.getProgram().set(
                symbol(from_symbol), state(from_state),
                symbol(write_symbol), mot[move.toUpperCase()], state(to_state)
            );
        });
    };

    // @method AnimatedTuringMachine.syncToUI:
    //   Write the current TM state to the UI
    this.syncToUI = function () {
        if (!this._lockingCheck('synchronize state to GUI'))
            return;

        // animation enabled?
        ui_tm.find("input[name='wo_animation']").prop("checked", !animation_enabled);

        // set numbers
        var vals = this.getTape().read(undefined, 7); // TODO non-static 7
        numbers.setNumbers(vals.map(toJson).map(toStr));

        // set state
        this._updateStateInUI(this.getState(),
            tm.finalStateReached(), tm.undefinedInstruction(),
            this.getTape().read());

        // set steps count
        ui_tm.find(".steps_prev").val(ui_settings['steps_back']);
        ui_tm.find(".steps_next").val(ui_settings['steps_continue']);

        // set machine name
        ui_meta.find(".machine_name").val(this.getMachineName());

        // set 'Load tape'
        ui_data.find(".tape").val(tape.toHumanString());

        // set 'Final states'
        var fs = this.getFinalStates().map(toStr).join(", ");
        ui_data.find(".final_states").val(fs);


        //fire window event for UI
        $(document).trigger('syncMachine');
    };

    // @method AnimatedTuringMachine.fromJSON: Import object state from JSON dump
    this.fromJSON = function (data) {
        this.interrupt();
        this.lock();

        if (data['speed'] !== undefined) {
            speed = parseInt(data['speed']);
            require(!isNaN(speed));
            delete data['speed'];
        }
        if (data['animations'] !== undefined) {
            animation_enabled = !!data['animations'];
            delete data['animations'];
        }

        tm.fromJSON(data);
        this.release();
    };

    // @method AnimatedTuringMachine.toJSON: Export object state to JSON dump
    this.toJSON = function () {
        this.interrupt();

        var data = tm.toJSON();
        data['speed'] = speed;
        data['animations'] = animation_enabled;

        return data;
    };

    this._initialize();

    // inherited:
    //   lock, release, locked
    //   finished
    //   isAFinalState
    //   setTape, getTape
    //   setState, getState
    //   setProgram, getProgram
    //   setMachineName, getMachineName
    //   setInitialTape, getInitialTape
    //   setFinalStates, addFinalState, getFinalStates
    //   setCursor, getCursor
    //   setInitialState, getInitialState
    //   getStep
    //   undefinedInstruction, finalStateReached
};