/**
 * suturingUI — 2D suturing trainer: zones, markers, needle, thread, tension, Finish → report.
 * Requires: WoundPanel (Element IMAGE, useInput ON for clicks). Other entities optional.
 */
var SuturingUI = pc.createScript('suturingUI');

SuturingUI.attributes.add('woundPanelEntity', { type: 'entity', title: 'WoundPanel (IMAGE, useInput)' });
SuturingUI.attributes.add('leftZoneEntity', { type: 'entity', title: 'Left Zone (optional IMAGE)' });
SuturingUI.attributes.add('rightZoneEntity', { type: 'entity', title: 'Right Zone (optional IMAGE)' });
SuturingUI.attributes.add('needleIconEntity', { type: 'entity', title: 'Needle Icon' });
SuturingUI.attributes.add('threadLineEntity', { type: 'entity', title: 'Thread Line (thin IMAGE)' });
SuturingUI.attributes.add('statusTextEntity', { type: 'entity', title: 'Status Text' });
SuturingUI.attributes.add('detailTextEntity', { type: 'entity', title: 'Detail Text' });
SuturingUI.attributes.add('stitchCounterTextEntity', { type: 'entity', title: 'Stitch Counter Text' });
SuturingUI.attributes.add('mistakeFeedbackTextEntity', { type: 'entity', title: 'Mistake Feedback Text' });
SuturingUI.attributes.add('tensionBarFillEntity', { type: 'entity', title: 'Tension Bar Fill' });
SuturingUI.attributes.add('tensionValueTextEntity', { type: 'entity', title: 'Tension Value Text' });
SuturingUI.attributes.add('finishButtonEntity', { type: 'entity', title: 'Finish Procedure Button' });

SuturingUI.attributes.add('stitchCount', { type: 'number', default: 5 });
SuturingUI.attributes.add('entryIdealX', { type: 'number', default: 0.22 });
SuturingUI.attributes.add('exitIdealX', { type: 'number', default: 0.78 });
SuturingUI.attributes.add('hitRadius', { type: 'number', default: 0.09 });
SuturingUI.attributes.add('idealTension', { type: 'number', default: 0.5 });
SuturingUI.attributes.add('tensionStep', { type: 'number', default: 0.04 });
SuturingUI.attributes.add('symmetryTolerance', { type: 'number', default: 0.12 });
SuturingUI.attributes.add('procedureName', { type: 'string', default: 'Interrupted Dermal Suture — Training Module' });
SuturingUI.attributes.add('idealSecondsPerStitch', { type: 'number', default: 14 });
SuturingUI.attributes.add('proceduralMarkers', { type: 'boolean', default: true });
SuturingUI.attributes.add('autoCreateWoundFallback', { type: 'boolean', default: false });

SuturingUI.prototype.initialize = function () {
    this.on('sessionComplete', function () {});

    this._phase = 'IDLE';
    this._currentIndex = 0;
    this._tension = 0.5;
    this._sessionStart = 0;
    this._records = [];
    this._orderErrors = 0;
    this._wrongClicks = 0;
    this._mistakeMsgUntil = 0;
    this._markerEntities = [];
    this._plan = [];

    this.app.keyboard.on(pc.EVENT_KEYDOWN, this._onKeyDown, this);
    this.app.mouse.on(pc.EVENT_MOUSEMOVE, this._onMouseMove, this);
    this.app.mouse.on(pc.EVENT_MOUSEDOWN, this._onGlobalWoundClick, this);

    this._bindWoundInput();
    this._bindFinishButton();

    if (this.autoCreateWoundFallback && !this.woundPanelEntity) {
        this._ensureWoundFallback();
    }

    this._setFinishVisible(false);
};

SuturingUI.prototype._bindWoundInput = function () {
    if (!this.woundPanelEntity || !this.woundPanelEntity.element) return;
    var el = this.woundPanelEntity.element;
    el.useInput = true;
    el.on('mousedown', this._onWoundPointer, this);
    el.on('touchstart', this._onWoundPointer, this);
};

