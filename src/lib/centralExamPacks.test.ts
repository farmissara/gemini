import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  DEFAULT_CENTRAL_EXAM_PACKS,
  LEARNING_STRANDS,
} from '../data/examQuestionBanks';

describe('Central Exam Bank (คลังข้อสอบกลาง 10 ชุด/สาระ)', () => {
  it('provides exactly 10 published exam packs for each of the 8 learning strands (80 total)', () => {
    assert.equal(LEARNING_STRANDS.length, 8);
    assert.equal(DEFAULT_CENTRAL_EXAM_PACKS.length, 80);

    for (const strand of LEARNING_STRANDS) {
      const strandPacks = DEFAULT_CENTRAL_EXAM_PACKS.filter(
        (pack) => pack.strand === strand.id && pack.status === 'published'
      );
      assert.equal(
        strandPacks.length,
        10,
        `Expected 10 published packs for strand ${strand.id}, got ${strandPacks.length}`
      );
    }
  });

  it('has unique pack IDs and unique question IDs across all 80 packs', () => {
    const packIds = new Set<string>();
    const questionIds = new Set<string>();

    for (const pack of DEFAULT_CENTRAL_EXAM_PACKS) {
      assert.ok(!packIds.has(pack.id), `Duplicate pack id: ${pack.id}`);
      packIds.add(pack.id);

      for (const question of pack.questions) {
        assert.ok(!questionIds.has(question.id), `Duplicate question id: ${question.id}`);
        questionIds.add(question.id);
      }
    }
  });

  it('validates every question has 4 non-empty options, valid correctIndex, and consistent pack counts', () => {
    for (const pack of DEFAULT_CENTRAL_EXAM_PACKS) {
      assert.ok(pack.questions.length >= 5, `Pack ${pack.id} has fewer than 5 questions`);
      assert.equal(
        pack.questionCount,
        pack.questions.length,
        `Pack ${pack.id} questionCount mismatch`
      );
      assert.ok(pack.titleTh.trim().length > 0, `Pack ${pack.id} missing titleTh`);
      assert.ok(pack.gradeLevel.trim().length > 0, `Pack ${pack.id} missing gradeLevel`);

      if (pack.pricingType === 'free') {
        assert.equal(pack.priceThb, 0, `Free pack ${pack.id} should have priceThb === 0`);
      } else {
        assert.ok(pack.priceThb > 0, `Paid pack ${pack.id} should have priceThb > 0`);
      }

      for (const q of pack.questions) {
        assert.equal(q.strand, pack.strand, `Question ${q.id} strand mismatch with pack ${pack.id}`);
        assert.ok(q.questionTh.trim().length > 0, `Question ${q.id} empty questionTh`);
        assert.equal(q.options.length, 4, `Question ${q.id} must have 4 options`);
        for (const opt of q.options) {
          assert.ok(opt.trim().length > 0, `Question ${q.id} has empty option`);
        }
        assert.ok(
          Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex <= 3,
          `Question ${q.id} invalid correctIndex: ${q.correctIndex}`
        );
      }
    }
  });
});
