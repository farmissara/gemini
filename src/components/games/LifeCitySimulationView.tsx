import React, { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase,
  Building2,
  Coins,
  Compass,
  HeartPulse,
  Landmark,
  MapPin,
  Scale,
  ShieldAlert,
  ShoppingBag,
  Sparkles,
  Sprout,
  Store,
  Sun,
  Zap,
} from 'lucide-react';
import type { AppLanguage, Student } from '../../types';
import { emitAppToast } from '../common/ToastProvider';
import { farmAudio } from '../../lib/farmAudioEngine';
import {
  CROP_CATALOG,
  PRODUCT_CATALOG,
  type CropId,
  type ProductId,
  type SchoolFarmState,
} from '../../lib/schoolFarmEngine';
import {
  advanceCityDay,
  bankDeposit,
  bankWithdraw,
  buyShopItem,
  CAREER_DEF_MAP,
  CITY_DISTRICTS_META,
  CITY_LOAN_TIERS,
  CITY_MARKET_COMMODITIES,
  CITY_SHOP_ITEMS,
  exchangeBankCoinsToGems,
  foundOrUpgradeCompany,
  getCityMarketDemandMultiplier,
  getCommodityCurrentPrice,
  hireCompanyStaff,
  ILLNESS_META,
  LIFE_CITY_CAREERS,
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
  type CityActionResult,
  type CityDistrictId,
  type LifeCityState,
} from '../../lib/lifeCityEngine';

interface LifeCitySimulationViewProps {
  lang: AppLanguage;
  farmState: SchoolFarmState;
  cityState: LifeCityState;
  playerGems: number;
  students: Student[];
  onApplyCityResult: (result: CityActionResult) => void;
  onSwitchToFarm: () => void;
  onExitGame?: () => void;
}

const DistrictIcon: React.FC<{ district: Exclude<CityDistrictId, 'overview'>; className?: string }> = ({
  district,
  className = 'w-5 h-5',
}) => {
  switch (district) {
    case 'gardens':
      return <Sprout className={className} />;
    case 'shops':
      return <CoffeeOrShopIcon className={className} />;
    case 'company':
      return <Building2 className={className} />;
    case 'market':
      return <Store className={className} />;
    case 'city_hall':
      return <Briefcase className={className} />;
    case 'bank':
      return <Landmark className={className} />;
    case 'hospital':
      return <HeartPulse className={className} />;
    case 'police':
      return <Scale className={className} />;
    case 'temple':
      return <Sparkles className={className} />;
    default:
      return <MapPin className={className} />;
  }
};

const CoffeeOrShopIcon: React.FC<{ className?: string }> = ({ className }) => (
  <ShoppingBag className={className} />
);

