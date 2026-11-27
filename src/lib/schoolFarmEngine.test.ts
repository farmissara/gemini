import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyDailyFertilizerTile,
  applyQuizBoostReward,
  buySeedPack,
  calculateTownProsperity,
  claimDisciplineSupplies,
  clearWeedOnTile,
  collectBuildingYield,
  computeDisciplineChestSummary,
  constructBuildingOnTile,
  createInitialFarmState,
  expandFarmGridTo8x8,
  fertilizeTile,
  fulfillMarketOrder,
  getFarmGridSize,
  harvestTile,
  helpNeighborFarm,
  plantCropOnTile,
  sellCropFromBarn,
  syncBehaviorWeedsOntoFarm,
  tillPlotTile,
  unlockPlotTile,
  upgradeBuildingOnTile,
  waterTile,
} from './schoolFarmEngine';
import type {
  Assignment,
  AttendanceRecord,
  AuthUser,
  BehaviorRecord,
  HomeworkSubmission,
  Student,
} from '../types';

const makeStudent = (): Student => ({
  id: 'stu-1',
  schoolId: 'sch-1',
  studentIdNumber: '69001',
  firstNameEn: 'Somchai',
  lastNameEn: 'Jaidee',
  firstNameTh: 'สมชาย',
  lastNameTh: 'ใจดี',
  gender: 'male',
  dateOfBirth: '2012-05-01',
  gradeLevel: 'ม.2',
  room: '2/1',
  status: 'active',
  avatarUrl: '',
  gpa: 3.6,
  guardianName: 'ผู้ปกครอง',
  guardianRelation: 'บิดา',
  guardianPhone: '0800000000',
  guardianEmail: 'parent@school.test',
  enrolledDate: '2026-05-15',
});

const makeUser = (): AuthUser => ({
  id: 'usr-stu-1',
  email: 'somchai@school.test',
  fullNameTh: 'สมชาย ใจดี',
  fullNameEn: 'Somchai Jaidee',
  role: 'student',
  schoolId: 'sch-1',
  avatarUrl: '',
  studentRecordId: 'stu-1',
});

