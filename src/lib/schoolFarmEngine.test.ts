import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  applyAttendanceStreakGoldenBonus,
  applyDailyFertilizerTile,
  applyQuizBoostReward,
  buyDailyDirtBargain,
  buyFromNeighborRoadsideShop,
  buySeedPack,
  calculateTownProsperity,
  claimDisciplineSupplies,
  claimFarmAchievement,
  clearWeedOnTile,
  collectAllReadyForBuilding,
  collectBuildingYield,
  collectReadyProductionJob,
  computeDisciplineChestSummary,
  computeStudentPresentStreak,
  constructBuildingOnTile,
  convertFarmCoinsToGems,
  craftProductOnFarm,
  createInitialFarmState,
  DEFAULT_FARM_OWNER_CHARACTER,
  dismissVisitorRequest,
  enqueueProductionJob,
  expandFarmGridTo8x8,
  fertilizeTile,
  fulfillMarketOrder,
  fulfillVisitorRequest,
  generateDailyDirtListings,
  getBuildingMaxQueueSlots,
  getFarmAchievementProgress,
  getFarmGridSize,
  getNpcDailyQuotaStatus,
  harvestTile,
  helpNeighborFarm,
  listItemInRoadsideShop,
  normalizeFarmState,
  plantCropOnTile,
  sellCropFromBarn,
  speedUpProductionJob,
  spinDailyLuckyWheel,
  syncBehaviorWeedsOntoFarm,
  tillPlotTile,
  unlockPlotTile,
  updateFarmOwnerCharacter,
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

  it('starts with Hay Day starter farmstead, supports crafting products, NPC visitors, roadside shop trading, and compound orders', () => {
    let state = createInitialFarmState({
      schoolId: 'sch-1',
      userId: 'usr-seller',
      ownerName: 'ปันปัน',
    });

    // Starter farmstead does not start at 0
    assert.ok(state.coins >= 350);
    assert.equal(state.tiles[8].buildingId, 'farm_cottage');
    assert.equal(state.tiles[9].buildingId, 'chicken_coop');
    assert.equal(state.tiles[19].buildingId, 'wooden_fence');
    assert.equal(state.goods.egg, 1);
    assert.ok(state.visitorQueue.length >= 2);

    // Harvest starter corn at index 14, then craft Fresh Egg at starter chicken_coop
    const hCorn = harvestTile(state, 14);
    assert.equal(hCorn.ok, true);
    state = hCorn.state;
    assert.equal(state.barn.corn, 1);

    const craftedEgg = craftProductOnFarm(state, 'egg');
    assert.equal(craftedEgg.ok, true);
    state = craftedEgg.state;
    assert.equal(state.barn.corn, 0);
    assert.equal(state.goods.egg, 2);

    // Compound order check (tomato + egg)
    state = {
      ...state,
      barn: { ...state.barn, tomato: 2, corn: 3 },
    };
    const compoundOrder = state.marketOrders.find((o) => o.productId === 'egg');
    assert.ok(compoundOrder);
    const ordDelivered = fulfillMarketOrder(state, compoundOrder.id);
    assert.equal(ordDelivered.ok, true);
    state = ordDelivered.state;
    assert.equal(state.goods.egg, 1);

    // Serve NPC visitor & dismiss another
    const cornVisitor = state.visitorQueue.find((v) => v.itemId === 'corn');
    assert.ok(cornVisitor);
    const served = fulfillVisitorRequest(state, cornVisitor.id);
    assert.equal(served.ok, true);
    state = served.state;
    assert.equal(state.barn.corn, 1);

    const firstVisId = state.visitorQueue[0].id;
    const afterDismiss = dismissVisitorRequest(state, firstVisId);
    assert.equal(afterDismiss.visitorQueue.length, state.visitorQueue.length);

    // Roadside shop listing & neighbor purchase
    const listed = listItemInRoadsideShop(state, 'product', 'egg', 1, 60);
    assert.equal(listed.ok, true);
    state = listed.state;
    assert.equal(state.goods.egg, 0);
    assert.equal(state.roadsideShop.length, 1);

    const buyer = createInitialFarmState({
      schoolId: 'sch-1',
      userId: 'usr-buyer',
      ownerName: 'น้ำใส',
    });
    // Prevent self-buy
    const selfBuy = buyFromNeighborRoadsideShop(state, state, state.roadsideShop[0].id);
    assert.equal(selfBuy.ok, false);

    const trade = buyFromNeighborRoadsideShop(buyer, state, state.roadsideShop[0].id);
    assert.equal(trade.ok, true);
    assert.equal(trade.buyerState.coins, buyer.coins - 60);
    assert.equal(trade.buyerState.goods.egg, buyer.goods.egg + 1);
    assert.equal(trade.sellerState.coins, state.coins + 60);
    assert.equal(trade.sellerState.roadsideShop[0].sold, true);
  });

  it('grants Golden Fertilizer (2x crop growth speed) when attendance streak exceeds 5 days', () => {
    let state = createInitialFarmState({
      schoolId: 'sch-1',
      userId: 'usr-streak',
      studentId: 'stu-1',
      ownerName: 'มะลิ',
    });

    const fiveDaysRecords: AttendanceRecord[] = ['2026-11-23', '2026-11-24', '2026-11-25', '2026-11-26', '2026-11-27'].map(
      (date, i) => ({
        id: `att-s-${i}`,
        studentId: 'stu-1',
        date,
        time: '07:45:00',
        status: 'present',
        checkinMethod: 'qr_scanner',
      })
    );
    const ids = new Set(['stu-1']);
    assert.equal(computeStudentPresentStreak(fiveDaysRecords, ids), 5);

    // 5 days exactly does NOT grant >5-day Golden Fertilizer bonus
    const noBonus = applyAttendanceStreakGoldenBonus(state, 5, '2026-11-27');
    assert.equal(noBonus.granted, false);
    assert.equal(noBonus.state.goldenFertilizerStatus, undefined);

    // 6 consecutive days (> 5) grants +2 Golden Fertilizer & activates 2x speed
    const sixDaysRecords: AttendanceRecord[] = [
      {
        id: 'att-s-prev',
        studentId: 'stu-1',
        date: '2026-11-20', // Friday before Monday 2026-11-23 (weekend gap = 3 days)
        time: '07:45:00',
        status: 'present',
        checkinMethod: 'qr_scanner',
      },
      ...fiveDaysRecords,
    ];
    const streak6 = computeStudentPresentStreak(sixDaysRecords, ids);
    assert.equal(streak6, 6);

    const grantedBonus = applyAttendanceStreakGoldenBonus(state, streak6, '2026-11-27');
    assert.equal(grantedBonus.granted, true);
    state = grantedBonus.state;
    assert.equal(state.fertilizer, 4);
    assert.equal(state.goldenFertilizerStatus?.speedMultiplier, 2);

    // Idempotent on the same date
    const dupBonus = applyAttendanceStreakGoldenBonus(state, streak6, '2026-11-27');
    assert.equal(dupBonus.granted, false);
    assert.equal(dupBonus.state.fertilizer, 4);

    // Watering a newly planted crop with 2x Golden Fertilizer advances growthProgress by +2 in 1 water
    const planted = plantCropOnTile(state, 7, 'corn'); // corn needs 2 waters
    assert.equal(planted.ok, true);
    state = planted.state;
    const watered = waterTile(state, 7);
    assert.equal(watered.ok, true);
    assert.equal(watered.matured, true);
    assert.equal(watered.state.tiles[7].growthProgress, 2);
  });

  it('enforces daily NPC villager quotas (3/day) and supports coin-to-gem marketplace conversion', () => {
    let state = createInitialFarmState({
      schoolId: 'sch-1',
      userId: 'usr-market',
      ownerName: 'ต้นกล้า',
    });
    state = {
      ...state,
      barn: { ...state.barn, corn: 12 },
    };

    const today = '2026-11-27';
    const nextDay = '2026-11-28';

    // Serve aunt_malee up to her daily quota of 3 times on the same date
    for (let i = 0; i < 3; i += 1) {
      state = {
        ...state,
        visitorQueue: [
          {
            id: `vis-malee-${i}`,
            npcId: 'aunt_malee',
            nameTh: 'ป้ามาลี',
            roleTh: 'ผู้มาเยือน',
            dialogueTh: 'ขอซื้อข้าวโพดจ้า',
            itemKind: 'crop',
            itemId: 'corn',
            quantity: 2,
            rewardCoins: 76,
            rewardXp: 24,
            rewardGems: 2,
            dailyQuotaLimit: 3,
          },
        ],
      };
      const res = fulfillVisitorRequest(state, `vis-malee-${i}`, today);
      assert.equal(res.ok, true);
      state = res.state;
    }

    const exhaustedQuota = getNpcDailyQuotaStatus(state, 'aunt_malee', today, 3);
    assert.equal(exhaustedQuota.servedToday, 3);
    assert.equal(exhaustedQuota.remaining, 0);

    // 4th attempt on same day for aunt_malee is blocked
    state = {
      ...state,
      visitorQueue: [
        {
          id: 'vis-malee-4',
          npcId: 'aunt_malee',
          nameTh: 'ป้ามาลี',
          roleTh: 'ผู้มาเยือน',
          dialogueTh: 'ขอซื้อเพิ่มอีกจ้า',
          itemKind: 'crop',
          itemId: 'corn',
          quantity: 2,
          rewardCoins: 76,
          rewardXp: 24,
          rewardGems: 2,
          dailyQuotaLimit: 3,
        },
      ],
    };
    const blocked = fulfillVisitorRequest(state, 'vis-malee-4', today);
    assert.equal(blocked.ok, false);

    // Next day resets daily NPC quota cleanly
    const freshQuota = getNpcDailyQuotaStatus(state, 'aunt_malee', nextDay, 3);
    assert.equal(freshQuota.remaining, 3);
    const nextDayServe = fulfillVisitorRequest(state, 'vis-malee-4', nextDay);
    assert.equal(nextDayServe.ok, true);

    // Convert 50 coins -> +10 gems
    const convOk = convertFarmCoinsToGems(nextDayServe.state, 50, 10);
    assert.equal(convOk.ok, true);
    assert.equal(convOk.state.coins, nextDayServe.state.coins - 50);

    // Block insufficient coins
    const convFail = convertFarmCoinsToGems({ ...convOk.state, coins: 20 }, 50, 10);
    assert.equal(convFail.ok, false);
  });

  it('initializes, normalizes, and updates customizable FarmOwnerCharacter', () => {
    const initial = createInitialFarmState({
      schoolId: 'sch-1',
      userId: 'usr-owner',
      ownerName: 'ต้นข้าว',
    });
    assert.deepEqual(initial.ownerCharacter, DEFAULT_FARM_OWNER_CHARACTER);

    // Legacy snapshot missing ownerCharacter falls back safely
    const legacyNormalized = normalizeFarmState(
      { coins: 500 },
      { schoolId: 'sch-1', userId: 'usr-owner', ownerName: 'ต้นข้าว' }
    );
    assert.deepEqual(legacyNormalized.ownerCharacter, DEFAULT_FARM_OWNER_CHARACTER);
    assert.equal(legacyNormalized.coins, 500);

    // Customize style & colors and verify persistence through normalizeFarmState
    const customized = updateFarmOwnerCharacter(initial, {
      styleId: 'girl_farmer',
      hatColor: '#86efac',
      outfitColor: '#e11d48',
      hairColor: '#1e293b',
    });
    assert.equal(customized.ownerCharacter.styleId, 'girl_farmer');
    assert.equal(customized.ownerCharacter.hatColor, '#86efac');

    const rehydrated = normalizeFarmState(customized, {
      schoolId: 'sch-1',
      userId: 'usr-owner',
      ownerName: 'ต้นข้าว',
    });
    assert.deepEqual(rehydrated.ownerCharacter, customized.ownerCharacter);
  });

  it('supports Daily Lucky Spin Wheel, Farmhouse Achievements, and Daily Dirt Newspaper bargains', () => {
    let state = createInitialFarmState({
      schoolId: 'sch-1',
      userId: 'usr-hayday',
      ownerName: 'ใบเตย',
    });
    const today = '2026-11-27';

    // 1. Daily Lucky Wheel (slot 5 = Jackpot +150 coins)
    const spin1 = spinDailyLuckyWheel(state, today, 5);
    assert.equal(spin1.ok, true);
    assert.equal(spin1.slotIndex, 5);
    assert.equal(spin1.state.coins, state.coins + 150);
    assert.equal(spin1.state.lastSpinWheelDate, today);
    state = spin1.state;

    // Duplicate same-day spin is blocked
    const spinDup = spinDailyLuckyWheel(state, today, 0);
    assert.equal(spinDup.ok, false);

    // Next day spin succeeds (slot 2 = +2 fertilizer)
    const spinNext = spinDailyLuckyWheel(state, '2026-11-28', 2);
    assert.equal(spinNext.ok, true);
    assert.equal(spinNext.state.fertilizer, state.fertilizer + 2);
    state = spinNext.state;

    // 2. Farmhouse Achievements
    const unfinishedClaim = claimFarmAchievement(state, 'ach-harvest-5');
    assert.equal(unfinishedClaim.ok, false);

    state = { ...state, totalHarvested: 5 };
    const progressList = getFarmAchievementProgress(state);
    const harvestAch = progressList.find((a) => a.id === 'ach-harvest-5');
    assert.ok(harvestAch);
    assert.equal(harvestAch.completed, true);
    assert.equal(harvestAch.claimed, false);

    const coinsBeforeAch = state.coins;
    const starsBeforeAch = state.townStars;
    const achClaim = claimFarmAchievement(state, 'ach-harvest-5');
    assert.equal(achClaim.ok, true);
    assert.equal(achClaim.state.coins, coinsBeforeAch + 90);
    assert.equal(achClaim.state.townStars, starsBeforeAch + 1);
    state = achClaim.state;

    // Duplicate achievement claim blocked
    const achDup = claimFarmAchievement(state, 'ach-harvest-5');
    assert.equal(achDup.ok, false);

    // 3. Daily Dirt Newspaper listings & purchase
    let neighbor = createInitialFarmState({
      schoolId: 'sch-1',
      userId: 'usr-neighbor',
      ownerName: 'ปอปอ',
    });
    const listed = listItemInRoadsideShop(neighbor, 'product', 'egg', 1, 55);
    assert.equal(listed.ok, true);
    neighbor = listed.state;

    const ads = generateDailyDirtListings(state.userId, [state, neighbor], today);
    assert.ok(ads.length >= 2);
    assert.equal(ads.some((a) => a.sellerUserId === state.userId), false);
    const neighborAd = ads.find((a) => a.isNeighborListing && a.sellerUserId === neighbor.userId);
    assert.ok(neighborAd);

    const npcAd = ads.find((a) => !a.isNeighborListing);
    assert.ok(npcAd);
    const coinsBeforeBuy = state.coins;
    const boughtNpc = buyDailyDirtBargain(state, npcAd);
    assert.equal(boughtNpc.ok, true);
    assert.equal(boughtNpc.state.coins, coinsBeforeBuy - npcAd.priceCoins);
  });

  it('supports Thai Integrated Farm crops, multi-tier Garden Café production chains, and timed production queues', () => {
    let state = createInitialFarmState({
      schoolId: 'sch-1',
      userId: 'usr-cafe',
      ownerName: 'ใบชา',
    });

    // Starter farm already owns herbal_pavilion & garden_cafe, plus ready butterfly_pea at tile index 20 (3,2)
    assert.ok(state.tiles.some((t) => t.buildingId === 'herbal_pavilion'));
    assert.ok(state.tiles.some((t) => t.buildingId === 'garden_cafe'));
    assert.equal(getBuildingMaxQueueSlots(state, 'herbal_pavilion'), 3);

    // Harvest starter butterfly_pea at index 20 -> (3,2)
    const harvestedBp = harvestTile(state, 20);
    assert.equal(harvestedBp.ok, true);
    assert.equal(harvestedBp.cropId, 'butterfly_pea');
    state = harvestedBp.state;

    // Seed barn with pandan and milk to test full chain:
    // butterfly_pea + pandan -> herbal_tea_base (herbal_pavilion) -> butterfly_pea_latte (garden_cafe)
    state = {
      ...state,
      barn: { ...state.barn, butterfly_pea: 2, pandan: 2 },
      goods: { ...state.goods, milk: 1 },
    };

    const t0 = 1_700_000_000_000;
    const queuedTea = enqueueProductionJob(state, 'herbal_tea_base', t0);
    assert.equal(queuedTea.ok, true);
    assert.ok(queuedTea.job);
    state = queuedTea.state;
    assert.equal(state.barn.butterfly_pea, 1);
    assert.equal(state.barn.pandan, 1);

    // Collecting early fails cleanly
    const tooEarly = collectReadyProductionJob(state, queuedTea.job.id, t0 + 1000);
    assert.equal(tooEarly.ok, false);

    // Collecting after craftTimeSec (15s) succeeds
    const collectedTea = collectReadyProductionJob(state, queuedTea.job.id, t0 + 20_000);
    assert.equal(collectedTea.ok, true);
    assert.equal(collectedTea.productId, 'herbal_tea_base');
    state = collectedTea.state;
    assert.equal(state.goods.herbal_tea_base, 1);

    // Tier-2 craft at garden_cafe: herbal_tea_base + milk -> butterfly_pea_latte
    const queuedLatte = enqueueProductionJob(state, 'butterfly_pea_latte', t0 + 20_000);
    assert.equal(queuedLatte.ok, true);
    assert.ok(queuedLatte.job);
    state = queuedLatte.state;
    assert.equal(state.goods.herbal_tea_base, 0);
    assert.equal(state.goods.milk, 0);

    // Enqueue another herbal tea base and speed it up for 10 coins
    const queuedTea2 = enqueueProductionJob(state, 'herbal_tea_base', t0 + 21_000);
    assert.equal(queuedTea2.ok, true);
    assert.ok(queuedTea2.job);
    state = queuedTea2.state;
    const coinsBeforeSpeed = state.coins;
    const sped = speedUpProductionJob(state, queuedTea2.job.id, 10);
    assert.equal(sped.ok, true);
    state = sped.state;
    assert.equal(state.coins, coinsBeforeSpeed - 10);
    assert.equal(state.goods.herbal_tea_base, 1);

    // Batch-collect ready items at garden_cafe once finished
    const batch = collectAllReadyForBuilding(state, 'garden_cafe', t0 + 100_000);
    assert.equal(batch.collectedCount, 1);
    state = batch.state;
    assert.equal(state.goods.butterfly_pea_latte, 1);
  });
});


