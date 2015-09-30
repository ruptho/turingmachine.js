// -------------------------- NumberVisualization -------------------------

var NumberVisualization = function (values, ui_root) {
  // @member NumberVisualization.values: Initial values
  // @member NumberVisualization.ui_root: DOM root element
  ui_root = $(ui_root);

  // @member NumberVisualization.valid_events: Valid events
  var valid_events = ['moveFinished', 'writeFinished'];

  // @member NumberVisualization.events: Event register
  var events = new EventRegister(valid_events);

  // @member NumberVisualization.locked: Lock while modifying DOM
  var locked = false;

  // @member NumberVisualization.width_one_number: Width of one .numbers
  var width_one_number = 60;

  // @member NumberVisualization.width_main_number: Width of focused .numbers
  var width_main_number = 185;

  // @member NumberVisualization.speed: Animation speed
  var speed = 2000;


  // @method NumberVisualization._createNumber: append/prepend new .value in DOM
  this._createNumber = function (value, classes, left) {
    classes = def(classes, []);
    var elem = $("<div></div>").addClass("value")
      .css("opacity", "0").css("left", "0px")
      .text("" + value);

    for (var c = 0; c < classes.length; c++)
      elem.addClass(classes[c]);

    if (left)
      ui_root.find(".tm_value").first().before(elem);
    else
      ui_root.find(".tm_value").last().after(elem);

    return elem;
  };

  // @method NumberVisualization._rebuildValues: copy & destroy .value
  this._rebuildValues = function () {
    ui_root.find(".numbers .value").each(function () {
      var copy = $(this).clone(false);
      copy.removeClass("animated_left");
      copy.removeClass("animated_right");
      copy.css("opacity", 1);
      $(this).before(copy);
      $(this).remove();
    });
  };

  // @method NumberVisualization._assignSemanticalTapeClasses:
  //   assign semantical classes to .numbers instances
  this._assignSemanticalTapeClasses = function () {
    var semanticalClasses = [
      'lleft', 'rleft', 'mid', 'lright',
      'rright', 'left', 'right'
    ];

    var numbers = ui_root.find(".numbers .value");
    var mid = parseInt(numbers.length / 2);
    var i = 0;

    // reset classes
    numbers.each(function () {
      for (var c in semanticalClasses) {
        var cls = semanticalClasses[c];
        $(this).removeClass("value_" + cls);
      }
    });

    numbers.each(function () {
      if (i === 0)
        $(numbers[i]).addClass("value_lleft");
      else if (i === mid - 1)
        $(numbers[i]).addClass("value_rleft");
      else if (i === mid)
        $(numbers[i]).addClass("value_mid");
      else if (i === mid + 1)
        $(numbers[i]).addClass("value_lright");
      else if (i === numbers.length - 1)
        $(numbers[i]).addClass("value_rright");

      if (i < mid)
        $(numbers[i]).addClass("value_left");
      else if (i > mid)
        $(numbers[i]).addClass("value_right");

      i++;
    });
  };

  // @method NumberVisualization._tapeWidth:
  //   width in pixels of turingmachine display
  this._tapeWidth = function () {
    var padding = ui_root.css('padding-left') || 0;
    if (padding)
      padding = parseInt(padding.substr(0, padding.length - 2));
    return (ui_root[0].clientWidth - 2 * padding || 700);
  };

  // @method NumberVisualization._initialize: Initialize visualization
  this._initialize = function () {
    locked = true;

    // create .numbers .value instances
    this.setNumbers(values);

    // assign CSS classes
    this._assignSemanticalTapeClasses();

    // define left padding
    var computedWidth = width_one_number * (values.length - 1);
    computedWidth += width_main_number;
    var actualWidth = this._tapeWidth();
    var diff = actualWidth - computedWidth;

    // define left padding of visualization
    ui_root.find(".numbers").css("padding-left", parseInt(diff / 2) + "px");

    locked = false;
  };

  // @method NumberVisualization.addEventListener: event listener definition
  this.addEventListener = function (evt, callback, how_often) {
    return events.add(evt, callback, how_often);
  };

  // @method NumberVisualization.triggerEvent: trigger event
  this.triggerEvent = function (evt) {
    return events.trigger.apply(this, arguments);
  };

  // @method NumberVisualization.getSpeed: Get speed value
  this.getSpeed = function () {
    return speed;
  };

  // @method NumberVisualization.setSpeed: Set speed value
  this.setSpeed = function (val) {
    speed = val;
  };

  // @method NumberVisualization.setNumbers: Set values for .numbers
  //   This method ensures that values.length DOM elements exist
  //   and set all text contents to the values
  this.setNumbers = function (values) {
    require(values, "At least one value must be given");
    require(values.length % 2 === 1, "Number of values must be odd!");

    locked = true;
    var existing = ui_root.find(".numbers .value").length;
    while (existing > values.length) {
      ui_root.find(".numbers .value").last().remove();
      existing = ui_root.find(".numbers .value").length;
    }
    while (existing < values.length) {
      var elem = $("<div></div>").addClass("value").text("0");
      ui_root.find(".numbers").append(elem);
      existing = ui_root.find(".numbers .value").length;
    }

    for (var i = 0; i < values.length; i++)
      ui_root.find(".numbers .value").slice(i, i+1).text(values[i]);

    locked = false;
  };

  // @method NumberVisualization.getNumbers: Return values of .numbers
  this.getNumbers = function () {
    return ui_root.find(".numbers .value").map(function () {
      return $(this).text();
    }).get();
  };

  // @method NumberVisualization.writeNumber: Animate value writing for the cursor
  this.writeNumber = function (new_value) {
    if (locked) {
      console.warn("Cannot write number. NumberVisualization is locked.");
      console.trace();
      return;
    }
    locked = true;

    var mid = parseInt(ui_root.find(".numbers .value").length / 2);
    var old_value = ui_root.find(".numbers .value").slice(mid, mid+1).text();
    var halftime = parseInt(speed / 4);
    var animation_speed = parseInt(speed / 2);

    // make animation
    ui_root.find(".writer").css("animation-duration", "" + animation_speed + "ms");
    ui_root.find(".writer").addClass("animated_writer");
    setTimeout(function () {
      if (new_value)
        ui_root.find(".numbers .value").slice(mid, mid+1).text(new_value);
    }, halftime);
    var te = this.triggerEvent;
    ui_root.find(".writer")[0].addEventListener("animationend", function () {
      $(this).removeClass("animated_writer");

      // clone element and destroy element
      var original = ui_root.find(".writer");
      var copy = original.clone();
      original.after(copy);
      original.first().remove();

      te('writeFinished', old_value, new_value);
      locked = false;
    }, true);
  };

  // @method NumberVisualization.writeNumberFast: Animate value writing in high-speed
  this.writeNumberFast = function (new_value) {
    if (locked) {
      console.warn("Cannot write number. NumberVisualization is locked.");
      console.trace();
      return;
    }
    locked = true;

    var mid = parseInt(ui_root.find(".numbers .value").length / 2);
    var old_value = ui_root.find(".numbers .value").slice(mid, mid+1).text();

    if (new_value)
      ui_root.find(".numbers .value").slice(mid, mid+1).text(new_value);

    this.triggerEvent('writeFinished', old_value, new_value);
    locked = false;
  };

  // @method NumberVisualization.moveLeft: Move numbers to the left
  this.moveLeft = function (new_value) {
    if (locked) {
      console.warn("Cannot move left. NumberVisualization is locked.");
      console.trace();
      return;
    }
    locked = true;

    // insert element from right
    ui_root.find(".numbers .value_rright").removeClass("value_rright");
    var elem = $("<div></div>").addClass("value").addClass("value_rright")
      .css("opacity", "0").css("right", "0px").text("" + new_value);
    ui_root.find(".numbers").append(elem);

    // add animated-CSS-class to trigger animation
    var elem = ui_root.find(".numbers .value");
    elem.addClass("animated_left");
    elem.css("animation-duration", "" + speed + "ms");
    var count_last = elem.length;
    var te = this.triggerEvent;

    var self = this;
    elem.each(function () {
      var is_rright = $(this).hasClass("value_rright");
      var is_lleft = $(this).hasClass("value_lleft");
      $(this)[0].addEventListener("animationend", function () {
        $(this).removeClass("animated_left");

        // disallow most-right element to switch back to invisibility
        if (is_rright)
          $(this).css("opacity", 1);

        // delete most-left element
        if (is_lleft)
          $(this).remove();

        count_last -= 1;
        if (count_last === 0) { // last element triggers finalization
          // recreate DOM element to make next animation possible
          self._rebuildValues();

          // assign semantic CSS classes such as lleft
          self._assignSemanticalTapeClasses();

          // trigger callback
          te('moveFinished', self.getNumbers(), new_value, 'left');

          locked = false;
        }
      }, true);
    });
  };

  // @method NumberVisualization.moveRight: Move numbers to the right
  this.moveRight = function (new_value) {
    if (locked) {
      console.warn("Cannot move right. NumberVisualization is locked.");
      console.trace();
      return;
    }
    locked = true;

    // reduce left-padding to get space for new element
    var numbers = ui_root.find(".numbers");
    var old_padding = parseInt(numbers.css("padding-left"));
    if (!isNaN(old_padding)) {
      var new_padding = (old_padding - width_one_number);
      numbers.css("padding-left", "" + new_padding + "px");
    }

    // insert element from left
    ui_root.find(".numbers .value_lleft").removeClass("value_lleft");
    var elem = $("<div></div>").addClass("value").addClass("value_lleft")
      .css("opacity", "0").css("left", "0px").text("" + new_value);
    ui_root.find(".numbers").prepend(elem);

    // add animated-CSS-class to trigger animation
    var elem = ui_root.find(".numbers .value");
    elem.addClass("animated_right");
    elem.css("animation-duration", "" + speed + "ms");
    var count_last = elem.length;
    var te = this.triggerEvent;

    var self = this;
    elem.each(function () {
      var is_lleft = $(this).hasClass("value_lleft");
      var is_rright = $(this).hasClass("value_rright");

      $(this)[0].addEventListener("animationend", function () {
        $(this).removeClass("animated_right");

        // reset padding-left to old value (only one time)
        if (is_lleft)
          numbers.css("padding-left", old_padding);

        // disallow most-left element to switch back to invisibility
        if (is_lleft)
          $(this).css("opacity", 1);

        // delete most-right element
        if (is_rright)
          $(this).remove();

        count_last -= 1;
        if (count_last === 0) { // last element triggers finalization
          // recreate DOM element to make next animation possible
          self._rebuildValues();

          // assign semantic CSS classes such as lleft
          self._assignSemanticalTapeClasses();

          // trigger callback
          te('moveFinished', self.getNumbers(), new_value, 'right');

          locked = false;
        }
      }, true);
    });
  };

  // @method NumberVisualization.moveNot: Do not really move, but invoke events
  //    useful for HALT and STOP motions
  this.moveNot = function () {
    this.triggerEvent('moveFinished', this.getNumbers(), null, 'stop');
  };

  // @method NumberVisualization.moveLeftFast: Move numbers to the left fast
  this.moveLeftFast = function (new_value) {
    if (locked) {
      console.warn("Cannot jump left. NumberVisualization is locked.");
      console.trace();
      return;
    }
    locked = true;

    // insert element from left
    ui_root.find(".numbers .value_rright").removeClass("value_rright");
    var elem = $("<div></div>").addClass("value")
      .addClass("value_rright").text("" + new_value);
    ui_root.find(".numbers").append(elem);

    // delete most-left element
    ui_root.find(".numbers .value_lleft").remove();

    // recompute semantical classes
    this._assignSemanticalTapeClasses();

    // trigger callback
    this.triggerEvent('moveFinished', this.getNumbers(), new_value, 'right');

    locked = false;
  };

  // @method NumberVisualization.moveRightFast: Move numbers to the right fast
  this.moveRightFast = function (new_value) {
    if (locked) {
      console.warn("Cannot jump right. NumberVisualization is locked.");
      console.trace();
      return;
    }
    locked = true;

    // insert element from left
    ui_root.find(".numbers .value_lleft").removeClass("value_lleft");
    var elem = $("<div></div>").addClass("value")
      .addClass("value_lleft").text("" + new_value);
    ui_root.find(".numbers").prepend(elem);

    // delete most-right element
    ui_root.find(".numbers .value_rright").remove();

    // recompute semantical classes
    this._assignSemanticalTapeClasses();

    // trigger callback
    this.triggerEvent('moveFinished', this.getNumbers(), new_value, 'right');

    locked = false;
  };

  this._initialize();
};