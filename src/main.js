// ----------------------------- Main routine -----------------------------

var intro_program = {
    "title" : "00 - Introduction",
    "description" : [
        "Hi! This project is all about *turingmachines*. What are turingmachines? They are a computational concept from *Theoretical Computer Science* (TCS) by Alan Turing (*\u20061912 †\u20061954). They illustrate one possible way to define computation and are as powerful as your computer. So how do they work?",
        "Above you can see the animated turing machine with several control elements underneath. The animation consists of a tape (with bright background color) and one cursor (winded green structure). The text at the left bottom of the animation is called *current state*. You can press \"continue\" to compute the next *step*. What are steps?",
        "At the bottom you can see a *transition table*. It defines a current situation, consisting of a read symbol and a state, and the next situation after one step has been performed. So when you press \"continue\" the program will read the symbol focused by the cursor and the current state. It will search for a line in the transition table matching those 2 values and will execute the corresponding result. The result consists of a symbol to write, a movement of the tape and a successor state.",
        "The current program handles the following problem: Between '^' and '$' are there 0, 1 or 2 ones? Depending on the number, the final state is either Count0ones, Count1one or Count2ones.",
        "You can edit the transition table yourself. Try it! 😊"
    ],
    "version" : "1.2 / 23rd of Aug 2015 / meisterluk",
    "tape": {
        "data": ["^", "0", "1", "0", "0", "1", "$"],
        "cursor": 1,
        "blank": "0"
    },
    "program": [
        ["0", "Start", "0", "RIGHT", "Start"],
        ["1", "Start", "1", "RIGHT", "Found1one"],
        ["$", "Start", "$", "STOP", "Count0ones"],
        ["0", "Found1one", "0", "RIGHT", "Found1one"],
        ["1", "Found1one", "1", "RIGHT", "Found2ones"],
        ["$", "Found1one", "$", "STOP", "Count1one"],
        ["0", "Found2ones", "0", "RIGHT", "Found2ones"],
        ["1", "Found2ones", "1", "STOP", "Count2ones"],
        ["$", "Found2ones", "$", "STOP", "Count2ones"],
    ],
    "state" : "Start",
    "final_states" : ["Count0ones", "Count1one", "Count2ones"],
    "testcases" : [
        {
            "name": "find 0 ones in ^00000$",
            "input": {
                "tape": { "cursor": 1, "blank": "0", "data": ["^", "0", "0", "0", "0", "0", "$"] },
                "state": "Start"
            },
            "output": { "state": "Count0ones" }
        }, {
            "name": "find 1 one in ^00010$",
            "input": {
                "tape": { "cursor": 1, "blank": "0", "data": ["^", "0", "0", "0", "1", "0", "$"] },
                "state": "Start"
            },
            "output": { "state": "Count1one" }
        }, {
            "name": "find 2 ones in ^10010$",
            "input": {
                "tape": { "cursor": 1, "blank": "0", "data": ["^", "1", "0", "0", "1", "0", "$"] },
                "state": "Start"
            },
            "output": { "state": "Count2ones" }
        }, {
            "name": "find 1 one in ^00010000000$",
            "input": {
                "tape": { "cursor": 1, "blank": "0", "data": ["^", "0", "0", "0", "1", "0", "0", "0", "0", "0", "0", "0", "$"] },
                "state": "Start"
            },
            "output": { "state": "Count1one" }
        }
    ]
};