/** Fallback when no WoundPanel or editor forgot useInput — full-screen normalized pick. */
SuturingUI.prototype._onGlobalWoundClick = function () {
    if (!this.entity.enabled) return;
    if (this._phase !== 'ENTRY' && this._phase !== 'EXIT') return;
    if (this.woundPanelEntity && this.woundPanelEntity.element && this.woundPanelEntity.element.useInput) return;
    var p = this._normFromScreenMouse();
    this._tryStitchClick(p);
};

SuturingUI.prototype._bindFinishButton = function () {
    if (!this.finishButtonEntity || !this.finishButtonEntity.element) return;
    var el = this.finishButtonEntity.element;
    el.useInput = true;
    el.on('click', this._onFinishClick, this);
};

SuturingUI.prototype._ensureWoundFallback = function () {
    if (this.entity.findByName('WoundBackdrop')) return;
    var plate = new pc.Entity('WoundBackdrop');
    plate.addComponent('element', {
        type: pc.ELEMENTTYPE_IMAGE,
        anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5),
        pivot: new pc.Vec2(0.5, 0.5),
        width: 520,
        height: 300,
        color: new pc.Color(0.94, 0.82, 0.76),
        opacity: 1,
        useInput: true
    });
    if (this.entity.insertChild) this.entity.insertChild(plate, 0);
    else this.entity.addChild(plate);
    this.woundPanelEntity = plate;
    this._bindWoundInput();
};

SuturingUI.prototype.startSession = function (traineeName) {
    this._traineeName = traineeName || 'Trainee';
    this._sessionStart = Date.now() / 1000;
    this._phase = 'ENTRY';
    this._currentIndex = 0;
    this._tension = 0.5;
    this._records = [];
    this._orderErrors = 0;
    this._wrongClicks = 0;
    this._mistakeMsgUntil = 0;
    this._buildIdealPlan();
    this._clearProceduralMarkers();
    if (this.proceduralMarkers) this._createMarkersAndZones();
    this._setFinishVisible(false);
    this._updateHUD();
    this._layoutNeedleAndThread();
};

SuturingUI.prototype._buildIdealPlan = function () {
    var n = Math.max(1, Math.floor(this.stitchCount));
    this._plan = [];
    for (var i = 0; i < n; i++) {
        var t = (i + 1) / (n + 1);
        this._plan.push({
            index: i,
            entry: { x: this.entryIdealX, y: t },
            exit: { x: this.exitIdealX, y: t }
        });
    }
};

SuturingUI.prototype._panelSize = function () {
    if (this.woundPanelEntity && this.woundPanelEntity.element) {
        var e = this.woundPanelEntity.element;
        return { w: e.width || 520, h: e.height || 300 };
    }
    return { w: 520, h: 300 };
};

/** Normalized wound coords (0–1), origin bottom-left of panel, from element pointer event. */
SuturingUI.prototype._normFromElementEvent = function (evt) {
    var sz = this._panelSize();
    var W = sz.w;
    var H = sz.h;
    var x = typeof evt.x === 'number' ? evt.x : 0;
    var y = typeof evt.y === 'number' ? evt.y : 0;
    var nx = (x + W * 0.5) / W;
    var ny = (y + H * 0.5) / H;
    nx = pc.math.clamp(nx, 0, 1);
    ny = pc.math.clamp(ny, 0, 1);
    return { x: nx, y: ny };
};

/** Fallback: canvas mouse → same normalized wound box as before (screen-relative). */
SuturingUI.prototype._normFromScreenMouse = function () {
    var canvas = this.app.graphicsDevice.canvas;
    var cw = canvas.clientWidth || 1;
    var ch = canvas.clientHeight || 1;
    var mx = this.app.mouse.x / cw;
    var my = 1 - this.app.mouse.y / ch;
    var wr = 0.55;
    var hr = 0.45;
    var cx = 0.5;
    var cy = 0.5;
    var left = cx - wr * 0.5;
    var bottom = cy - hr * 0.5;
    var nx = (mx - left) / wr;
    var ny = (my - bottom) / hr;
    return { x: pc.math.clamp(nx, 0, 1), y: pc.math.clamp(ny, 0, 1) };
};

SuturingUI.prototype._onWoundPointer = function (evt) {
    if (!this.entity.enabled) return;
    if (this._phase !== 'ENTRY' && this._phase !== 'EXIT') return;
    var p = this._normFromElementEvent(evt);
    this._tryStitchClick(p);
};

