// ----------------------------- Main routine -----------------------------

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

    var programs = ['empty','intro', '2bit-xor', 'zero-writer'];
    var count_default_programs = 4;
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