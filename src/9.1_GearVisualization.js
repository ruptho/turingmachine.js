// --------------------------- GearVisualization --------------------------

// @class Visualization of the gear movement
function GearVisualization(ui_gear, queue) {
    // @member GearVisualization.ui_gear: Reference to the base element for viz
    // @member GearVisualization.queue: Operations queue to visualize in future
    // @member GearVisualization.currently_running: Lock for running
    var currently_running = false;

    // @member GearVisualization.valid_events: Events registered at this object
    var valid_events = ['animationFinished', 'animationsFinished'];

    // @member GearVisualization.events: Event register for this object
    var events = new EventRegister(valid_events);

    // @member GearVisualization.speed: Animation speed
    var speed = 2000;

    var self = this;

    // @method GearVisualization.addEventListener: event listener definition
    this.addEventListener = function (evt, callback, how_often) {
        return events.add(evt, callback, how_often);
    };

    // @method GearVisualization.triggerEvent: trigger event
    this.triggerEvent = function (evt) {
        return events.trigger.apply(this, arguments);
    };

    // @method GearVisualization.setSpeed: define the animation speed in milliseconds
    this.setSpeed = function (sp) {
        require(!isNaN(parseInt(sp)));
        speed = parseInt(sp);
    };

    // @method GearVisualization.getSpeed: Get the animation speed in milliseconds
    this.getSpeed = function () {
        return speed;
    };

    // Turingmachine API

    // @method GearVisualization.done: Stop animation
    this.done = function () {
        currently_running = false;
        self.triggerEvent('animationFinished');
        if (queue.isEmpty()) {
            self.triggerEvent('animationsFinished');
            return;
        }
    };

    // @method GearVisualization.addStepsLeft: Add an operation 'move to left'
    this.addStepsLeft = function (count) {
        if (count === undefined)
            count = 1;

        for (var i = 0; i < count; i++)
            queue.push(-1);

        if (!currently_running)
            this._nextAnimation();
    };

    // @method GearVisualization.addStepsRight: Add an operation 'move to right'
    this.addStepsRight = function (count) {
        if (count === undefined)
            count = 1;

        for (var i = 0; i < count; i++)
            queue.push(+1);

        if (!currently_running)
            this._nextAnimation();
    };

    // animation

    // @method GearVisualization._nextAnimation: Trigger the next animation
    this._nextAnimation = function () {
        if (queue.isEmpty()) {
            this.triggerEvent('animationsFinished');
            return;
        }

        var steps = queue.pop();

        this._startAnimation({
            animationTimingFunction: (Math.abs(steps) > 1) ? "linear" : "ease-in-out",
            animationName: "gear-" + (steps < 0 ? "left" : "right"),
            animationIterationCount: Math.abs(steps),
            animationDuration: speed
        });
    };

    // @method GearVisualization._startAnimation: Start the animations
    this._startAnimation = function (properties) {
        var defaultProperties = {
            animationName: 'gear-left',
            animationDuration: '2s',
            animationTimingFunction: 'ease',
            animationDelay: '0s',
            animationIterationCount: 1,
            animationDirection: 'normal',
            animationPlayState: 'paused'
        };

        currently_running = true;
        for (var prop in properties)
            defaultProperties[prop] = properties[prop];
        defaultProperties['animationPlayState'] = 'running';

        var oldGear = ui_gear; // == .gear-animation
        var oldUid = parseInt(oldGear.attr('data-uid'));
        if (isNaN(oldUid))
            oldUid = parseInt(Math.random() * Math.pow(2, 32));
        var newUid = parseInt(Math.random() * Math.pow(2, 32));
        if (newUid === oldUid)
            newUid = oldUid + 1;

        var newGear = oldGear.clone(true).attr("data-uid", newUid);

        oldGear.attr("data-uid", oldUid);
        oldGear.before(newGear);
        for (var prop in defaultProperties) {
            newGear[0].style[prop] = defaultProperties[prop];
        }
        ui_gear.find("*[data-uid=" + oldUid + "]").remove();

        var d = self.done;
        newGear[0].addEventListener("animationend", function () {
            d();
            self._nextAnimation();
        }, false);
    };
};