SuturingUI.prototype._dist = function (a, b) {
    var dx = a.x - b.x;
    var dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
};

SuturingUI.prototype._clickHitsWrongStitchHole = function (p) {
    var cur = this._currentIndex;
    for (var j = 0; j < this._plan.length; j++) {
        if (j === cur) continue;
        var hole = this._phase === 'ENTRY' ? this._plan[j].entry : this._plan[j].exit;
        if (this._dist(p, hole) <= this.hitRadius) return true;
    }
    return false;
};

SuturingUI.prototype._tryStitchClick = function (p) {
    var ideal = this._phase === 'ENTRY' ? this._idealEntry() : this._idealExit();
    var d = this._dist(p, ideal);

    if (d <= this.hitRadius) {
        var rec = this._records[this._currentIndex];
        if (!rec) {
            rec = {
                index: this._currentIndex,
                entry: null,
                exit: null,
                entryError: 0,
                exitError: 0,
                tension: 0.5,
                tensionScore: 0,
                symmetryScore: 0,
                spacingScore: 100,
                centerY: 0
            };
            this._records[this._currentIndex] = rec;
        }
        if (this._phase === 'ENTRY') {
            rec.entry = p;
            rec.entryError = d;
            this._phase = 'EXIT';
            this._flashMistake('', 0);
        } else {
            rec.exit = p;
            rec.exitError = d;
            rec.centerY = (p.y + rec.entry.y) * 0.5;
            rec.symmetryScore = this._symmetryScoreForStitch(rec);
            if (this._currentIndex > 0) {
                var prev = this._records[this._currentIndex - 1];
                if (prev && prev.entry && prev.exit) {
                    var prevCy = (prev.entry.y + prev.exit.y) * 0.5;
                    rec.spacingScore = this._spacingScoreStep(prevCy, rec.centerY, this._currentIndex);
                }
            }
            this._phase = 'TENSION';
            this._tension = 0.5;
        }
        this._updateMarkerColors();
    } else if (this._clickHitsWrongStitchHole(p)) {
        this._orderErrors += 1;
        this._wrongClicks += 1;
        this._flashMistake('Wrong stitch order — use the highlighted target.', 2.5);
    } else {
        this._wrongClicks += 1;
        this._flashMistake('Miss — click closer to the active target.', 2);
    }
    this._updateHUD();
    this._layoutNeedleAndThread();
};

SuturingUI.prototype._idealEntry = function () {
    return this._plan[this._currentIndex].entry;
};

SuturingUI.prototype._idealExit = function () {
    return this._plan[this._currentIndex].exit;
};

SuturingUI.prototype._symmetryScoreForStitch = function (rec) {
    var idealEntry = this._plan[rec.index].entry;
    var idealExit = this._plan[rec.index].exit;
    var dl = Math.abs(rec.entry.y - idealEntry.y);
    var dr = Math.abs(rec.exit.y - idealExit.y);
    var bal = Math.abs(dl - dr);
    var t = this.symmetryTolerance;
    return pc.math.clamp(100 * (1 - bal / t), 0, 100);
};

SuturingUI.prototype._spacingScoreStep = function (prevCenterY, curCenterY, index) {
    var n = this._plan.length;
    var idealStep = 1 / (n + 1);
    var gap = Math.abs(curCenterY - prevCenterY);
    var err = Math.abs(gap - idealStep);
    return pc.math.clamp(100 * (1 - err / idealStep), 0, 100);
};

SuturingUI.prototype._onMouseMove = function () {
    if (!this.entity.enabled) return;
    if (this._phase !== 'ENTRY' && this._phase !== 'EXIT') return;
    if (this.woundPanelEntity && this.woundPanelEntity.element) return;
    var p = this._normFromScreenMouse();
    this._needleNorm = p;
    this._layoutNeedleAndThread();
};

SuturingUI.prototype.update = function (dt) {
    if (!this.entity.enabled) return;
    if (this._phase === 'ENTRY' || this._phase === 'EXIT') {
        if (this.woundPanelEntity && this.woundPanelEntity.element) {
            this._needleNorm = this._normFromScreenMouse();
            this._layoutNeedleAndThread();
        }
    }
    if (this._mistakeMsgUntil > 0) {
        this._mistakeMsgUntil -= dt;
        if (this._mistakeMsgUntil <= 0 && this.mistakeFeedbackTextEntity && this.mistakeFeedbackTextEntity.element) {
            this.mistakeFeedbackTextEntity.element.text = '';
        }
    }
};

