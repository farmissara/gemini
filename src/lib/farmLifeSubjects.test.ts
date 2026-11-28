import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  generateCraftLifeChallenge,
  generateCropScienceChallenge,
  generateScenarioForSubject,
  generateTradeMathChallenge,
  LIFE_SUBJECT_CATALOG,
  resolveLifeSubjectChallenge,
  shuffleOptionsForDate,
} from './farmLifeSubjects';
import { createInitialFarmState, normalizeFarmState } from './schoolFarmEngine';

describe('farmLifeSubjects', () => {
  it('covers all 8 Thai curriculum subject branches with valid real-life garden scenarios', () => {
    assert.equal(LIFE_SUBJECT_CATALOG.length, 8);
    const state = createInitialFarmState({
      schoolId: 'sch-1',
      userId: 'usr-life-1',
      ownerName: 'ต้นกล้า',
    });

    for (const subject of LIFE_SUBJECT_CATALOG) {
      const scenario = generateScenarioForSubject(subject.id, state, 2);
      assert.equal(scenario.subjectId, subject.id);
      assert.equal(scenario.options.length, 4);
      assert.ok(scenario.correctIndex >= 0 && scenario.correctIndex < 4);
      assert.ok(scenario.questionTh.length > 10);
      assert.ok(scenario.realLifeTipTh.length > 10);
    }
  });

  it('triggers science water composition challenge (H2O) for jasmine rice', () => {
    const riceSci = generateCropScienceChallenge('jasmine_rice', 0);
    assert.equal(riceSci.subjectId, 'science_tech');
    assert.match(riceSci.questionTh, /H₂O|น้ำ/);
    assert.match(riceSci.options[riceSci.correctIndex], /ไฮโดรเจน.*ออกซิเจน/);
  });

  it('computes accurate live math checkout multiplication, change, and promo pricing', () => {
    // Mode 0: 3 * 50 = 150
    const mult = generateTradeMathChallenge('อัญชันลาเต้', 3, 50, 0);
    assert.equal(mult.subjectId, 'math');
    assert.equal(mult.options.length, 4);
    assert.equal(mult.options[mult.correctIndex], '150 เหรียญ');
    assert.equal(new Set(mult.options).size, 4);

    // Mode 1: total = 2 * 45 = 90 -> bill = 100 -> change = 10
    const change = generateTradeMathChallenge('ข้าวหอมมะลิ', 2, 45, 1);
    assert.equal(change.options[change.correctIndex], '10 เหรียญ');

    // Mode 2: 4 * 40 = 160 -> 10% rounded discount = 15 -> net = 145
    const promo = generateTradeMathChallenge('มะม่วงน้ำดอกไม้', 2, 40, 2);
    assert.equal(promo.options[promo.correctIndex], '145 เหรียญ');
  });

  it('covers Career, Health, Arts on craft and persists mastery in SchoolFarmState', () => {
    const career = generateCraftLifeChallenge('butterfly_pea_latte', 0);
    const health = generateCraftLifeChallenge('butterfly_pea_latte', 1);
    const arts = generateCraftLifeChallenge('butterfly_pea_latte', 2);
    assert.equal(career.subjectId, 'career_tech');
    assert.equal(health.subjectId, 'health_pe');
    assert.equal(arts.subjectId, 'arts');

    let state = createInitialFarmState({
      schoolId: 'sch-1',
      userId: 'usr-mastery',
      ownerName: 'ใบเตย',
    });
    const sci = generateCropScienceChallenge('jasmine_rice', 0);
    const win = resolveLifeSubjectChallenge(state, sci, true, '2026-11-27');
    assert.equal(win.coinsEarned, sci.rewardCoins);
    assert.equal(win.waterEarned, sci.rewardWater);
    assert.equal(win.state.lifeSubjectMastery?.science_tech?.solved, 1);
    assert.equal(win.state.lifeSubjectMastery?.science_tech?.streak, 1);
    state = win.state;

    // Wrong answer keeps solved count, resets streak, grants +5 XP consolation
    const miss = resolveLifeSubjectChallenge(state, sci, false, '2026-11-27');
    assert.equal(miss.xpEarned, 5);
    assert.equal(miss.state.lifeSubjectMastery?.science_tech?.solved, 1);
    assert.equal(miss.state.lifeSubjectMastery?.science_tech?.streak, 0);

    // Normalization preserves lifeSubjectMastery cleanly
    const rehydrated = normalizeFarmState(state, {
      schoolId: 'sch-1',
      userId: 'usr-mastery',
      ownerName: 'ใบเตย',
    });
    assert.equal(rehydrated.lifeSubjectMastery?.science_tech?.solved, 1);
  });

  it('provides crop science questions for all 6 new crops and expanded multi-seed questions across subjects', () => {
    const newCrops = ['morning_glory', 'chili', 'holy_basil', 'banana', 'watermelon', 'pineapple'] as const;
    for (const cropId of newCrops) {
      const challenge = generateCropScienceChallenge(cropId, 0);
      assert.equal(challenge.subjectId, 'science_tech');
      assert.equal(challenge.options.length, 4);
      assert.ok(challenge.correctIndex >= 0 && challenge.correctIndex < 4);
      assert.ok(challenge.questionTh.length > 10);
    }

    const state = createInitialFarmState({
      schoolId: 'sch-1',
      userId: 'usr-expand-q',
      ownerName: 'ต้นกล้า',
    });

    for (const subject of LIFE_SUBJECT_CATALOG) {
      for (const seedIdx of [0, 1, 2, 3]) {
        const scenario = generateScenarioForSubject(subject.id, state, seedIdx);
        assert.equal(scenario.subjectId, subject.id);
        assert.equal(scenario.options.length, 4);
        assert.ok(scenario.correctIndex >= 0 && scenario.correctIndex < 4);
        assert.equal(new Set(scenario.options).size, 4);
      }
    }
  });

  it('randomizes answer choice order across different days while preserving the exact right answer', () => {
    const sampleOpts = ['คำตอบที่ถูก', 'ตัวหลอก A', 'ตัวหลอก B', 'ตัวหลอก C'];
    const dates = Array.from({ length: 10 }, (_, i) => `2026-12-${String(i + 1).padStart(2, '0')}`);

    // Deterministic within the same day
    const day1a = shuffleOptionsForDate(sampleOpts, 0, '2026-12-01', 'q-test');
    const day1b = shuffleOptionsForDate(sampleOpts, 0, '2026-12-01', 'q-test');
    assert.deepEqual(day1a, day1b);
    assert.equal(day1a.options[day1a.correctIndex], 'คำตอบที่ถูก');

    // Changes correctIndex & option ordering across multiple dates
    const indicesAcrossDays = new Set(
      dates.map((d) => {
        const res = shuffleOptionsForDate(sampleOpts, 0, d, 'q-test');
        assert.equal(res.options[res.correctIndex], 'คำตอบที่ถูก');
        assert.equal(new Set(res.options).size, 4);
        return res.correctIndex;
      })
    );
    assert.ok(indicesAcrossDays.size >= 3);

    // Subject challenges also vary correctIndex across days while keeping exact answer text
    const craftIndices = new Set(
      dates.map((d) => {
        const c = generateCraftLifeChallenge('butterfly_pea_latte', 0, d);
        assert.equal(c.options.length, 4);
        assert.ok(c.options[c.correctIndex].includes('ต้มหัวเชื้อชา'));
        return c.correctIndex;
      })
    );
    assert.ok(craftIndices.size >= 2);
  });
});
