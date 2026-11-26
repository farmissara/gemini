import React from 'react';
import { Building2, CheckCircle2, RefreshCw, Send, Sliders } from 'lucide-react';
import { School } from '../../types';

export type LineSimulatorSampleType = 'checkin' | 'infirmary' | 'billing' | 'grades' | 'homework';

interface LineSimulatorTabProps {
  activeSchool: School;
  lineOaName: string;
  customHeaderColor: string;
  customFooterNote: string;
  previewSampleType: LineSimulatorSampleType;
  setPreviewSampleType: (val: LineSimulatorSampleType) => void;
  simulatedSendState: 'idle' | 'sending' | 'sent';
  handleSimulateSend: () => void;
  onUpdateCustomization: (patch: { customHeaderColor?: string; customFooterNote?: string }) => void;
}

const SAMPLE_OPTIONS: Array<{
  id: LineSimulatorSampleType;
  title: string;
  desc: string;
  badge: string;
}> = [
  {
    id: 'checkin',
    title: '1. บัตรแจ้งสแกนเข้าเรียน (Check-in)',
    desc: 'แสดงชื่อ เวลา และสถานะมาตรงเวลา/สาย',
    badge: 'ยอดนิยม',
  },
  {
    id: 'infirmary',
    title: '2. บัตรแจ้งเตือนห้องพยาบาล (Infirmary Visit)',
    desc: 'แจ้งอาการ อุณหภูมิ และยาที่ได้รับ',
    badge: 'เร่งด่วน',
  },
  {
    id: 'billing',
    title: '3. บัตรแจ้งหนี้ค่าเทอมพร้อม PromptPay',
    desc: 'ยอดชำระ และ QR PromptPay จ่ายในแอป',
    badge: 'การเงิน',
  },
  {
    id: 'grades',
    title: '4. บัตรสรุปผลการเรียน ปพ.1 (GPA Release)',
    desc: 'ผลการเรียนเฉลี่ยและเกรดแต่ละวิชา',
    badge: 'วิชาการ',
  },
  {
    id: 'homework',
    title: '5. บัตรแจ้งเตือนการบ้านใหม่ (Assignment)',
    desc: 'วิชา คำสั่ง และกำหนดส่ง',
    badge: 'การบ้าน',
  },
];

