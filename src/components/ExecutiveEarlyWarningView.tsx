import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  Send, 
  UserCheck, 
  BookOpen, 
  Calendar, 
  MessageSquare, 
  Filter, 
  Search, 
  TrendingDown, 
  Clock, 
  ChevronRight,
  Sparkles,
  PhoneCall,
  FileCheck2,
  Download,
  X,
  SlidersHorizontal,
  Printer,
  Users,
  Activity,
  Award,
  AlertCircle,
  FileText,
  User,
  ExternalLink,
  Info
} from 'lucide-react';
import { 
  AtRiskStudentForecast, 
  AppLanguage, 
  UserRole,
  Student, 
  AttendanceRecord, 
  GradeRecord, 
  SdqAssessment, 
  BehaviorRecord,
  Course
} from '../types';
import { INITIAL_AT_RISK_FORECASTS } from '../data/innovativeFeaturesData';
import { PagedList } from './PagedList';
import { sendEduVerseNotification } from '../lib/pushNotifications';

export interface EnrichedStudentRiskProfile {
  studentId: string;
  studentName: string;
  studentRoom: string;
  studentNumber?: string;
  avatarUrl?: string;
  gpa: number;
  
  // Risk metrics
  attendanceRate: number; // 0-100%
  absenceCount: number;
  lateCount: number;
  midtermAverageScore: number;
  failingCoursesCount: number;
  homeworkCompletionRate: number;
  demeritPoints: number;
  demeritCount: number;
  sdqRiskStatus: 'normal' | 'risk' | 'problem';
  sdqTotalScore: number;
  
  // Evaluation
  riskLevel: 'high' | 'moderate' | 'low';
  riskFactors: ('attendance' | 'academic' | 'behavior' | 'sdq')[];
  predictedOutcome: string;
  primaryAlertReasonTh: string;
  primaryAlertReasonEn: string;
  
  // Associated history
  recentAbsenceDates: string[];
  recentDemeritNotes: string[];
  failingCourseNames: string[];
  
  // Interventions
  earlyInterventionActions: {
    id: string;
    actionType: 'line_parent_alert' | 'counselor_meeting' | 'remedial_course' | 'official_notice_letter';
    titleTh: string;
    titleEn: string;
    status: 'pending' | 'completed';
    sentAt?: string;
    note?: string;
  }[];
}

interface ExecutiveEarlyWarningViewProps {
  students?: Student[];
  attendance?: AttendanceRecord[];
  grades?: GradeRecord[];
  courses?: Course[];
  sdqAssessments?: SdqAssessment[];
  behaviorRecords?: BehaviorRecord[];
  lang?: AppLanguage;
  currentRole?: UserRole;
  currentUserName?: string;
  onNavigateToTab?: (tab: string) => void;
}

