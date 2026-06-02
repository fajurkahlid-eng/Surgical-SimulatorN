/**
 * evaluationPanel — Post-procedure training summary. R = return to ward.
 * Attach to: EvaluationRoot under UIScreen.
 */
var EvaluationPanel = pc.createScript('evaluationPanel');

EvaluationPanel.attributes.add('titleTextEntity', { type: 'entity', title: 'Results Title Text' });
EvaluationPanel.attributes.add('reportTextEntity', { type: 'entity', title: 'Report Body (multiline)' });
EvaluationPanel.attributes.add('hintTextEntity', { type: 'entity', title: 'Return Hint Text' });
EvaluationPanel.attributes.add('gameManagerEntity', { type: 'entity', title: 'Game Manager' });

EvaluationPanel.prototype.initialize = function () {
    this._gm = this.gameManagerEntity && this.gameManagerEntity.script
        ? this.gameManagerEntity.script.gameManager
        : null;
    this.app.keyboard.on(pc.EVENT_KEYDOWN, this._onKey, this);
};

EvaluationPanel.prototype.showReport = function (report, traineeName) {
    this.entity.enabled = true;
    var t = report || {};
    var name = traineeName || t.traineeName || 'Trainee';
    var proc = t.procedureName || 'Suturing procedure';

    if (this.titleTextEntity && this.titleTextEntity.element) {
        this.titleTextEntity.element.text = 'Training evaluation — ' + name;
    }

    var lines = [
        'Procedure: ' + proc,
        '────────────────────────────────',
        'Stitches completed: ' + (t.stitchesCompleted != null ? t.stitchesCompleted : t.stitchCount != null ? t.stitchCount : '—'),
        'Correct / incorrect stitches: ' + (t.correctStitches != null ? t.correctStitches : '—') + ' / ' + (t.incorrectStitches != null ? t.incorrectStitches : '—'),
        'Accuracy score: ' + (t.accuracyScore != null ? t.accuracyScore : '—') + ' / 100',
        'Stitch spacing score: ' + (t.stitchSpacingScore != null ? t.stitchSpacingScore : '—') + ' / 100',
        'Symmetry score: ' + (t.symmetryScore != null ? t.symmetryScore : '—') + ' / 100',
        'Tension score: ' + (t.tensionScore != null ? t.tensionScore : '—') + ' / 100',
        'Order score: ' + (t.orderScore != null ? t.orderScore : '—') + ' / 100',
        'Time score: ' + (t.timeScore != null ? t.timeScore : '—') + ' / 100',
        'Mistake count: ' + (t.mistakeCount != null ? t.mistakeCount : '—'),
        'Elapsed time: ' + (t.totalTimeSec != null ? t.totalTimeSec : '—') + ' s',
        '────────────────────────────────',
        'FINAL SCORE: ' + (t.finalScore != null ? t.finalScore : '—') + ' / 100',
        '',
        t.weightsNote || 'Weights: 28% accuracy, 18% spacing, 18% symmetry, 14% tension, 10% order, 12% time.',
        '',
        'Feedback:',
        t.feedback || '—'
    ];

    if (this.reportTextEntity && this.reportTextEntity.element) {
        this.reportTextEntity.element.text = lines.join('\n');
    }

    if (this.hintTextEntity && this.hintTextEntity.element) {
        this.hintTextEntity.element.text = 'Press R to return to exploration mode.';
    }
};

EvaluationPanel.prototype._onKey = function (e) {
    if (!this.entity.enabled) return;
    if (e.key === pc.KEY_R && this._gm && this._gm.restartExploration) {
        this._gm.restartExploration();
    }
};

EvaluationPanel.prototype.onDestroy = function () {
    this.app.keyboard.off(pc.EVENT_KEYDOWN, this._onKey, this);
};