export const LineSimulatorTab: React.FC<LineSimulatorTabProps> = ({
  activeSchool,
  lineOaName,
  customHeaderColor,
  customFooterNote,
  previewSampleType,
  setPreviewSampleType,
  simulatedSendState,
  handleSimulateSend,
  onUpdateCustomization,
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-in fade-in duration-200">
    {/* Left Column: Sample Selector & Trigger Simulation */}
    <div className="lg:col-span-5 space-y-4">
      <div className="bg-[var(--color-card)] rounded-2xl p-5 border border-[var(--color-border)] shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-[var(--color-text-title)]">
          <Sliders className="w-4 h-4 text-emerald-700 dark:text-emerald-300" />
          <h3 className="font-bold text-sm">เลือกรูปแบบการ์ดจำลอง (Select Sample Message)</h3>
        </div>

        <div className="space-y-2">
          {SAMPLE_OPTIONS.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => setPreviewSampleType(sample.id)}
              className={`w-full text-left p-3 rounded-xl border transition-all cursor-pointer ${
                previewSampleType === sample.id
                  ? 'bg-emerald-100 dark:bg-emerald-950 border-emerald-500 dark:border-emerald-500 text-emerald-950 dark:text-emerald-100'
                  : 'bg-[var(--color-card-subtle)] border-[var(--color-border)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-body)]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold ${
                    previewSampleType === sample.id
                      ? 'text-emerald-950 dark:text-emerald-100'
                      : 'text-[var(--color-text-title)]'
                  }`}
                >
                  {sample.title}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[var(--color-card)] text-[var(--color-text-body)] font-semibold border border-[var(--color-border)]">
                  {sample.badge}
                </span>
              </div>
              <p
                className={`text-[11px] mt-0.5 ${
                  previewSampleType === sample.id
                    ? 'text-emerald-900 dark:text-emerald-200'
                    : 'text-[var(--color-text-muted)]'
                }`}
              >
                {sample.desc}
              </p>
            </button>
          ))}
        </div>

        <div className="pt-2 border-t border-[var(--color-border)]">
          <button
            type="button"
            onClick={handleSimulateSend}
            disabled={simulatedSendState === 'sending'}
            className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md transition cursor-pointer"
          >
            {simulatedSendState === 'sending' ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>กำลังส่งข้อความจำลองไปยัง LINE Webhook...</span>
              </>
            ) : simulatedSendState === 'sent' ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                <span>ส่งข้อความจำลองสำเร็จ! (จำลองแสดงผลในหน้าจอขวา)</span>
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                <span>🚀 ทดสอบส่งข้อความจำลอง (Simulate Live Send)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Customization Details */}
      <div className="bg-[var(--color-card)] rounded-2xl p-5 border border-[var(--color-border)] shadow-xs space-y-3">
        <h4 className="font-bold text-xs text-[var(--color-text-title)]">
          ปรับแต่งสีและข้อความท้ายบัตร (Custom Styling)
        </h4>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[var(--color-text-muted)]">
            สีแถบหัวการ์ด (Header Accent Color)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={customHeaderColor}
              onChange={(e) => onUpdateCustomization({ customHeaderColor: e.target.value })}
              className="w-8 h-8 rounded-lg cursor-pointer border border-[var(--color-border)]"
            />
            <input
              type="text"
              value={customHeaderColor}
              onChange={(e) => onUpdateCustomization({ customHeaderColor: e.target.value })}
              className="flex-1 px-3 py-1.5 text-xs rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] font-mono uppercase"
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-semibold text-[var(--color-text-muted)]">
            ข้อความท้ายบัตร (Footer Disclaimer)
          </label>
          <textarea
            rows={2}
            value={customFooterNote}
            onChange={(e) => onUpdateCustomization({ customFooterNote: e.target.value })}
            className="w-full px-3 py-1.5 text-xs rounded-lg bg-[var(--color-card-subtle)] border border-[var(--color-border)] text-[var(--color-text-title)] focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
      </div>
    </div>

    {/* Right Column: Realistic LINE Mobile Phone Frame Simulator */}
    <div className="lg:col-span-7 flex justify-center">
      <div className="w-full max-w-[360px] bg-slate-900 rounded-[38px] p-3 shadow-2xl border-4 border-slate-700/80">
        <div className="w-28 h-4 bg-slate-800 rounded-full mx-auto mb-2 flex items-center justify-center">
          <div className="w-10 h-1 bg-slate-600 rounded-full" />
        </div>

        <div className="bg-[#78909C] rounded-[28px] overflow-hidden flex flex-col h-[580px] shadow-inner relative">
          <div className="bg-emerald-700 text-white px-3.5 py-2.5 flex items-center justify-between shadow-xs">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-white text-emerald-800 flex items-center justify-center font-black text-xs shadow-xs">
                EV
              </div>
              <div>
                <div className="font-bold text-xs truncate max-w-[170px] leading-tight text-white">
                  {lineOaName}
                </div>
                <div className="text-[9px] text-emerald-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                  <span>Official Account • Verified</span>
                </div>
              </div>
            </div>
            <div className="text-[10px] text-white">10:45</div>
          </div>

          <div className="flex-1 p-3 overflow-hidden space-y-3">
            <div className="text-center">
              <span className="text-[10px] bg-black/20 text-white px-2.5 py-0.5 rounded-full">
                วันนี้ • Today
              </span>
            </div>

            <div className="bg-white rounded-2xl shadow-md overflow-hidden text-slate-900 text-xs border border-slate-200 animate-in zoom-in-95 duration-200">
              <div
                className="p-3 text-white flex items-center justify-between"
                style={{
                  backgroundColor:
                    customHeaderColor === '#00B900' ? '#047857' : customHeaderColor || '#047857',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <Building2 className="w-3.5 h-3.5" />
                  <span className="font-extrabold text-[11px] truncate">{activeSchool.nameTh}</span>
                </div>
                <span className="text-[9px] bg-black/35 px-1.5 py-0.5 rounded text-white font-mono">
                  SIS LIVE
                </span>
              </div>

              {previewSampleType === 'checkin' && (
                <div className="p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                      แจ้งเตือนเข้าเรียน
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-bold border border-emerald-300">
                      ✓ ตรงเวลา
                    </span>
                  </div>
                  <div className="font-extrabold text-sm text-slate-900">นายธนาธร สมชาย (น้องกอล์ฟ)</div>
                  <div className="bg-slate-100 rounded-xl p-2.5 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-700">รหัสนักเรียน:</span>
                      <span className="font-semibold text-slate-900">STU-2026-0842</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">ระดับชั้น:</span>
                      <span className="font-semibold text-slate-900">มัธยมศึกษาปีที่ 4/1</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">เวลาที่สแกน:</span>
                      <span className="font-semibold text-emerald-800">07:42:15 น.</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">ช่องทาง:</span>
                      <span className="font-semibold text-slate-900">Gate Turnstile 1 (หน้าโรงเรียน)</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="w-full py-1.5 rounded-lg bg-emerald-700 text-white text-[11px] font-bold shadow-xs hover:bg-emerald-800 cursor-pointer"
                  >
                    ดูสถิติการมาเรียนเดือนนี้
                  </button>
                </div>
              )}

              {previewSampleType === 'infirmary' && (
                <div className="p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider">
                      ห้องพยาบาลแจ้งเตือน
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold border border-rose-300">
                      ปฐมพยาบาลแล้ว
                    </span>
                  </div>
                  <div className="font-extrabold text-sm text-slate-900">น.ส.วิภาดา รัตนโชติ (น้องฟ้า)</div>
                  <div className="bg-rose-50 rounded-xl p-2.5 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-700">อาการที่พบ:</span>
                      <span className="font-bold text-rose-800">ปวดศีรษะ เป็นไข้ (38.1°C)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">การดูแล:</span>
                      <span className="font-semibold text-slate-900">พักผ่อนเตียง 2 + พาราเซตามอล 1 เม็ด</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">ครูพยาบาล:</span>
                      <span className="font-semibold text-slate-900">อ.สุดารัตน์ พยาบาลวิชาชีพ</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="w-full py-1.5 rounded-lg bg-rose-700 text-white text-[11px] font-bold shadow-xs hover:bg-rose-800 cursor-pointer"
                  >
                    โทรติดต่อห้องพยาบาลทันที
                  </button>
                </div>
              )}

              {previewSampleType === 'billing' && (
                <div className="p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider">
                      ใบแจ้งหนี้ค่าเทอม
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-100 text-purple-800 font-bold border border-purple-300">
                      รอชำระ
                    </span>
                  </div>
                  <div className="font-extrabold text-sm text-slate-900">
                    ภาคเรียนที่ 1/2569 • นายธนาธร สมชาย
                  </div>
                  <div className="bg-purple-50 rounded-xl p-2.5 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-700">ยอดที่ต้องชำระ:</span>
                      <span className="font-extrabold text-purple-900 text-xs">฿14,500.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">กำหนดชำระ:</span>
                      <span className="font-semibold text-slate-900">30 พ.ย. 2569</span>
                    </div>
                  </div>
                  <div className="p-2 bg-white rounded-lg border border-slate-200 flex items-center justify-center">
                    <img
                      src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=PROMPTPAY-0842-14500"
                      alt="PromptPay QR"
                      className="w-24 h-24 object-contain"
                    />
                  </div>
                  <button
                    type="button"
                    className="w-full py-1.5 rounded-lg bg-purple-700 text-white text-[11px] font-bold shadow-xs hover:bg-purple-800 cursor-pointer"
                  >
                    บันทึกภาพ QR เพื่อจ่ายในแอปธนาคาร
                  </button>
                </div>
              )}

              {previewSampleType === 'grades' && (
                <div className="p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider">
                      ประกาศผลการเรียน
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-300">
                      GPA 3.92
                    </span>
                  </div>
                  <div className="font-extrabold text-sm text-slate-900">ปพ.1 ดิจิทัล • นายธนาธร สมชาย</div>
                  <div className="bg-blue-50 rounded-xl p-2.5 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-700">วิทยาการคำนวณ AI:</span>
                      <span className="font-bold text-blue-800">เกรด 4.00 (A)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">คณิตศาสตร์ขั้นสูง:</span>
                      <span className="font-bold text-blue-800">เกรด 4.00 (A)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">ภาษาอังกฤษวิชาการ:</span>
                      <span className="font-bold text-blue-800">เกรด 3.50 (B+)</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="w-full py-1.5 rounded-lg bg-blue-700 text-white text-[11px] font-bold shadow-xs hover:bg-blue-800 cursor-pointer"
                  >
                    เปิดดูเล่มผลการเรียน ปพ.1 ฉบับเต็ม
                  </button>
                </div>
              )}

              {previewSampleType === 'homework' && (
                <div className="p-3.5 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">
                      มอบหมายการบ้านใหม่
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-bold border border-amber-300">
                      ส่งใน 3 วัน
                    </span>
                  </div>
                  <div className="font-extrabold text-sm text-slate-900">วิชาวิทยาการคำนวณ (CS301)</div>
                  <div className="bg-amber-50 rounded-xl p-2.5 space-y-1 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-slate-700">หัวข้อ:</span>
                      <span className="font-bold text-slate-900">โครงงาน Mini AI Image Classifier</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">กำหนดส่ง:</span>
                      <span className="font-semibold text-rose-800">8 พ.ย. 2569 (23:59 น.)</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-700">คะแนนเต็ม:</span>
                      <span className="font-semibold text-slate-900">20 คะแนน</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="w-full py-1.5 rounded-lg bg-amber-700 text-white text-[11px] font-bold shadow-xs hover:bg-amber-800 cursor-pointer"
                  >
                    ส่งการบ้านในระบบ LMS
                  </button>
                </div>
              )}

              <div className="px-3 pb-2.5 pt-1 text-[9px] text-slate-700 text-center border-t border-slate-200">
                {customFooterNote}
              </div>
            </div>
          </div>

          <div className="bg-white border-t border-slate-200 px-3 py-2 flex items-center justify-between text-slate-700 text-xs">
            <span>พิมพ์ข้อความถึงห้องธุรการ...</span>
            <Send className="w-4 h-4 text-emerald-700" />
          </div>
        </div>
      </div>
    </div>
  </div>
);
