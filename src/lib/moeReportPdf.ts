import { AppLanguage, Course, GradeRecord, GradingSystem, School, Student, SystemConfig } from '../types';
import {
  aggregateGradesByAssessmentCycle,
  calculateStudentAcademicSummary,
  CycleGradeEntry,
  getEducationStageLabelTh,
  getRawScoreFeedback,
  getStudentPrefixTh,
  resolveEffectiveGrade,
  StudentAcademicSummary,
} from './moeGrading';
import { formatSemesterLabel } from './schoolSettings';
import { generateQrMatrix } from './qrCode';

export interface MoeSummaryPdfPayload {
  student: Student;
  courses: Course[];
  grades: GradeRecord[];
  systemConfig: SystemConfig;
  school?: School;
  advisorName?: string;
  principalName?: string;
  registrarName?: string;
  readingRating?: string;
  attributeRating?: string;
  competencyRating?: string;
  activityResult?: string;
  homeroomRemark?: string;
}

const THAI_DIGITS = ['๐', '๑', '๒', '๓', '๔', '๕', '๖', '๗', '๘', '๙'];

export function toThaiNumerals(value: string | number): string {
  return String(value).replace(/\d/g, (digit) => THAI_DIGITS[Number(digit)] ?? digit);
}

function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.split(',')[1] || '';
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Wraps one or more high-DPI JPEG page images into a standards-compliant PDF 1.4 Blob (A4: 595.28 x 841.89 pt).
 */
function buildPdfFromJpegPages(pages: Array<{ bytes: Uint8Array; width: number; height: number }>): Blob {
  const pageWidthPt = 595.28;
  const pageHeightPt = 841.89;
  const encoder = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [];
  let byteLength = 0;

  const pushStr = (text: string) => {
    const encoded = encoder.encode(text);
    chunks.push(encoded);
    byteLength += encoded.length;
  };

  const pushBytes = (bytes: Uint8Array) => {
    chunks.push(bytes);
    byteLength += bytes.length;
  };

  pushStr('%PDF-1.4\n%\xFF\xFF\xFF\xFF\n');

  // Object 1: Catalog, Object 2: Pages
  // Each page uses 3 objects: Page (3 + i*3), Contents (4 + i*3), Image XObject (5 + i*3)
  const pageObjIds = pages.map((_, idx) => 3 + idx * 3);

  offsets[1] = byteLength;
  pushStr('1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');

  offsets[2] = byteLength;
  pushStr(`2 0 obj\n<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>\nendobj\n`);

  pages.forEach((page, idx) => {
    const pageId = 3 + idx * 3;
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    const streamCmd = `q\n${pageWidthPt.toFixed(2)} 0 0 ${pageHeightPt.toFixed(2)} 0 0 cm\n/Im0 Do\nQ\n`;
    const streamLen = encoder.encode(streamCmd).length;

    offsets[pageId] = byteLength;
    pushStr(
      `${pageId} 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidthPt.toFixed(2)} ${pageHeightPt.toFixed(2)}] /Resources << /XObject << /Im0 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>\nendobj\n`
    );

    offsets[contentId] = byteLength;
    pushStr(`${contentId} 0 obj\n<< /Length ${streamLen} >>\nstream\n${streamCmd}endstream\nendobj\n`);

    offsets[imageId] = byteLength;
    pushStr(
      `${imageId} 0 obj\n<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`
    );
    pushBytes(page.bytes);
    pushStr('\nendstream\nendobj\n');
  });

  const xrefOffset = byteLength;
  const totalObjects = 2 + pages.length * 3;
  pushStr(`xref\n0 ${totalObjects + 1}\n`);
  pushStr('0000000000 65535 f \n');
  for (let id = 1; id <= totalObjects; id += 1) {
    const offsetStr = String(offsets[id] || 0).padStart(10, '0');
    pushStr(`${offsetStr} 00000 n \n`);
  }
  pushStr(`trailer\n<< /Size ${totalObjects + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`);

  const blobParts: BlobPart[] = chunks.map((chunk) => {
    const copy = new Uint8Array(chunk.length);
    copy.set(chunk);
    return copy.buffer;
  });
  return new Blob(blobParts, { type: 'application/pdf' });
}

function drawTruncatedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  align: CanvasTextAlign = 'left'
) {
  ctx.textAlign = align;
  let output = text;
  if (ctx.measureText(output).width > maxWidth) {
    while (output.length > 1 && ctx.measureText(`${output}...`).width > maxWidth) {
      output = output.slice(0, -1);
    }
    output = `${output}...`;
  }
  ctx.fillText(output, x, y);
}

function getCourseCategoryTh(category: string): string {
  if (category === 'core') return 'พื้นฐาน';
  if (category === 'elective') return 'เพิ่มเติม';
  if (category === 'activities') return 'กิจกรรม';
  return 'เพิ่มเติม';
}