SuturingUI.prototype._flashMistake = function (msg, seconds) {
    if (!msg) return;
    if (this.mistakeFeedbackTextEntity && this.mistakeFeedbackTextEntity.element) {
        this.mistakeFeedbackTextEntity.element.text = msg;
    }
    this._mistakeMsgUntil = Math.max(this._mistakeMsgUntil, seconds);
};

SuturingUI.prototype._onKeyDown = function (e) {
    if (!this.entity.enabled || this._phase !== 'TENSION') return;

    if (e.key === pc.KEY_LEFT || e.key === pc.KEY_Q) {
        this._tension = pc.math.clamp(this._tension - this.tensionStep, 0, 1);
        this._updateHUD();
    } else if (e.key === pc.KEY_RIGHT || e.key === pc.KEY_E) {
        this._tension = pc.math.clamp(this._tension + this.tensionStep, 0, 1);
        this._updateHUD();
    } else if (e.key === pc.KEY_SPACE || e.key === pc.KEY_ENTER) {
        this._commitTensionAndAdvance();
    }
};

SuturingUI.prototype._commitTensionAndAdvance = function () {
    var rec = this._records[this._currentIndex];
    if (!rec || this._phase !== 'TENSION') return;

    rec.tension = this._tension;
    var dt = Math.abs(this._tension - this.idealTension);
    rec.tensionScore = pc.math.clamp(100 * (1 - dt * 2), 0, 100);

    this._currentIndex += 1;
    if (this._currentIndex >= this._plan.length) {
        this._phase = 'AWAIT_FINISH';
        this._setFinishVisible(true);
        this._flashMistake('All stitches recorded. Press Finish Procedure to view evaluation.', 4);
    } else {
        this._phase = 'ENTRY';
    }
    this._updateMarkerColors();
    this._updateHUD();
    this._layoutNeedleAndThread();
};

SuturingUI.prototype._setFinishVisible = function (on) {
    if (this.finishButtonEntity) this.finishButtonEntity.enabled = !!on;
};

SuturingUI.prototype._onFinishClick = function () {
    if (!this.entity.enabled || this._phase !== 'AWAIT_FINISH') return;
    this._finishSession();
};

SuturingUI.prototype._clearProceduralMarkers = function () {
    for (var i = 0; i < this._markerEntities.length; i++) {
        var m = this._markerEntities[i];
        if (m && m.parent) m.parent.removeChild(m);
        if (m) m.destroy();
    }
    this._markerEntities = [];
    var parent = this.woundPanelEntity || this.entity;
    if (!parent) return;
    var kill = [];
    var c = parent.children;
    for (var k = 0; k < c.length; k++) {
        var name = c[k].name || '';
        if (name.indexOf('__SuturingProc_') === 0) kill.push(c[k]);
    }
    for (var j = 0; j < kill.length; j++) {
        parent.removeChild(kill[j]);
        kill[j].destroy();
    }
};

SuturingUI.prototype._createMarkersAndZones = function () {
    var panel = this.woundPanelEntity;
    if (!panel || !panel.element) return;
    var W = panel.element.width || 520;
    var H = panel.element.height || 300;

    var addRect = function (name, x, y, ww, hh, col, opacity) {
        var e = new pc.Entity('__SuturingProc_' + name);
        e.addComponent('element', {
            type: pc.ELEMENTTYPE_IMAGE,
            anchor: new pc.Vec4(0.5, 0.5, 0.5, 0.5),
            pivot: new pc.Vec2(0.5, 0.5),
            width: ww,
            height: hh,
            color: col,
            opacity: opacity,
            useInput: false
        });
        e.setLocalPosition(x, y, 0);
        panel.addChild(e);
        return e;
    };

    if (!this.leftZoneEntity && !this.rightZoneEntity) {
        addRect('LeftZone', -W * 0.28, 0, W * 0.22, H * 0.88, new pc.Color(0.2, 0.65, 0.4), 0.18);
        addRect('RightZone', W * 0.28, 0, W * 0.22, H * 0.88, new pc.Color(0.25, 0.45, 0.85), 0.18);
    }

    for (var i = 0; i < this._plan.length; i++) {
        var pl = this._plan[i];
        var lx = (pl.entry.x - 0.5) * W;
        var ly = (pl.entry.y - 0.5) * H;
        var rx = (pl.exit.x - 0.5) * W;
        var ry = (pl.exit.y - 0.5) * H;
        var dotL = addRect('DotL' + i, lx, ly, 14, 14, new pc.Color(0.9, 0.85, 0.2), 0.95);
        var dotR = addRect('DotR' + i, rx, ry, 14, 14, new pc.Color(0.9, 0.85, 0.2), 0.95);
        dotL.__side = 'L';
        dotL.__idx = i;
        dotR.__side = 'R';
        dotR.__idx = i;
        this._markerEntities.push(dotL, dotR);
    }
    this._updateMarkerColors();
};