export const LifeCitySimulationView: React.FC<LifeCitySimulationViewProps> = ({
  lang,
  farmState,
  cityState,
  playerGems,
  onApplyCityResult,
  onSwitchToFarm,
  onExitGame,
}) => {
  const [activeDistrict, setActiveDistrict] = useState<CityDistrictId>('overview');
  const [companyNameDraft, setCompanyNameDraft] = useState(cityState.company.name);
  const [bankAmountDraft, setBankAmountDraft] = useState<string>('200');
  const [marketSubTab, setMarketSubTab] = useState<'commodities' | 'farm_goods'>('commodities');

  const activeCareer = CAREER_DEF_MAP[cityState.careerId];
  const illnessInfo = ILLNESS_META[cityState.illness];
  const totalLoanDebt = useMemo(
    () => cityState.loans.reduce((sum, loan) => sum + loan.remainingDue, 0),
    [cityState.loans]
  );

  const runAction = (res: CityActionResult, sfx: 'coin' | 'tap' | 'build' | 'gift' = 'tap') => {
    if (!res.ok) {
      emitAppToast({
        title: lang === 'th' ? 'ทำรายการไม่สำเร็จ' : 'Action unavailable',
        message: res.errorTh || 'กรุณาตรวจสอบเงื่อนไขอีกครั้ง',
        tone: 'warning',
      });
      return;
    }
    if (res.coinDelta > 0) farmAudio.playSfx('coin');
    else farmAudio.playSfx(sfx);

    onApplyCityResult(res);
    emitAppToast({
      title: activeDistrictMeta?.nameTh || (lang === 'th' ? 'เมืองจำลองชุมชน' : 'City Simulation'),
      message: res.messageTh,
      tone: res.state.jailDaysRemaining > cityState.jailDaysRemaining ? 'error' : 'success',
    });
  };

  const citizensInCurrentDistrict = useMemo(
    () =>
      activeDistrict === 'overview'
        ? cityState.citizens
        : cityState.citizens.filter((c) => c.location === activeDistrict),
    [activeDistrict, cityState.citizens]
  );

  const ownedFarmCrops = useMemo(
    () => CROP_CATALOG.filter((crop) => (farmState.barn[crop.id] || 0) > 0),
    [farmState.barn]
  );

  const ownedFarmProducts = useMemo(
    () => PRODUCT_CATALOG.filter((prod) => (farmState.goods[prod.id] || 0) > 0),
    [farmState.goods]
  );

  const activeDistrictMeta = CITY_DISTRICTS_META.find((d) => d.id === activeDistrict);

  return (
    <div className="w-full h-full min-h-0 flex flex-col bg-slate-50 text-slate-900 overflow-hidden">
      {/* Top City Simulation HUD */}
      <header className="shrink-0 bg-white border-b border-slate-200 px-3 sm:px-4 py-2.5 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          {onExitGame && (
            <button
              type="button"
              onClick={onExitGame}
              className="min-h-[36px] px-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer whitespace-nowrap shrink-0"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ออก</span>
            </button>
          )}
          <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100 shrink-0">
            <button
              type="button"
              onClick={() => {
                farmAudio.playSfx('tap');
                onSwitchToFarm();
              }}
              className="min-h-[32px] px-2.5 rounded-md text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer whitespace-nowrap shrink-0"
            >
              สวนของฉัน
            </button>
            <button
              type="button"
              className="min-h-[32px] px-2.5 rounded-md text-xs font-semibold bg-white text-slate-900 shadow-sm whitespace-nowrap shrink-0"
            >
              เมืองจำลองชุมชน
            </button>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-500 min-w-0">
            <span className="font-semibold text-slate-800 truncate">{activeCareer.nameTh} Lv.{cityState.careerLevel}</span>
            <span aria-hidden="true">·</span>
            <span className="tabular-nums">วันที่ {cityState.day}</span>
          </div>
        </div>

        {/* Vitals & Wallet Strip */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs tabular-nums">
          <span className="font-semibold text-amber-700 inline-flex items-center gap-1">
            <Coins className="w-3.5 h-3.5 text-amber-500" />
            {farmState.coins.toLocaleString()}
          </span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="font-semibold text-teal-700 inline-flex items-center gap-1" title="เงินฝากธนาคาร">
            <Landmark className="w-3.5 h-3.5 text-teal-600" />
            {cityState.bankSavings.toLocaleString()}
          </span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span
            className={`font-semibold inline-flex items-center gap-1 ${
              cityState.health < 45 || cityState.illness !== 'none' ? 'text-rose-600' : 'text-emerald-700'
            }`}
          >
            <HeartPulse className="w-3.5 h-3.5" />
            {cityState.health}/100
          </span>
          <span className="text-slate-300" aria-hidden="true">·</span>
          <span className="font-semibold text-sky-700 inline-flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" />
            {cityState.energy}/100
          </span>
          {cityState.wantedLevel > 0 && (
            <>
              <span className="text-slate-300" aria-hidden="true">·</span>
              <span className="font-semibold text-rose-700 inline-flex items-center gap-0.5">
                <ShieldAlert className="w-3.5 h-3.5" />
                หมายจับ {cityState.wantedLevel}★
              </span>
            </>
          )}
          <button
            type="button"
            onClick={() => runAction(advanceCityDay(cityState, farmState.coins), 'build')}
            className="min-h-[36px] px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Sun className="w-3.5 h-3.5 text-amber-300" />
            <span>ขึ้นวันใหม่</span>
          </button>
        </div>
      </header>

      {/* Alert Banner when Sick, In Jail, or Indebted */}
      {(cityState.jailDaysRemaining > 0 || cityState.illness !== 'none' || totalLoanDebt > 0) && (
        <div className="shrink-0 bg-amber-50 border-b border-amber-200 px-4 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-3 text-amber-950 font-medium">
            {cityState.jailDaysRemaining > 0 && (
              <span className="text-rose-700 font-semibold tabular-nums">
                ถูกคุมขังที่สถานีตำรวจเหลือ {cityState.jailDaysRemaining} วัน (จ่ายประกันตัวหรือกดขึ้นวันใหม่)
              </span>
            )}
            {cityState.illness !== 'none' && (
              <span className="text-rose-700 font-semibold">
                กำลังป่วย: {illnessInfo.nameTh} (ลดรายได้ -{illnessInfo.workPenaltyPct}% · แวะโรงพยาบาลเพื่อรักษา)
              </span>
            )}
            {totalLoanDebt > 0 && (
              <span className="text-amber-900 tabular-nums">
                หนี้ธนาคารคงค้าง: {totalLoanDebt.toLocaleString()} เหรียญ · เครดิต {cityState.creditScore}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {cityState.jailDaysRemaining > 0 && (
              <button
                type="button"
                onClick={() => setActiveDistrict('police')}
                className="text-xs font-semibold text-blue-700 hover:underline cursor-pointer whitespace-nowrap"
              >
                ไปสถานีตำรวจ
              </button>
            )}
            {cityState.illness !== 'none' && (
              <button
                type="button"
                onClick={() => setActiveDistrict('hospital')}
                className="text-xs font-semibold text-rose-700 hover:underline cursor-pointer whitespace-nowrap"
              >
                ไปโรงพยาบาล
              </button>
            )}
          </div>
        </div>
      )}

      {/* District Sub-Nav Strip */}
      <nav
        aria-label="เขตต่างๆ ในเมืองจำลอง"
        className="shrink-0 bg-white border-b border-slate-200 px-3 py-2 flex items-center gap-1.5 overflow-x-auto no-scrollbar"
      >
        <button
          type="button"
          onClick={() => {
            farmAudio.playSfx('tap');
            setActiveDistrict('overview');
          }}
          className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
            activeDistrict === 'overview'
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>แผนที่เมือง</span>
        </button>
        {CITY_DISTRICTS_META.map((dist) => {
          const active = activeDistrict === dist.id;
          const visitorsCount = cityState.citizens.filter((c) => c.location === dist.id).length;
          return (
            <button
              key={dist.id}
              type="button"
              onClick={() => {
                farmAudio.playSfx('tap');
                setActiveDistrict(dist.id);
              }}
              className={`min-h-[34px] px-3 rounded-lg text-xs font-semibold inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                active
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              <DistrictIcon district={dist.id} className="w-3.5 h-3.5" />
              <span>{dist.nameTh.split(' ')[0]}</span>
              {visitorsCount > 0 && (
                <span className={`text-[10px] tabular-nums ${active ? 'text-amber-300' : 'text-slate-500'}`}>
                  ({visitorsCount})
                </span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Main Scrollable Content Area */}
      <main className="flex-1 min-h-0 overflow-y-auto p-3 sm:p-5">
        <div className="max-w-6xl mx-auto space-y-5">
          {activeDistrict === 'overview' ? (
            <>
              {/* Interactive Town Map + Life Summary */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
                {/* Interactive District Map Canvas */}
                <section className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h2 className="text-base font-bold text-slate-900">แผนที่เมืองจำลองชุมชน</h2>
                      <p className="text-xs text-slate-500">
                        คลิกสถานที่ต่างๆ เพื่อเข้าเยี่ยมชม ทำอาชีพ ค้าขาย กู้ยืม รักษาตัว หรือทำบุญ
                      </p>
                    </div>
                    <span className="text-xs text-slate-500 tabular-nums">
                      ความสุข {cityState.happiness}% · ความเครียด {cityState.stress}% · แต้มบุญ {cityState.karmaPoints}
                    </span>
                  </div>

                  {/* Visual Illustrated Town Map (Interactive Building Nodes) */}
                  <div className="relative rounded-xl border border-slate-200 bg-emerald-50/60 overflow-hidden p-3 sm:p-4">
                    <svg
                      viewBox="0 0 800 420"
                      className="w-full h-auto block select-none"
                      aria-label="แผนผังเมืองจำลอง"
                    >
                      {/* Town Ground & River */}
                      <rect x="0" y="0" width="800" height="420" rx="16" fill="#ecfdf5" />
                      <path
                        d="M 0 280 Q 220 250 400 285 T 800 265 L 800 315 Q 600 335 400 320 T 0 325 Z"
                        fill="#bae6fd"
                        opacity="0.7"
                      />
                      {/* Horizontal & Vertical Town Roads */}
                      <rect x="70" y="100" width="660" height="18" rx="9" fill="#e2e8f0" />
                      <rect x="70" y="210" width="660" height="18" rx="9" fill="#e2e8f0" />
                      <rect x="70" y="340" width="660" height="18" rx="9" fill="#e2e8f0" />
                      <rect x="135" y="65" width="18" height="305" rx="9" fill="#e2e8f0" />
                      <rect x="392" y="65" width="18" height="305" rx="9" fill="#e2e8f0" />
                      <rect x="646" y="65" width="18" height="305" rx="9" fill="#e2e8f0" />
                      {/* Central Plaza Circle */}
                      <circle cx="401" cy="219" r="36" fill="#fef3c7" stroke="#d97706" strokeWidth="2" />
                    </svg>

                    {/* Interactive Building Overlay Grid Aligned Cleanly Over Map */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-3">
                      {CITY_DISTRICTS_META.map((dist) => {
                        const visitors = cityState.citizens.filter((c) => c.location === dist.id);
                        const isCareerBonus = activeCareer.specialtyDistrict === dist.id;
                        return (
                          <button
                            key={dist.id}
                            type="button"
                            onClick={() => {
                              farmAudio.playSfx('open');
                              setActiveDistrict(dist.id);
                            }}
                            className="text-left rounded-xl border border-slate-200 bg-white hover:border-slate-400 p-3 transition-colors cursor-pointer flex flex-col justify-between gap-2"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div
                                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white shrink-0"
                                  style={{ backgroundColor: dist.accentHex }}
                                >
                                  <DistrictIcon district={dist.id} className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-slate-900 truncate">{dist.nameTh}</p>
                                  <p className="text-[11px] text-slate-500 line-clamp-1">{dist.subtitleTh}</p>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between gap-2 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                              <span className="truncate">
                                {visitors.length > 0
                                  ? `มีคนอยู่: ${visitors.map((v) => v.nameTh.split(' ')[0]).join(', ')}`
                                  : 'เปิดให้บริการ'}
                              </span>
                              {isCareerBonus && (
                                <span className="font-semibold text-indigo-700 shrink-0">โบนัสอาชีพ</span>
                              )}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </section>

                {/* Right Sidebar: Citizen Activity & City Feed */}
                <aside className="lg:col-span-4 space-y-4 flex flex-col">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">สถานะพลเมือง & เพื่อนในเมือง</h3>
                      <span className="text-xs text-slate-500 tabular-nums">{cityState.citizens.length} คน</span>
                    </div>
                    <div className="space-y-2 max-h-[260px] overflow-y-auto pr-1">
                      {cityState.citizens.map((c) => {
                        const dist = CITY_DISTRICTS_META.find((d) => d.id === c.location);
                        return (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              farmAudio.playSfx('tap');
                              setActiveDistrict(c.location);
                            }}
                            className="w-full text-left p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors cursor-pointer space-y-1"
                          >
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-900 truncate">{c.nameTh}</span>
                              <span className="text-[11px] font-semibold text-indigo-700 shrink-0">
                                อยู่ที่ {dist?.nameTh.split(' ')[0]}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 truncate">
                              {c.roleTh} · มิตรภาพ {c.friendship}%
                            </p>
                            <p className="text-[11px] text-slate-700 line-clamp-1">"{c.dialogueTh}"</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2.5 flex-1">
                    <h3 className="text-sm font-bold text-slate-900">บันทึกเหตุการณ์ประจำเมือง</h3>
                    <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                      {cityState.cityLog.slice(0, 10).map((entry) => (
                        <div
                          key={entry.id}
                          className="text-xs pb-2 border-b border-slate-100 last:border-b-0 flex items-start justify-between gap-2"
                        >
                          <span
                            className={
                              entry.tone === 'danger'
                                ? 'text-rose-700 font-medium'
                                : entry.tone === 'warning'
                                  ? 'text-amber-800 font-medium'
                                  : entry.tone === 'success'
                                    ? 'text-emerald-800'
                                    : 'text-slate-700'
                            }
                          >
                            {entry.textTh}
                          </span>
                          <span className="text-[11px] text-slate-400 tabular-nums shrink-0">วันที่ {entry.day}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </aside>
              </div>
            </>
          ) : (
            /* Building Interior Workspace */
            <div className="space-y-4">
              {/* Building Interior Header */}
              <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={() => {
                      farmAudio.playSfx('tap');
                      setActiveDistrict('overview');
                    }}
                    className="min-h-[38px] px-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 inline-flex items-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>กลับแผนที่เมือง</span>
                  </button>
                  {activeDistrictMeta && (
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white shrink-0"
                        style={{ backgroundColor: activeDistrictMeta.accentHex }}
                      >
                        <DistrictIcon district={activeDistrictMeta.id} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-base font-bold text-slate-900 truncate">{activeDistrictMeta.nameTh}</h2>
                        <p className="text-xs text-slate-500 truncate">{activeDistrictMeta.subtitleTh}</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="text-xs text-slate-500 tabular-nums">
                  {citizensInCurrentDistrict.length > 0
                    ? `พลเมืองในสถานที่นี้ ${citizensInCurrentDistrict.length} คน`
                    : 'บรรยากาศเงียบสงบ พร้อมให้บริการ'}
                </div>
              </div>

              {/* Citizens Visiting This Building */}
              {citizensInCurrentDistrict.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-xl p-3.5">
                  <p className="text-xs font-bold text-slate-700 mb-2">ผู้คนที่กำลังอยู่ในสถานที่นี้</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                    {citizensInCurrentDistrict.map((c) => (
                      <div key={c.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-bold text-slate-900">{c.nameTh}</span>
                          <span className="text-[11px] text-slate-500">{c.moodTh}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{c.roleTh}</p>
                        <p className="text-xs text-slate-700">"{c.dialogueTh}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 1. COMMUNITY GARDENS */}
              {activeDistrict === 'gardens' && (
                <section className="space-y-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">สวนของคุณ: {farmState.farmName}</h3>
                      <p className="text-xs text-slate-500">
                        กลับไปจัดการแปลงปลูกผัก เลี้ยงสัตว์ และร้านกาแฟในสวนแบบเต็มพื้นที่ได้ทุกเมื่อ
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={onSwitchToFarm}
                      className="min-h-[38px] px-4 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                    >
                      เปิดสวนของฉัน
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                    {cityState.citizens.map((citizen) => (
                      <div
                        key={citizen.id}
                        className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <h4 className="text-sm font-bold text-slate-900">สวนของ {citizen.nameTh}</h4>
                            <span className="text-xs font-semibold text-emerald-700 tabular-nums">
                              สวน Lv.{citizen.gardenLevel}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500">
                            {citizen.roleTh} · พืชเด่น: {citizen.specialtyCrop} · มิตรภาพ {citizen.friendship}%
                          </p>
                          <p className="text-xs text-slate-700 pt-1">"{citizen.dialogueTh}"</p>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
                          <button
                            type="button"
                            disabled={citizen.helpedToday}
                            onClick={() => runAction(visitCityGardenAction(cityState, citizen.id, 'water_help'), 'coin')}
                            className="min-h-[36px] px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-500 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                          >
                            {citizen.helpedToday ? 'ช่วยดูแลวันนี้แล้ว' : 'ช่วยรดน้ำสวน (+เหรียญ)'}
                          </button>
                          <button
                            type="button"
                            onClick={() => runAction(visitCityGardenAction(cityState, citizen.id, 'gift_snack'), 'gift')}
                            className="min-h-[36px] px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer whitespace-nowrap"
                          >
                            มอบของขวัญ (+มิตรภาพ)
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* 2. SHOPS & CAFE */}
              {activeDistrict === 'shops' && (
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-8 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold text-slate-900">สินค้าในร้านค้า & คาเฟ่ชุมชน</h3>
                      {cityState.careerId === 'chef_cafe' && (
                        <span className="text-xs font-semibold text-orange-700">ส่วนลดอาชีพเชฟ -15% หมวดอาหาร</span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {CITY_SHOP_ITEMS.map((item) => {
                        const finalPrice =
                          cityState.careerId === 'chef_cafe' && item.category === 'food'
                            ? Math.round(item.priceCoins * 0.85)
                            : item.priceCoins;
                        return (
                          <div key={item.id} className="p-3 rounded-lg border border-slate-200 flex flex-col justify-between gap-2.5">
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-xs font-bold text-slate-900">{item.nameTh}</span>
                                <span className="text-xs font-bold text-amber-700 tabular-nums">{finalPrice} เหรียญ</span>
                              </div>
                              <p className="text-[11px] text-slate-500">{item.descTh}</p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => runAction(buyShopItem(cityState, item.id, 1, farmState.coins), 'coin')}
                                className="flex-1 min-h-[34px] px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                              >
                                ซื้อ 1 ชิ้น
                              </button>
                              <button
                                type="button"
                                onClick={() => runAction(buyShopItem(cityState, item.id, 3, farmState.coins), 'coin')}
                                className="min-h-[34px] px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer whitespace-nowrap"
                              >
                                ×3
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="lg:col-span-4 bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">กระเป๋าเสบียงของคุณ</h3>
                    <div className="space-y-2">
                      {CITY_SHOP_ITEMS.map((item) => {
                        const owned = cityState.bag[item.id] || 0;
                        return (
                          <div key={item.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-900 truncate">{item.nameTh}</p>
                              <p className="text-[11px] text-slate-500 tabular-nums">คงเหลือ {owned} ชิ้น</p>
                            </div>
                            <button
                              type="button"
                              disabled={owned <= 0}
                              onClick={() => runAction(useInventoryItem(cityState, item.id), 'tap')}
                              className="min-h-[32px] px-3 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                            >
                              ใช้งาน
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

              {/* 3. COMPANY & WORK */}
              {activeDistrict === 'company' && (
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">เข้าทำงานประจำวันตามสายอาชีพ</h3>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
                      <p className="font-bold text-slate-900">
                        อาชีพปัจจุบัน: {activeCareer.nameTh} (Lv.{cityState.careerLevel})
                      </p>
                      <p className="text-slate-600 tabular-nums">
                        ค่าตอบแทนพื้นฐาน {activeCareer.baseSalary} เหรียญ/กะ · ใช้พลังงาน {activeCareer.energyCost}
                      </p>
                      <p className="text-indigo-700">{activeCareer.perkTh}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => runAction(workCareerShift(cityState, farmState.coins), 'coin')}
                        className="min-h-[40px] px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                      >
                        ลงเวลาทำงาน (+เงินเดือน)
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveDistrict('city_hall')}
                        className="min-h-[40px] px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer whitespace-nowrap"
                      >
                        เปลี่ยนอาชีพที่ศาลากลาง
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">
                      {cityState.company.founded ? `บริษัทของฉัน: ${cityState.company.name}` : 'ก่อตั้งบริษัทส่วนตัว'}
                    </h3>
                    {!cityState.company.founded ? (
                      <div className="space-y-3">
                        <p className="text-xs text-slate-600">
                          จดทะเบียนธุรกิจของคุณเองเพื่อรับกำไรปันผลอัตโนมัติทุกวัน (ค่าจดทะเบียน 500 เหรียญ · ลด 15% สำหรับ CEO)
                        </p>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            maxLength={40}
                            value={companyNameDraft}
                            onChange={(e) => setCompanyNameDraft(e.target.value)}
                            placeholder="ตั้งชื่อบริษัทของคุณ..."
                            className="flex-1 min-h-[38px] px-3 rounded-lg border border-slate-300 text-xs"
                          />
                          <button
                            type="button"
                            onClick={() => runAction(foundOrUpgradeCompany(cityState, farmState.coins, companyNameDraft), 'build')}
                            className="min-h-[38px] px-4 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                          >
                            ก่อตั้งบริษัท
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2 text-xs tabular-nums">
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                            <p className="text-slate-500">ระดับบริษัท</p>
                            <p className="font-bold text-slate-900 mt-0.5">Lv.{cityState.company.level}/5</p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                            <p className="text-slate-500">พนักงาน</p>
                            <p className="font-bold text-slate-900 mt-0.5">{cityState.company.staffCount}/{cityState.company.level * 3} คน</p>
                          </div>
                          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                            <p className="text-slate-500">กำไร/วัน</p>
                            <p className="font-bold text-emerald-700 mt-0.5">+{cityState.company.dailyBaseProfit}</p>
                          </div>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => runAction(foundOrUpgradeCompany(cityState, farmState.coins), 'build')}
                            className="min-h-[38px] px-3.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                          >
                            {cityState.company.level >= 5 ? 'ระดับสูงสุดแล้ว' : `อัปเกรดบริษัทเป็น Lv.${cityState.company.level + 1}`}
                          </button>
                          <button
                            type="button"
                            onClick={() => runAction(hireCompanyStaff(cityState, farmState.coins), 'coin')}
                            className="min-h-[38px] px-3.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer whitespace-nowrap"
                          >
                            จ้างพนักงานเพิ่ม (220 เหรียญ)
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              )}

              {/* 4. CENTRAL MARKET */}
              {activeDistrict === 'market' && (
                <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">ตลาดกลางเมือง (ราคาขึ้นลงรายวัน)</h3>
                      <p className="text-xs text-slate-500">ซื้อต่ำขายสูง หรือนำผลผลิตและสินค้าจากฟาร์มมาขายรับราคาตลาดวันนี้</p>
                    </div>
                    <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-100">
                      <button
                        type="button"
                        onClick={() => setMarketSubTab('commodities')}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap ${
                          marketSubTab === 'commodities' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                        }`}
                      >
                        สินค้าโภคภัณฑ์เมือง
                      </button>
                      <button
                        type="button"
                        onClick={() => setMarketSubTab('farm_goods')}
                        className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer whitespace-nowrap ${
                          marketSubTab === 'farm_goods' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600'
                        }`}
                      >
                        ขายผลผลิตจากฟาร์ม ({ownedFarmCrops.length + ownedFarmProducts.length})
                      </button>
                    </div>
                  </div>

                  {marketSubTab === 'commodities' ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {CITY_MARKET_COMMODITIES.map((item) => {
                        const price = getCommodityCurrentPrice(cityState, item.id);
                        const mult = cityState.marketMultipliers[item.id] ?? 1;
                        const prev = cityState.marketPrevMultipliers[item.id] ?? 1;
                        const diffPct = Math.round(((mult - prev) / Math.max(0.01, prev)) * 100);
                        const held = cityState.commodityHoldings[item.id] || 0;
                        return (
                          <div key={item.id} className="p-3.5 rounded-xl border border-slate-200 space-y-2.5">
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-xs font-bold text-slate-900">{item.nameTh}</p>
                                <p className="text-[11px] text-slate-500">
                                  {item.categoryTh} · ถือครอง {held} {item.unitTh}
                                </p>
                              </div>
                              <div className="text-right tabular-nums">
                                <p className="text-sm font-bold text-slate-900">{price} เหรียญ</p>
                                <p
                                  className={`text-[11px] font-semibold inline-flex items-center gap-0.5 ${
                                    diffPct >= 0 ? 'text-emerald-700' : 'text-rose-600'
                                  }`}
                                >
                                  {diffPct >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                                  {diffPct >= 0 ? `+${diffPct}%` : `${diffPct}%`}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => runAction(tradeMarketCommodity(cityState, 'buy', item.id, 1, farmState.coins), 'coin')}
                                className="flex-1 min-h-[34px] rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                              >
                                ซื้อ 1
                              </button>
                              <button
                                type="button"
                                onClick={() => runAction(tradeMarketCommodity(cityState, 'buy', item.id, 5, farmState.coins), 'coin')}
                                className="min-h-[34px] px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer whitespace-nowrap"
                              >
                                ซื้อ 5
                              </button>
                              <button
                                type="button"
                                disabled={held <= 0}
                                onClick={() => runAction(tradeMarketCommodity(cityState, 'sell', item.id, 1, farmState.coins), 'coin')}
                                className="flex-1 min-h-[34px] rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                              >
                                ขาย 1
                              </button>
                              <button
                                type="button"
                                disabled={held <= 0}
                                onClick={() => runAction(tradeMarketCommodity(cityState, 'sell', item.id, held, farmState.coins), 'coin')}
                                className="min-h-[34px] px-3 rounded-lg border border-emerald-600 text-emerald-700 hover:bg-emerald-50 disabled:border-slate-200 disabled:text-slate-400 text-xs font-semibold cursor-pointer whitespace-nowrap"
                              >
                                ขายหมด
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {ownedFarmCrops.length + ownedFarmProducts.length === 0 ? (
                        <div className="p-6 text-center rounded-xl border border-dashed border-slate-300 text-xs text-slate-500">
                          ยังไม่มีผลผลิตหรือสินค้าแปรรูปในยุ้งฉาง ลองแวะกลับสวนเพื่อปลูกผักหรือทำเมนูคาเฟ่ก่อนนะ
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                          {ownedFarmCrops.map((crop) => {
                            const qty = farmState.barn[crop.id] || 0;
                            const mult = getCityMarketDemandMultiplier(cityState, crop.id);
                            const unitPrice = Math.max(10, Math.round(crop.sellPrice * mult));
                            return (
                              <div key={crop.id} className="p-3 rounded-xl border border-slate-200 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-bold text-slate-900">{crop.nameTh}</span>
                                  <span className="text-xs font-semibold text-emerald-700 tabular-nums">
                                    {unitPrice} เหรียญ/ชิ้น (×{mult})
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 tabular-nums">ในยุ้งฉาง: {qty}</p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    runAction(
                                      sellFarmItemToCityMarket(
                                        cityState,
                                        'crop',
                                        crop.id as CropId,
                                        crop.nameTh,
                                        crop.sellPrice,
                                        qty,
                                        1
                                      ),
                                      'coin'
                                    )
                                  }
                                  className="w-full min-h-[34px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                                >
                                  ขาย 1 ชิ้น
                                </button>
                              </div>
                            );
                          })}
                          {ownedFarmProducts.map((prod) => {
                            const qty = farmState.goods[prod.id] || 0;
                            const mult = getCityMarketDemandMultiplier(cityState, prod.id);
                            const unitPrice = Math.max(15, Math.round(prod.sellPrice * mult));
                            return (
                              <div key={prod.id} className="p-3 rounded-xl border border-slate-200 space-y-2">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-xs font-bold text-slate-900">{prod.nameTh}</span>
                                  <span className="text-xs font-semibold text-emerald-700 tabular-nums">
                                    {unitPrice} เหรียญ/ชิ้น (×{mult})
                                  </span>
                                </div>
                                <p className="text-[11px] text-slate-500 tabular-nums">ในคลังสินค้า: {qty}</p>
                                <button
                                  type="button"
                                  onClick={() =>
                                    runAction(
                                      sellFarmItemToCityMarket(
                                        cityState,
                                        'product',
                                        prod.id as ProductId,
                                        prod.nameTh,
                                        prod.sellPrice,
                                        qty,
                                        1
                                      ),
                                      'coin'
                                    )
                                  }
                                  className="w-full min-h-[34px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                                >
                                  ขาย 1 ชิ้น
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </section>
              )}

              {/* 5. CENTRAL BANK (DEPOSIT, WITHDRAW, LOANS, CREDIT SCORE, GEMS) */}
              {activeDistrict === 'bank' && (
                <section className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                  <div className="lg:col-span-5 bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">บัญชีออมทรัพย์ & แลกเพชร</h3>
                      <p className="text-xs text-slate-500 tabular-nums">
                        ยอดเงินฝาก: {cityState.bankSavings.toLocaleString()} เหรียญ · ดอกเบี้ย{' '}
                        {cityState.careerId === 'banker_finance' ? '3.5%' : '2%'}/วัน
                      </p>
                    </div>
                    <div className="space-y-2">
                      <label className="block text-xs font-semibold text-slate-700">จำนวนเงินฝาก-ถอน</label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min={1}
                          value={bankAmountDraft}
                          onChange={(e) => setBankAmountDraft(e.target.value)}
                          className="w-32 min-h-[38px] px-3 rounded-lg border border-slate-300 text-xs tabular-nums"
                        />
                        <button
                          type="button"
                          onClick={() => runAction(bankDeposit(cityState, Number(bankAmountDraft), farmState.coins), 'coin')}
                          className="min-h-[38px] px-3 rounded-lg bg-teal-600 hover:bg-teal-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                        >
                          ฝากเงิน
                        </button>
                        <button
                          type="button"
                          onClick={() => runAction(bankWithdraw(cityState, Number(bankAmountDraft)), 'coin')}
                          className="min-h-[38px] px-3 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer whitespace-nowrap"
                        >
                          ถอนเงิน
                        </button>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <div className="text-xs">
                        <p className="font-bold text-slate-900">แลกเปลี่ยนเงินเป็นเพชร</p>
                        <p className="text-slate-500 tabular-nums">350 เหรียญ → 1 เพชร (มี {playerGems} เพชร)</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => runAction(exchangeBankCoinsToGems(cityState, farmState.coins), 'coin')}
                        className="min-h-[36px] px-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                      >
                        แลก 1 เพชร
                      </button>
                    </div>
                  </div>

                  <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">สินเชื่อและกู้ยืมเงิน</h3>
                        <p className="text-xs text-slate-500">ชำระคืนตรงเวลาเพื่อเพิ่มคะแนนเครดิต (ค้าง 3 วันถูกออกหมายจับ)</p>
                      </div>
                      <span className="text-xs font-bold text-teal-700 tabular-nums">
                        Credit Score: {cityState.creditScore}/850
                      </span>
                    </div>

                    {cityState.loans.length > 0 && (
                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-700">สัญญาเงินกู้ที่ค้างชำระ</p>
                        {cityState.loans.map((loan) => (
                          <div
                            key={loan.id}
                            className="p-3 rounded-lg bg-amber-50 border border-amber-200 flex flex-wrap items-center justify-between gap-2"
                          >
                            <div className="text-xs">
                              <p className="font-bold text-slate-900">{loan.titleTh}</p>
                              <p className="text-slate-600 tabular-nums">
                                ค้างชำระ {loan.remainingDue.toLocaleString()} เหรียญ ·{' '}
                                {loan.overdueDays > 0
                                  ? `เกินกำหนด ${loan.overdueDays} วัน`
                                  : `เหลือเวลา ${loan.daysLeft} วัน`}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  runAction(
                                    repayBankLoan(cityState, loan.id, Math.ceil(loan.remainingDue / 2), farmState.coins),
                                    'coin'
                                  )
                                }
                                className="min-h-[34px] px-3 rounded-lg border border-amber-400 bg-white text-amber-900 text-xs font-semibold cursor-pointer whitespace-nowrap"
                              >
                                จ่ายครึ่งหนึ่ง
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  runAction(repayBankLoan(cityState, loan.id, loan.remainingDue, farmState.coins), 'coin')
                                }
                                className="min-h-[34px] px-3 rounded-lg bg-teal-700 hover:bg-teal-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                              >
                                ปิดยอดทั้งหมด
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      {CITY_LOAN_TIERS.map((tier) => (
                        <div key={tier.id} className="p-3 rounded-lg border border-slate-200 flex flex-col justify-between gap-2">
                          <div className="space-y-1">
                            <p className="text-xs font-bold text-slate-900">{tier.titleTh}</p>
                            <p className="text-sm font-bold text-teal-700 tabular-nums">
                              +{tier.principal.toLocaleString()} เหรียญ
                            </p>
                            <p className="text-[11px] text-slate-500 tabular-nums">
                              ดอกเบี้ย {tier.interestRatePct}% · {tier.termDays} วัน · เครดิต ≥ {tier.minCreditScore}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => runAction(takeBankLoan(cityState, tier.id), 'coin')}
                            className="w-full min-h-[34px] rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                          >
                            ขอกู้เงิน
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* 6. COMMUNITY HOSPITAL (HEALTH, ILLNESS, INSURANCE, DOCTOR SHIFT) */}
              {activeDistrict === 'hospital' && (
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">ห้องตรวจอาการ & รักษาพยาบาล</h3>
                      <span className="text-xs font-bold text-rose-700 tabular-nums">HP: {cityState.health}/100</span>
                    </div>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-xs">
                      <p className="font-bold text-slate-900">สถานะปัจจุบัน: {illnessInfo.nameTh}</p>
                      <p className="text-slate-600">{illnessInfo.descTh}</p>
                      <p className="text-slate-500 tabular-nums">
                        พลังงาน {cityState.energy}% · ความเครียด {cityState.stress}% ·{' '}
                        {cityState.hasHealthInsurance ? 'มีประกันสุขภาพแล้ว (ลด 50%)' : 'ยังไม่มีประกันสุขภาพ'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => runAction(visitHospitalAction(cityState, 'treat_illness', farmState.coins), 'tap')}
                        className="min-h-[38px] px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                      >
                        ตรวจและรักษาอาการเจ็บป่วย
                      </button>
                      <button
                        type="button"
                        onClick={() => runAction(visitHospitalAction(cityState, 'rest_ward', farmState.coins), 'tap')}
                        className="min-h-[38px] px-4 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-semibold cursor-pointer whitespace-nowrap"
                      >
                        นอนห้องพักฟื้น (+HP +พลังงาน)
                      </button>
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">ประกันสุขภาพ & อาสาการแพทย์</h3>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
                      <p className="font-semibold text-slate-900">แผนประกันสุขภาพชุมชน (300 เหรียญถาวร)</p>
                      <p className="text-slate-600">ลดค่ารักษาโรคและค่าห้องพักฟื้นทุกครั้งลง 50% ทันที</p>
                      <button
                        type="button"
                        disabled={cityState.hasHealthInsurance}
                        onClick={() => runAction(visitHospitalAction(cityState, 'buy_insurance', farmState.coins), 'build')}
                        className="min-h-[34px] px-3.5 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-500 text-white text-xs font-semibold cursor-pointer"
                      >
                        {cityState.hasHealthInsurance ? 'สมัครประกันสุขภาพแล้ว' : 'ซื้อประกันสุขภาพ (300 เหรียญ)'}
                      </button>
                    </div>

                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-2 text-xs">
                      <p className="font-semibold text-slate-900">เข้าเวรแพทย์ / จิตอาสาโรงพยาบาล</p>
                      <p className="text-slate-600">
                        ช่วยดูแลผู้ป่วยในโรงพยาบาล (แพทย์รับ 270 เหรียญ · อาชีพอื่นรับ 120 เหรียญ + แต้มดี +5)
                      </p>
                      <button
                        type="button"
                        onClick={() => runAction(visitHospitalAction(cityState, 'doctor_shift', farmState.coins), 'coin')}
                        className="min-h-[34px] px-3.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        เข้าเวรโรงพยาบาล (-24 พลังงาน)
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* 7. POLICE STATION (LAW, BAIL, PATROL, ILLEGAL RISK) */}
              {activeDistrict === 'police' && (
                <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <h3 className="text-sm font-bold text-slate-900">สถานะกฎหมาย & สายตรวจยุติธรรม</h3>
                    <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 space-y-1 text-xs tabular-nums">
                      <p className="font-bold text-slate-900">
                        ระดับหมายจับ: {cityState.wantedLevel}/5 ★ · ประวัติคดี: {cityState.criminalRecord} ครั้ง
                      </p>
                      <p className="text-slate-600">
                        สถานะคุมขัง: {cityState.jailDaysRemaining > 0 ? `อยู่ในห้องขัง ${cityState.jailDaysRemaining} วัน` : 'อิสระ'}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => runAction(performPoliceAction(cityState, 'patrol_shift', farmState.coins), 'coin')}
                        className="min-h-[38px] px-4 rounded-lg bg-blue-700 hover:bg-blue-800 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                      >
                        ออกสายตรวจตำรวจ ({cityState.careerId === 'police_officer' ? '+280' : '+135'} เหรียญ)
                      </button>
                      {(cityState.wantedLevel > 0 || cityState.jailDaysRemaining > 0) && (
                        <button
                          type="button"
                          onClick={() => runAction(performPoliceAction(cityState, 'pay_bail_or_fine', farmState.coins), 'tap')}
                          className="min-h-[38px] px-4 rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
                        >
                          ชำระค่าปรับ / ประกันตัว
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
                    <div>
                      <h3 className="text-sm font-bold text-rose-700">กิจกรรมเสี่ยงผิดกฎหมาย (จำลองผลลัพธ์ทางกฎหมาย)</h3>
                      <p className="text-xs text-slate-500">
                        เงินรางวัลสูงแต่มีความเสี่ยงถูกตำรวจจับกุม เสียค่าปรับ ติดคุก และเครดิตสกอร์ตก
                      </p>
                    </div>
                    <div className="space-y-2">
                      {[
                        {
                          action: 'illegal_smuggle' as const,
                          title: 'ลักลอบขนส่งของหนีภาษี',
                          detail: 'รอดได้ +420 เหรียญ · โอกาสโดนจับ 35% (ปรับ 320, คุก 2 วัน)',
                        },
                        {
                          action: 'illegal_blackmarket' as const,
                          title: 'ค้าขายในตลาดมืดลับ',
                          detail: 'รอดได้ +680 เหรียญ · โอกาสโดนจับ 48% (ปรับ 520, คุก 2 วัน)',
                        },
                        {
                          action: 'illegal_fraud' as const,
                          title: 'เจาะระบบปั่นตัวเลขการเงิน',
                          detail: 'รอดได้ +1,100 เหรียญ · โอกาสโดนจับ 60% (ปรับ 850, คุก 2 วัน)',
                        },
                      ].map((op) => (
                        <div key={op.action} className="p-2.5 rounded-lg border border-rose-200 bg-rose-50/50 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-900">{op.title}</p>
                            <p className="text-[11px] text-slate-600 tabular-nums">{op.detail}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => runAction(performPoliceAction(cityState, op.action, farmState.coins), 'tap')}
                            className="min-h-[34px] px-3 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0"
                          >
                            ลองเสี่ยง
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              )}

              {/* 8. COMMUNITY TEMPLE */}
              {activeDistrict === 'temple' && (
                <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">วัดประจำชุมชน · บำบัดจิตใจและสร้างกุศล</h3>
                      <p className="text-xs text-slate-500">เพิ่มแต้มบุญ ลดความเครียด และช่วยฟื้นฟูประวัติทางสังคม</p>
                    </div>
                    <span className="text-xs font-bold text-amber-700 tabular-nums">
                      แต้มบุญสะสม: {cityState.karmaPoints} · ความสุข {cityState.happiness}%
                    </span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="p-3.5 rounded-xl border border-slate-200 space-y-2.5 flex flex-col justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">ทำบุญถวายสังฆทาน (100 เหรียญ)</p>
                        <p className="text-[11px] text-slate-500 mt-1">เพิ่มแต้มบุญ +16 ความสุข +18 ลดความเครียด และช่วยเครดิตสกอร์</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => runAction(performTempleAction(cityState, 'donate_merit', farmState.coins), 'gift')}
                        className="w-full min-h-[36px] rounded-lg bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        ทำบุญ 100 เหรียญ
                      </button>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 space-y-2.5 flex flex-col justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">นั่งสมาธิสงบใจ (ฟรี)</p>
                        <p className="text-[11px] text-slate-500 mt-1">ฟื้นพลังงาน +18 ความสุข +14 และลดความเครียดสะสม -28</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => runAction(performTempleAction(cityState, 'meditate_free', farmState.coins), 'tap')}
                        className="w-full min-h-[36px] rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                      >
                        นั่งสมาธิฟรี
                      </button>
                    </div>

                    <div className="p-3.5 rounded-xl border border-slate-200 space-y-2.5 flex flex-col justify-between">
                      <div>
                        <p className="text-xs font-bold text-slate-900">จิตอาสาลานวัด (15 พลังงาน)</p>
                        <p className="text-[11px] text-slate-500 mt-1">ช่วยบำเพ็ญประโยชน์ ลดดาวหมายจับและล้างประวัติคดีความ</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => runAction(performTempleAction(cityState, 'volunteer_service', farmState.coins), 'gift')}
                        className="w-full min-h-[36px] rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                      >
                        ทำงานจิตอาสา
                      </button>
                    </div>
                  </div>
                </section>
              )}

              {/* 9. CITY HALL & CAREERS SELECTION */}
              {activeDistrict === 'city_hall' && (
                <section className="bg-white border border-slate-200 rounded-xl p-4 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">ศาลากลางเมือง · เลือกอาชีพที่คุณชอบ</h3>
                      <p className="text-xs text-slate-500">เลือกเปลี่ยนอาชีพได้อิสระทุกอาชีพ เพื่อรับสิทธิพิเศษเฉพาะในแต่ละย่าน</p>
                    </div>
                    <span className="text-xs font-semibold text-indigo-700 tabular-nums">
                      อาชีพปัจจุบัน: {activeCareer.nameTh} · Lv.{cityState.careerLevel} ({cityState.careerXp} XP)
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {LIFE_CITY_CAREERS.map((career) => {
                      const selected = cityState.careerId === career.id;
                      return (
                        <div
                          key={career.id}
                          className={`p-3.5 rounded-xl border flex flex-col justify-between gap-2.5 ${
                            selected ? 'border-indigo-600 bg-indigo-50/40' : 'border-slate-200 bg-white'
                          }`}
                        >
                          <div className="space-y-1">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-xs font-bold text-slate-900">{career.nameTh}</span>
                              <span className="text-[11px] font-semibold text-emerald-700 tabular-nums">
                                +{career.baseSalary}/กะ
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500">
                              {career.categoryTh} · ใช้พลังงาน {career.energyCost}
                            </p>
                            <p className="text-xs text-slate-700 pt-1">{career.perkTh}</p>
                          </div>
                          <button
                            type="button"
                            disabled={selected}
                            onClick={() => runAction(selectCityCareer(cityState, career.id), 'build')}
                            className={`w-full min-h-[34px] rounded-lg text-xs font-semibold cursor-pointer ${
                              selected
                                ? 'bg-indigo-600 text-white cursor-default'
                                : 'bg-slate-900 hover:bg-slate-800 text-white'
                            }`}
                          >
                            {selected ? 'กำลังประกอบอาชีพนี้' : 'เลือกอาชีพนี้'}
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