function renderMoePageCanvas({
  payload,
  summary,
  entriesChunk,
  pageIndex,
  totalPages,
  startRowIndex,
}: {
  payload: MoeSummaryPdfPayload;
  summary: StudentAcademicSummary;
  entriesChunk: CycleGradeEntry[];
  pageIndex: number;
  totalPages: number;
  startRowIndex: number;
}): { bytes: Uint8Array; width: number; height: number } {
  const {
    student,
    systemConfig,
    school,
    advisorName = '',
    principalName = '',
    registrarName = '',
    readingRating = 'ดีเยี่ยม (๓)',
    attributeRating = 'ดีเยี่ยม (๓)',
    competencyRating = 'ดีเยี่ยม (๓)',
    activityResult = 'ผ (ผ่าน)',
    homeroomRemark = '',
  } = payload;

  // 150 DPI A4 canvas
  const width = 1240;
  const height = 1754;
  const margin = 72;
  const contentWidth = width - margin * 2;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('ไม่สามารถสร้าง Canvas สำหรับส่งออก PDF ได้');
  }

  const fontFamily = `'Sarabun', 'Noto Sans Thai', 'Plus Jakarta Sans', sans-serif`;

  // Paper background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);

  // Outer official frame
  ctx.strokeStyle = '#1e293b';
  ctx.lineWidth = 2;
  ctx.strokeRect(42, 42, width - 84, height - 84);

  const schoolNameTh = school?.nameTh || systemConfig.schoolNameTh || 'สถานศึกษา';
  const schoolNameEn = school?.nameEn || systemConfig.schoolNameEn || 'School';
  const stageLabel = getEducationStageLabelTh(summary.stage);
  const issuedDateTh = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Emblem seal box (left)
  ctx.save();
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(margin + 46, 128, 42, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#0f172a';
  ctx.font = `700 18px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText('ศธ.', margin + 46, 125);
  ctx.font = `600 13px ${fontFamily}`;
  ctx.fillText('สพฐ.', margin + 46, 146);
  ctx.restore();

  // Document reference box (right)
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.strokeRect(width - margin - 185, 86, 185, 84);
  ctx.fillStyle = '#f1f5f9';
  ctx.fillRect(width - margin - 184, 87, 183, 30);
  ctx.fillStyle = '#0f172a';
  ctx.font = `700 17px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText(summary.isPrimary ? 'แบบสรุป ปพ.๑/๖' : 'แบบสรุป ปพ.๑', width - margin - 92, 108);
  ctx.font = `600 14px ${fontFamily}`;
  ctx.fillText(`หน้า ${toThaiNumerals(pageIndex + 1)}/${toThaiNumerals(totalPages)}`, width - margin - 92, 134);
  ctx.font = `500 13px ${fontFamily}`;
  ctx.fillText(
    `ปีการศึกษา ${toThaiNumerals(systemConfig.academicYear || '2569')}`,
    width - margin - 92,
    157
  );

  // Center official header
  ctx.textAlign = 'center';
  ctx.fillStyle = '#0f172a';
  ctx.font = `700 24px ${fontFamily}`;
  ctx.fillText('แบบสรุปผลการเรียนและพัฒนาคุณภาพผู้เรียน (ฉบับกระทรวงศึกษาธิการ)', width / 2, 108);
  ctx.font = `700 22px ${fontFamily}`;
  ctx.fillText(`โรงเรียน${schoolNameTh} (${schoolNameEn})`, width / 2, 138);
  ctx.fillStyle = '#334155';
  ctx.font = `500 15px ${fontFamily}`;
  ctx.fillText(
    `ตามหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน พุทธศักราช ๒๕๕๑ (ฉบับปรับปรุง พ.ศ. ๒๕๖๐) • ${
      school?.code ? `รหัสสถานศึกษา ${school.code}` : 'สังกัด สพฐ.'
    }`,
    width / 2,
    165
  );

  // Header divider line
  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(margin, 188);
  ctx.lineTo(width - margin, 188);
  ctx.stroke();

  // Student info box
  const infoY = 204;
  const infoH = 112;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(margin, infoY, contentWidth, infoH);
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(margin, infoY, contentWidth, infoH);

  // Info grid divider lines
  ctx.beginPath();
  ctx.moveTo(margin, infoY + 56);
  ctx.lineTo(width - margin, infoY + 56);
  ctx.moveTo(margin + 560, infoY);
  ctx.lineTo(margin + 560, infoY + infoH);
  ctx.stroke();

  const fullPrefix = getStudentPrefixTh(student);
  ctx.fillStyle = '#0f172a';
  ctx.textAlign = 'left';
  ctx.font = `700 16px ${fontFamily}`;
  drawTruncatedText(
    ctx,
    `ชื่อ-สกุล: ${fullPrefix}${student.firstNameTh} ${student.lastNameTh} (${student.firstNameEn} ${student.lastNameEn})`,
    margin + 14,
    infoY + 34,
    532
  );
  drawTruncatedText(
    ctx,
    `เลขประจำตัวนักเรียน: ${student.studentIdNumber} • เลข ปชช.: ${student.nationalId || '-'}`,
    margin + 574,
    infoY + 34,
    contentWidth - 588
  );
  ctx.font = `600 15px ${fontFamily}`;
  drawTruncatedText(
    ctx,
    `ระดับชั้น: ${student.gradeLevel} ห้อง ${student.room} • ${stageLabel}`,
    margin + 14,
    infoY + 89,
    532
  );
  drawTruncatedText(
    ctx,
    `รอบประเมิน: ${
      summary.isPrimary
        ? `ประเมินผลรายปี (ปีการศึกษา ${systemConfig.academicYear})`
        : `${formatSemesterLabel(systemConfig.currentSemester)} ปีการศึกษา ${systemConfig.academicYear}`
    }`,
    margin + 574,
    infoY + 89,
    contentWidth - 588
  );

  // Section 1 heading
  let cursorY = infoY + infoH + 34;
  ctx.fillStyle = '#0f172a';
  ctx.font = `700 18px ${fontFamily}`;
  ctx.textAlign = 'left';
  ctx.fillText(
    summary.isPrimary
      ? '๑. ผลการประเมินพัฒนาการและสาระการเรียนรู้รายวิชา (รอบรายปี • สื่อสารด้วยคะแนนดิบและร้อยละ)'
      : '๑. ผลการเรียนกลุ่มสาระการเรียนรู้และรายวิชา (รอบรายภาคเรียน • ระบบหน่วยกิต ๐–๔)',
    margin,
    cursorY
  );
  cursorY += 14;

  // Table geometry
  const colWidths = summary.isPrimary
    ? [48, 108, 340, 104, 118, 174, 204] // Total = 1096
    : [48, 108, 360, 96, 86, 128, 126, 144]; // Total = 1096
  const headers = summary.isPrimary
    ? ['ที่', 'รหัสวิชา', 'ชื่อรายวิชา', 'ประเภท', 'รอบประเมิน', 'คะแนนที่ได้ (%)', 'ระดับพัฒนาการ / ผล']
    : ['ที่', 'รหัสวิชา', 'ชื่อรายวิชา', 'ประเภท', 'หน่วยกิต', 'คะแนน (๑๐๐)', 'ผลการเรียน', 'ค่าระดับ (Point)'];

  const headerH = 42;
  const rowH = 38;

  // Draw Table Header
  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(margin, cursorY, contentWidth, headerH);
  ctx.strokeStyle = '#334155';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(margin, cursorY, contentWidth, headerH);

  let colX = margin;
  ctx.fillStyle = '#0f172a';
  ctx.font = `700 15px ${fontFamily}`;
  headers.forEach((h, i) => {
    const w = colWidths[i];
    if (i > 0) {
      ctx.beginPath();
      ctx.moveTo(colX, cursorY);
      ctx.lineTo(colX, cursorY + headerH);
      ctx.stroke();
    }
    drawTruncatedText(ctx, h, colX + w / 2, cursorY + 27, w - 10, 'center');
    colX += w;
  });
  cursorY += headerH;

  // Draw Table Rows
  if (entriesChunk.length === 0) {
    ctx.strokeStyle = '#64748b';
    ctx.strokeRect(margin, cursorY, contentWidth, rowH * 2);
    ctx.fillStyle = '#475569';
    ctx.font = `500 16px ${fontFamily}`;
    ctx.textAlign = 'center';
    ctx.fillText('ยังไม่มีข้อมูลผลการเรียนในรอบการประเมินนี้', width / 2, cursorY + 42);
    cursorY += rowH * 2;
  } else {
    entriesChunk.forEach((entry, idx) => {
      const { grade, course, cycleLabelTh, resolved } = entry;
      const isAlt = idx % 2 === 1;
      if (isAlt) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(margin, cursorY, contentWidth, rowH);
      }
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1;
      ctx.strokeRect(margin, cursorY, contentWidth, rowH);

      const feedback = getRawScoreFeedback(grade.totalScore);
      const cells = summary.isPrimary
        ? [
            String(startRowIndex + idx + 1),
            course?.code || '-',
            course?.titleTh || course?.titleEn || '-',
            getCourseCategoryTh(course?.category || 'core'),
            resolved.isActivity ? 'กิจกรรม (รายปี)' : cycleLabelTh,
            `${grade.totalScore}% (${grade.totalScore}/100)`,
            resolved.isSpecial ? resolved.letter : `${feedback.labelTh} (ผล ${resolved.letter})`,
          ]
        : [
            String(startRowIndex + idx + 1),
            course?.code || '-',
            course?.titleTh || course?.titleEn || '-',
            getCourseCategoryTh(course?.category || 'core'),
            resolved.isActivity ? '-' : (course?.credits ?? 1).toFixed(1),
            `${grade.totalScore}`,
            resolved.letter,
            resolved.isSpecial ? '-' : resolved.point.toFixed(2),
          ];

      let cellX = margin;
      cells.forEach((val, ci) => {
        const w = colWidths[ci];
        if (ci > 0) {
          ctx.beginPath();
          ctx.moveTo(cellX, cursorY);
          ctx.lineTo(cellX, cursorY + rowH);
          ctx.stroke();
        }
        ctx.fillStyle =
          ci === 6 && (resolved.letter === 'ร' || resolved.letter === 'มส.' || resolved.letter === 'มผ')
            ? '#b91c1c'
            : '#0f172a';
        ctx.font = ci === 2 || ci === 5 || ci === 6 ? `600 15px ${fontFamily}` : `500 15px ${fontFamily}`;
        if (ci === 2) {
          drawTruncatedText(ctx, val, cellX + 10, cursorY + 24, w - 18, 'left');
        } else {
          drawTruncatedText(ctx, val, cellX + w / 2, cursorY + 24, w - 10, 'center');
        }
        cellX += w;
      });
      cursorY += rowH;
    });
  }

  // Only draw summary, MOE qualitative competencies, and signatures on the final page
  if (pageIndex === totalPages - 1) {
    cursorY += 22;

    // Academic Summary Highlight Strip
    const sumBoxH = 82;
    ctx.fillStyle = summary.hideGpaCalculations ? '#f0f9ff' : '#eef2ff';
    ctx.fillRect(margin, cursorY, contentWidth, sumBoxH);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(margin, cursorY, contentWidth, sumBoxH);

    const thirdW = contentWidth / 3;
    ctx.beginPath();
    ctx.moveTo(margin + thirdW, cursorY);
    ctx.lineTo(margin + thirdW, cursorY + sumBoxH);
    ctx.moveTo(margin + thirdW * 2, cursorY);
    ctx.lineTo(margin + thirdW * 2, cursorY + sumBoxH);
    ctx.stroke();

    const overallFeedback = getRawScoreFeedback(summary.averageRawScore);
    if (summary.hideGpaCalculations) {
      // Primary: show yearly cycle & raw percentage feedback ONLY (hide GPA/GPAX)
      ctx.textAlign = 'center';
      ctx.fillStyle = '#475569';
      ctx.font = `700 14px ${fontFamily}`;
      ctx.fillText('รอบประเมินและจำนวนวิชา (ป.๑–ป.๖)', margin + thirdW * 0.5, cursorY + 28);
      ctx.fillText('คะแนนดิบเฉลี่ยรายปี (เต็ม ๑๐๐ / %)', margin + thirdW * 1.5, cursorY + 28);
      ctx.fillText('ระดับพัฒนาการภาพรวม (Feedback)', margin + thirdW * 2.5, cursorY + 28);

      ctx.fillStyle = '#0f172a';
      ctx.font = `700 24px ${fontFamily}`;
      ctx.fillText(`${summary.gradedSubjectCount} รายวิชา (รายปี)`, margin + thirdW * 0.5, cursorY + 62);
      ctx.fillStyle = '#047857';
      ctx.fillText(
        summary.averageRawScore !== null ? `${summary.averageRawScore}%` : '-',
        margin + thirdW * 1.5,
        cursorY + 62
      );
      ctx.fillStyle = '#0369a1';
      ctx.fillText(`${overallFeedback.labelTh} (${overallFeedback.labelEn})`, margin + thirdW * 2.5, cursorY + 62);
    } else {
      const termGpaStr = summary.termGpa !== null ? summary.termGpa.toFixed(2) : Number(student.gpa || 0).toFixed(2);
      const gpaxStr = summary.gpax !== null ? summary.gpax.toFixed(2) : Number(student.gpa || 0).toFixed(2);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#475569';
      ctx.font = `700 14px ${fontFamily}`;
      ctx.fillText('หน่วยกิตลงทะเบียน / หน่วยกิตที่ได้', margin + thirdW * 0.5, cursorY + 28);
      ctx.fillText('ผลการเรียนเฉลี่ยประจำภาค (GPA)', margin + thirdW * 1.5, cursorY + 28);
      ctx.fillText('ผลการเรียนเฉลี่ยสะสม (GPAX)', margin + thirdW * 2.5, cursorY + 28);

      ctx.fillStyle = '#0f172a';
      ctx.font = `700 24px ${fontFamily}`;
      ctx.fillText(
        `${summary.registeredCredits.toFixed(1)} / ${summary.earnedCredits.toFixed(1)}`,
        margin + thirdW * 0.5,
        cursorY + 62
      );
      ctx.fillStyle = '#1d4ed8';
      ctx.fillText(termGpaStr, margin + thirdW * 1.5, cursorY + 62);
      ctx.fillStyle = '#047857';
      ctx.fillText(gpaxStr, margin + thirdW * 2.5, cursorY + 62);
    }

    cursorY += sumBoxH + 28;

    // Section 2: MOE Non-Academic Pillars (4 Pillars required by Basic Education Core Curriculum)
    ctx.fillStyle = '#0f172a';
    ctx.font = `700 18px ${fontFamily}`;
    ctx.textAlign = 'left';
    ctx.fillText('๒. สรุปผลการประเมินตามเกณฑ์มาตรฐานหลักสูตรแกนกลางการศึกษาขั้นพื้นฐาน (ศธ.)', margin, cursorY);
    cursorY += 12;

    const moeRows = [
      ['การอ่าน คิดวิเคราะห์ และเขียน', readingRating],
      ['คุณลักษณะอันพึงประสงค์ ๘ ประการ', attributeRating],
      ['สมรรถนะสำคัญของผู้เรียน ๕ ประการ', competencyRating],
      ['กิจกรรมพัฒนาผู้เรียน (แนะแนว / ลูกเสือ-เนตรนารี / ชุมนุม / เพื่อสังคม)', activityResult],
    ];
    const moeRowH = 34;
    moeRows.forEach(([label, rating], idx) => {
      if (idx % 2 === 0) {
        ctx.fillStyle = '#f8fafc';
        ctx.fillRect(margin, cursorY, contentWidth, moeRowH);
      }
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.strokeRect(margin, cursorY, contentWidth, moeRowH);
      ctx.beginPath();
      ctx.moveTo(margin + 760, cursorY);
      ctx.lineTo(margin + 760, cursorY + moeRowH);
      ctx.stroke();

      ctx.fillStyle = '#0f172a';
      ctx.font = `600 15px ${fontFamily}`;
      drawTruncatedText(ctx, `${idx + 1}. ${label}`, margin + 12, cursorY + 22, 736, 'left');
      ctx.fillStyle = '#047857';
      ctx.font = `700 15px ${fontFamily}`;
      drawTruncatedText(ctx, rating, margin + 760 + (contentWidth - 760) / 2, cursorY + 22, contentWidth - 780, 'center');
      cursorY += moeRowH;
    });

    if (homeroomRemark.trim()) {
      cursorY += 20;
      ctx.fillStyle = '#334155';
      ctx.font = `600 14px ${fontFamily}`;
      drawTruncatedText(ctx, `ความเห็นครูที่ปรึกษา: ${homeroomRemark.trim()}`, margin, cursorY, contentWidth, 'left');
    }

    // Signatures block anchored cleanly at bottom of page
    const sigY = height - 255;
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(margin, sigY - 22);
    ctx.lineTo(width - margin, sigY - 22);
    ctx.stroke();

    const sigCols = [
      { role: 'ลงชื่อ ....................................................... ครูที่ปรึกษา', name: advisorName.trim() || '........................................', title: 'ครูประจำชั้น / ครูที่ปรึกษา' },
      { role: 'ลงชื่อ ....................................................... นายทะเบียน', name: registrarName.trim() || 'งานวัดผลและทะเบียน', title: `ออกเอกสาร ณ วันที่ ${issuedDateTh}` },
      { role: 'ลงชื่อ ....................................................... ผู้อำนวยการ', name: principalName.trim() || '........................................', title: `ผู้อำนวยการโรงเรียน${schoolNameTh}` },
    ];

    sigCols.forEach((sig, i) => {
      const cx = margin + thirdW * (i + 0.5);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f172a';
      ctx.font = `500 14px ${fontFamily}`;
      drawTruncatedText(ctx, sig.role, cx, sigY + 42, thirdW - 20, 'center');
      ctx.font = `700 15px ${fontFamily}`;
      drawTruncatedText(ctx, `(${sig.name})`, cx, sigY + 72, thirdW - 20, 'center');
      ctx.fillStyle = '#475569';
      ctx.font = `500 13px ${fontFamily}`;
      drawTruncatedText(ctx, sig.title, cx, sigY + 96, thirdW - 20, 'center');
    });
  }

  // Footer note
  ctx.fillStyle = '#64748b';
  ctx.font = `500 12px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText(
    `เอกสารรับรองผลการเรียนอิเล็กทรอนิกส์ตามรูปแบบกระทรวงศึกษาธิการ • ออกเมื่อ ${issuedDateTh}`,
    width / 2,
    height - 58
  );

  const jpegUrl = canvas.toDataURL('image/jpeg', 0.94);
  return {
    bytes: dataUrlToBytes(jpegUrl),
    width,
    height,
  };
}

export function generateMoeGradeSummaryPdfBlob(payload: MoeSummaryPdfPayload): {
  blob: Blob;
  fileName: string;
  summary: StudentAcademicSummary;
  entries: CycleGradeEntry[];
} {
  const summary = calculateStudentAcademicSummary({
    student: payload.student,
    courses: payload.courses,
    grades: payload.grades,
    gradingSystem: payload.systemConfig.gradingSystem,
    currentAcademicYear: payload.systemConfig.academicYear,
    currentSemester: payload.systemConfig.currentSemester,
  });

  const entries = aggregateGradesByAssessmentCycle({
    student: payload.student,
    courses: payload.courses,
    grades: payload.grades,
    gradingSystem: payload.systemConfig.gradingSystem,
    currentAcademicYear: payload.systemConfig.academicYear,
    currentSemester: payload.systemConfig.currentSemester,
  });

  const rowsPerPage = 16;
  const chunks: CycleGradeEntry[][] = [];
  if (entries.length === 0) {
    chunks.push([]);
  } else {
    for (let i = 0; i < entries.length; i += rowsPerPage) {
      chunks.push(entries.slice(i, i + rowsPerPage));
    }
  }

  const renderedPages = chunks.map((chunk, idx) =>
    renderMoePageCanvas({
      payload,
      summary,
      entriesChunk: chunk,
      pageIndex: idx,
      totalPages: chunks.length,
      startRowIndex: idx * rowsPerPage,
    })
  );

  const blob = buildPdfFromJpegPages(renderedPages);
  const safeId = (payload.student.studentIdNumber || payload.student.id).replace(/[^a-zA-Z0-9_-]/g, '');
  const stageTag = summary.isPrimary ? 'MOE_Primary_Yearly' : 'MOE_Secondary_Transcript';
  const fileName = `${stageTag}_${safeId}_AY${payload.systemConfig.academicYear || '2569'}.pdf`;

  return { blob, fileName, summary, entries };
}

/**
 * Triggers a clean browser file download of the Thai MOE Grade Summary PDF.
 */
export function downloadMoeGradeSummaryPdf(payload: MoeSummaryPdfPayload): { fileName: string } {
  const { blob, fileName } = generateMoeGradeSummaryPdfBlob(payload);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return { fileName };
}

/**
 * Prints cleanly via an isolated hidden A4 iframe (avoiding window.open & background modal clutter).
 */
export function printHtmlElementInIsolatedFrame(htmlContent: string, title: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  iframe.setAttribute('aria-hidden', 'true');
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) {
    iframe.remove();
    window.print();
    return;
  }

  const inheritedStyles = Array.from(
    document.querySelectorAll('link[rel="stylesheet"], style')
  )
    .map((el) => el.outerHTML)
    .join('\n  ');

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  ${inheritedStyles}
  <style>
    @page { size: A4 portrait; margin: 12mm; }
    * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    html, body { margin: 0; padding: 0; font-family: 'Sarabun', 'Noto Sans Thai', sans-serif; color: #0f172a !important; background: #ffffff !important; }
    .print\\:hidden { display: none !important; }
    .hidden.print\\:block { display: block !important; }
  </style>
</head>
<body>${htmlContent}</body>
</html>`);
  doc.close();

  const triggerPrint = () => {
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } finally {
      setTimeout(() => iframe.remove(), 1500);
    }
  };

  setTimeout(triggerPrint, 250);
}