function main()
{
    // initialize application
    var ui_tm = $(".turingmachine:eq(0)");
    var ui_meta = $(".turingmachine_meta:eq(0)");
    var ui_data = $(".turingmachine_data:eq(0)");
    var ui_notes = $("#notes");
    var ui_gear = ui_tm.find("#gear");

    require(ui_tm.length > 0 && ui_meta.length > 0);
    require(ui_data.length > 0 && ui_notes.length > 0 && ui_gear.length > 0);

    // read configuration via URL hash
    /// you can load additional programs via URL like:
    ///   #programs{intro;2bit-xor}
    var url_hash = window.location.hash.slice(1);
    var default_market = 'local';
    var market_matches = url_hash.match(/markets\{(([a-zA-Z0-9_-]+:.*?;)*([a-zA-Z0-9_-]+:.*?))\}/);
    var program_matches = url_hash.match(/programs\{(([a-zA-Z0-9:_-]+;)*([a-zA-Z0-9:_-]+))\}/);

    var markets = {'local': 'markets/'};  // local is always contained
    if (market_matches) {
        var p = market_matches[1].split(';');
        for (var i = 0; i < p.length; i++) {
            var q = p[i].split(':');
            if (q[0] && q[1] && q[0] !== 'local') {
                markets[q[0]] = q[1];
            }
        }
    }
    console.info("Markets considered: ", markets);

    var programs = ['empty', '2bit-xor', 'zero-writer'];
    var count_default_programs = 5;
    if (program_matches) {
        var p = program_matches[1].split(';');
        for (var i = 0; i < p.length; i++) {
            if (p[i] && programs.indexOf(p[i]) === -1)
                programs.push(p[i]);
        }
    }
    console.info("Programs considered: ", programs);

    // market handling
    var manager = new TuringManager(default_market, markets,
        ui_notes, ui_tm, ui_meta, ui_data);
    var application = new Application(manager, ui_tm, ui_meta, ui_data, ui_notes, ui_gear);

    // REMARK I just hope it takes 100ms to make the application instance available
    manager.addEventListener("programReady", function (_, data) {
        return application.tm().addExampleProgram.apply(null, arguments);
    });
    manager.addEventListener("programActivated", function (program_id, data) {
        application.tm().updateTestcaseList.apply(null, arguments);
        application.loadMarketProgram(data);

        ui_meta.find(".example").val(program_id);
    });
    ui_meta.find(".testcase_load").click(function () {
        try {
            var testdata = manager.get(ui_meta.find(".example").val());
            var testsuite = testdata.title;
            var testcase = ui_meta.find(".testcase").val();
            var testcase_data;

            for (var tc in testdata.testcases)
                if (testdata.testcases[tc].name === testcase)
                    testcase_data = testdata.testcases[tc];
            require(testcase_data !== undefined);

            // TODO: add normalization function
            application.tm().getTape().fromJSON(testcase_data.input.tape);
            application.tm().setState(state(testcase_data.input.state));
            application.tm().setFinalStates(testdata.final_states.map(
                function (v) { return state(v) }));

            application.tm().syncToUI();
        } catch (e) {
            console.error(e);
            application.tm().alertNote(e.message);
        }
    });
    ui_meta.find(".testcase_runall").click(function () {
        try {
            // prepare variables
            var trun = new TestcaseRunner(manager);
            var report = trun.runTestcase(manager.getActivated(), undefined,
                application.tm().readTransitionTable());

            var msg = "Testing " + report.program + " (" + (report.ok ? "OK" : "FAILED") + ")\n\n";
            for (var tc in report.reports) {
                msg += "[" + tc + "] " + (report.reports[tc].ok ? "OK" : report.reports[tc].error) + "\n";
            }

            application.tm().alertNote(msg);
        } catch (e) {
            application.tm().alertNote(e.message);
        }
    });
    ui_meta.find(".example").change(function () {
        try {
            var program_id = $(this).val();
        } catch (e) {
            console.error(e);
            application.tm().alertNote(e.message);
        }
    });
    ui_meta.find(".example_load").click(function () {
        try {
            var current_program = ui_meta.find(".example").val();
            application.manager().activateProgram(current_program);
            window.localStorage['activeprogram'] = current_program;
        } catch (e) {
            console.error(e);
            self.alertNote(e.message);
        }
    });

    // Immediately load the default program and later update,
    // if another program shall be activated
    manager.add("intro", intro_program);
    manager.activateProgram("intro");

    for (var i = 0; i < programs.length; i++)
        manager.load(programs[i]);

    if (window.localStorage['activeprogram']) {
        // load the program used in the last session
        manager.activateWhenReady(window.localStorage['activeprogram']);
    } else if (programs[count_default_programs]) {
        // if user-defined program are provided, load first one per default
        manager.activateWhenReady(programs[count_default_programs]);
    }

    application.run();
    return application;
}