SuturingUI.prototype._updateMarkerColors = function () {
    for (var i = 0; i < this._markerEntities.length; i++) {
        var ent = this._markerEntities[i];
        if (!ent || !ent.element) continue;
        var idx = ent.__idx;
        var done = idx < this._currentIndex;
        var cur = idx === this._currentIndex;
        var activeSide = this._phase === 'ENTRY' ? 'L' : (this._phase === 'EXIT' ? 'R' : null);
        var isActive = cur && activeSide && ent.__side === activeSide;
        var tensionPair = cur && this._phase === 'TENSION';
        var c;
        if (done) c = new pc.Color(0.35, 0.85, 0.4);
        else if (tensionPair) c = new pc.Color(1, 0.55, 0.15);
        else if (isActive) c = new pc.Color(1, 0.55, 0.15);
        else c = new pc.Color(0.55, 0.55, 0.55);
        ent.element.color = c;
    }
};

SuturingUI.prototype._normToPanelLocal = function (nx, ny) {
    var sz = this._panelSize();
    return { x: (nx - 0.5) * sz.w, y: (ny - 0.5) * sz.h };
};

SuturingUI.prototype._layoutNeedleAndThread = function () {
    var panel = this.woundPanelEntity;
    if (!panel || !this._plan || !this._plan.length) return;
    var sz = this._panelSize();
    var W = sz.w;
    var H = sz.h;

    var recIndex = this._currentIndex;
    if (this._phase === 'AWAIT_FINISH' || this._phase === 'DONE') {
        recIndex = this._plan.length - 1;
    }
    recIndex = pc.math.clamp(recIndex, 0, Math.max(0, this._plan.length - 1));

    var rec = this._records[recIndex];
    var idealE = this._plan && this._plan[recIndex] ? this._plan[recIndex].entry : { x: 0.5, y: 0.5 };
    var needleN = this._needleNorm || idealE;
    if (this._phase === 'ENTRY') {
        needleN = this._needleNorm || idealE;
    } else if (this._phase === 'EXIT' && rec && rec.entry) {
        needleN = this._needleNorm || (this._plan[recIndex] ? this._plan[recIndex].exit : idealE);
    } else if (this._phase === 'TENSION' || this._phase === 'AWAIT_FINISH' || this._phase === 'DONE') {
        needleN = rec && rec.exit ? rec.exit : idealE;
    }

    if (this.needleIconEntity && this.needleIconEntity.element) {
        var pl = this._normToPanelLocal(needleN.x, needleN.y);
        this.needleIconEntity.setLocalPosition(pl.x, pl.y, 1);
    }

    if (this.threadLineEntity && this.threadLineEntity.element) {
        var ax;
        var ay;
        if (rec && rec.entry) {
            var al = this._normToPanelLocal(rec.entry.x, rec.entry.y);
            ax = al.x;
            ay = al.y;
        } else {
            ax = (this.entryIdealX - 0.5) * W;
            ay = (idealE.y - 0.5) * H;
        }
        var bl = this._normToPanelLocal(needleN.x, needleN.y);
        var bx = bl.x;
        var by = bl.y;
        var dx = bx - ax;
        var dy = by - ay;
        var len = Math.sqrt(dx * dx + dy * dy) || 1;
        var midX = (ax + bx) * 0.5;
        var midY = (ay + by) * 0.5;
        var ang = Math.atan2(dy, dx) * pc.math.RAD_TO_DEG;
        this.threadLineEntity.setLocalPosition(midX, midY, 0.5);
        this.threadLineEntity.setLocalEulerAngles(0, 0, ang);
        this.threadLineEntity.element.width = Math.max(8, len);
        this.threadLineEntity.element.height = 3;
    }
};

