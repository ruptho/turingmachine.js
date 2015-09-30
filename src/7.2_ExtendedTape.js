// ----------------------------- ExtendedTape -----------------------------

function defaultExtendedTape(symbol_norm_fn) {
    symbol_norm_fn = def(symbol_norm_fn, normalizeSymbol);
    return new ExtendedTape(symbol(generic_blank_symbol, symbol_norm_fn));
}

// @object ExtendedTape: An extension of Tape with additional features.
// invariant: ExtendedTape provides a superset API of RecordedTape

function ExtendedTape(blank_symbol, history_size)
{
    // @member ExtendedTape.rec_tape
    var rec_tape = inherit(RecordedTape, this, arguments);

    // @method ExtendedTape.move: Move 1 step in some specified direction
    this.move = function (move) {
        requireMotion(move);

        if (move.equals(mot.RIGHT))
            rec_tape.right();
        else if (move.equals(mot.LEFT))
            rec_tape.left();
        else if (move.equals(mot.STOP) || move.equals(mot.HALT)) {
            // nothing.
        } else
            throw AssertionException("Unknown motion '" + move.toString() + "'");
    };

    // @method ExtendedTape.forEach: Apply f for each element at the tape
    //   f is called as func(pos, val) from begin() to end()
    this.forEach = function (func) {
        var base = rec_tape.cursor();
        rec_tape.moveTo(rec_tape.begin());

        while (!rec_tape.cursor().equals(rec_tape.end())) {
            func(rec_tape.cursor(), rec_tape.read());
            rec_tape.right();
        }
        func(rec_tape.cursor(), rec_tape.read());

        rec_tape.moveTo(base);
    };

    // @method ExtendedTape.getAlphabet: Get alphabet of current Tape
    //         alphabet = OrderedSet of normalized characters at tape
    this.getAlphabet = function () {
        var values = new OrderedSet();

        // remove duplicate entries
        forEach(function (pos, element) {
            values.push(element.toJSON());
        });

        return values;
    };

    this.isExtendedTape = true;
}