// ----------------------------- RecordedTape -----------------------------

function defaultRecordedTape(symbol_norm_fn) {
    symbol_norm_fn = def(symbol_norm_fn, normalizeSymbol);
    return new RecordedTape(symbol(generic_blank_symbol, symbol_norm_fn));
}

// @object RecordedTape: A tape with a history (can restore old states).
// invariant: RecordedTape provides a superset API of Tape

// A Tape which also provides a history with the undo and snapshot methods.
// The state is stored whenever method 'snapshot' is called.
// In other words: it can revert back to previous snapshots using 'undo'.
function RecordedTape(blank_symbol, history_size)
{
    // @member RecordedTape.history_size
    history_size = def(history_size, Infinity);
    if (history_size !== Infinity)
        history_size = parseInt(def(history_size, 10));
    require(!isNaN(history_size), "History size must be integer");

    // @member RecordedTape.history
    // Array of humantapes. One string per snapshot. Stores all actions.
    var history = [[]];

    // @member RecordedTape.simple_tape
    var simple_tape = inherit(Tape, this, arguments);

    // @member RecordedTape.logging
    var logging = true;

    // General overview for instruction set:
    //    going $x pos left     -> [-$x]
    //    going $x pos right    -> [$x]
    //    overwrite $x with $y  -> ['w', $x, $y]

    // @method RecordedTape._oppositeInstruction: Get opposite instruction
    this._oppositeInstruction = function (ins) {
        if (ins[0] === 'w')
            return ["w", ins[2], ins[1]];
        else if (isNaN(parseInt(ins[0])))
            throw AssertionException("Unknown VM instruction");
        else if (ins[0] === 0)
            return [0];
        else
            return [-ins[0]];
    };

    // @method RecordedTape._applyInstruction: Run an instruction
    //         This method runs the instruction given
    this._applyInstruction = function (ins) {
        if (ins[0] === "w")
            write(ins[1], ins[2]);
        else if (typeof ins === 'number' && ins[0] < 0)
            left(-ins[0]);
        else if (typeof ins === 'number' && ins[0] > 0)
            right(ins[0]);
        else if (typeof ins === 'number' && ins[0] === 0)
        {}
        else
            throw AssertionException("Unknown instruction");
    };

    // @method RecordedTape._applyNativeInstruction: Run instruction natively
    //         This method runs the instructions when jumping around in history
    this._applyNativeInstruction = function (ins) {
        if (ins[0] === 'w')
            simple_tape.write(ins[2]);
        else if (typeof ins[0] === 'number' && ins[0] < 0)
            simple_tape.left(-ins[0]);
        else if (typeof ins[0] === 'number' && ins[0] > 0)
            simple_tape.right(ins[0]);
        else if (typeof ins[0] === 'number' && ins[0] === 0)
        {}
        else
            throw AssertionException("Unknown instruction");
    };

    // @method RecordedTape._undoOneSnapshot: Undo all actions of latest snapshot
    this._undoOneSnapshot = function (frame) {
        var ops = [];
        for (var i = frame.length - 1; i >= 0; i--) {
            var undo = this._oppositeInstruction(frame[i]);
            this._applyNativeInstruction(undo);
            ops.push(undo);
        }
        return ops;
    };

    // @method RecordedTape.resizeHistory: Shorten history if necessary
    this._resizeHistory = function (size) {
        if (size === Infinity)
            return;
        if (size <= 0)
            return;
        history = history.slice(-size, history.length);
    };

    // @method RecordedTape.enableLogging: Enable logging of actions
    this.enableLogging = function () {
        logging = true;
    };

    // @method RecordedTape.disableLogging: Disable logging of actions
    this.disableLogging = function () {
        logging = false;
    };

    // @method RecordedTape.getHistorySize: returns history_size
    this.getHistorySize = function () {
        return history_size;
    };

    // @method RecordedTape.setHistorySize: get history_size
    this.setHistorySize = function (val) {
        if (val === Infinity)
            val = Infinity;
        else if (!isNaN(parseInt(val)))
            val = parseInt(val);
        else
            throw AssertionException("setHistorySize only accept inf or num");

        simple_tape.setHistorySize(val);
        simple_tape.setBlankSymbol(val);
    };

    // @method RecordedTape.getHistory: Return the stored history
    this.getHistory = function () {
        return history;
    };

    // @method RecordedTape.clearHistory: Clear the history of this tape
    this.clearHistory = function () {
        history = [[]];
    };

    // @method RecordedTape.clear: Clear values of the tape and its history
    this.clear = function () {
        this.clearHistory();
        simple_tape.clear();
    };

    // @method RecordedTape.left: Go left.
    this.left = function (positions) {
        positions = def(positions, 1);
        require(!isNaN(parseInt(positions)));
        history[history.length - 1].push([-positions]);
        this._resizeHistory(history_size);
        simple_tape.left(positions);
    };

    // @method RecordedTape.right: Go right.
    this.right = function (positions) {
        positions = def(positions, 1);
        require(!isNaN(parseInt(positions)));
        history[history.length - 1].push([positions]);
        this._resizeHistory(history_size);
        simple_tape.right(positions);
    };

    // @method RecordedTape.write: Write a value to tape.
    this.write = function (new_value, old_value) {
        old_value = def(old_value, simple_tape.read());
        history[history.length - 1].push(['w', old_value, new_value]);
        this._resizeHistory(history_size);
        simple_tape.write(new_value);
    };

    // @method RecordedTape.undo: Go back to last snapshot.
    //   Returns reversed operations.
    this.undo = function () {
        if (history.length === 1 && history[0].length === 0)
            throw new OutOfHistoryException("Tape history under the limit");

        var frame = history.pop();
        return this._undoOneSnapshot(frame);
    };

    // @method RecordedTape.snapshot: Take a snapshot.
    this.snapshot = function () {
        var last = history.length - 1;
        history.push([]);
        this._resizeHistory(history_size);
    };

    // @method RecordedTape.toString: Return string representation of RecordedTape
    this.toString = function () {
        return simple_tape.toHumanString(false);
    };

    // @method RecordedTape.toJSON: Return JSON representation of RecordedTape
    this.toJSON = function (export_history) {
        var data = simple_tape.toJSON();

        export_history = def(export_history, true);
        if (!export_history)
            return data;

        data['history'] = deepCopy(history);
        if (history_size === Infinity)
            data['history_size'] = null;
        else
            data['history_size'] = history_size;

        return data;
    };

    // @method RecordedTape.fromJSON: Import RecordedTape data
    // @example
    //   fromJSON({'data': [], 'cursor':0, 'blank_symbol':'0',
    //     'offset': 3, 'history': [], 'history_size': 0})
    this.fromJSON = function (data) {
        this.clearHistory();
        if (typeof data['history'] !== 'undefined')
            if (data['history'].length > 0)
                history = data['history'];
            else
                history = [[]];
        if (typeof data['history_size'] !== 'undefined')
            if (data['history_size'] === null)
                history_size = Infinity;
            else {
                history_size = parseInt(data['history_size']);
                require(!isNaN(history_size));
            }
        this._resizeHistory(history_size);
        delete data['history_size'];
        delete data['history'];

        return simple_tape.fromJSON(data);
    };

    this.isRecordedTape = true;
}