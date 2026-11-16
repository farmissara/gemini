import { Course, GradeRecord, School, Student, SystemConfig } from '../types';
import {
  aggregateGradesByAssessmentCycle,
  calculateStudentAcademicSummary,
  CycleGradeEntry,
  getEducationStageLabelTh,
  getRawScoreFeedback,
  getStudentPrefixTh,
  StudentAcademicSummary,
} from './moeGrading';
import { formatSemesterLabel } from './schoolSettings';

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
