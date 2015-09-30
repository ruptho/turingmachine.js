// ---------------------------- Testcase Runner ---------------------------

var TestcaseRunner = function (manager) {
    var N_SUCCESS = "(ok) Testcase '%1' succeeded.";
    var N_FAILURE = "(fail) Testcase '%1' failed.";

    // @function TestcaseRunner._createTM: create/overwrite a
    //   TuringMachine instance with the given input configuration
    this._createTM = function (input, tm, transition_table,
                               default_final_states, default_initial_state)
    {
        var i_tape_cursor = input['tape']['cursor'];
        var i_tape_blank = input['tape']['blank'];
        var i_tape_data = input['tape']['data'];
        var i_state = input['state'];

        var prg, tape;
        if (tm) {
            prg = tm.getProgram();
            tape = tm.getTape();
        } else {
            if (typeof i_tape_blank === 'undefined')
                tape = new UserFriendlyTape(symbol(i_tape_blank), 0);
            else
                tape = new UserFriendlyTape(symbol("_"), 0);
            prg = new Program();
            tm = new TuringMachine(prg, tape,
                default_final_states.map(function (v) { return state(v) }),
                state(default_initial_state));
        }
        prg.fromJSON(transition_table);

        if (typeof i_tape_blank !== 'undefined')
            tape.setBlankSymbol(symbol(i_tape_blank));

        if (typeof i_state !== 'undefined')
            tm.setState(state(i_state));

        tape.clear();
        if (typeof i_tape_data !== 'undefined') {
            tape.moveTo(position(0));
            for (var i = 0; i < i_tape_data.length; i++) {
                tape.write(symbol(i_tape_data[i])); // TODO comparison function
                tape.right();
            }
            if (typeof i_tape_cursor !== 'undefined')
                tape.moveTo(position(i_tape_cursor));
            else
                tape.moveTo(position(0));
        }

        return tm;
    };

    // @function TestcaseRunner._testTM: test whether a TuringMachine instance
    //   satisfies the given output configuration
    this._testTM = function (tm, output) {
        var o_tapecontent = output['tapecontent'];
        var o_cursorposition = output['cursorposition'];
        var o_state = output['state'];

        if (tm.getStep() >= generic_check_inf_loop)
            return [false, 'steps performed', '<' + generic_check_inf_loop, 'greater'];

        if (typeof o_state !== 'undefined')
            if (!tm.getState().equals(state(o_state)))
                return [false, 'final state', o_state, tm.getState().toJSON()];

        if (typeof o_tapecontent !== 'undefined') {
            var actual_data = tm.getTape().toJSON()['data'];
            var expected_data = o_tapecontent.map(toStr);

            while (actual_data[0] === tm.getTape().getBlankSymbol().toJSON())
                actual_data = actual_data.slice(1);
            while (actual_data[actual_data.length - 1] === tm.getTape().getBlankSymbol().toJSON())
                actual_data = actual_data.slice(0, -1);

            var equals = true, i = 0;
            for (; i < Math.max(actual_data.length, expected_data.length); i++)
                if (actual_data[i] !== expected_data[i]) {
                    equals = false;
                    break;
                }

            var r = function (v) { return (v === undefined) ? 'blank' : ("'" + v + "'") };

            if (!equals)
                return [false, 'tape content', r(actual_data[i]),
                    r(expected_data[i]) + " at index " + i];

            if (typeof o_cursorposition !== 'undefined')
                if (o_cursorposition !== tm.getTape().toJSON()['cursor'])
                    return [false, 'cursor', o_cursorposition, tm.getTape().toJSON()['cursor']];
        }

        return [true];
    };

    // @function TestcaseRunner._runTM: run a turingmachine
    //   until a terminating condition is reached
    this._runTM = function (tm) {
        var steps = 0;
        while (!tm.finished() && steps++ < generic_check_inf_loop)
            tm.forth();
    };

    // @function TestcaseRunner.runTestcase: run a specific testcase (or all)
    this.runTestcase = function (testsuite, tc_name, transition_table) {
        require(typeof testsuite !== 'undefined', 'Testsuite required');
        require(typeof transition_table.length !== 'undefined', 'transition table required');

        var report = { 'reports': { }, 'reports_length': 0 };
        if (tc_name)
            var testcases = [tc_name];
        else
            var testcases = manager.get(testsuite).testcases;

        report['program'] = manager.get(testsuite)['title'];
        var default_final_states = manager.get(testsuite)['final_states']
            .map(function (s) { return state(s) } );
        var default_initial_state = state(manager.get(testsuite)['state']);

        var ok = true;
        for (var tc = 0; tc < testcases.length; tc++) {
            var testcase = manager.get(testsuite).testcases[tc];

            var testing_tm = this._createTM(testcase['input'], undefined,
                transition_table, default_final_states, default_initial_state);
            this._runTM(testing_tm);
            var response = this._testTM(testing_tm, testcase['output']);

            var tc_report = { 'ok': response[0] };
            if (!tc_report['ok']) {
                ok = false;
                tc_report['error'] = 'Expected ' + response[1] + ' to be ' + response[2]
                    + ' but is actually ' + response[3];
            }

            report.reports[testcase.name] = tc_report;
            report.reports_length += 1;
        }

        report['ok'] = ok;
        return report;
    };

    // @function TestcaseRunner.loadTestcaseToATM:
    //   load a testcase to a given AnimatedTuringMachine
    this.loadTestcaseToATM = function (tc_name, atm) {
        require(tc_name !== undefined, "Testcase must be given");

        var default_final_states = manager.getProgram()['final_states'].map(state);
        var default_initial_state = state(manager.getProgram()['state']);
        var testcase = null;

        for (var i = 0; i < manager.get(testsuite).testcases.length; i++)
            if (manager.get(testsuite).testcases[i].title === tc_name)
                testcase = manager.get(testsuite).testcases[i];

        this._createTM(testcase.input, atm, default_final_states, default_initial_state);
        atm.syncToUI();
    };
};