describe('schoolFarmEngine', () => {
  it('computes and claims supplies idempotently from attendance, homework, and merit records', () => {
    const state = createInitialFarmState({
      schoolId: 'sch-1',
      userId: 'usr-stu-1',
      studentId: 'stu-1',
      ownerName: 'สมชาย ใจดี',
      ownerRoom: 'ม.2/1',
    });
    const student = makeStudent();
    const user = makeUser();
    const today = '2026-11-27';

    const attendance: AttendanceRecord[] = [
      {
        id: 'att-1',
        studentId: 'stu-1',
        date: '2026-11-25',
        time: '07:45:00',
        status: 'present',
        checkinMethod: 'qr_scanner',
      },
      {
        id: 'att-2',
        studentId: 'stu-1',
        date: '2026-11-26',
        time: '07:50:00',
        status: 'present',
        checkinMethod: 'qr_scanner',
      },
      {
        id: 'att-3',
        studentId: 'stu-1',
        date: today,
        time: '07:40:00',
        status: 'present',
        checkinMethod: 'qr_scanner',
      },
    ];

    const assignments: Assignment[] = [
      {
        id: 'asg-1',
        courseId: 'crs-1',
        titleTh: 'แบบฝึกหัดคณิตบทที่ 1',
        titleEn: 'Math Exercise 1',
        dueDate: today,
        points: 10,
        submittedStudentIds: ['stu-1'],
        status: 'active',
      },
      {
        id: 'asg-2',
        courseId: 'crs-1',
        titleTh: 'เรียงความภาษาไทย',
        titleEn: 'Thai Essay',
        dueDate: today,
        points: 10,
        submittedStudentIds: [],
        status: 'active',
      },
    ];

    const submissions: HomeworkSubmission[] = [
      {
        id: 'sub-1',
        assignmentId: 'asg-1',
        assignmentTitle: 'แบบฝึกหัดคณิตบทที่ 1',
        courseCode: 'MA201',
        courseTitleTh: 'คณิตศาสตร์',
        studentId: 'stu-1',
        studentName: 'สมชาย ใจดี',
        studentRoom: 'ม.2/1',
        dueDate: today,
        status: 'submitted',
        maxScore: 10,
      },
    ];

    const behaviors: BehaviorRecord[] = [
      {
        id: 'beh-1',
        studentId: 'stu-1',
        studentName: 'สมชาย ใจดี',
        studentRoom: 'ม.2/1',
        date: today,
        type: 'merit',
        points: 10,
        category: 'ช่วยเหลือกิจกรรม',
        notes: 'ช่วยครูจัดห้องสมุด',
        recordedBy: 'ครูสมศรี',
      },
      {
        id: 'beh-2',
        studentId: 'stu-1',
        studentName: 'สมชาย ใจดี',
        studentRoom: 'ม.2/1',
        date: today,
        type: 'demerit',
        points: 5,
        category: 'ลืมอุปกรณ์การเรียน',
        notes: 'ไม่นำสมุดมา 1 ครั้ง',
        recordedBy: 'ครูสมศรี',
      },
    ];

    const summary = computeDisciplineChestSummary({
      farmState: state,
      currentUser: user,
      students: [student],
      attendance,
      periodAttendance: [],
      homeworkSubmissions: submissions,
      assignments,
      behaviorRecords: behaviors,
      todayDate: today,
    });

    assert.equal(summary.attendanceStatusToday, 'present');
    assert.equal(summary.attendanceStreakDays, 3);
    assert.equal(summary.submittedHomeworkCount, 1);
    assert.equal(summary.pendingHomeworkCount, 1);
    assert.equal(summary.hasAnythingToClaim, true);
    assert.equal(summary.claimableWater, 5); // 4 present + 1 streak bonus
    assert.equal(summary.claimableFertilizer, 2);
    assert.equal(summary.claimableStars, 2); // 10 merit / 5
    assert.equal(summary.claimableSeeds.strawberry, 1);
    assert.deepEqual(summary.unresolvedDemeritIds, ['beh-2']);

    const claimed = claimDisciplineSupplies(state, summary);
    assert.equal(claimed.water, state.water + 5);
    assert.equal(claimed.townStars, state.townStars + 2);
    assert.equal(claimed.seeds.strawberry, 1);

    // Re-computing immediately should prevent duplicate claiming on the same day/records
    const secondSummary = computeDisciplineChestSummary({
      farmState: claimed,
      currentUser: user,
      students: [student],
      attendance,
      periodAttendance: [],
      homeworkSubmissions: submissions,
      assignments,
      behaviorRecords: behaviors,
      todayDate: today,
    });
    assert.equal(secondSummary.hasAnythingToClaim, false);
    assert.equal(secondSummary.claimableWater, 0);
  });

  it('supports planting, watering, fertilizing, harvesting, barn selling, and market orders', () => {
    let state = createInitialFarmState({
      schoolId: 'sch-1',
      userId: 'usr-stu-1',
      ownerName: 'สมชาย ใจดี',
    });

    // Starter plot at (2,2) -> index 14 is ready corn
    const starterHarvest = harvestTile(state, 14);
    assert.equal(starterHarvest.ok, true);
    assert.equal(starterHarvest.cropId, 'corn');
    state = starterHarvest.state;
    assert.equal(state.barn.corn, 1);

    // Plant corn on now-empty index 14
    const planted = plantCropOnTile(state, 14, 'corn');
    assert.equal(planted.ok, true);
    state = planted.state;
    assert.equal(state.tiles[14].kind, 'crop');

    // Fertilize plot 14 for double yield & instant maturity
    const fert = fertilizeTile(state, 14);
    assert.equal(fert.ok, true);
    state = fert.state;
    assert.equal(state.tiles[14].fertilized, true);

    const doubleHarvest = harvestTile(state, 14);
    assert.equal(doubleHarvest.ok, true);
    assert.equal(doubleHarvest.harvestedQty, 2);
    state = doubleHarvest.state;
    assert.equal(state.barn.corn, 3);

    // Water starter tomato at (2,3) -> index 15
    const watered = waterTile(state, 15);
    assert.equal(watered.ok, true);
    assert.equal(watered.matured, true);
    state = watered.state;

    // Fulfill first market order (2 corn)
    const cornOrder = state.marketOrders.find((o) => o.cropId === 'corn');
    assert.ok(cornOrder);
    const coinsBefore = state.coins;
    const orderRes = fulfillMarketOrder(state, cornOrder.id);
    assert.equal(orderRes.ok, true);
    state = orderRes.state;
    assert.ok(state.coins > coinsBefore);
    assert.equal(state.totalOrdersCompleted, 1);

    // Sell remaining 1 corn directly & buy 1 tomato seed
    const sold = sellCropFromBarn(state, 'corn', 1);
    assert.equal(sold.ok, true);
    state = sold.state;
    assert.equal(state.barn.corn, 0);

    const bought = buySeedPack(state, 'tomato', 1);
    assert.equal(bought.ok, true);
    state = bought.state;
    assert.equal(state.seeds.tomato, 3);
  });

  it('spawns demerit weeds, clears them cleanly, unlocks plots, and constructs buildings', () => {
    let state = createInitialFarmState({
      schoolId: 'sch-1',
      userId: 'usr-stu-1',
      ownerName: 'สมชาย ใจดี',
    });

    state = syncBehaviorWeedsOntoFarm(state, ['dem-1']);
    const weedTile = state.tiles.find((t) => t.kind === 'weed');
    assert.ok(weedTile);

    const cleared = clearWeedOnTile(state, weedTile.index);
    assert.equal(cleared.ok, true);
    state = cleared.state;
    assert.equal(state.tiles[weedTile.index].kind, 'empty');
    assert.ok(state.resolvedDemeritIds.includes('dem-1'));

    // Unlock outer corner tile (0,0) -> index 0
    const unlocked = unlockPlotTile(state, 0);
    assert.equal(unlocked.ok, true);
    state = unlocked.state;
    assert.equal(state.tiles[0].unlocked, true);

    // Build chicken coop on empty unlocked tile (0)
    const built = constructBuildingOnTile(state, 0, 'chicken_coop');
    assert.equal(built.ok, true);
    state = built.state;
    assert.equal(state.tiles[0].kind, 'building');

    const collected = collectBuildingYield(state, 0, '2026-11-27');
    assert.equal(collected.ok, true);
    assert.equal(collected.coinsEarned, 28);
    state = collected.state;

    // Duplicate same-day collection is blocked
    const dup = collectBuildingYield(state, 0, '2026-11-27');
    assert.equal(dup.ok, false);
    assert.ok(calculateTownProsperity(state) > 100);
  });

  it('caps quiz boost at 3/day and supports neighbor farm cooperation', () => {
    let helper = createInitialFarmState({
      schoolId: 'sch-1',
      userId: 'usr-1',
      ownerName: 'กิตติ',
    });
    const neighbor = createInitialFarmState({
      schoolId: 'sch-1',
      userId: 'usr-2',
      ownerName: 'มะลิ',
    });

    for (let i = 0; i < 3; i += 1) {
      const boost = applyQuizBoostReward(helper, '2026-11-27');
      assert.equal(boost.ok, true);
      helper = boost.state;
    }
    const fourth = applyQuizBoostReward(helper, '2026-11-27');
    assert.equal(fourth.ok, false);

    const coop = helpNeighborFarm(helper, neighbor, '2026-11-27');
    assert.equal(coop.ok, true);
    assert.equal(coop.neighborState.water, neighbor.water + 2);

    const repeat = helpNeighborFarm(coop.helperState, coop.neighborState, '2026-11-27');
    assert.equal(repeat.ok, false);
  });

  it('denies free water bonus when late/absent, supports building upgrades, 8x8 expansion, and targeted neighbor crop watering', () => {
    const student = makeStudent();
    const user = makeUser();
    const today = '2026-11-27';
    let state = createInitialFarmState({
      schoolId: 'sch-1',
      userId: 'usr-stu-1',
      studentId: 'stu-1',
      ownerName: 'สมชาย ใจดี',
    });

    // Late attendance grants 0 free daily water bonus
    const lateSummary = computeDisciplineChestSummary({
      farmState: state,
      currentUser: user,
      students: [student],
      attendance: [
        {
          id: 'att-late',
          studentId: 'stu-1',
          date: today,
          time: '08:30:00',
          status: 'late',
          checkinMethod: 'qr_scanner',
        },
      ],
      periodAttendance: [],
      homeworkSubmissions: [],
      assignments: [],
      behaviorRecords: [],
      todayDate: today,
    });
    assert.equal(lateSummary.attendanceStatusToday, 'late');
    assert.equal(lateSummary.claimableWater, 0);

    // Daily fertilizer advances growth +1 without consuming water
    const dailyFert = applyDailyFertilizerTile(state, 15); // starter tomato (1/2)
    assert.equal(dailyFert.ok, true);
    assert.equal(dailyFert.matured, true);
    state = dailyFert.state;

    // Till an unlocked empty tile (row 1, col 1 -> index 7)
    state = {
      ...state,
      tiles: state.tiles.map((t, i) => (i === 7 ? { ...t, tilled: false } : t)),
    };
    const tilled = tillPlotTile(state, 7);
    assert.equal(tilled.ok, true);
    state = tilled.state;
    assert.equal(state.tiles[7].tilled, true);

    // Build and upgrade chicken coop to Lv.2
    state = { ...state, coins: 300, townStars: 12, farmXp: 200 };
    const built = constructBuildingOnTile(state, 7, 'chicken_coop');
    assert.equal(built.ok, true);
    state = built.state;

    const upgraded = upgradeBuildingOnTile(state, 7);
    assert.equal(upgraded.ok, true);
    assert.equal(upgraded.newLevel, 2);
    state = upgraded.state;

    // Expand grid from 6x6 to 8x8 while preserving existing building at (1,1) -> shifted to (2,2) = index 18
    const expanded = expandFarmGridTo8x8(state);
    assert.equal(expanded.ok, true);
    state = expanded.state;
    assert.equal(getFarmGridSize(state), 8);
    assert.equal(state.tiles.length, 64);
    assert.equal(state.tiles[2 * 8 + 2].kind, 'building');
    assert.equal(state.tiles[2 * 8 + 2].buildingId, 'chicken_coop');
    assert.equal(state.tiles[2 * 8 + 2].buildingLevel, 2);

    // Interactive neighbor crop watering advances friend's crop on targetTileIndex 15
    const friend = createInitialFarmState({
      schoolId: 'sch-1',
      userId: 'usr-friend',
      ownerName: 'เพื่อนรัก',
    });
    const helpRes = helpNeighborFarm(state, friend, today, 15);
    assert.equal(helpRes.ok, true);
    assert.equal(helpRes.wateredCropTile, true);
    assert.equal(helpRes.neighborState.tiles[15].growthProgress, 2);
  });
});
