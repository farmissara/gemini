import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  advanceCityDay,
  bankDeposit,
  bankWithdraw,
  buyShopItem,
  createInitialLifeCityState,
  exchangeBankCoinsToGems,
  foundOrUpgradeCompany,
  hireCompanyStaff,
  performPoliceAction,
  performTempleAction,
  repayBankLoan,
  selectCityCareer,
  sellFarmItemToCityMarket,
  takeBankLoan,
  tradeMarketCommodity,
  useInventoryItem,
  visitCityGardenAction,
  visitHospitalAction,
  workCareerShift,
} from './lifeCityEngine';

describe('lifeCityEngine — complete city simulation', () => {
  it('allows choosing any career, working shifts, founding a company, and earning daily profit', () => {
    let state = createInitialLifeCityState('school-1', 'user-1');
    let coins = 1000;

    const careerRes = selectCityCareer(state, 'business_ceo');
    assert.equal(careerRes.ok, true);
    state = careerRes.state;
    assert.equal(state.careerId, 'business_ceo');

    const workRes = workCareerShift(state, coins);
    assert.equal(workRes.ok, true);
    assert.ok(workRes.coinDelta > 0);
    coins += workRes.coinDelta;
    state = workRes.state;
    assert.ok(state.energy < 100);

    const companyRes = foundOrUpgradeCompany(state, coins, 'บริษัท ข้าวหอมดิจิทัล');
    assert.equal(companyRes.ok, true);
    assert.ok(companyRes.coinDelta < 0);
    coins += companyRes.coinDelta;
    state = companyRes.state;
    assert.equal(state.company.founded, true);
    assert.equal(state.company.name, 'บริษัท ข้าวหอมดิจิทัล');

    const hireRes = hireCompanyStaff(state, coins);
    assert.equal(hireRes.ok, true);
    state = hireRes.state;
    assert.equal(state.company.staffCount, 2);

    const dayRes = advanceCityDay(state, coins, () => 0.5);
    assert.equal(dayRes.ok, true);
    assert.ok(dayRes.coinDelta > 0); // company daily profit
    assert.equal(dayRes.state.day, 2);
  });

  it('supports bank deposits, loans, repayments, overdue warrants, and coin-to-gem exchange', () => {
    let state = createInitialLifeCityState('school-1', 'user-1');
    let coins = 600;

    const depRes = bankDeposit(state, 300, coins);
    assert.equal(depRes.ok, true);
    coins += depRes.coinDelta;
    state = depRes.state;
    assert.equal(state.bankSavings, 500);

    const wdRes = bankWithdraw(state, 100);
    assert.equal(wdRes.ok, true);
    coins += wdRes.coinDelta;
    state = wdRes.state;
    assert.equal(state.bankSavings, 400);

    const loanRes = takeBankLoan(state, 'micro');
    assert.equal(loanRes.ok, true);
    assert.equal(loanRes.coinDelta, 400);
    coins += loanRes.coinDelta;
    state = loanRes.state;
    assert.equal(state.loans.length, 1);

    const loanId = state.loans[0].id;
    const repayRes = repayBankLoan(state, loanId, state.loans[0].remainingDue, coins);
    assert.equal(repayRes.ok, true);
    state = repayRes.state;
    assert.equal(state.loans.length, 0);
    assert.ok(state.creditScore > 620);

    const gemRes = exchangeBankCoinsToGems(state, 500);
    assert.equal(gemRes.ok, true);
    assert.equal(gemRes.gemGain, 1);
  });

  it('handles illness, hospital treatment, insurance, shops, and temple stress/karma mechanics', () => {
    let state = createInitialLifeCityState('school-1', 'user-1');
    state = { ...state, illness: 'common_cold', health: 55, energy: 40, stress: 60 };
    let coins = 800;

    const insRes = visitHospitalAction(state, 'buy_insurance', coins);
    assert.equal(insRes.ok, true);
    coins += insRes.coinDelta;
    state = insRes.state;
    assert.equal(state.hasHealthInsurance, true);

    const treatRes = visitHospitalAction(state, 'treat_illness', coins);
    assert.equal(treatRes.ok, true);
    assert.equal(treatRes.coinDelta, -45); // 50% discount from 90
    state = treatRes.state;
    assert.equal(state.illness, 'none');
    assert.equal(state.health, 100);

    const buyRes = buyShopItem(state, 'herbal_coffee', 1, coins);
    assert.equal(buyRes.ok, true);
    state = buyRes.state;
    const useRes = useInventoryItem(state, 'herbal_coffee');
    assert.equal(useRes.ok, true);
    state = useRes.state;
    assert.ok(state.energy > 40);

    const medRes = performTempleAction(state, 'meditate_free', coins);
    assert.equal(medRes.ok, true);
    state = medRes.state;
    assert.ok(state.stress < 45);

    const meritRes = performTempleAction(state, 'donate_merit', coins);
    assert.equal(meritRes.ok, true);
    assert.ok(meritRes.state.karmaPoints > state.karmaPoints);
  });

  it('enforces legal vs illegal actions, arrest/jail blocking, bail, and temple reform', () => {
    let state = createInitialLifeCityState('school-1', 'user-1');
    let coins = 1200;

    // Force caught roll (rng returns 0.05 < catchChance)
    const caughtRes = performPoliceAction(state, 'illegal_smuggle', coins, () => 0.05);
    assert.equal(caughtRes.ok, true);
    state = caughtRes.state;
    coins += caughtRes.coinDelta;
    assert.equal(state.jailDaysRemaining, 2);
    assert.ok(state.wantedLevel >= 1);
    assert.equal(state.criminalRecord, 1);

    // Work shift must be blocked while in jail
    const blockedWork = workCareerShift(state, coins);
    assert.equal(blockedWork.ok, false);

    // Pay bail clears jail & wanted level
    const bailRes = performPoliceAction(state, 'pay_bail_or_fine', coins);
    assert.equal(bailRes.ok, true);
    state = bailRes.state;
    assert.equal(state.jailDaysRemaining, 0);
    assert.equal(state.wantedLevel, 0);

    // Volunteer service at temple reduces criminal record
    const volRes = performTempleAction(state, 'volunteer_service', coins);
    assert.equal(volRes.ok, true);
    assert.equal(volRes.state.criminalRecord, 0);
  });

  it('supports market commodity trading, selling farm barn items, and visiting community gardens', () => {
    let state = createInitialLifeCityState('school-1', 'user-1');
    let coins = 1000;

    const buyComm = tradeMarketCommodity(state, 'buy', 'jasmine_rice_sack', 2, coins);
    assert.equal(buyComm.ok, true);
    coins += buyComm.coinDelta;
    state = buyComm.state;
    assert.equal(state.commodityHoldings.jasmine_rice_sack, 2);

    const sellComm = tradeMarketCommodity(state, 'sell', 'jasmine_rice_sack', 2, coins);
    assert.equal(sellComm.ok, true);
    state = sellComm.state;
    assert.equal(state.commodityHoldings.jasmine_rice_sack, 0);

    const sellFarm = sellFarmItemToCityMarket(state, 'crop', 'corn', 'ข้าวโพดหวาน', 28, 5, 2);
    assert.equal(sellFarm.ok, true);
    assert.ok(sellFarm.coinDelta > 0);
    assert.equal(sellFarm.barnDelta?.corn, -2);

    const targetCitizen = state.citizens[0];
    const visitRes = visitCityGardenAction(state, targetCitizen.id, 'water_help');
    assert.equal(visitRes.ok, true);
    assert.ok(visitRes.coinDelta > 0);
    assert.equal(visitRes.state.citizens[0].helpedToday, true);
  });
});