export interface GradeDistributionPdfPayload {
  courses: Course[];
  grades: GradeRecord[];
  students: Student[];
  systemConfig: SystemConfig;
  school?: School;
  selectedCourse?: Course;
  gradingSystem: GradingSystem;
  scope: 'course' | 'all_courses' | 'by_subject';
  chartMode: 'score_bins' | 'grade_tiers';
  departmentFilter?: string;
  roomFilter?: string;
  levelFilter?: string;
  eligibilityFilter?: string;
  lang?: AppLanguage;
}

const PDF_SCORE_BINS = [
  { key: 'lt50', label: '0–49', gradeThai: '0', gradeIntl: 'F', min: -1, max: 49.999, color: '#f43f5e' },
  { key: '50_54', label: '50–54', gradeThai: '1', gradeIntl: 'D', min: 50, max: 54.999, color: '#fb923c' },
  { key: '55_59', label: '55–59', gradeThai: '1.5', gradeIntl: 'D+', min: 55, max: 59.999, color: '#f59e0b' },
  { key: '60_64', label: '60–64', gradeThai: '2', gradeIntl: 'C', min: 60, max: 64.999, color: '#eab308' },
  { key: '65_69', label: '65–69', gradeThai: '2.5', gradeIntl: 'C+', min: 65, max: 69.999, color: '#84cc16' },
  { key: '70_74', label: '70–74', gradeThai: '3', gradeIntl: 'B', min: 70, max: 74.999, color: '#14b8a6' },
  { key: '75_79', label: '75–79', gradeThai: '3.5', gradeIntl: 'B+', min: 75, max: 79.999, color: '#06b6d4' },
  { key: '80_84', label: '80–84', gradeThai: '4', gradeIntl: 'A', min: 80, max: 84.999, color: '#0ea5e9' },
  { key: '85_89', label: '85–89', gradeThai: '4', gradeIntl: 'A', min: 85, max: 89.999, color: '#6366f1' },
  { key: '90_100', label: '90–100', gradeThai: '4', gradeIntl: 'A', min: 90, max: 100.001, color: '#10b981' },
];

