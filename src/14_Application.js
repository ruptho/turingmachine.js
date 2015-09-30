// ------------------------- Application object ---------------------------

var Application = function (manager, ui_tm, ui_meta, ui_data, ui_notes, ui_gear) {
    var normalize_symbol_fn = normalizeSymbol;
    var normalize_state_fn = normalizeState;

    this.loadMarketProgram = function (data) {
        // TODO all state() & symbol() need normalization function

        var user_tape_to_userfriendly_tape = function (data) {
            // input: { "data": ["1"], "cursor": -1, "blank": "0" }
            // output: { "data": ["1"], "cursor": -1, "blank_symbol": "0",
            //           "offset": 0, "history": [], "history_size": 0 }

            // TODO: implement optional-default values correctly
            return {
                'data' : data.data,
                'cursor': def(data.cursor, -1),
                'blank_symbol' : def(data.blank, "0"),
                'offset': def(data.offset, 0),
                'history': [],
                'history_size': 0
            }
        };

        var user_program_to_program = function (data) {
            // input: [['0', 'Start', '1', 'RIGHT', 'End']]
            // output: [['0', 'Start', ['1', 'RIGHT', 'End']]]

            var ret = [];
            for (var i = 0; i < data.length; i++) {
                ret.push([data[i][0], data[i][1],
                    [data[i][2], data[i][3], data[i][4]]]);
            }
            return ret;
        };

        try {
            var tape = user_tape_to_userfriendly_tape(data['tape']);

            this.tm().getTape().fromJSON(tape);
            this.tm().setInitialTape(tape);
            this.tm().getProgram().fromJSON(user_program_to_program(data['program']));
            this.tm().setState(state(data['state']));
            this.tm().setInitialState(state(data['state']));
            this.tm().setFinalStates(data['final_states'].map(function (s) { return state(s) }));
            this.tm().setDescriptionText(data['description']);
            this.tm().setDescriptionTitle(data['title']);
            this.tm().setVersion(data['version']);

            this.tm().syncToUI();
            this.tm().verifyUIsync();
        } catch (e) {
            console.error(e);
            this.tm().alertNote(e.message);
        }
    };

    this.manager = function () { return manager; };
    this.tm = function () { return machine; };
    this.run = function () { machine.initializeGUI(); };

    var gear = new GearVisualization(ui_gear, new Queue());
    var numbers = new NumberVisualization([0, 0, 0, 0, 0, 0, 0], ui_tm); // TODO: non-static 7
    var machine = defaultAnimatedTuringMachine(normalize_symbol_fn,
        normalize_state_fn, gear, numbers, ui_tm, ui_meta, ui_data, ui_notes);
}