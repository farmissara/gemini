export class GoogleDriveAuthExpiredError extends Error {
  constructor(message = 'สิทธิ์เชื่อมต่อ Google Drive หมดอายุ กรุณาเชื่อมต่อบัญชี Google ใหม่อีกครั้ง') {
    super(message);
    this.name = 'GoogleDriveAuthExpiredError';
  }
}

export interface GoogleDriveBackupAppProperties {
  baanpakkruBackup?: string;
  scopeType?: 'school' | 'system';
  schoolId?: string;
  schoolName?: string;
  scheduleKind?: 'manual' | 'auto_midnight' | 'server_sync';
  exportedAt?: string;
}

export interface GoogleDriveBackupFile {
  id: string;
  name: string;
  size: number;
  createdTime: string;
  modifiedTime: string;
  webViewLink?: string;
  appProperties: GoogleDriveBackupAppProperties;
}

const DRIVE_FILES_API = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_API = 'https://www.googleapis.com/upload/drive/v3/files';
const FOLDER_MIME = 'application/vnd.google-apps.folder';

function escapeDriveQueryValue(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function sanitizeFolderName(name: string): string {
  return name.replace(/[\\/:*?"<>|]/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'School';
}

async function parseDriveError(response: Response): Promise<never> {
  const payload = await response.json().catch(() => null) as {
    error?: { message?: string; status?: string };
  } | null;
  const detail = payload?.error?.message || `Google Drive API error (${response.status})`;
  if (response.status === 401 || response.status === 403) {
    throw new GoogleDriveAuthExpiredError(
      response.status === 401
        ? 'สิทธิ์เชื่อมต่อ Google Drive หมดอายุ กรุณาเชื่อมต่อบัญชี Google ใหม่อีกครั้ง'
        : `บัญชี Google นี้ยังไม่ได้รับสิทธิ์เข้าถึง Google Drive หรือสิทธิ์ถูกเพิกถอน (${detail})`
    );
  }
  throw new Error(detail);
}

async function findFolderByAppProperty(
  accessToken: string,
  propertyKey: string,
  propertyValue: string,
  parentId?: string
): Promise<string | null> {
  const clauses = [
    `mimeType = '${FOLDER_MIME}'`,
    'trashed = false',
    `appProperties has { key='${escapeDriveQueryValue(propertyKey)}' and value='${escapeDriveQueryValue(propertyValue)}' }`,
  ];
  if (parentId) {
    clauses.push(`'${escapeDriveQueryValue(parentId)}' in parents`);
  }
  const params = new URLSearchParams({
    q: clauses.join(' and '),
    fields: 'files(id,name)',
    pageSize: '1',
    spaces: 'drive',
  });
  const response = await fetch(`${DRIVE_FILES_API}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return parseDriveError(response);
  const data = (await response.json()) as { files?: Array<{ id?: string }> };
  return data.files?.[0]?.id || null;
}

async function createFolder(
  accessToken: string,
  name: string,
  appProperties: Record<string, string>,
  parentId?: string
): Promise<string> {
  const metadata: Record<string, unknown> = {
    name,
    mimeType: FOLDER_MIME,
    appProperties,
  };
  if (parentId) {
    metadata.parents = [parentId];
  }
  const response = await fetch(`${DRIVE_FILES_API}?fields=id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(metadata),
  });
  if (!response.ok) return parseDriveError(response);
  const data = (await response.json()) as { id?: string };
  if (!data.id) throw new Error('สร้างโฟลเดอร์บน Google Drive ไม่สำเร็จ');
  return data.id;
}

async function ensureFolder(
  accessToken: string,
  name: string,
  propertyKey: string,
  propertyValue: string,
  extraProperties: Record<string, string> = {},
  parentId?: string
): Promise<string> {
  const existing = await findFolderByAppProperty(accessToken, propertyKey, propertyValue, parentId);
  if (existing) return existing;
  return createFolder(
    accessToken,
    name,
    { [propertyKey]: propertyValue, ...extraProperties },
    parentId
  );
}

export async function ensureBackupFolderHierarchy(
  accessToken: string,
  options: {
    scopeType: 'school' | 'system';
    schoolId?: string;
    schoolLabel?: string;
  }
): Promise<string> {
  const rootId = await ensureFolder(
    accessToken,
    'BaanPakKru-Backups',
    'baanpakkruFolderRole',
    'root'
  );

  if (options.scopeType === 'system') {
    return ensureFolder(
      accessToken,
      'System',
      'baanpakkruFolderRole',
      'system',
      {},
      rootId
    );
  }

  const schoolsRootId = await ensureFolder(
    accessToken,
    'Schools',
    'baanpakkruFolderRole',
    'schools_root',
    {},
    rootId
  );

  const cleanSchoolId = String(options.schoolId || 'default').trim();
  const folderLabel = sanitizeFolderName(options.schoolLabel || cleanSchoolId);
  return ensureFolder(
    accessToken,
    folderLabel,
    'baanpakkruSchoolId',
    cleanSchoolId,
    { baanpakkruFolderRole: 'school' },
    schoolsRootId
  );
}

export async function uploadBackupToGoogleDrive(
  accessToken: string,
  options: {
    filename: string;
    jsonContent: string;
    scopeType: 'school' | 'system';
    schoolId?: string;
    schoolName?: string;
    scheduleKind: 'manual' | 'auto_midnight' | 'server_sync';
    exportedAt?: string;
  }
): Promise<GoogleDriveBackupFile> {
  const folderId = await ensureBackupFolderHierarchy(accessToken, {
    scopeType: options.scopeType,
    schoolId: options.schoolId,
    schoolLabel: options.schoolName || options.schoolId,
  });

  const metadata = {
    name: options.filename,
    mimeType: 'application/json',
    parents: [folderId],
    appProperties: {
      baanpakkruBackup: 'true',
      scopeType: options.scopeType,
      schoolId: String(options.schoolId || 'system').slice(0, 110),
      schoolName: String(options.schoolName || (options.scopeType === 'system' ? 'All System' : '')).slice(0, 110),
      scheduleKind: options.scheduleKind,
      exportedAt: (options.exportedAt || new Date().toISOString()).slice(0, 64),
    },
  };

  const boundary = `baanpakkru_${Math.random().toString(36).slice(2)}_${Date.now()}`;
  const multipartBody = [
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    JSON.stringify(metadata),
    `--${boundary}`,
    'Content-Type: application/json; charset=UTF-8',
    '',
    options.jsonContent,
    `--${boundary}--`,
  ].join('\r\n');

  const params = new URLSearchParams({
    uploadType: 'multipart',
    fields: 'id,name,size,createdTime,modifiedTime,webViewLink,appProperties',
  });

  const response = await fetch(`${DRIVE_UPLOAD_API}?${params.toString()}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartBody,
  });

  if (!response.ok) return parseDriveError(response);
  const created = (await response.json()) as {
    id: string;
    name: string;
    size?: string;
    createdTime?: string;
    modifiedTime?: string;
    webViewLink?: string;
    appProperties?: GoogleDriveBackupAppProperties;
  };

  return {
    id: created.id,
    name: created.name,
    size: Number(created.size || options.jsonContent.length),
    createdTime: created.createdTime || new Date().toISOString(),
    modifiedTime: created.modifiedTime || new Date().toISOString(),
    webViewLink: created.webViewLink,
    appProperties: created.appProperties || metadata.appProperties,
  };
}

export async function listGoogleDriveBackups(
  accessToken: string,
  filter?: { scopeType?: 'all' | 'school' | 'system'; schoolId?: string }
): Promise<GoogleDriveBackupFile[]> {
  const clauses = [
    'trashed = false',
    "appProperties has { key='baanpakkruBackup' and value='true' }",
  ];
  if (filter?.scopeType === 'system') {
    clauses.push("appProperties has { key='scopeType' and value='system' }");
  } else if (filter?.scopeType === 'school') {
    clauses.push("appProperties has { key='scopeType' and value='school' }");
    if (filter.schoolId) {
      clauses.push(
        `appProperties has { key='schoolId' and value='${escapeDriveQueryValue(filter.schoolId)}' }`
      );
    }
  }

  const params = new URLSearchParams({
    q: clauses.join(' and '),
    orderBy: 'createdTime desc',
    pageSize: '100',
    fields: 'files(id,name,size,createdTime,modifiedTime,webViewLink,appProperties)',
    spaces: 'drive',
  });

  const response = await fetch(`${DRIVE_FILES_API}?${params.toString()}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) return parseDriveError(response);
  const data = (await response.json()) as {
    files?: Array<{
      id: string;
      name: string;
      size?: string;
      createdTime?: string;
      modifiedTime?: string;
      webViewLink?: string;
      appProperties?: GoogleDriveBackupAppProperties;
    }>;
  };

  return (data.files || []).map((file) => ({
    id: file.id,
    name: file.name,
    size: Number(file.size || 0),
    createdTime: file.createdTime || '',
    modifiedTime: file.modifiedTime || '',
    webViewLink: file.webViewLink,
    appProperties: file.appProperties || {},
  }));
}

export async function downloadGoogleDriveBackupFile(
  accessToken: string,
  fileId: string,
  filename: string
): Promise<File> {
  const response = await fetch(
    `${DRIVE_FILES_API}/${encodeURIComponent(fileId)}?alt=media`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!response.ok) return parseDriveError(response);
  const blob = await response.blob();
  return new File([blob], filename || 'baanpakkru-backup.json', {
    type: 'application/json',
  });
}

export async function deleteGoogleDriveBackupFile(
  accessToken: string,
  fileId: string
): Promise<void> {
  const response = await fetch(
    `${DRIVE_FILES_API}/${encodeURIComponent(fileId)}`,
    {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!response.ok && response.status !== 204) {
    return parseDriveError(response);
  }
}
