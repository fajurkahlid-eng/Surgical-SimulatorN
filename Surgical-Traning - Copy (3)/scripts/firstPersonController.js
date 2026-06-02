/**
 * firstPersonController — WASD + mouse look; pointer lock on canvas mousedown (browser user gesture).
 * Releases pointer lock when disabled.
 */
var FirstPersonController = pc.createScript('firstPersonController');

FirstPersonController.attributes.add('cameraEntity', { type: 'entity', title: 'Head Camera' });
FirstPersonController.attributes.add('moveSpeed', { type: 'number', default: 4 });
FirstPersonController.attributes.add('lookSensitivity', { type: 'number', default: 0.2 });
FirstPersonController.attributes.add('pitchLimitDeg', { type: 'number', default: 80 });
FirstPersonController.attributes.add('groundY', { type: 'number', default: 0 });
FirstPersonController.attributes.add('useGroundY', { type: 'boolean', default: true });
FirstPersonController.attributes.add('boundsMin', { type: 'vec3', default: [-80, -10, -80] });
FirstPersonController.attributes.add('boundsMax', { type: 'vec3', default: [80, 50, 80] });

FirstPersonController.prototype.initialize = function () {
    this._yaw = this.entity.getEulerAngles().y;
    this._pitch = 0;
    this._active = true;

    this.app.mouse.on(pc.EVENT_MOUSEMOVE, this._onMouseMove, this);
    this.app.mouse.on(pc.EVENT_MOUSEDOWN, this._onMouseDown, this);

    this._applyCameraRotation();
};

FirstPersonController.prototype.setEnabled = function (v) {
    this._active = v;
    if (!v && this.app.mouse) {
        this.app.mouse.enablePointerLock(false);
    }
};

FirstPersonController.prototype._onMouseDown = function () {
    if (!this._active || !this.enabled) return;
    if (this.app.mouse.isPointerLocked()) return;
    this.app.mouse.enablePointerLock(true);
};

FirstPersonController.prototype._onMouseMove = function (e) {
    if (!this._active || !this.enabled) return;
    if (!this.app.mouse.isPointerLocked()) return;

    this._yaw -= e.dx * this.lookSensitivity;
    this._pitch -= e.dy * this.lookSensitivity;
    var lim = this.pitchLimitDeg;
    this._pitch = pc.math.clamp(this._pitch, -lim, lim);
    this._applyCameraRotation();
};

FirstPersonController.prototype._applyCameraRotation = function () {
    this.entity.setEulerAngles(0, this._yaw, 0);
    if (this.cameraEntity) {
        this.cameraEntity.setLocalEulerAngles(this._pitch, 0, 0);
    }
};

FirstPersonController.prototype.update = function (dt) {
    if (!this.enabled || !this._active) return;
    if (!this.app.keyboard) return;

    var kb = this.app.keyboard;
    var forward = 0;
    var strafe = 0;
    if (kb.isPressed(pc.KEY_W)) forward += 1;
    if (kb.isPressed(pc.KEY_S)) forward -= 1;
    if (kb.isPressed(pc.KEY_D)) strafe += 1;
    if (kb.isPressed(pc.KEY_A)) strafe -= 1;

    if (forward === 0 && strafe === 0) return;

    var yawRad = this._yaw * pc.math.DEG_TO_RAD;
    var fx = -Math.sin(yawRad);
    var fz = -Math.cos(yawRad);
    var rx = Math.cos(yawRad);
    var rz = -Math.sin(yawRad);

    var mx = (fx * forward + rx * strafe) * this.moveSpeed * dt;
    var mz = (fz * forward + rz * strafe) * this.moveSpeed * dt;

    var p = this.entity.getPosition();
    p.x += mx;
    p.z += mz;

    p.x = pc.math.clamp(p.x, this.boundsMin.x, this.boundsMax.x);
    p.z = pc.math.clamp(p.z, this.boundsMin.z, this.boundsMax.z);
    if (this.useGroundY) p.y = this.groundY;

    this.entity.setPosition(p);
};

FirstPersonController.prototype.onDestroy = function () {
    this.app.mouse.off(pc.EVENT_MOUSEMOVE, this._onMouseMove, this);
    this.app.mouse.off(pc.EVENT_MOUSEDOWN, this._onMouseDown, this);
    if (this.app.mouse) this.app.mouse.enablePointerLock(false);
};