SuturingUI.prototype._aggregateScores = function (totalTime) {
    var n = this._plan.length;
    var idealStep = 1 / (n + 1);
    var accs = [];
    var syms = [];
    var spacings = [];
    var tens = [];
    var correct = 0;
    var incorrect = 0;

    for (var i = 0; i < this._records.length; i++) {
        var r = this._records[i];
        if (!r) continue;
        var eScore = pc.math.clamp(100 * (1 - r.entryError / this.hitRadius), 0, 100);
        var xScore = pc.math.clamp(100 * (1 - r.exitError / this.hitRadius), 0, 100);
        var acc = (eScore + xScore) * 0.5;
        accs.push(acc);
        syms.push(r.symmetryScore != null ? r.symmetryScore : 80);
        if (i > 0 && r.spacingScore != null) spacings.push(r.spacingScore);
        tens.push(r.tensionScore || 0);
        if (acc >= 72 && (r.tensionScore || 0) >= 58 && (r.symmetryScore || 0) >= 60) correct++;
        else incorrect++;
    }

    var accuracyScore = accs.length ? this._avg(accs) : 0;
    var symmetryScore = syms.length ? this._avg(syms) : 0;
    var stitchSpacingScore = spacings.length ? this._avg(spacings) : (n <= 1 ? 100 : 85);
    var tensionScore = tens.length ? this._avg(tens) : 0;

    var orderScore = pc.math.clamp(100 - this._orderErrors * 12 - this._wrongClicks * 4, 0, 100);

    var expected = Math.max(30, this.idealSecondsPerStitch * n);
    var timeRatio = totalTime / expected;
    var timeScore = pc.math.clamp(100 * (1.15 - timeRatio * 0.35), 0, 100);

    var mistakeCount = this._wrongClicks + this._orderErrors;

    var finalScore = Math.round(
        accuracyScore * 0.28 +
        stitchSpacingScore * 0.18 +
        symmetryScore * 0.18 +
        tensionScore * 0.14 +
        orderScore * 0.10 +
        timeScore * 0.12
    );

    return {
        accuracyScore: Math.round(accuracyScore),
        symmetryScore: Math.round(symmetryScore),
        stitchSpacingScore: Math.round(stitchSpacingScore),
        tensionScore: Math.round(tensionScore),
        orderScore: Math.round(orderScore),
        timeScore: Math.round(timeScore),
        finalScore: finalScore,
        correctStitches: correct,
        incorrectStitches: incorrect,
        mistakeCount: mistakeCount,
        idealStep: idealStep
    };
};

SuturingUI.prototype._avg = function (arr) {
    var s = 0;
    for (var i = 0; i < arr.length; i++) s += arr[i];
    return s / arr.length;
};

SuturingUI.prototype._finishSession = function () {
    var t1 = Date.now() / 1000;
    var totalTime = t1 - this._sessionStart;
    var agg = this._aggregateScores(totalTime);
    var feedback = this._makeFeedback(agg);

    var report = {
        traineeName: this._traineeName,
        procedureName: this.procedureName,
        stitchCount: this._plan.length,
        stitchesCompleted: this._plan.length,
        correctStitches: agg.correctStitches,
        incorrectStitches: agg.incorrectStitches,
        accuracyScore: agg.accuracyScore,
        stitchSpacingScore: agg.stitchSpacingScore,
        symmetryScore: agg.symmetryScore,
        tensionScore: agg.tensionScore,
        orderScore: agg.orderScore,
        timeScore: agg.timeScore,
        mistakeCount: agg.mistakeCount,
        totalTimeSec: Math.round(totalTime * 10) / 10,
        finalScore: agg.finalScore,
        feedback: feedback,
        weightsNote: 'Final = 28% accuracy + 18% spacing + 18% symmetry + 14% tension + 10% order + 12% time',
        details: {
            orderErrors: this._orderErrors,
            wrongClicks: this._wrongClicks,
            stitches: this._records
        }
    };

    this._phase = 'DONE';
    this._updateHUD();
    this.fire('sessionComplete', report);
};