const PDF_THAI_TIERS = [
  { tier: '4', range: '80–100', color: '#10b981' },
  { tier: '3.5', range: '75–79', color: '#0ea5e9' },
  { tier: '3', range: '70–74', color: '#06b6d4' },
  { tier: '2.5', range: '65–69', color: '#14b8a6' },
  { tier: '2', range: '60–64', color: '#84cc16' },
  { tier: '1.5', range: '55–59', color: '#eab308' },
  { tier: '1', range: '50–54', color: '#f59e0b' },
  { tier: '0', range: '0–49', color: '#f43f5e' },
  { tier: 'ผ', range: 'ผ่านกิจกรรม', color: '#059669' },
  { tier: 'มผ', range: 'ไม่ผ่านกิจกรรม', color: '#e11d48' },
  { tier: 'ร', range: 'รอตัดสิน', color: '#fb7185' },
  { tier: 'มส.', range: 'ไม่มีสิทธิ์สอบ', color: '#be123c' },
];

const PDF_INTL_TIERS = [
  { tier: 'A', range: '80–100', color: '#10b981' },
  { tier: 'B+', range: '75–79', color: '#0ea5e9' },
  { tier: 'B', range: '70–74', color: '#06b6d4' },
  { tier: 'C+', range: '65–69', color: '#14b8a6' },
  { tier: 'C', range: '60–64', color: '#84cc16' },
  { tier: 'D+', range: '55–59', color: '#eab308' },
  { tier: 'D', range: '50–54', color: '#f59e0b' },
  { tier: 'F', range: '0–49', color: '#f43f5e' },
  { tier: 'ผ', range: 'Pass Activity', color: '#059669' },
  { tier: 'มผ', range: 'Fail Activity', color: '#e11d48' },
  { tier: 'ร', range: 'Incomplete', color: '#fb7185' },
  { tier: 'มส.', range: 'Ineligible', color: '#be123c' },
];

