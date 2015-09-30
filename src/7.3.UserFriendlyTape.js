// --------------------------- UserFriendlyTape ---------------------------

function defaultUserFriendlyTape(symbol_norm_fn) {
    symbol_norm_fn = def(symbol_norm_fn, normalizeSymbol);
    return new UserFriendlyTape(symbol(generic_blank_symbol), 5);
}

// @object UserFriendlyTape: Tape adding awkward & special but handy methods.
// invariant: UserFriendlyTape provides a superset API of ExtendedTape

function UserFriendlyTape(blank_symbol, history_size)
{
    // @method UserFriendlyTape.ext_tape
    var rec_tape = inherit(ExtendedTape, this, arguments);

    // @method UserFriendlyTape.setByString
    // Clear tape, store values of `array` from left to right starting with
    // position 0. Go back to position 0.
    this.fromArray = function (array, symbol_norm_fn) {
        symbol_norm_fn = def(symbol_norm_fn, normalizeSymbol);

        rec_tape.clear();
        rec_tape.moveTo(position(0));
        for (var i = 0; i < array.length; i++) {
            rec_tape.write(symbol(array[i]));
            rec_tape.right();
        }
        rec_tape.moveTo(position(0));
    };

    // @method UserFriendlyTape.readBinaryValue
    //   Assume that the tape only contains values 0 and 1.
    //   Consider this value as binary value and return
    //     [binary value as number, bitstring, number of bits]
    //   if anything fails, return null
    this.readBinaryValue = function () {
        var values = [];
        ext_tape.forEach(function (pos, val) {
            values.push(val);
        });
        var binstring = '';
        for (var i = 0; i < values.length; i++) {
            var val = ("" + values[i]).strip();
            if (val !== '0' && val !== '1')
                return false;
            else
                binstring += val;
        }
        var num = parseInt(binstring.split('').reverse().join(''), 2);
        return [num, binstring, values.length];
    };

    this.isUserFriendlyTape = true;
}