SuturingUI.prototype._makeFeedback = function (agg) {
    var parts = [];
    if (agg.finalScore >= 88) parts.push('Excellent technical execution for this module.');
    else if (agg.finalScore >= 72) parts.push('Competent performance with room to refine consistency.');
    else parts.push('Continue deliberate practice on placement, spacing, and tension control.');

    if (agg.accuracyScore < 70) parts.push('Needle entry/exit accuracy should improve.');
    if (agg.stitchSpacingScore < 70) parts.push('Work on even bite spacing along the wound.');
    if (agg.symmetryScore < 70) parts.push('Balance left/right depth alignment across the wound.');
    if (agg.tensionScore < 70) parts.push('Thread tension was frequently outside the ideal band.');
    if (agg.orderScore < 70) parts.push('Maintain correct stitch sequence and avoid stray clicks.');
    if (agg.timeScore < 65) parts.push('Consider a steadier pace — speed affected the time component.');

    return parts.join(' ');
};

SuturingUI.prototype._updateHUD = function () {
    var n = (this._plan && this._plan.length) || 0;
    var i = this._currentIndex + 1;
    var st = this.statusTextEntity && this.statusTextEntity.element;
    var dt = this.detailTextEntity && this.detailTextEntity.element;
    var ct = this.stitchCounterTextEntity && this.stitchCounterTextEntity.element;
    var tv = this.tensionValueTextEntity && this.tensionValueTextEntity.element;
    var bar = this.tensionBarFillEntity && this.tensionBarFillEntity.element;

    if (ct) ct.text = n ? 'Stitch ' + Math.min(i, n) + ' / ' + n : 'Stitch — / —';

    if (this._phase === 'IDLE') {
        if (st) st.text = 'Stand by';
        if (dt) dt.text = '';
        if (tv) tv.text = '';
        if (bar) bar.width = 0;
        return;
    }

    if (this._phase === 'AWAIT_FINISH') {
        if (st) st.text = 'Procedure complete';
        if (dt) dt.text = 'Review your technique mentally, then tap Finish Procedure for your evaluation.';
        if (tv) tv.text = '';
        if (bar) bar.width = 0;
        return;
    }

    if (this._phase === 'DONE') {
        if (st) st.text = 'Submitting results…';
        if (dt) dt.text = '';
        return;
    }

    if (this._phase === 'ENTRY') {
        if (st) st.text = 'Place NEEDLE ENTRY (left / green zone)';
        if (dt) dt.text = 'Click the active orange target on the left wound edge.';
    } else if (this._phase === 'EXIT') {
        if (st) st.text = 'Pass NEEDLE EXIT (right / blue zone)';
        if (dt) dt.text = 'Click the active orange target on the right wound edge.';
    } else if (this._phase === 'TENSION') {
        if (st) st.text = 'Set THREAD TENSION';
        if (dt) dt.text = 'Q/E or ←/→ adjust. Space/Enter confirms. Aim near mid (balanced).';
    }

    if (tv) tv.text = 'Tension: ' + Math.round(this._tension * 100) + '%';
    if (bar && this._phase === 'TENSION') {
        bar.width = pc.math.clamp(this._tension * 220, 6, 220);
    } else if (bar) {
        bar.width = 0;
    }
};

SuturingUI.prototype.onDestroy = function () {
    this.app.keyboard.off(pc.EVENT_KEYDOWN, this._onKeyDown, this);
    this.app.mouse.off(pc.EVENT_MOUSEMOVE, this._onMouseMove, this);
    this.app.mouse.off(pc.EVENT_MOUSEDOWN, this._onGlobalWoundClick, this);
    if (this.woundPanelEntity && this.woundPanelEntity.element) {
        this.woundPanelEntity.element.off('mousedown', this._onWoundPointer, this);
        this.woundPanelEntity.element.off('touchstart', this._onWoundPointer, this);
    }
    if (this.finishButtonEntity && this.finishButtonEntity.element) {
        this.finishButtonEntity.element.off('click', this._onFinishClick, this);
    }
};