function computeMedianValue(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

/**
 * Builds and downloads an A4 Administrative PDF Report containing the grade distribution KPIs,
 * histogram chart, grade tier breakdown, and official signature block.
 */
export function downloadGradeDistributionReportPdf(payload: GradeDistributionPdfPayload): {
  fileName: string;
} {
  const {
    courses,
    grades,
    systemConfig,
    school,
    selectedCourse,
    gradingSystem,
    scope,
    chartMode,
    departmentFilter = 'all',
    roomFilter = 'all',
    levelFilter = 'all',
    eligibilityFilter = 'all',
  } = payload;

  const width = 1240;
  const height = 1754;
  const margin = 68;
  const contentWidth = width - margin * 2;
  const fontFamily = `'Sarabun', 'Noto Sans Thai', 'Plus Jakarta Sans', sans-serif`;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('ไม่สามารถสร้าง Canvas สำหรับรายงาน PDF ได้');
  }

  const courseById = new Map(courses.map((c) => [c.id, c]));
  const totalCount = grades.length;
  const scores = grades.map((g) => Number(g.totalScore) || 0);
  const meanScore =
    totalCount > 0 ? Math.round((scores.reduce((s, v) => s + v, 0) / totalCount) * 10) / 10 : 0;
  const medianScore =
    totalCount > 0 ? Math.round(computeMedianValue(scores) * 10) / 10 : 0;

  let passCount = 0;
  let distinctionCount = 0;
  let atRiskCount = 0;
  const tierBuckets = new Map<string, GradeRecord[]>();

  for (const grade of grades) {
    const course = courseById.get(grade.courseId) || selectedCourse;
    const resolved = resolveEffectiveGrade(grade, course, gradingSystem);
    const list = tierBuckets.get(resolved.letter) || [];
    list.push(grade);
    tierBuckets.set(resolved.letter, list);

    const failSpecial = resolved.letter === 'ร' || resolved.letter === 'มส.' || resolved.letter === 'มผ';
    const score = Number(grade.totalScore) || 0;
    if (!failSpecial && score >= 50 && resolved.letter !== '0' && resolved.letter !== 'F') {
      passCount += 1;
    } else {
      atRiskCount += 1;
    }
    if (!failSpecial && score >= 80) {
      distinctionCount += 1;
    }
  }

  const passRate = totalCount > 0 ? Math.round((passCount / totalCount) * 1000) / 10 : 0;
  const distinctionRate = totalCount > 0 ? Math.round((distinctionCount / totalCount) * 1000) / 10 : 0;

  // Score bins data
  const scoreBins = PDF_SCORE_BINS.map((bin) => {
    const matches = grades.filter((g) => {
      const s = Math.max(0, Math.min(100, Number(g.totalScore) || 0));
      return s >= bin.min && s <= bin.max;
    });
    const count = matches.length;
    const avg =
      count > 0
        ? Math.round((matches.reduce((s, g) => s + (Number(g.totalScore) || 0), 0) / count) * 10) / 10
        : null;
    return {
      ...bin,
      gradeLabel: gradingSystem === 'international' ? bin.gradeIntl : bin.gradeThai,
      count,
      percent: totalCount > 0 ? Math.round((count / totalCount) * 1000) / 10 : 0,
      avg,
    };
  });

  // Grade tiers data
  const tierDefs = gradingSystem === 'international' ? PDF_INTL_TIERS : PDF_THAI_TIERS;
  const coreTiers = new Set(
    gradingSystem === 'international'
      ? ['A', 'B+', 'B', 'C+', 'C', 'D+', 'D', 'F']
      : ['4', '3.5', '3', '2.5', '2', '1.5', '1', '0']
  );
  const tierRows = tierDefs
    .map((def) => {
      const items = tierBuckets.get(def.tier) || [];
      if (!coreTiers.has(def.tier) && items.length === 0) return null;
      const count = items.length;
      const avg =
        count > 0
          ? Math.round((items.reduce((s, g) => s + (Number(g.totalScore) || 0), 0) / count) * 10) / 10
          : null;
      return {
        ...def,
        count,
        percent: totalCount > 0 ? Math.round((count / totalCount) * 1000) / 10 : 0,
        avg,
      };
    })
    .filter((item): item is NonNullable<typeof item> => Boolean(item));

  // Subject breakdown data
  const subjectMap = new Map<string, GradeRecord[]>();
  for (const g of grades) {
    const list = subjectMap.get(g.courseId) || [];
    list.push(g);
    subjectMap.set(g.courseId, list);
  }
  const subjectRows = Array.from(subjectMap.entries())
    .map(([courseId, list]) => {
      const c = courseById.get(courseId);
      const count = list.length;
      const avg =
        count > 0 ? Math.round((list.reduce((s, g) => s + (Number(g.totalScore) || 0), 0) / count) * 10) / 10 : 0;
      return {
        code: c?.code || courseId,
        title: c?.titleTh || c?.titleEn || '-',
        count,
        avg,
        color: avg >= 80 ? '#10b981' : avg >= 70 ? '#0ea5e9' : avg >= 60 ? '#6366f1' : avg >= 50 ? '#f59e0b' : '#f43f5e',
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code, 'th'));

  // Draw white A4 paper background & border
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, width, height);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 2;
  ctx.strokeRect(36, 36, width - 72, height - 72);

  const schoolNameTh = school?.nameTh || systemConfig.schoolNameTh || 'สถานศึกษา';
  const schoolNameEn = school?.nameEn || systemConfig.schoolNameEn || 'School';
  const issuedDateTh = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  // Top Banner
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(margin, 56, contentWidth, 96);
  ctx.fillStyle = '#38bdf8';
  ctx.fillRect(margin, 148, contentWidth, 4);

  ctx.fillStyle = '#ffffff';
  ctx.textAlign = 'left';
  ctx.font = `700 24px ${fontFamily}`;
  drawTruncatedText(
    ctx,
    'รายงานสถิติการกระจายผลการเรียนและคะแนนผลสัมฤทธิ์ (Grade Distribution Report)',
    margin + 24,
    98,
    contentWidth - 260
  );
  ctx.fillStyle = '#cbd5e1';
  ctx.font = `500 15px ${fontFamily}`;
  drawTruncatedText(
    ctx,
    `โรงเรียน${schoolNameTh} (${schoolNameEn}) • ${formatSemesterLabel(systemConfig.currentSemester)} ปีการศึกษา ${systemConfig.academicYear || '2569'}`,
    margin + 24,
    128,
    contentWidth - 260
  );

  // Document Ref pill on right of banner
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(width - margin - 220, 72, 200, 62);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1;
  ctx.strokeRect(width - margin - 220, 72, 200, 62);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#93c5fd';
  ctx.font = `700 13px ${fontFamily}`;
  ctx.fillText('เอกสารงานวัดผลและทะเบียน', width - margin - 120, 96);
  ctx.fillStyle = '#ffffff';
  ctx.font = `600 13px ${fontFamily}`;
  ctx.fillText(gradingSystem === 'international' ? 'เกณฑ์สากล (A–F)' : 'เกณฑ์ไทย (0–4)', width - margin - 120, 120);

  // Scope & Filter Context Box
  let cursorY = 172;
  ctx.fillStyle = '#f8fafc';
  ctx.fillRect(margin, cursorY, contentWidth, 64);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(margin, cursorY, contentWidth, 64);

  const scopeTitle =
    scope === 'course' && selectedCourse
      ? `รายวิชา: ${selectedCourse.code} — ${selectedCourse.titleTh || selectedCourse.titleEn} (${selectedCourse.titleEn}) • ครูผู้สอน: ${selectedCourse.teacherName || '-'}`
      : scope === 'by_subject'
      ? `ขอบเขตรายงาน: เปรียบเทียบผลสัมฤทธิ์รายวิชา (${subjectRows.length} วิชา)${departmentFilter !== 'all' ? ` • กลุ่มสาระฯ ${departmentFilter}` : ''}`
      : `ขอบเขตรายงาน: สรุปรวมทุกรายวิชา (${courses.length} รายวิชา)${departmentFilter !== 'all' ? ` • กลุ่มสาระฯ ${departmentFilter}` : ''}`;

  const filterSummaryParts: string[] = [];
  if (scope === 'course') {
    if (roomFilter !== 'all') filterSummaryParts.push(`ห้อง: ${roomFilter}`);
    if (levelFilter !== 'all') filterSummaryParts.push(`ชั้น: ${levelFilter}`);
    if (eligibilityFilter !== 'all') {
      filterSummaryParts.push(eligibilityFilter === 'at_risk' ? 'เฉพาะกลุ่มเสี่ยง มส.' : 'เฉพาะผู้มีสิทธิ์สอบ');
    }
  }
  const filterSummary =
    filterSummaryParts.length > 0
      ? `ตัวกรองที่ใช้: ${filterSummaryParts.join(' • ')}`
      : 'ตัวกรองที่ใช้: แสดงข้อมูลนักเรียนทั้งหมดในช่วงที่เลือก';

  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = `700 16px ${fontFamily}`;
  drawTruncatedText(ctx, scopeTitle, margin + 16, cursorY + 27, contentWidth - 32);
  ctx.fillStyle = '#475569';
  ctx.font = `500 14px ${fontFamily}`;
  drawTruncatedText(ctx, `${filterSummary} • วันที่ออกรายงาน: ${issuedDateTh}`, margin + 16, cursorY + 50, contentWidth - 32);

  // KPI Summary Cards (5 boxes)
  cursorY += 82;
  const kpiGap = 12;
  const kpiW = (contentWidth - kpiGap * 4) / 5;
  const kpiH = 78;
  const kpis = [
    { label: 'จำนวนนักเรียนที่ประเมิน', value: `${totalCount} คน`, bg: '#f8fafc', border: '#cbd5e1', text: '#0f172a' },
    { label: 'คะแนนเฉลี่ย (Mean)', value: `${meanScore}%`, bg: '#f0f9ff', border: '#7dd3fc', text: '#0369a1' },
    { label: 'ค่ามัธยฐาน (Median)', value: `${medianScore}%`, bg: '#eef2ff', border: '#a5b4fc', text: '#4338ca' },
    { label: 'ผ่านเกณฑ์ / ดีเยี่ยม (80+)', value: `${passRate}% (${distinctionRate}%)`, bg: '#ecfdf5', border: '#6ee7b7', text: '#047857' },
    { label: 'กลุ่มเสี่ยง (<50 / ร / มส.)', value: `${atRiskCount} คน`, bg: '#fff1f2', border: '#fda4af', text: '#be123c' },
  ];

  kpis.forEach((kpi, idx) => {
    const x = margin + idx * (kpiW + kpiGap);
    ctx.fillStyle = kpi.bg;
    ctx.fillRect(x, cursorY, kpiW, kpiH);
    ctx.strokeStyle = kpi.border;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, cursorY, kpiW, kpiH);

    ctx.textAlign = 'center';
    ctx.fillStyle = '#475569';
    ctx.font = `700 13px ${fontFamily}`;
    drawTruncatedText(ctx, kpi.label, x + kpiW / 2, cursorY + 26, kpiW - 12, 'center');
    ctx.fillStyle = kpi.text;
    ctx.font = `700 22px ${fontFamily}`;
    drawTruncatedText(ctx, kpi.value, x + kpiW / 2, cursorY + 58, kpiW - 12, 'center');
  });

  // Histogram Chart Section
  cursorY += kpiH + 26;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = `700 18px ${fontFamily}`;
  const chartHeading =
    scope === 'by_subject'
      ? '๑. กราฟเปรียบเทียบคะแนนเฉลี่ยรายวิชา (%)'
      : chartMode === 'grade_tiers'
      ? '๑. ฮิสโตแกรมการกระจายระดับเกรด (Grade Tier Histogram)'
      : '๑. ฮิสโตแกรมการกระจายช่วงคะแนน (Score Distribution Histogram)';
  ctx.fillText(chartHeading, margin, cursorY);
  cursorY += 12;

  const chartBoxH = 310;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(margin, cursorY, contentWidth, chartBoxH);
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(margin, cursorY, contentWidth, chartBoxH);

  const plotLeft = margin + 62;
  const plotRight = width - margin - 24;
  const plotTop = cursorY + 30;
  const plotBottom = cursorY + chartBoxH - 48;
  const plotWidth = plotRight - plotLeft;
  const plotHeight = plotBottom - plotTop;

  const barItems =
    scope === 'by_subject'
      ? subjectRows.slice(0, 14).map((s) => ({
          label: s.code,
          value: s.avg,
          displayTop: `${s.avg}% (${s.count})`,
          color: s.color,
        }))
      : chartMode === 'grade_tiers'
      ? tierRows.map((t) => ({
          label: t.tier,
          value: t.count,
          displayTop: `${t.count} คน`,
          color: t.color,
        }))
      : scoreBins.map((b) => ({
          label: b.label,
          value: b.count,
          displayTop: `${b.count} คน`,
          color: b.color,
        }));

  const maxVal =
    scope === 'by_subject'
      ? 100
      : Math.max(4, ...barItems.map((item) => item.value));

  // Horizontal grid lines
  const gridSteps = 4;
  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.fillStyle = '#64748b';
  ctx.font = `500 12px ${fontFamily}`;
  ctx.textAlign = 'right';
  for (let s = 0; s <= gridSteps; s += 1) {
    const ratio = s / gridSteps;
    const y = plotBottom - ratio * plotHeight;
    ctx.beginPath();
    ctx.moveTo(plotLeft, y);
    ctx.lineTo(plotRight, y);
    ctx.stroke();
    const tickVal = Math.round(maxVal * ratio);
    ctx.fillText(scope === 'by_subject' ? `${tickVal}%` : `${tickVal}`, plotLeft - 8, y + 4);
  }

  // Axis baseline
  ctx.strokeStyle = '#64748b';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(plotLeft, plotTop);
  ctx.lineTo(plotLeft, plotBottom);
  ctx.lineTo(plotRight, plotBottom);
  ctx.stroke();

  if (barItems.length > 0) {
    const slotW = plotWidth / barItems.length;
    const barW = Math.min(58, Math.max(18, slotW * 0.62));
    barItems.forEach((item, idx) => {
      const x = plotLeft + idx * slotW + (slotW - barW) / 2;
      const barH = maxVal > 0 ? Math.max(item.value > 0 ? 4 : 0, (item.value / maxVal) * plotHeight) : 0;
      const y = plotBottom - barH;

      ctx.fillStyle = item.color;
      ctx.fillRect(x, y, barW, barH);

      // Value label above bar
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f172a';
      ctx.font = `700 12px ${fontFamily}`;
      ctx.fillText(item.displayTop, x + barW / 2, Math.max(plotTop - 4, y - 6));

      // X-axis label
      ctx.fillStyle = '#334155';
      ctx.font = `700 12px ${fontFamily}`;
      drawTruncatedText(ctx, item.label, x + barW / 2, plotBottom + 20, slotW - 4, 'center');
    });
  } else {
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = `500 15px ${fontFamily}`;
    ctx.fillText('ไม่มีข้อมูลคะแนนในช่วงที่เลือก', width / 2, plotTop + plotHeight / 2);
  }

  // Section 2: Distribution Summary Tables (side-by-side: Grade Tiers on left, Score Bands on right)
  cursorY += chartBoxH + 28;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#0f172a';
  ctx.font = `700 18px ${fontFamily}`;
  ctx.fillText('๒. ตารางสรุปจำนวนนักเรียนตามระดับเกรดและช่วงคะแนน (สำหรับบันทึกฝ่ายวิชาการ)', margin, cursorY);
  cursorY += 12;

  const gapTables = 20;
  const leftTableW = Math.floor((contentWidth - gapTables) * 0.48);
  const rightTableW = contentWidth - gapTables - leftTableW;
  const leftX = margin;
  const rightX = margin + leftTableW + gapTables;

  // Draw Left Table (Grade Tiers)
  const tHeaderH = 34;
  const tRowH = 31;
  const leftCols = [
    Math.round(leftTableW * 0.22),
    Math.round(leftTableW * 0.24),
    Math.round(leftTableW * 0.20),
    Math.round(leftTableW * 0.17),
    leftTableW - Math.round(leftTableW * 0.22) - Math.round(leftTableW * 0.24) - Math.round(leftTableW * 0.20) - Math.round(leftTableW * 0.17),
  ];
  const leftHeaders = ['ระดับเกรด', 'ช่วงคะแนน', 'จำนวน (คน)', 'ร้อยละ', 'เฉลี่ย'];

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(leftX, cursorY, leftTableW, tHeaderH);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(leftX, cursorY, leftTableW, tHeaderH);
  let lx = leftX;
  ctx.fillStyle = '#0f172a';
  ctx.font = `700 13px ${fontFamily}`;
  leftHeaders.forEach((h, i) => {
    if (i > 0) {
      ctx.beginPath();
      ctx.moveTo(lx, cursorY);
      ctx.lineTo(lx, cursorY + tHeaderH);
      ctx.stroke();
    }
    drawTruncatedText(ctx, h, lx + leftCols[i] / 2, cursorY + 22, leftCols[i] - 6, 'center');
    lx += leftCols[i];
  });

  let leftY = cursorY + tHeaderH;
  tierRows.slice(0, 11).forEach((row, idx) => {
    if (idx % 2 === 1) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(leftX, leftY, leftTableW, tRowH);
    }
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(leftX, leftY, leftTableW, tRowH);
    const cells = [
      row.tier,
      row.range,
      `${row.count}`,
      `${row.percent}%`,
      row.avg !== null ? `${row.avg}%` : '-',
    ];
    let cx = leftX;
    cells.forEach((val, ci) => {
      if (ci > 0) {
        ctx.beginPath();
        ctx.moveTo(cx, leftY);
        ctx.lineTo(cx, leftY + tRowH);
        ctx.stroke();
      }
      ctx.fillStyle = ci === 0 ? row.color : '#0f172a';
      ctx.font = ci === 0 || ci === 2 ? `700 13px ${fontFamily}` : `500 13px ${fontFamily}`;
      drawTruncatedText(ctx, val, cx + leftCols[ci] / 2, leftY + 20, leftCols[ci] - 6, 'center');
      cx += leftCols[ci];
    });
    leftY += tRowH;
  });

  // Draw Right Table (Score Bins)
  const rightCols = [
    Math.round(rightTableW * 0.24),
    Math.round(rightTableW * 0.20),
    Math.round(rightTableW * 0.22),
    Math.round(rightTableW * 0.17),
    rightTableW - Math.round(rightTableW * 0.24) - Math.round(rightTableW * 0.20) - Math.round(rightTableW * 0.22) - Math.round(rightTableW * 0.17),
  ];
  const rightHeaders = ['ช่วงคะแนน (%)', 'เทียบเกรด', 'จำนวน (คน)', 'ร้อยละ', 'เฉลี่ย'];

  ctx.fillStyle = '#e2e8f0';
  ctx.fillRect(rightX, cursorY, rightTableW, tHeaderH);
  ctx.strokeStyle = '#475569';
  ctx.lineWidth = 1.2;
  ctx.strokeRect(rightX, cursorY, rightTableW, tHeaderH);
  let rx = rightX;
  ctx.fillStyle = '#0f172a';
  ctx.font = `700 13px ${fontFamily}`;
  rightHeaders.forEach((h, i) => {
    if (i > 0) {
      ctx.beginPath();
      ctx.moveTo(rx, cursorY);
      ctx.lineTo(rx, cursorY + tHeaderH);
      ctx.stroke();
    }
    drawTruncatedText(ctx, h, rx + rightCols[i] / 2, cursorY + 22, rightCols[i] - 6, 'center');
    rx += rightCols[i];
  });

  let rightY = cursorY + tHeaderH;
  scoreBins.forEach((bin, idx) => {
    if (idx % 2 === 1) {
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(rightX, rightY, rightTableW, tRowH);
    }
    ctx.strokeStyle = '#cbd5e1';
    ctx.lineWidth = 1;
    ctx.strokeRect(rightX, rightY, rightTableW, tRowH);
    const cells = [
      bin.label,
      bin.gradeLabel,
      `${bin.count}`,
      `${bin.percent}%`,
      bin.avg !== null ? `${bin.avg}%` : '-',
    ];
    let cx = rightX;
    cells.forEach((val, ci) => {
      if (ci > 0) {
        ctx.beginPath();
        ctx.moveTo(cx, rightY);
        ctx.lineTo(cx, rightY + tRowH);
        ctx.stroke();
      }
      ctx.fillStyle = ci === 1 ? bin.color : '#0f172a';
      ctx.font = ci === 1 || ci === 2 ? `700 13px ${fontFamily}` : `500 13px ${fontFamily}`;
      drawTruncatedText(ctx, val, cx + rightCols[ci] / 2, rightY + 20, rightCols[ci] - 6, 'center');
      cx += rightCols[ci];
    });
    rightY += tRowH;
  });

  // Signatures block at bottom
  const sigY = height - 210;
  ctx.strokeStyle = '#cbd5e1';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(margin, sigY - 18);
  ctx.lineTo(width - margin, sigY - 18);
  ctx.stroke();

  const thirdW = contentWidth / 3;
  const sigCols = [
    { role: 'ลงชื่อ ............................................... ผู้รายงาน', name: selectedCourse?.teacherName || 'ครูผู้สอน / ครูประจำวิชา', title: 'ผู้จัดทำรายงานผลสัมฤทธิ์' },
    { role: 'ลงชื่อ ............................................... หัวหน้างานวัดผล', name: 'งานวัดผลและประเมินผล', title: 'ผู้ตรวจสอบความถูกต้อง' },
    { role: 'ลงชื่อ ............................................... ผู้บริหารสถานศึกษา', name: `โรงเรียน${schoolNameTh}`, title: `รับทราบผล ณ วันที่ ${issuedDateTh}` },
  ];

  sigCols.forEach((sig, i) => {
    const cx = margin + thirdW * (i + 0.5);
    ctx.textAlign = 'center';
    ctx.fillStyle = '#0f172a';
    ctx.font = `500 14px ${fontFamily}`;
    drawTruncatedText(ctx, sig.role, cx, sigY + 28, thirdW - 18, 'center');
    ctx.font = `700 14px ${fontFamily}`;
    drawTruncatedText(ctx, `(${sig.name})`, cx, sigY + 56, thirdW - 18, 'center');
    ctx.fillStyle = '#475569';
    ctx.font = `500 13px ${fontFamily}`;
    drawTruncatedText(ctx, sig.title, cx, sigY + 80, thirdW - 18, 'center');
  });

  // Footer
  ctx.fillStyle = '#64748b';
  ctx.font = `500 12px ${fontFamily}`;
  ctx.textAlign = 'center';
  ctx.fillText(
    `เอกสารรายงานการกระจายผลการเรียนอิเล็กทรอนิกส์ (EduVerse Academic Records) • ออกเมื่อ ${issuedDateTh}`,
    width / 2,
    height - 52
  );

  const jpegUrl = canvas.toDataURL('image/jpeg', 0.94);
  const blob = buildPdfFromJpegPages([{ bytes: dataUrlToBytes(jpegUrl), width, height }]);
  const safeTag =
    scope === 'course' && selectedCourse?.code
      ? selectedCourse.code.replace(/[^a-zA-Z0-9_-]/g, '')
      : scope === 'by_subject'
      ? 'Subject_Comparison'
      : 'All_Subjects';
  const fileName = `Grade_Distribution_${safeTag}_AY${systemConfig.academicYear || '2569'}.pdf`;

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);

  return { fileName };
}