export const ExecutiveEarlyWarningView: React.FC<ExecutiveEarlyWarningViewProps> = ({
  students = [],
  attendance = [],
  grades = [],
  courses = [],
  sdqAssessments = [],
  behaviorRecords = [],
  lang = 'th',
  currentRole = 'super_admin',
  currentUserName = 'ผู้อำนวยการสถานศึกษา',
  onNavigateToTab
}) => {
  // Threshold Configurations
  const [absenceThresholdPct, setAbsenceThresholdPct] = useState<number>(20); // 20% absence => <80% attendance (OBEC standard)
  const [gpaThreshold, setGpaThreshold] = useState<number>(2.0);
  const [demeritThreshold, setDemeritThreshold] = useState<number>(10);
  
  // View persona toggle: Executive Summary vs Teacher Intervention Radar
  const [viewPersona, setViewPersona] = useState<'executive' | 'teacher'>('executive');
  
  // Filters
  const [selectedRiskFilter, setSelectedRiskFilter] = useState<'all' | 'high' | 'moderate' | 'low'>('all');
  const [selectedFactorFilter, setSelectedFactorFilter] = useState<'all' | 'attendance' | 'academic' | 'behavior' | 'compound'>('all');
  const [selectedRoomFilter, setSelectedRoomFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modals & Popups
  const [notificationToast, setNotificationToast] = useState<string | null>(null);
  const [activeDetailStudent, setActiveDetailStudent] = useState<EnrichedStudentRiskProfile | null>(null);
  const [officialNoticeStudent, setOfficialNoticeStudent] = useState<EnrichedStudentRiskProfile | null>(null);
  const [interventionNoteInput, setInterventionNoteInput] = useState('');

  // Course map for quick name resolution
  const courseMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of courses) {
      map.set(c.id, lang === 'th' ? c.titleTh : c.titleEn);
    }
    return map;
  }, [courses, lang]);

  // Compute Enriched Risk Profiles based on real data & dynamic thresholds
  const computedProfiles = useMemo<EnrichedStudentRiskProfile[]>(() => {
    if (!students || students.length === 0) {
      // Fallback conversion from innovativeFeaturesData
      return INITIAL_AT_RISK_FORECASTS.map((f, idx) => ({
        studentId: f.studentId,
        studentName: f.studentName,
        studentRoom: f.studentRoom,
        studentNumber: `0${idx + 1}`,
        avatarUrl: `https://images.unsplash.com/photo-${1534528741775 + idx}?w=150&auto=format&fit=crop&q=80`,
        gpa: f.riskLevel === 'high' ? 1.65 : f.riskLevel === 'moderate' ? 2.15 : 3.42,
        attendanceRate: f.attendanceRate,
        absenceCount: Math.round((100 - f.attendanceRate) / 5),
        lateCount: 2,
        midtermAverageScore: f.midtermAverageScore,
        failingCoursesCount: f.midtermAverageScore < 50 ? 2 : 0,
        homeworkCompletionRate: f.homeworkCompletionRate,
        demeritPoints: f.riskLevel === 'high' ? 15 : 0,
        demeritCount: f.riskLevel === 'high' ? 2 : 0,
        sdqRiskStatus: f.sdqRiskStatus,
        sdqTotalScore: f.sdqRiskStatus === 'problem' ? 21 : f.sdqRiskStatus === 'risk' ? 16 : 9,
        riskLevel: f.riskLevel,
        riskFactors: [
          ...(f.attendanceRate < (100 - absenceThresholdPct) ? ['attendance' as const] : []),
          ...(f.midtermAverageScore < 50 ? ['academic' as const] : []),
          ...(f.sdqRiskStatus !== 'normal' ? ['sdq' as const] : [])
        ],
        predictedOutcome: f.predictedOutcome,
        primaryAlertReasonTh: f.attendanceRate < 80 ? 'ขาดเรียนเกิน 20% เสี่ยงหมดสิทธิ์สอบ (มส.)' : 'งานค้างส่งและคะแนนสอบกลางภาคต่ำกว่าเกณฑ์',
        primaryAlertReasonEn: f.attendanceRate < 80 ? 'Attendance <80% exam disqualification hazard' : 'Academic probation & missing homework',
        recentAbsenceDates: ['2026-11-03', '2026-11-05'],
        recentDemeritNotes: ['ไม่เข้าแถวเคารพธงชาติ 3 ครั้ง', 'หนีเรียนคาบบ่าย'],
        failingCourseNames: ['คณิตศาสตร์พื้นฐาน', 'วิทยาการคำนวณ'],
        earlyInterventionActions: [
          {
            id: `act-${f.studentId}-1`,
            actionType: 'line_parent_alert',
            titleTh: 'ส่งหนังสือแจ้งเตือนผู้ปกครองผ่าน LINE OA',
            titleEn: 'Send Official Warning Alert via LINE OA',
            status: 'pending'
          },
          {
            id: `act-${f.studentId}-2`,
            actionType: 'counselor_meeting',
            titleTh: 'นัดหมายครูแนะแนวรายบุคคล (OBEC Care)',
            titleEn: 'Refer to School Guidance Counselor (OBEC Care)',
            status: 'pending'
          },
          {
            id: `act-${f.studentId}-3`,
            actionType: 'remedial_course',
            titleTh: 'ส่งต่อคลินิกการเรียนรู้ / ซ่อมเสริมคะแนน',
            titleEn: 'Assign Remedial Clinic / Makeup Lessons',
            status: 'pending'
          }
        ]
      }));
    }

    const attendanceMinRate = 100 - absenceThresholdPct;

    return students.map((stu) => {
      // 1. Attendance Analysis
      const stuAttendance = attendance.filter(a => a.studentId === stu.id);
      const totalAtt = stuAttendance.length;
      let attendanceRate = 92;
      let absenceCount = 0;
      let lateCount = 0;
      const recentAbsenceDates: string[] = [];

      if (totalAtt > 0) {
        absenceCount = stuAttendance.filter(a => a.status === 'absent').length;
        lateCount = stuAttendance.filter(a => a.status === 'late').length;
        const presentCount = stuAttendance.filter(a => a.status === 'present').length;
        // Late counts as 0.5 presence in standard calculations
        const effectivePresent = presentCount + (lateCount * 0.5);
        attendanceRate = Math.min(100, Math.max(0, Math.round((effectivePresent / totalAtt) * 100)));
        
        stuAttendance
          .filter(a => a.status === 'absent' || a.status === 'late')
          .slice(0, 5)
          .forEach(a => recentAbsenceDates.push(`${a.date} (${a.status === 'absent' ? 'ขาด' : 'สาย'})`));
      } else {
        // Fallback default calculation based on student GPA or synthetic variation
        if (stu.gpa < 2.0) {
          attendanceRate = 74;
          absenceCount = 6;
          recentAbsenceDates.push('2026-11-04 (ขาด)', '2026-11-06 (ขาด)');
        } else if (stu.gpa < 2.5) {
          attendanceRate = 82;
          absenceCount = 3;
        }
      }

      // 2. Academic Scores Analysis
      const stuGrades = grades.filter(g => g.studentId === stu.id);
      let avgScore = Math.round((stu.gpa / 4.0) * 100);
      let failingCoursesCount = 0;
      const failingCourseNames: string[] = [];

      if (stuGrades.length > 0) {
        const totalPoints = stuGrades.reduce((acc, g) => acc + (g.totalScore || g.midtermScore || 65), 0);
        avgScore = Math.round(totalPoints / stuGrades.length);

        stuGrades.forEach(g => {
          const score = g.totalScore || g.midtermScore || 0;
          if (score < 50 || g.letterGrade === 'F' || g.gradePoint === 0) {
            failingCoursesCount++;
            const cName = courseMap.get(g.courseId) || `วิชา ${g.courseId}`;
            failingCourseNames.push(cName);
          }
        });
      } else if (stu.gpa < gpaThreshold) {
        failingCoursesCount = 2;
        failingCourseNames.push('คณิตศาสตร์พื้นฐาน', 'ภาษาอังกฤษเพื่อการสื่อสาร');
      }

      // Homework completion estimation
      const homeworkRate = stu.gpa >= 3.2 ? 96 : stu.gpa >= 2.5 ? 82 : stu.gpa >= 2.0 ? 64 : 41;

      // 3. Behavior Infractions & Demerits Analysis
      const stuBehaviors = behaviorRecords.filter(b => b.studentId === stu.id);
      let demeritPoints = 0;
      let demeritCount = 0;
      const recentDemeritNotes: string[] = [];

      stuBehaviors.forEach(b => {
        if (b.type === 'demerit') {
          demeritCount++;
          demeritPoints += Math.abs(b.points);
          recentDemeritNotes.push(`${b.category}: ${b.notes || 'หักคะแนนพฤติกรรม'} (-${Math.abs(b.points)})`);
        }
      });

      // 4. SDQ Psychological Screening
      const stuSdq = sdqAssessments.find(s => s.studentId === stu.id);
      let sdqRiskStatus: 'normal' | 'risk' | 'problem' = 'normal';
      let sdqTotalScore = 10;

      if (stuSdq) {
        sdqRiskStatus = stuSdq.overallStatus;
        sdqTotalScore = stuSdq.totalDifficultiesScore;
      } else if (attendanceRate < 75 || demeritPoints >= 15) {
        sdqRiskStatus = 'risk';
        sdqTotalScore = 17;
      }

      // 5. Evaluate Multi-Factor Risks
      const riskFactors: ('attendance' | 'academic' | 'behavior' | 'sdq')[] = [];
      if (attendanceRate < attendanceMinRate) riskFactors.push('attendance');
      if (stu.gpa < gpaThreshold || avgScore < 50 || failingCoursesCount > 0) riskFactors.push('academic');
      if (demeritPoints >= demeritThreshold) riskFactors.push('behavior');
      if (sdqRiskStatus !== 'normal') riskFactors.push('sdq');

      // Risk Level Determination
      let riskLevel: 'high' | 'moderate' | 'low' = 'low';
      let outcome = 'ปลอดภัยตามเกณฑ์ปกติ';
      let primaryReasonTh = 'ผลการเรียนและสถิติเวลาเรียนผ่านเกณฑ์มาตรฐาน';
      let primaryReasonEn = 'On track with attendance and academic standards';

      if (attendanceRate < attendanceMinRate && riskFactors.length >= 2) {
        riskLevel = 'high';
        outcome = 'วิกฤตพหุมิติ (เสี่ยง มส. + ผลการเรียนตกต่ำ)';
        primaryReasonTh = `ขาดเรียนเกิน ${absenceThresholdPct}% (${attendanceRate}%) และมีผลการเรียนไม่ผ่าน ${failingCoursesCount} วิชา`;
        primaryReasonEn = `Absent >${absenceThresholdPct}% and failing ${failingCoursesCount} subjects`;
      } else if (attendanceRate < attendanceMinRate) {
        riskLevel = 'high';
        outcome = 'เสี่ยงหมดสิทธิ์สอบ (มส. เวลาเรียนไม่พอ)';
        primaryReasonTh = `เวลาเรียน ${attendanceRate}% ต่ำกว่าเกณฑ์ขั้นต่ำ 80% ของหลักสูตร สพฐ.`;
        primaryReasonEn = `Attendance ${attendanceRate}% falls below 80% OBEC exam eligibility threshold`;
      } else if (stu.gpa < 1.8 || failingCoursesCount >= 2 || homeworkRate < 50) {
        riskLevel = 'high';
        outcome = 'เสี่ยงติด ร. / 0 (งานค้างส่งสะสมและคะแนนสอบตก)';
        primaryReasonTh = `คะแนนสอบไม่ผ่านเกณฑ์ หรืออัตราส่งงานต่ำกว่า 50%`;
        primaryReasonEn = `Failing exam marks and homework submission < 50%`;
      } else if (riskFactors.length > 0) {
        riskLevel = 'moderate';
        outcome = 'กลุ่มเฝ้าระวัง (ต้องการการดูแลเชิงรุก)';
        primaryReasonTh = demeritPoints >= demeritThreshold 
          ? `ถูกตัดคะแนนพฤติกรรมสะสม ${demeritPoints} คะแนน`
          : sdqRiskStatus !== 'normal'
          ? `ผลคัดกรองสุขภาพจิต SDQ บ่งชี้ความเครียด/ความยากลำบาก`
          : `เกรดเฉลี่ย ${stu.gpa.toFixed(2)} มีแนวโน้มลดลง`;
        primaryReasonEn = 'Moderate risk requiring advisor and parental follow-up';
      }

      return {
        studentId: stu.id,
        studentName: `${stu.firstNameTh} ${stu.lastNameTh}`,
        studentRoom: stu.room,
        studentNumber: stu.studentIdNumber || stu.id.replace('stu-', ''),
        avatarUrl: stu.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        gpa: stu.gpa,
        attendanceRate,
        absenceCount,
        lateCount,
        midtermAverageScore: avgScore,
        failingCoursesCount,
        homeworkCompletionRate: homeworkRate,
        demeritPoints,
        demeritCount,
        sdqRiskStatus,
        sdqTotalScore,
        riskLevel,
        riskFactors,
        predictedOutcome: outcome,
        primaryAlertReasonTh: primaryReasonTh,
        primaryAlertReasonEn: primaryReasonEn,
        recentAbsenceDates,
        recentDemeritNotes,
        failingCourseNames,
        earlyInterventionActions: [
          {
            id: `act-${stu.id}-1`,
            actionType: 'line_parent_alert',
            titleTh: 'ส่งหนังสือแจ้งเตือนผู้ปกครองผ่าน LINE OA',
            titleEn: 'Send Warning Alert via LINE OA',
            status: 'pending'
          },
          {
            id: `act-${stu.id}-2`,
            actionType: 'counselor_meeting',
            titleTh: 'นัดหมายครูแนะแนวรายบุคคล (OBEC Care)',
            titleEn: 'Refer to School Guidance Counselor',
            status: 'pending'
          },
          {
            id: `act-${stu.id}-3`,
            actionType: 'remedial_course',
            titleTh: 'ส่งต่อคลินิกการเรียนรู้ / ซ่อมเสริมคะแนน',
            titleEn: 'Assign Remedial Clinic',
            status: 'pending'
          },
          {
            id: `act-${stu.id}-4`,
            actionType: 'official_notice_letter',
            titleTh: 'พิมพ์หนังสือแจ้งเตือน มส. ทางการ',
            titleEn: 'Print Official Notice Letter (มส.)',
            status: 'pending'
          }
        ]
      };
    });
  }, [students, attendance, grades, courses, sdqAssessments, behaviorRecords, absenceThresholdPct, gpaThreshold, demeritThreshold, courseMap, lang]);

  // Profiles State
  const [profiles, setProfiles] = useState<EnrichedStudentRiskProfile[]>(computedProfiles);

  React.useEffect(() => {
    if (computedProfiles.length > 0) {
      setProfiles(computedProfiles);
    }
  }, [computedProfiles]);

  // Dynamic Room List
  const availableRooms = useMemo(() => {
    return Array.from(new Set(profiles.map(p => p.studentRoom).filter(Boolean))).sort();
  }, [profiles]);

  // Aggregate Key Performance Indicators (KPIs)
  const totalStudents = profiles.length;
  const highRiskCount = profiles.filter(p => p.riskLevel === 'high').length;
  const moderateRiskCount = profiles.filter(p => p.riskLevel === 'moderate').length;
  const lowRiskCount = profiles.filter(p => p.riskLevel === 'low').length;
  
  const attendanceDangerCount = profiles.filter(p => p.riskFactors.includes('attendance')).length;
  const academicDangerCount = profiles.filter(p => p.riskFactors.includes('academic')).length;
  const behaviorDangerCount = profiles.filter(p => p.riskFactors.includes('behavior')).length;
  const sdqDangerCount = profiles.filter(p => p.riskFactors.includes('sdq')).length;
  const compoundRiskCount = profiles.filter(p => p.riskFactors.length >= 2).length;

  const totalInterventionsTaken = profiles.reduce(
    (acc, p) => acc + p.earlyInterventionActions.filter(a => a.status === 'completed').length, 
    0
  );

  // Room by Room Risk Breakdown for Chart
  const roomRiskBreakdown = useMemo(() => {
    const map = new Map<string, { total: number; high: number; moderate: number }>();
    profiles.forEach(p => {
      const room = p.studentRoom || 'ทั่วไป';
      if (!map.has(room)) {
        map.set(room, { total: 0, high: 0, moderate: 0 });
      }
      const entry = map.get(room)!;
      entry.total++;
      if (p.riskLevel === 'high') entry.high++;
      else if (p.riskLevel === 'moderate') entry.moderate++;
    });
    return Array.from(map.entries()).map(([room, counts]) => ({
      room,
      ...counts,
      riskRate: Math.round(((counts.high + counts.moderate) / (counts.total || 1)) * 100)
    })).sort((a, b) => b.riskRate - a.riskRate);
  }, [profiles]);

  // Filtered List
  const filteredProfiles = useMemo(() => {
    return profiles.filter(p => {
      // Risk level filter
      if (selectedRiskFilter !== 'all' && p.riskLevel !== selectedRiskFilter) return false;
      
      // Factor filter
      if (selectedFactorFilter === 'attendance' && !p.riskFactors.includes('attendance')) return false;
      if (selectedFactorFilter === 'academic' && !p.riskFactors.includes('academic')) return false;
      if (selectedFactorFilter === 'behavior' && (!p.riskFactors.includes('behavior') && !p.riskFactors.includes('sdq'))) return false;
      if (selectedFactorFilter === 'compound' && p.riskFactors.length < 2) return false;

      // Room filter
      if (selectedRoomFilter !== 'all' && p.studentRoom !== selectedRoomFilter) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          p.studentName.toLowerCase().includes(q) ||
          p.studentRoom.toLowerCase().includes(q) ||
          (p.studentNumber && p.studentNumber.toLowerCase().includes(q)) ||
          p.predictedOutcome.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [profiles, selectedRiskFilter, selectedFactorFilter, selectedRoomFilter, searchQuery]);

  // Action Handler: Execute 1-Click Intervention
  const handleTriggerAction = (
    studentId: string, 
    actionId: string, 
    actionType: EnrichedStudentRiskProfile['earlyInterventionActions'][0]['actionType'], 
    studentName: string,
    customNote?: string
  ) => {
    const nowTime = new Date().toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' });
    
    setProfiles(prev => prev.map(student => {
      if (student.studentId !== studentId) return student;
      return {
        ...student,
        earlyInterventionActions: student.earlyInterventionActions.map(act => {
          if (act.id === actionId) {
            return {
              ...act,
              status: 'completed',
              sentAt: `${lang === 'th' ? 'ดำเนินการแล้วเมื่อ' : 'Completed at'} ${nowTime}`,
              note: customNote || act.note
            };
          }
          return act;
        })
      };
    }));

    // Update active modal student if open
    if (activeDetailStudent && activeDetailStudent.studentId === studentId) {
      setActiveDetailStudent(prev => prev ? {
        ...prev,
        earlyInterventionActions: prev.earlyInterventionActions.map(act => {
          if (act.id === actionId) {
            return {
              ...act,
              status: 'completed',
              sentAt: `${lang === 'th' ? 'ดำเนินการแล้วเมื่อ' : 'Completed at'} ${nowTime}`,
              note: customNote || act.note
            };
          }
          return act;
        })
      } : null);
    }

    // Special case: Official Notice Letter opens the Printable Notice Modal
    if (actionType === 'official_notice_letter') {
      const stu = profiles.find(p => p.studentId === studentId);
      if (stu) setOfficialNoticeStudent(stu);
    }

    // Send Web Push notification
    sendEduVerseNotification({
      title: `⚠️ [มาตรการช่วยเหลือด่วน] ${studentName}`,
      body: actionType === 'line_parent_alert'
        ? `ระบบส่งหนังสือแจ้งเตือนผู้ปกครองผ่าน LINE OA เรียบร้อยแล้ว (${nowTime})`
        : actionType === 'counselor_meeting'
        ? `นัดหมายครูแนะแนวรายบุคคล (OBEC Care) บันทึกลงปฏิทินสถานศึกษาแล้ว`
        : actionType === 'remedial_course'
        ? `มอบหมายแพ็กเกจบทเรียนซ่อมเสริมเพื่อกู้คะแนน/เวลาเรียนเรียบร้อย`
        : `ออกหนังสือเตือนหมดสิทธิ์สอบ (มส.) ตามระเบียบ ศธ. เรียบร้อย`,
      category: 'attendance',
      priority: 'urgent',
    });

    const successMsg = actionType === 'line_parent_alert'
      ? `ส่งหนังสือแจ้งเตือนผู้ปกครองของ ${studentName} ผ่าน LINE OA สำเร็จแล้ว`
      : actionType === 'counselor_meeting'
      ? `นัดหมายครูแนะแนวสำหรับ ${studentName} เรียบร้อย`
      : actionType === 'remedial_course'
      ? `ส่งต่อคลินิกวิชาการและมอบหมายงานซ่อมเสริมสำเร็จ`
      : `ออกเอกสารเตือนเวลาเรียน มส. สำเร็จ`;

    setNotificationToast(successMsg);
    setTimeout(() => setNotificationToast(null), 3500);
  };

  // Bulk Alert for all filtered high-risk students
  const handleBulkAlertHighRisk = () => {
    const highRiskStudents = filteredProfiles.filter(p => p.riskLevel === 'high');
    if (highRiskStudents.length === 0) {
      setNotificationToast('ไม่มีนักเรียนกลุ่มวิกฤตในรายการที่แสดง');
      setTimeout(() => setNotificationToast(null), 3000);
      return;
    }

    highRiskStudents.forEach(stu => {
      const firstPending = stu.earlyInterventionActions.find(a => a.status === 'pending');
      if (firstPending) {
        handleTriggerAction(stu.studentId, firstPending.id, firstPending.actionType, stu.studentName);
      }
    });

    setNotificationToast(`ส่งการแจ้งเตือนด่วนไปยังผู้ปกครองและครูประจำชั้นของนักเรียนกลุ่มวิกฤต ${highRiskStudents.length} คน เรียบร้อยแล้ว`);
    setTimeout(() => setNotificationToast(null), 4000);
  };

  // Export Executive Early Warning Report to CSV with UTF-8 BOM
  const handleExportCsv = () => {
    const headers = [
      'เลขประจำตัว',
      'ชื่อ-นามสกุล',
      'ห้อง/ชั้น',
      'ระดับความเสี่ยง',
      'อัตราเวลาเรียน (%)',
      'จำนวนวันขาดเรียน',
      'เกรดเฉลี่ย (GPA)',
      'คะแนนสอบกลางภาค',
      'จำนวนวิชาไม่ผ่าน',
      'คะแนนตัดพฤติกรรม',
      'ผลคัดกรอง SDQ',
      'ปัจจัยความเสี่ยง',
      'การพยากรณ์ผลการเรียน',
      'สถานะมาตรการช่วยเหลือ'
    ];

    const rows = filteredProfiles.map(p => [
      `"${p.studentNumber || p.studentId}"`,
      `"${p.studentName}"`,
      p.studentRoom,
      p.riskLevel === 'high' ? 'วิกฤต (High)' : p.riskLevel === 'moderate' ? 'ปานกลาง (Moderate)' : 'ปกติ (Low)',
      `${p.attendanceRate}%`,
      p.absenceCount,
      p.gpa.toFixed(2),
      p.midtermAverageScore,
      p.failingCoursesCount,
      p.demeritPoints,
      p.sdqRiskStatus === 'problem' ? 'มีปัญหา' : p.sdqRiskStatus === 'risk' ? 'เสี่ยง' : 'ปกติ',
      `"${p.riskFactors.join(', ')}"`,
      `"${p.predictedOutcome}"`,
      `"${p.earlyInterventionActions.map(a => `${a.titleTh}: ${a.status}`).join('; ')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `obec_early_warning_at_risk_report_${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="h-full flex flex-col min-h-0 overflow-hidden space-y-2.5">
      {/* Toast Notification */}
      {notificationToast && (
        <div className="fixed top-16 right-6 z-50 p-3.5 rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700 flex items-center gap-2.5 animate-in slide-in-from-top-2 max-w-md">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-xs font-semibold leading-relaxed">{notificationToast}</p>
        </div>
      )}

      {/* ======================================================== */}
      {/* 1. TOP HEADER & THRESHOLD CONFIGURATION BAR               */}
      {/* ======================================================== */}
      <div className="shrink-0 bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 text-white rounded-2xl p-4 shadow-md border border-rose-500/30 relative overflow-hidden">
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-xs text-rose-300 font-medium">
              <ShieldAlert className="w-4 h-4" />
              <span>{lang === 'th' ? 'ระบบเฝ้าระวัง & พยากรณ์ความเสี่ยงผู้บริหาร (Executive Early Warning System)' : 'Executive Early Warning System'}</span>
              <span aria-hidden="true">·</span>
              <span>สพฐ. / OBEC Care</span>
            </div>
            <h1 className="text-lg sm:text-xl font-black tracking-tight text-white flex items-center gap-2">
              <span>{lang === 'th' ? 'ศูนย์เฝ้าระวังนักเรียนกลุ่มเสี่ยงพหุมิติ (มส./ร./0)' : 'Predictive Student Retention Radar'}</span>
            </h1>
            <p className="text-slate-300 text-xs leading-relaxed max-w-2xl">
              {lang === 'th'
                ? 'ตรวจจับสัญญาณอันตรายอัตโนมัติจาก เวลาเรียน < 80% (เสี่ยง มส.), เกรดเฉลี่ย/คะแนนสอบกลางภาค, บันทึกคะแนนพฤติกรรม และแบบประเมิน SDQ เพื่อตัดวงจรการตกค้างก่อนจบภาคเรียน'
                : 'Automated multidimensional risk detection across attendance thresholds, GPA, demerits, and SDQ screening.'}
            </p>
          </div>

          {/* Quick Metrics & Persona Switcher */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center">
            {/* View Mode Toggle */}
            <div className="inline-flex p-1 rounded-xl bg-slate-800/80 border border-slate-700">
              <button
                type="button"
                onClick={() => setViewPersona('executive')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  viewPersona === 'executive'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Award className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'ภาพรวมผู้บริหาร' : 'Executive Overview'}</span>
              </button>
              <button
                type="button"
                onClick={() => setViewPersona('teacher')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                  viewPersona === 'teacher'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                <span>{lang === 'th' ? 'มาตรการครูประจำชั้น' : 'Advisor Intervention'}</span>
              </button>
            </div>

            {/* Threshold Adjuster Pill */}
            <div className="bg-slate-900/80 border border-slate-700 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs">
              <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-slate-300 font-medium">{lang === 'th' ? 'เกณฑ์ขาดเรียน:' : 'Absence Threshold:'}</span>
              <div className="inline-flex items-center gap-1">
                {[15, 20, 25].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setAbsenceThresholdPct(pct)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-bold transition cursor-pointer ${
                      absenceThresholdPct === pct
                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title={pct === 20 ? 'เกณฑ์ สพฐ. มาตรฐาน (เวลาเรียนต่ำกว่า 80%)' : undefined}
                  >
                    &gt;{pct}% {pct === 20 && '(มส.)'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. 5-CARD EXECUTIVE KPI RADAR STRIP                      */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 shrink-0">
        {/* 1. Critical High Risk */}
        <div className="p-3 rounded-2xl bg-[var(--color-card)] border border-rose-300 dark:border-rose-800 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400">
              {lang === 'th' ? 'เสี่ยงวิกฤต (High Risk)' : 'Critical Risk'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-[var(--color-text-title)]">
              {highRiskCount} <span className="text-xs font-normal text-[var(--color-text-muted)]">/ {totalStudents}</span>
            </h3>
            <p className="text-[10px] text-rose-600 dark:text-rose-400 font-medium truncate">
              {lang === 'th' ? 'เสี่ยงหมดสิทธิ์สอบและตกค้าง' : 'At-risk of retention'}
            </p>
          </div>
        </div>

        {/* 2. Attendance Hazard */}
        <div className="p-3 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">
              {lang === 'th' ? `ขาดเรียน > ${absenceThresholdPct}%` : `Absence > ${absenceThresholdPct}%`}
            </span>
            <div className="w-7 h-7 rounded-lg bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-[var(--color-text-title)]">
              {attendanceDangerCount} <span className="text-xs font-normal text-[var(--color-text-muted)]">{lang === 'th' ? 'คน' : 'stu'}</span>
            </h3>
            <p className="text-[10px] text-[var(--color-text-muted)] font-medium truncate">
              {lang === 'th' ? 'เกณฑ์เวลาเรียนไม่ถึง 80% (มส.)' : 'Below 80% class hours'}
            </p>
          </div>
        </div>

        {/* 3. Academic Hazard */}
        <div className="p-3 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-indigo-700 dark:text-indigo-400">
              {lang === 'th' ? 'ผลสัมฤทธิ์ตกต่ำ' : 'Academic Hazard'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center">
              <BookOpen className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-[var(--color-text-title)]">
              {academicDangerCount} <span className="text-xs font-normal text-[var(--color-text-muted)]">{lang === 'th' ? 'คน' : 'stu'}</span>
            </h3>
            <p className="text-[10px] text-[var(--color-text-muted)] font-medium truncate">
              {lang === 'th' ? 'GPA < 2.00 หรือสอบตก' : 'GPA < 2.00 or failing marks'}
            </p>
          </div>
        </div>

        {/* 4. Behavior / SDQ Hazard */}
        <div className="p-3 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-purple-700 dark:text-purple-400">
              {lang === 'th' ? 'พฤติกรรม & SDQ' : 'Behavior & SDQ'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-[var(--color-text-title)]">
              {behaviorDangerCount + sdqDangerCount} <span className="text-xs font-normal text-[var(--color-text-muted)]">{lang === 'th' ? 'คน' : 'stu'}</span>
            </h3>
            <p className="text-[10px] text-[var(--color-text-muted)] font-medium truncate">
              {lang === 'th' ? 'ตัดคะแนน >= 10 หรือ SDQ เสี่ยง' : 'Demerits >= 10 or SDQ stress'}
            </p>
          </div>
        </div>

        {/* 5. Compound Multidimensional Risk */}
        <div className="p-3 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
              {lang === 'th' ? 'ช่วยเหลือสำเร็จแล้ว' : 'Interventions Done'}
            </span>
            <div className="w-7 h-7 rounded-lg bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <h3 className="text-2xl font-black text-emerald-800 dark:text-emerald-300">
              {totalInterventionsTaken} <span className="text-xs font-normal text-[var(--color-text-muted)]">{lang === 'th' ? 'ครั้ง' : 'actions'}</span>
            </h3>
            <p className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium truncate">
              {lang === 'th' ? 'แจ้งเตือน LINE/นัดแนะแนวแล้ว' : 'Alerts & counseling booked'}
            </p>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. EXECUTIVE VISUAL COMPARISON (ROOM BREAKDOWN)          */}
      {/* ======================================================== */}
      {viewPersona === 'executive' && roomRiskBreakdown.length > 0 && (
        <div className="shrink-0 p-3 rounded-2xl bg-[var(--color-card)] border border-[var(--color-border)] shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-xs font-bold text-[var(--color-text-title)]">
              <TrendingDown className="w-4 h-4 text-rose-600" />
              <span>{lang === 'th' ? 'สัดส่วนนักเรียนกลุ่มเสี่ยงแยกตามห้องเรียน (Room Risk Matrix)' : 'At-Risk Student Distribution by Classroom'}</span>
            </div>
            <span className="text-[11px] text-[var(--color-text-muted)]">
              {lang === 'th' ? 'จัดเรียงตามห้องที่มีอัตราความเสี่ยงสูงสุด' : 'Sorted by highest risk rate'}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
            {roomRiskBreakdown.slice(0, 6).map((item) => (
              <button
                key={item.room}
                type="button"
                onClick={() => setSelectedRoomFilter(item.room === selectedRoomFilter ? 'all' : item.room)}
                className={`p-2 rounded-xl border text-left transition cursor-pointer ${
                  selectedRoomFilter === item.room
                    ? 'border-rose-500 bg-rose-50 dark:bg-rose-950/40 ring-1 ring-rose-500'
                    : 'border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)]'
                }`}
              >
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-[var(--color-text-title)]">ห้อง {item.room}</span>
                  <span className={`text-[11px] ${item.high > 0 ? 'text-rose-700 dark:text-rose-400 font-black' : 'text-slate-500'}`}>
                    {item.high + item.moderate} คน
                  </span>
                </div>
                <div className="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full mt-1.5 overflow-hidden flex">
                  <div 
                    className="bg-rose-500 h-full transition-all" 
                    style={{ width: `${Math.min(100, (item.high / item.total) * 100)}%` }} 
                    title={`เสี่ยงวิกฤต: ${item.high} คน`}
                  />
                  <div 
                    className="bg-amber-400 h-full transition-all" 
                    style={{ width: `${Math.min(100, (item.moderate / item.total) * 100)}%` }} 
                    title={`เฝ้าระวัง: ${item.moderate} คน`}
                  />
                </div>
                <div className="flex items-center justify-between text-[10px] text-[var(--color-text-muted)] mt-1">
                  <span>ทั้งหมด {item.total} คน</span>
                  <span>{item.riskRate}%</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. MAIN ACTIONABLE AT-RISK MATRIX & CONTROLS             */}
      {/* ======================================================== */}
      <div className="flex-1 min-h-0 bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] p-3.5 shadow-xs flex flex-col overflow-hidden">
        {/* Controls Bar */}
        <div className="shrink-0 flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3 border-b border-[var(--color-border)]">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[var(--color-text-title)] flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" />
              <span>{lang === 'th' ? 'ตารางรายชื่อนักเรียนในข่ายเฝ้าระวัง' : 'Watchlist Student Roster'}</span>
            </h2>
            <span className="text-xs font-semibold text-[var(--color-text-muted)]">
              ({filteredProfiles.length} {lang === 'th' ? 'คน' : 'students'})
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Risk Level Segmented Switcher */}
            <div className="inline-flex p-0.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)]">
              {(['all', 'high', 'moderate', 'low'] as const).map(lvl => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSelectedRiskFilter(lvl)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    selectedRiskFilter === lvl
                      ? 'bg-[var(--color-primary)] text-white shadow-xs'
                      : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-title)]'
                  }`}
                >
                  {lvl === 'all' ? 'ทั้งหมด' : lvl === 'high' ? 'วิกฤต' : lvl === 'moderate' ? 'เฝ้าระวัง' : 'ปกติ'}
                </button>
              ))}
            </div>

            {/* Factor Selector */}
            <select
              value={selectedFactorFilter}
              onChange={(e) => setSelectedFactorFilter(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold text-[var(--color-text-title)] cursor-pointer"
            >
              <option value="all">ทุกมิติความเสี่ยง</option>
              <option value="attendance">🕒 เวลาเรียน (เสี่ยง มส.)</option>
              <option value="academic">📚 ผลการเรียน / งานค้าง</option>
              <option value="behavior">⚠️ พฤติกรรม & SDQ</option>
              <option value="compound">🚨 ความเสี่ยงพหุมิติ (2+ ด้าน)</option>
            </select>

            {/* Room Selector */}
            <select
              value={selectedRoomFilter}
              onChange={(e) => setSelectedRoomFilter(e.target.value)}
              className="px-2.5 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs font-semibold text-[var(--color-text-title)] cursor-pointer"
            >
              <option value="all">ทุกห้องเรียน</option>
              {availableRooms.map(r => (
                <option key={r} value={r}>ห้อง {r}</option>
              ))}
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={lang === 'th' ? 'ค้นหาชื่อ, เลขประจำตัว, หรือห้อง...' : 'Search student...'}
                className="pl-8 pr-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] text-xs text-[var(--color-text-title)] w-40 sm:w-48"
              />
            </div>

            {/* Bulk Action: Alert All High Risk */}
            <button
              type="button"
              onClick={handleBulkAlertHighRisk}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              title="ส่งข้อความแจ้งเตือนผู้ปกครองกลุ่มวิกฤตทุกคนพร้อมกัน"
            >
              <Send className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">เตือนกลุ่มวิกฤตทั้งหมด</span>
            </button>

            {/* Export CSV Button */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] hover:bg-[var(--color-primary-light)] text-[var(--color-text-title)] font-bold text-xs shadow-xs transition cursor-pointer"
              title="ดาวน์โหลดรายงานสรุปนักเรียนกลุ่มเสี่ยงเป็น Excel/CSV (UTF-8 BOM)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden sm:inline">CSV</span>
            </button>
          </div>
        </div>

        {/* List of at-risk students with PagedList */}
        <div className="flex-1 min-h-0 overflow-y-auto py-2">
          {filteredProfiles.length === 0 ? (
            <div className="text-center py-16 text-[var(--color-text-muted)] text-xs space-y-1.5">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
              <p className="font-bold text-sm text-[var(--color-text-title)]">ไม่มีนักเรียนในข่ายเฝ้าระวังตามเกณฑ์ที่เลือก</p>
              <p>นักเรียนทุกคนมีสถิติเวลาเรียน ผลการเรียน และคะแนนความประพฤติอยู่ในเกณฑ์ปลอดภัย</p>
            </div>
          ) : (
            <PagedList
              items={filteredProfiles}
              pageSize={5}
              previousLabel="ก่อนหน้า"
              nextLabel="ถัดไป"
              paginationLabel="เปลี่ยนหน้ารายชื่อกลุ่มเสี่ยง"
              renderItem={(stu) => (
                <div
                  key={stu.studentId}
                  className="p-3.5 rounded-2xl border border-[var(--color-border)] bg-[var(--color-card-subtle)] space-y-3 text-xs mb-2.5 shadow-2xs hover:border-[var(--color-primary)] transition"
                >
                  {/* Top Row: Avatar, Student Info, Risk Level, Indicators */}
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={stu.avatarUrl}
                        alt={stu.studentName}
                        className="w-10 h-10 rounded-xl object-cover border border-[var(--color-border)] shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-black text-sm text-[var(--color-text-title)] truncate">
                            {stu.studentName}
                          </h4>
                          <span className="text-[11px] text-[var(--color-text-muted)] font-mono">
                            เลขที่/รหัส: {stu.studentNumber} · ห้อง {stu.studentRoom}
                          </span>
                        </div>
                        <p className="text-[11px] font-medium text-rose-700 dark:text-rose-400 mt-0.5">
                          {stu.predictedOutcome}
                        </p>
                      </div>
                    </div>

                    {/* 4-Metric Quadrant Pills */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                      {/* Attendance % */}
                      <div className={`px-2.5 py-1 rounded-xl font-bold flex flex-col justify-center ${
                        stu.attendanceRate < 80 
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800' 
                          : 'bg-[var(--color-card)] text-[var(--color-text-body)] border border-[var(--color-border)]'
                      }`}>
                        <span className="text-[9px] font-normal text-[var(--color-text-muted)]">เวลาเรียน</span>
                        <span>{stu.attendanceRate}% {stu.attendanceRate < 80 && '(มส.)'}</span>
                      </div>

                      {/* Academic GPA */}
                      <div className={`px-2.5 py-1 rounded-xl font-bold flex flex-col justify-center ${
                        stu.gpa < 2.0 
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800' 
                          : 'bg-[var(--color-card)] text-[var(--color-text-body)] border border-[var(--color-border)]'
                      }`}>
                        <span className="text-[9px] font-normal text-[var(--color-text-muted)]">เกรดเฉลี่ย</span>
                        <span>GPA {stu.gpa.toFixed(2)}</span>
                      </div>

                      {/* Behavior Demerits */}
                      <div className={`px-2.5 py-1 rounded-xl font-bold flex flex-col justify-center ${
                        stu.demeritPoints >= 10
                          ? 'bg-purple-100 dark:bg-purple-950 text-purple-800 dark:text-purple-300 border border-purple-300 dark:border-purple-800'
                          : 'bg-[var(--color-card)] text-[var(--color-text-body)] border border-[var(--color-border)]'
                      }`}>
                        <span className="text-[9px] font-normal text-[var(--color-text-muted)]">ตัดพฤติกรรม</span>
                        <span>{stu.demeritPoints > 0 ? `-${stu.demeritPoints} แต้ม` : 'ปกติ'}</span>
                      </div>

                      {/* SDQ Health */}
                      <div className={`px-2.5 py-1 rounded-xl font-bold flex flex-col justify-center ${
                        stu.sdqRiskStatus === 'problem'
                          ? 'bg-rose-100 dark:bg-rose-950 text-rose-800 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                          : stu.sdqRiskStatus === 'risk'
                          ? 'bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                          : 'bg-[var(--color-card)] text-[var(--color-text-body)] border border-[var(--color-border)]'
                      }`}>
                        <span className="text-[9px] font-normal text-[var(--color-text-muted)]">คัดกรอง SDQ</span>
                        <span>{stu.sdqRiskStatus === 'problem' ? 'มีปัญหา' : stu.sdqRiskStatus === 'risk' ? 'เสี่ยง' : 'ปกติ'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Context Note / Why At-Risk */}
                  <div className="bg-[var(--color-card)] p-2.5 rounded-xl border border-[var(--color-border)] text-[11px] text-[var(--color-text-body)] flex items-start gap-2">
                    <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-[var(--color-text-title)]">{stu.primaryAlertReasonTh}</p>
                      {stu.failingCourseNames.length > 0 && (
                        <p className="text-[10px] text-rose-600 dark:text-rose-400 mt-0.5">
                          วิชาที่มีความเสี่ยง: {stu.failingCourseNames.join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Bottom Row: 1-Click Actionable Insights & Deep Dive Trigger */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[var(--color-border)]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-[10px] font-bold text-[var(--color-text-muted)] uppercase tracking-wider mr-1">
                        มาตรการช่วยเหลือ:
                      </span>
                      {stu.earlyInterventionActions.map((act) => (
                        <button
                          key={act.id}
                          type="button"
                          onClick={() => handleTriggerAction(stu.studentId, act.id, act.actionType, stu.studentName)}
                          disabled={act.status === 'completed'}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-[11px] font-bold transition cursor-pointer disabled:opacity-70 disabled:cursor-default ${
                            act.status === 'completed'
                              ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                              : 'bg-[var(--color-card)] hover:bg-[var(--color-primary-light)] text-[var(--color-primary-text)] border border-[var(--color-border)] shadow-2xs'
                          }`}
                        >
                          {act.status === 'completed' ? (
                            <>
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                              <span>{act.titleTh} ({act.sentAt || 'เสร็จสิ้น'})</span>
                            </>
                          ) : (
                            <>
                              <Send className="w-3 h-3" />
                              <span>{act.titleTh}</span>
                            </>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Deep Dive Profile Button */}
                    <button
                      type="button"
                      onClick={() => setActiveDetailStudent(stu)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[var(--color-primary)] text-white hover:opacity-90 font-bold text-[11px] shadow-xs transition cursor-pointer ml-auto"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>{lang === 'th' ? 'แฟ้มวิเคราะห์เชิงลึก' : 'Deep Dive Profile'}</span>
                    </button>
                  </div>
                </div>
              )}
            />
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. STUDENT RISK DEEP-DIVE & INTERVENTION MODAL           */}
      {/* ======================================================== */}
      {activeDetailStudent && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-[var(--color-card)] text-[var(--color-text-body)] rounded-3xl border border-[var(--color-border)] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-4 bg-gradient-to-r from-rose-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <img
                  src={activeDetailStudent.avatarUrl}
                  alt={activeDetailStudent.studentName}
                  className="w-12 h-12 rounded-2xl object-cover border-2 border-rose-400"
                />
                <div>
                  <h3 className="text-base font-black text-white">{activeDetailStudent.studentName}</h3>
                  <p className="text-xs text-slate-300">
                    เลขประจำตัว: {activeDetailStudent.studentNumber} · ชั้นมัธยมศึกษาปีที่ {activeDetailStudent.studentRoom}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setActiveDetailStudent(null)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 space-y-4 overflow-y-auto flex-1">
              {/* Alert Status Banner */}
              <div className={`p-3 rounded-2xl border ${
                activeDetailStudent.riskLevel === 'high'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
              }`}>
                <div className="flex items-center gap-2 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{activeDetailStudent.predictedOutcome}</span>
                </div>
                <p className="text-[11px] mt-1 opacity-90 leading-relaxed">
                  {activeDetailStudent.primaryAlertReasonTh}
                </p>
              </div>

              {/* 4 Quadrants Detailed Analysis */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* 1. เวลาเรียนและการมาโรงเรียน */}
                <div className="p-3 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-2">
                  <div className="flex items-center justify-between font-bold text-[var(--color-text-title)]">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-amber-500" />
                      เวลาเรียนและการขาดเรียน
                    </span>
                    <span className={activeDetailStudent.attendanceRate < 80 ? 'text-rose-600 font-black' : ''}>
                      {activeDetailStudent.attendanceRate}%
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-[var(--color-text-muted)]">
                    <p>• จำนวนวันขาดเรียนสะสม: <strong className="text-[var(--color-text-title)]">{activeDetailStudent.absenceCount} วัน</strong></p>
                    <p>• มาสายสะสม: <strong className="text-[var(--color-text-title)]">{activeDetailStudent.lateCount} ครั้ง</strong></p>
                    {activeDetailStudent.recentAbsenceDates.length > 0 && (
                      <p>• วันที่ขาดเรียนล่าสุด: {activeDetailStudent.recentAbsenceDates.join(', ')}</p>
                    )}
                  </div>
                </div>

                {/* 2. ผลสัมฤทธิ์ทางการเรียน */}
                <div className="p-3 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-2">
                  <div className="flex items-center justify-between font-bold text-[var(--color-text-title)]">
                    <span className="flex items-center gap-1.5">
                      <BookOpen className="w-4 h-4 text-indigo-500" />
                      ผลการเรียน & ส่งการบ้าน
                    </span>
                    <span>GPA {activeDetailStudent.gpa.toFixed(2)}</span>
                  </div>
                  <div className="space-y-1 text-[11px] text-[var(--color-text-muted)]">
                    <p>• คะแนนเฉลี่ยสอบกลางภาค: <strong className="text-[var(--color-text-title)]">{activeDetailStudent.midtermAverageScore} / 100</strong></p>
                    <p>• อัตราการส่งการบ้าน: <strong className="text-[var(--color-text-title)]">{activeDetailStudent.homeworkCompletionRate}%</strong></p>
                    {activeDetailStudent.failingCourseNames.length > 0 && (
                      <p className="text-rose-600 dark:text-rose-400 font-semibold">• รายวิชาที่ติดขัด: {activeDetailStudent.failingCourseNames.join(', ')}</p>
                    )}
                  </div>
                </div>

                {/* 3. พฤติกรรมและความประพฤติ */}
                <div className="p-3 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-2">
                  <div className="flex items-center justify-between font-bold text-[var(--color-text-title)]">
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-4 h-4 text-purple-500" />
                      คะแนนความประพฤติ
                    </span>
                    <span className={activeDetailStudent.demeritPoints >= 10 ? 'text-rose-600 font-black' : ''}>
                      -{activeDetailStudent.demeritPoints} คะแนน
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-[var(--color-text-muted)]">
                    <p>• บันทึกการตัดคะแนน: {activeDetailStudent.demeritCount} ครั้ง</p>
                    {activeDetailStudent.recentDemeritNotes.length > 0 ? (
                      activeDetailStudent.recentDemeritNotes.map((note, i) => (
                        <p key={i}>• {note}</p>
                      ))
                    ) : (
                      <p className="text-emerald-600">• ไม่มีประวัติถูกตัดคะแนนความประพฤติร้ายแรง</p>
                    )}
                  </div>
                </div>

                {/* 4. สุขภาพจิตและการดูแล SDQ */}
                <div className="p-3 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-2">
                  <div className="flex items-center justify-between font-bold text-[var(--color-text-title)]">
                    <span className="flex items-center gap-1.5">
                      <ShieldAlert className="w-4 h-4 text-rose-500" />
                      คัดกรองสุขภาพจิต SDQ
                    </span>
                    <span className={activeDetailStudent.sdqRiskStatus !== 'normal' ? 'text-amber-600 font-black' : 'text-emerald-600'}>
                      {activeDetailStudent.sdqRiskStatus === 'problem' ? 'มีปัญหา' : activeDetailStudent.sdqRiskStatus === 'risk' ? 'เสี่ยง' : 'ปกติ'}
                    </span>
                  </div>
                  <div className="space-y-1 text-[11px] text-[var(--color-text-muted)]">
                    <p>• คะแนนรวมความยากลำบาก: {activeDetailStudent.sdqTotalScore} / 40</p>
                    <p>• ระบบส่งต่อ: OBEC Care เชื่อมโยงครูแนะแนวและผู้ปกครอง</p>
                  </div>
                </div>
              </div>

              {/* Action Plan Execution inside Modal */}
              <div className="p-3.5 rounded-2xl bg-[var(--color-card-subtle)] border border-[var(--color-border)] space-y-2.5">
                <h4 className="text-xs font-bold text-[var(--color-text-title)] flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  แผนปฏิบัติการช่วยเหลือรายบุคคล (Individual Action Plan)
                </h4>
                
                <div className="space-y-2">
                  {activeDetailStudent.earlyInterventionActions.map((act) => (
                    <div 
                      key={act.id} 
                      className="flex items-center justify-between p-2.5 rounded-xl bg-[var(--color-card)] border border-[var(--color-border)] text-xs"
                    >
                      <div>
                        <p className="font-bold text-[var(--color-text-title)]">{act.titleTh}</p>
                        <p className="text-[10px] text-[var(--color-text-muted)]">
                          สถานะ: {act.status === 'completed' ? `✓ ${act.sentAt || 'เสร็จสิ้นแล้ว'}` : '⏳ รอดำเนินการ'}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleTriggerAction(activeDetailStudent.studentId, act.id, act.actionType, activeDetailStudent.studentName, interventionNoteInput)}
                        disabled={act.status === 'completed'}
                        className={`px-3 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer disabled:opacity-60 disabled:cursor-default ${
                          act.status === 'completed'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                            : 'bg-[var(--color-primary)] text-white hover:opacity-90'
                        }`}
                      >
                        {act.status === 'completed' ? 'สำเร็จแล้ว' : 'ดำเนินการทันที'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 border-t border-[var(--color-border)] bg-[var(--color-card-subtle)] flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setOfficialNoticeStudent(activeDetailStudent)}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs shadow-xs transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>พิมพ์หนังสือเตือน มส. ทางการ</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveDetailStudent(null)}
                className="px-4 py-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] hover:bg-[var(--color-card-subtle)] font-bold text-xs transition cursor-pointer"
              >
                ปิดหน้าต่าง
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. OFFICIAL NOTICE LETTER PRINT MODAL (แบบฟอร์ม มส.)       */}
      {/* ======================================================== */}
      {officialNoticeStudent && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-white text-slate-900 rounded-3xl border border-slate-300 shadow-2xl overflow-hidden flex flex-col">
            {/* Toolbar for Print */}
            <div className="p-3 bg-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold">
                <FileText className="w-4 h-4 text-rose-400" />
                <span>หนังสือแจ้งเตือนเวลาเรียนไม่ถึงเกณฑ์ (มส.) ตามระเบียบ ศธ.</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>สั่งพิมพ์ / Save PDF</span>
                </button>
                <button
                  type="button"
                  onClick={() => setOfficialNoticeStudent(null)}
                  className="p-1.5 rounded-lg hover:bg-white/10 text-white transition cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Official Letter Document Canvas */}
            <div className="p-6 sm:p-8 space-y-4 text-xs font-serif leading-relaxed overflow-y-auto max-h-[75vh]">
              {/* Garuda / Header */}
              <div className="text-center space-y-1 border-b pb-4">
                <p className="font-bold text-sm tracking-wide">หนังสือแจ้งเตือนเวลาเรียนไม่ถึงเกณฑ์ขั้นต่ำ (มส.)</p>
                <p className="text-[11px] text-slate-600">กลุ่มบริหารวิชาการและงานวัดผลประเมินผล สถานศึกษา</p>
                <p className="text-[10px] text-slate-500">ที่ ศธ {new Date().getFullYear()}/{(Math.random() * 900 + 100).toFixed(0)}</p>
              </div>

              <div className="space-y-2 pt-2">
                <p className="text-right">วันที่ {new Date().toLocaleDateString('th-TH', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                <p><strong>เรื่อง:</strong> ขอแจ้งเตือนเวลาเรียนของนักเรียนไม่ถึงเกณฑ์ขั้นต่ำร้อยละ ๘๐ เสี่ยงหมดสิทธิ์สอบ (มส.)</p>
                <p><strong>เรียน:</strong> ผู้ปกครองของ <strong>{officialNoticeStudent.studentName}</strong> (ชั้น ม.{officialNoticeStudent.studentRoom} เลขประจำตัว {officialNoticeStudent.studentNumber})</p>
                
                <p className="indent-6 leading-relaxed pt-2">
                  ด้วยกลุ่มบริหารวิชาการและงานทะเบียนวัดผล ได้ดำเนินการตรวจสอบสถิติเวลาเรียนประจำภาคเรียนนี้ ปรากฏว่า 
                  <strong> {officialNoticeStudent.studentName}</strong> มีสถิติเวลาเรียนปัจจุบันเพียง 
                  <strong> {officialNoticeStudent.attendanceRate}%</strong> ซึ่งมีจำนวนวันขาดเรียนสะสม 
                  <strong> {officialNoticeStudent.absenceCount} วัน</strong> และมีแนวโน้มจะไม่ครบตามเกณฑ์ขั้นต่ำร้อยละ ๘๐ ของเวลาเรียนทั้งหมด 
                  อันเป็นเหตุให้หมดสิทธิ์เข้าสอบปลายภาคเรียน (ได้รับผลการเรียน "มส.") ตามระเบียบกระทรวงศึกษาธิการ
                </p>

                {officialNoticeStudent.failingCourseNames.length > 0 && (
                  <div className="p-2.5 bg-slate-50 border rounded-lg space-y-1">
                    <p className="font-bold">รายวิชาที่อยู่ในข่ายเฝ้าระวังเวลาเรียนและภาระงานค้าง:</p>
                    <ul className="list-disc list-inside text-slate-700 pl-2">
                      {officialNoticeStudent.failingCourseNames.map((name, i) => (
                        <li key={i}>{name}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="indent-6 leading-relaxed">
                  จึงเรียนมาเพื่อโปรดให้ผู้ปกครองติดต่อพบครูที่ปรึกษาหรือครูประจำวิชา เพื่อร่วมกันวางแผนการเรียนชดเชยและแก้ไขปัญหา 
                  ภายในระยะเวลา ๗ วันทำการนับตั้งแต่วันที่ได้รับหนังสือฉบับนี้
                </p>
              </div>

              {/* Signatures */}
              <div className="grid grid-cols-2 pt-8 text-center text-xs">
                <div className="space-y-12">
                  <p>ลงชื่อ......................................................</p>
                  <p>(..........................................................)<br/>ครูที่ปรึกษาประจำชั้น</p>
                </div>
                <div className="space-y-12">
                  <p>ลงชื่อ......................................................</p>
                  <p>( {currentUserName} )<br/>ผู้อำนวยการสถานศึกษา</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
