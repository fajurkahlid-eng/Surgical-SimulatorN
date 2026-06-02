/**
 * startScreen — Trainee name: keyboard + Enter, or Start button click.
 * Attach to: StartScreenRoot (under a Screen). Assign Text + optional Button entity.
 */
var StartScreen = pc.createScript('startScreen');

StartScreen.attributes.add('instructionText', { type: 'entity', title: 'Title / Instruction Text' });
StartScreen.attributes.add('nameText', { type: 'entity', title: 'Name Display Text' });
StartScreen.attributes.add('startButtonEntity', { type: 'entity', title: 'Start Button (optional)' });
StartScreen.attributes.add('maxNameLength', { type: 'number', default: 32 });

StartScreen.prototype.initialize = function () {
    this._buffer = '';
    this._confirmed = false;

    this.app.keyboard.on(pc.EVENT_KEYDOWN, this._onKeyDown, this);

    if (this.startButtonEntity && this.startButtonEntity.element) {
        var bel = this.startButtonEntity.element;
        bel.useInput = true;
        this.startButtonEntity.element.on('click', this._submit, this);
    }

    this._refreshUI();
};

StartScreen.prototype._submit = function () {
    if (this._confirmed || !this.entity.enabled) return;
    this._confirmed = true;
    var name = this._buffer.trim() || 'Trainee';
    this.fire('confirmed', name);
};

StartScreen.prototype._onKeyDown = function (e) {
    if (this._confirmed || !this.entity.enabled) return;

    if (e.key === pc.KEY_ENTER) {
        this._submit();
        return;
    }

    if (e.key === pc.KEY_BACKSPACE) {
        this._buffer = this._buffer.slice(0, -1);
        this._refreshUI();
        return;
    }

    if (e.key < 32) return;

    var ch = null;
    if (e.key >= 32 && e.key <= 126) {
        ch = String.fromCharCode(e.key);
    }

    if (!ch) return;
    if (this._buffer.length >= this.maxNameLength) return;

    this._buffer += ch;
    this._refreshUI();
};

StartScreen.prototype._refreshUI = function () {
    if (this.nameText && this.nameText.element) {
        this.nameText.element.text = this._buffer ? this._buffer : 'Your name';
    }
    if (this.instructionText && this.instructionText.element) {
        this.instructionText.element.text =
            'Surgical Suturing Simulator\nEnter your name, then press Enter or Start';
    }
};

StartScreen.prototype.onDestroy = function () {
    if (this.app.keyboard) {
        this.app.keyboard.off(pc.EVENT_KEYDOWN, this._onKeyDown, this);
    }
    if (this.startButtonEntity && this.startButtonEntity.element) {
        this.startButtonEntity.element.off('click', this._submit, this);
    }
};