export interface BatchQrPdfPayload {
  students: Student[];
  school?: School;
  layout?: 'standard_3x4' | 'compact_4x5';
  lang?: AppLanguage;
}

/**
 * Generates and downloads a single multi-page A4 PDF containing scannable student ID QR codes
 * for all selected students.
 */
export function downloadBatchStudentQrCodesPdf(payload: BatchQrPdfPayload): {
  fileName: string;
  pageCount: number;
} {
  const { students, school, layout = 'standard_3x4' } = payload;
  if (students.length === 0) {
    throw new Error('ไม่มีนักเรียนที่เลือกสำหรับสร้าง PDF');
  }

  const pageWidth = 1240;
  const pageHeight = 1754;
  const margin = 56;
  const headerHeight = 88;
  const footerHeight = 42;
  const cols = layout === 'compact_4x5' ? 4 : 3;
  const rows = layout === 'compact_4x5' ? 5 : 4;
  const perPage = cols * rows;
  const gap = 18;
  const gridWidth = pageWidth - margin * 2;
  const gridHeight = pageHeight - margin * 2 - headerHeight - footerHeight;
  const cardW = (gridWidth - gap * (cols - 1)) / cols;
  const cardH = (gridHeight - gap * (rows - 1)) / rows;
  const fontFamily = `'Sarabun', 'Noto Sans Thai', 'Plus Jakarta Sans', sans-serif`;

  const schoolCode = school?.code || 'EDU';
  const schoolName = school?.nameTh || school?.nameEn || 'สถานศึกษา EduVerse';
  const accentColor = school?.primaryColor || '#1d4ed8';
  const issuedDateTh = new Date().toLocaleDateString('th-TH', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const totalPages = Math.ceil(students.length / perPage);
  const pages: Array<{ bytes: Uint8Array; width: number; height: number }> = [];

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx += 1) {
    const chunk = students.slice(pageIdx * perPage, (pageIdx + 1) * perPage);
    const canvas = document.createElement('canvas');
    canvas.width = pageWidth;
    canvas.height = pageHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('ไม่สามารถสร้าง Canvas สำหรับ PDF ได้');
    }

    // White A4 background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageWidth, pageHeight);

    // Header band
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(margin, margin, gridWidth, 68);
    ctx.fillStyle = accentColor;
    ctx.fillRect(margin, margin + 64, gridWidth, 4);

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.font = `700 22px ${fontFamily}`;
    drawTruncatedText(
      ctx,
      `${schoolName} • ชุดบัตรสแกน QR Code นักเรียน`,
      margin + 20,
      margin + 32,
      gridWidth - 260,
      'left'
    );
    ctx.fillStyle = '#cbd5e1';
    ctx.font = `500 13px ${fontFamily}`;
    ctx.fillText(
      `จำนวน ${students.length} คน • ใช้สแกนเช็คชื่อหน้าประตูและห้องเรียน (EDUVERSE:STU)`,
      margin + 20,
      margin + 54
    );

    ctx.textAlign = 'right';
    ctx.fillStyle = '#ffffff';
    ctx.font = `700 14px ${fontFamily}`;
    ctx.fillText(
      `หน้า ${pageIdx + 1} / ${totalPages}`,
      margin + gridWidth - 18,
      margin + 42
    );

    // Draw cards on grid
    chunk.forEach((student, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const x = margin + col * (cardW + gap);
      const y = margin + headerHeight + row * (cardH + gap);

      // Card outline + dashed cut guideline
      ctx.save();
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x, y, cardW, cardH);
      ctx.strokeStyle = '#94a3b8';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.strokeRect(x, y, cardW, cardH);
      ctx.restore();

      // Top bar inside card
      ctx.fillStyle = accentColor;
      ctx.fillRect(x, y, cardW, 7);

      // School label + badge
      ctx.textAlign = 'left';
      ctx.fillStyle = '#475569';
      ctx.font = `700 ${layout === 'compact_4x5' ? 11 : 13}px ${fontFamily}`;
      drawTruncatedText(ctx, schoolName, x + 12, y + 26, cardW - 86, 'left');

      ctx.fillStyle = '#eff6ff';
      ctx.fillRect(x + cardW - 68, y + 13, 56, 18);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#1d4ed8';
      ctx.font = `700 10px ${fontFamily}`;
      ctx.fillText('QR PASS', x + cardW - 40, y + 26);

      // Render crisp QR Code matrix
      const qrValue = `EDUVERSE:STU:${student.studentIdNumber}:${schoolCode}`;
      const matrix = generateQrMatrix(qrValue);
      const n = matrix.length;
      const maxQrBox = Math.min(
        cardW - 36,
        cardH - (layout === 'compact_4x5' ? 105 : 132)
      );
      const quietModules = 2;
      const totalModules = n + quietModules * 2;
      const cellPx = Math.max(2, Math.floor(maxQrBox / totalModules));
      const qrDrawSize = cellPx * totalModules;
      const qrX = x + (cardW - qrDrawSize) / 2;
      const qrY = y + 36;

      // White quiet zone + light frame
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(qrX - 4, qrY - 4, qrDrawSize + 8, qrDrawSize + 8);
      ctx.strokeStyle = '#e2e8f0';
      ctx.lineWidth = 1;
      ctx.strokeRect(qrX - 4, qrY - 4, qrDrawSize + 8, qrDrawSize + 8);

      ctx.fillStyle = '#0f172a';
      for (let r = 0; r < n; r += 1) {
        for (let c = 0; c < n; c += 1) {
          if (matrix[r][c]) {
            ctx.fillRect(
              qrX + (c + quietModules) * cellPx,
              qrY + (r + quietModules) * cellPx,
              cellPx,
              cellPx
            );
          }
        }
      }

      // Student Name & ID Info
      const textTopY = qrY + qrDrawSize + (layout === 'compact_4x5' ? 20 : 26);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#0f172a';
      ctx.font = `700 ${layout === 'compact_4x5' ? 14 : 17}px ${fontFamily}`;
      drawTruncatedText(
        ctx,
        `${student.firstNameTh} ${student.lastNameTh}`.trim(),
        x + cardW / 2,
        textTopY,
        cardW - 20,
        'center'
      );

      if (layout === 'standard_3x4') {
        ctx.fillStyle = '#64748b';
        ctx.font = `500 12px ${fontFamily}`;
        drawTruncatedText(
          ctx,
          `${student.firstNameEn} ${student.lastNameEn}`.trim(),
          x + cardW / 2,
          textTopY + 18,
          cardW - 20,
          'center'
        );
      }

      const idPillY = textTopY + (layout === 'compact_4x5' ? 10 : 28);
      const idLabel = `${student.studentIdNumber} • ${student.room}`;
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect(x + 16, idPillY, cardW - 32, 24);
      ctx.fillStyle = '#1e3a8a';
      ctx.font = `700 ${layout === 'compact_4x5' ? 12 : 13}px monospace`;
      drawTruncatedText(ctx, idLabel, x + cardW / 2, idPillY + 16, cardW - 40, 'center');
    });

    // Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = '#64748b';
    ctx.font = `500 12px ${fontFamily}`;
    ctx.fillText(
      `EduVerse Student QR Passes • ออกเอกสารเมื่อ ${issuedDateTh} • หน้า ${pageIdx + 1}/${totalPages}`,
      pageWidth / 2,
      pageHeight - 26
    );

    const jpegUrl = canvas.toDataURL('image/jpeg', 0.94);
    pages.push({
      bytes: dataUrlToBytes(jpegUrl),
      width: pageWidth,
      height: pageHeight,
    });
  }

  const blob = buildPdfFromJpegPages(pages);
  const fileName = `EduVerse_Student_QR_Codes_${students.length}.pdf`;
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);

  return { fileName, pageCount: totalPages };
}

