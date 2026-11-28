import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  countEnabledGames,
  GAME_CONTROL_CATALOG,
  isGameEnabledByFeatureFlags,
  isTabEnabledByFeatureFlags,
  setGameControlEnabled,
  TIER_PRESETS,
} from './schoolFeatureFlags';
import type { GameControlId } from '../types';

describe('schoolFeatureFlags — per-game admin controls', () => {
  it('enables all catalog games by default when package permits modules', () => {
    const flags = { ...TIER_PRESETS.level_4 };
    const enabledCount = countEnabledGames(flags);
    assert.equal(enabledCount, GAME_CONTROL_CATALOG.length);
    assert.equal(isGameEnabledByFeatureFlags('school_farm', flags), true);
    assert.equal(isGameEnabledByFeatureFlags('meteor_blaster', flags), true);
    assert.equal(isGameEnabledByFeatureFlags('boss_raid', flags), true);
  });

  it('allows admin to toggle individual games off and on cleanly', () => {
    let flags = { ...TIER_PRESETS.level_4 };
    flags = setGameControlEnabled(flags, 'school_farm', false);
    assert.equal(isGameEnabledByFeatureFlags('school_farm', flags, 'student'), false);
    assert.equal(isTabEnabledByFeatureFlags('school_farm', flags, 'student'), false);
    assert.equal(isGameEnabledByFeatureFlags('meteor_blaster', flags, 'student'), true);

    flags = setGameControlEnabled(flags, 'school_farm', true);
    assert.equal(isGameEnabledByFeatureFlags('school_farm', flags, 'student'), true);
    assert.equal(isTabEnabledByFeatureFlags('school_farm', flags, 'student'), true);
  });

  it('respects game controls even for super_admin preview when toggled off', () => {
    let flags = { ...TIER_PRESETS.level_4 };
    flags = setGameControlEnabled(flags, 'battle_royale_3d', false);
    assert.equal(isGameEnabledByFeatureFlags('battle_royale_3d', flags, 'super_admin'), false);
  });

  it('hides games / edu_battle tabs when all EduBattle sub-games are disabled', () => {
    let flags = { ...TIER_PRESETS.level_4 };
    const eduBattleIds: GameControlId[] = [
      'meteor_blaster',
      'concept_match',
      'word_builder',
      'chrono_sort',
      'arena_1v1',
      'battle_royale_3d',
      'live_room',
      'subject_labs',
    ];
    for (const id of eduBattleIds) {
      flags = setGameControlEnabled(flags, id, false);
    }
    assert.equal(isTabEnabledByFeatureFlags('games', flags, 'student'), false);
    assert.equal(isTabEnabledByFeatureFlags('edu_battle', flags, 'student'), false);
    assert.equal(isTabEnabledByFeatureFlags('edu_battle_3d', flags, 'student'), false);
    // Turning one back on restores access to games hub
    flags = setGameControlEnabled(flags, 'word_builder', true);
    assert.equal(isTabEnabledByFeatureFlags('games', flags, 'student'), true);
  });
});
