/**
 * gameManager — START → EXPLORING → SURGERY → RESULTS
 * Attach to: GameManager (root empty entity).
 */
var GameManager = pc.createScript('gameManager');

GameManager.attributes.add('startScreenEntity', { type: 'entity', title: 'Start Screen Root' });
GameManager.attributes.add('worldRoot', { type: 'entity', title: 'World3D' });
GameManager.attributes.add('playerEntity', { type: 'entity', title: 'Player' });
GameManager.attributes.add('patientEntity', { type: 'entity', title: 'Patient' });
GameManager.attributes.add('uiScreenRoot', { type: 'entity', title: 'UIScreen (optional parent)' });
GameManager.attributes.add('suturingRoot', { type: 'entity', title: 'SuturingRoot' });
GameManager.attributes.add('evaluationRoot', { type: 'entity', title: 'EvaluationRoot' });
GameManager.attributes.add('interactionPromptEntity', { type: 'entity', title: 'FPrompt Text' });
GameManager.attributes.add('explorationCamera', { type: 'entity', title: 'Exploration Camera (optional)' });
GameManager.attributes.add('disableCameraDuringSurgery', { type: 'boolean', default: false });

GameManager.prototype.initialize = function () {
    this.traineeName = '';
    this.state = 'START';

    this._bindScripts();

    if (this.startScript) {
        this.startScript.on('confirmed', this._onNameConfirmed, this);
    }
    if (this.sutureScript) {
        this.sutureScript.on('sessionComplete', this._onSurgeryComplete, this);
    }

    this._applyState();
};

GameManager.prototype._bindScripts = function () {
    this.fpScript = this.playerEntity && this.playerEntity.script
        ? this.playerEntity.script.firstPersonController
        : null;
    this.startScript = this.startScreenEntity && this.startScreenEntity.script
        ? this.startScreenEntity.script.startScreen
        : null;
    this.patientScript = this.patientEntity && this.patientEntity.script
        ? this.patientEntity.script.patientInteract
        : null;
    this.sutureScript = this.suturingRoot && this.suturingRoot.script
        ? this.suturingRoot.script.suturingUI
        : null;
    this.evalScript = this.evaluationRoot && this.evaluationRoot.script
        ? this.evaluationRoot.script.evaluationPanel
        : null;
};

GameManager.prototype._setExplorationCamera = function (on) {
    if (!this.explorationCamera || !this.explorationCamera.camera) return;
    this.explorationCamera.camera.enabled = !!on;
};

GameManager.prototype._applyState = function () {
    var isStart = this.state === 'START';
    var isExplore = this.state === 'EXPLORING';
    var isSurgery = this.state === 'SURGERY';
    var isResults = this.state === 'RESULTS';

    if (this.worldRoot) this.worldRoot.enabled = !isStart;

    if (this.startScreenEntity) this.startScreenEntity.enabled = isStart;

    if (this.uiScreenRoot) this.uiScreenRoot.enabled = !isStart;

    if (this.suturingRoot) this.suturingRoot.enabled = isSurgery;
    if (this.evaluationRoot) this.evaluationRoot.enabled = isResults;

    if (this.fpScript) {
        this.fpScript.enabled = isExplore;
        if (this.fpScript.setEnabled) this.fpScript.setEnabled(isExplore);
    }

    if (this.patientScript && this.patientScript.setGameActive) {
        this.patientScript.setGameActive(isExplore);
    }

    if (this.interactionPromptEntity) {
        this.interactionPromptEntity.enabled = false;
    }

    if (this.disableCameraDuringSurgery) {
        var camOn = isExplore || isResults;
        this._setExplorationCamera(camOn);
    } else {
        this._setExplorationCamera(true);
    }

    if (this.app.mouse) {
        if (isStart || isSurgery || isResults) {
            this.app.mouse.enablePointerLock(false);
        }
    }
};

GameManager.prototype._onNameConfirmed = function (name) {
    this.traineeName = (name && String(name).trim()) || 'Trainee';
    this.state = 'EXPLORING';
    this._applyState();
};

GameManager.prototype.beginSurgery = function () {
    if (this.state !== 'EXPLORING') return;
    this.state = 'SURGERY';
    if (this.fpScript && this.fpScript.setEnabled) this.fpScript.setEnabled(false);
    if (this.fpScript) this.fpScript.enabled = false;
    if (this.patientScript && this.patientScript.setGameActive) this.patientScript.setGameActive(false);
    if (this.interactionPromptEntity) this.interactionPromptEntity.enabled = false;
    if (this.suturingRoot) this.suturingRoot.enabled = true;
    if (this.app.mouse) this.app.mouse.enablePointerLock(false);
    if (this.disableCameraDuringSurgery) this._setExplorationCamera(false);

    this._bindScripts();
    if (this.sutureScript && this.sutureScript.startSession) {
        this.sutureScript.startSession(this.traineeName);
    }
};

GameManager.prototype._onSurgeryComplete = function (report) {
    this.state = 'RESULTS';
    if (this.suturingRoot) this.suturingRoot.enabled = false;
    if (this.evaluationRoot) this.evaluationRoot.enabled = true;
    if (this.disableCameraDuringSurgery) this._setExplorationCamera(true);

    this._bindScripts();
    if (this.evalScript && this.evalScript.showReport) {
        this.evalScript.showReport(report, this.traineeName);
    }
};

GameManager.prototype.restartExploration = function () {
    this.state = 'EXPLORING';
    if (this.evaluationRoot) this.evaluationRoot.enabled = false;
    if (this.fpScript) this.fpScript.enabled = true;
    if (this.fpScript && this.fpScript.setEnabled) this.fpScript.setEnabled(true);
    if (this.patientScript && this.patientScript.setGameActive) this.patientScript.setGameActive(true);
    this._applyState();
};

GameManager.prototype.showInteractionPrompt = function (show) {
    if (!this.interactionPromptEntity) return;
    if (this.state !== 'EXPLORING') return;
    this.interactionPromptEntity.enabled = !!show;
    var el = this.interactionPromptEntity.element;
    if (el) el.text = 'Press F to start surgery';
};

GameManager.prototype.onDestroy = function () {
    if (this.startScript) this.startScript.off('confirmed', this._onNameConfirmed, this);
    if (this.sutureScript) this.sutureScript.off('sessionComplete', this._onSurgeryComplete, this);
};
