import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildIsoStructure,
  buySeedIntoInventory,
  collectIsoBuildingProduct,
  createInitialIsometricFarmState,
  fertilizeIsoCrop,
  fulfillTruckOrder,
  gridToIso,
  harvestIsoCrop,
  isoToGrid,
  plantIsoCrop,
  sellCropFromInventory,
  tickIsoFarmGrowth,
  tillIsoTile,
  unlockIsoPlot,
  waterIsoCrop,
} from '../features/game/useFarmGameState';

describe('useFarmGameState isometric farm engine', () => {
  it('projects grid coordinates to isometric space and back accurately', () => {
    const tileW = 112;
    const tileH = 56;
    const originX = 500;
    const originY = 180;

    for (let row = 0; row < 8; row += 1) {
      for (let col = 0; col < 8; col += 1) {
        const pt = gridToIso(row, col, tileW, tileH, originX, originY);
        const mappedCenter = isoToGrid(pt.x, pt.y, tileW, tileH, originX, originY);
        const mappedUpper = isoToGrid(pt.x, pt.y - tileH * 0.25, tileW, tileH, originX, originY);
        const mappedLower = isoToGrid(pt.x, pt.y + tileH * 0.25, tileW, tileH, originX, originY);
        assert.deepEqual(mappedCenter, { row, col });
        assert.deepEqual(mappedUpper, { row, col });
        assert.deepEqual(mappedLower, { row, col });
      }
    }
  });

  it('progresses crops through growth stages, supports golden fertilizer x2 yield, and updates gold/XP progression', () => {
    const t0 = 1_700_000_000_000;
    let state = createInitialIsometricFarmState({
      schoolId: 'sch-1',
      userId: 'stu-1',
      ownerName: 'ปันปัน',
      nowMs: t0,
    });

    assert.equal(state.gridSize, 8);
    assert.equal(state.gold, 420);
    assert.equal(state.level, 1);

    // Harvest starter wheat at (3,2)
    const hStarter = harvestIsoCrop(state, 3, 2);
    assert.equal(hStarter.ok, true);
    assert.equal(hStarter.cropId, 'wheat');
    state = hStarter.state;
    assert.equal(state.inventory.crops.wheat, 4); // 2 starter + 2 harvested

    // Plant wheat back on (3,2), then tick time to advance stages: seed -> sprout -> growing -> flowering -> harvestable
    const planted = plantIsoCrop(state, 3, 2, 'wheat', t0);
    assert.equal(planted.ok, true);
    state = planted.state;
    let tile = state.tiles.find((t) => t.row === 3 && t.col === 2);
    assert.equal(tile?.crop?.stage, 'seed');

    // +3s -> sprout (wheat growDurationMs = 12000; 3000/12000 = 0.25)
    state = tickIsoFarmGrowth(state, t0 + 3000);
    tile = state.tiles.find((t) => t.row === 3 && t.col === 2);
    assert.equal(tile?.crop?.stage, 'sprout');

    // +3s (total 6s = 0.5) -> growing
    state = tickIsoFarmGrowth(state, t0 + 6000);
    tile = state.tiles.find((t) => t.row === 3 && t.col === 2);
    assert.equal(tile?.crop?.stage, 'growing');

    // +3s (total 9s = 0.75) -> flowering
    state = tickIsoFarmGrowth(state, t0 + 9000);
    tile = state.tiles.find((t) => t.row === 3 && t.col === 2);
    assert.equal(tile?.crop?.stage, 'flowering');

    // +3s (total 12s = 1.0) -> harvestable
    state = tickIsoFarmGrowth(state, t0 + 12000);
    tile = state.tiles.find((t) => t.row === 3 && t.col === 2);
    assert.equal(tile?.crop?.stage, 'harvestable');

    // Plant corn on (4,2), water once, then apply Golden Fertilizer for instant x2 harvest
    const plantCorn = plantIsoCrop(state, 4, 2, 'corn', t0 + 12000);
    assert.equal(plantCorn.ok, true);
    state = plantCorn.state;

    const watered = waterIsoCrop(state, 4, 2);
    assert.equal(watered.ok, true);
    state = watered.state;

    const fert = fertilizeIsoCrop(state, 4, 2);
    assert.equal(fert.ok, true);
    state = fert.state;

    const hCorn = harvestIsoCrop(state, 4, 2);
    assert.equal(hCorn.ok, true);
    assert.equal(hCorn.qty, 4); // corn base yield 2 * 2 from golden fertilizer
    state = hCorn.state;

    // Sell 1 wheat & fulfill a truck order
    const goldBeforeSell = state.gold;
    const sold = sellCropFromInventory(state, 'wheat', 1);
    assert.equal(sold.ok, true);
    assert.ok(sold.state.gold > goldBeforeSell);
    state = sold.state;

    const wheatOrder = state.truckOrders.find((o) => (state.inventory.crops[o.cropId] || 0) >= o.quantity);
    assert.ok(wheatOrder);
    const goldBeforeOrder = state.gold;
    const delivered = fulfillTruckOrder(state, wheatOrder.id);
    assert.equal(delivered.ok, true);
    assert.ok(delivered.state.gold > goldBeforeOrder);
    assert.equal(delivered.state.totalOrdersDelivered, 1);
  });

  it('supports unlocking border plots, tilling, buying seeds, constructing buildings, and collecting yield', () => {
    const t0 = 1_700_000_000_000;
    let state = createInitialIsometricFarmState({
      schoolId: 'sch-1',
      userId: 'stu-2',
      ownerName: 'ต้นข้าว',
      nowMs: t0,
    });

    // Unlock locked border plot (0,0) using starter expansion deed
    const unlocked = unlockIsoPlot(state, 0, 0);
    assert.equal(unlocked.ok, true);
    state = unlocked.state;
    assert.equal(state.inventory.supplies.expansionDeeds, 1);
    assert.equal(state.tiles.find((t) => t.row === 0 && t.col === 0)?.unlocked, true);

    // Till grass tile at (1,1)
    const tilled = tillIsoTile(state, 1, 1);
    assert.equal(tilled.ok, true);
    state = tilled.state;
    assert.equal(state.tiles.find((t) => t.row === 1 && t.col === 1)?.kind, 'soil');

    // Buy seeds
    const bought = buySeedIntoInventory(state, 'wheat', 5);
    assert.equal(bought.ok, true);
    state = bought.state;
    assert.equal(state.inventory.seeds.wheat, 11);

    // Collect starter ready chicken coop at (2,5)
    const collected = collectIsoBuildingProduct(state, 2, 5, t0 + 1000);
    assert.equal(collected.ok, true);
    assert.equal(collected.goldEarned, 36);
    state = collected.state;
    assert.equal(state.inventory.goods.fresh_egg, 2);

    // Build a roadside_stand on (1,1)
    const built = buildIsoStructure(state, 1, 1, 'roadside_stand', t0 + 1000);
    assert.equal(built.ok, true);
    state = built.state;
    assert.equal(state.tiles.find((t) => t.row === 1 && t.col === 1)?.building?.type, 'roadside_stand');
  });
});
