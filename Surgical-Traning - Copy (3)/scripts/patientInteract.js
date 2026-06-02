/**
 * patientInteract — Proximity + F → gameManager.beginSurgery()
 * Attach to: Patient entity (parent of BodyHuman model).
 */
var PatientInteract = pc.createScript('patientInteract');

PatientInteract.attributes.add('playerEntity', { type: 'entity', title: 'Player' });
PatientInteract.attributes.add('gameManagerEntity', { type: 'entity', title: 'Game Manager' });
PatientInteract.attributes.add('interactDistance', { type: 'number', default: 3.5 });
PatientInteract.attributes.add('checkY', { type: 'boolean', default: false });

PatientInteract.prototype.initialize = function () {
    this._gameActive = false;
    this._gm = this.gameManagerEntity && this.gameManagerEntity.script
        ? this.gameManagerEntity.script.gameManager
        : null;
};

PatientInteract.prototype.setGameActive = function (v) {
    this._gameActive = v;
};

PatientInteract.prototype.update = function () {
    if (!this._gameActive || !this.playerEntity || !this._gm) return;

    var pp = this.playerEntity.getPosition();
    var tp = this.entity.getPosition();
    var dx = pp.x - tp.x;
    var dy = this.checkY ? (pp.y - tp.y) : 0;
    var dz = pp.z - tp.z;
    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    var near = dist <= this.interactDistance;
    if (this._gm.showInteractionPrompt) {
        this._gm.showInteractionPrompt(near);
    }

    if (near && this.app.keyboard && this.app.keyboard.wasPressed(pc.KEY_F)) {
        if (this._gm.beginSurgery) {
            this._gm.beginSurgery();
        }
    }
};
