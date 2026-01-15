import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../db/db';

describe('RelayPACSDB', () => {
  // Before each test, clear the database
  beforeEach(async () => {
    await db.delete();
    await db.open();
  });

  it('should create a new study', async () => {
    const studyId = await db.studies.add({
      status: 'queued',
      metadata: {
        patientName: 'John Doe',
        studyDate: '2023-01-01',
        modality: 'CT',
        age: '45',
        gender: 'M',
        serviceLevel: 'routine',
        studyDescription: 'Head CT',
      },
      totalFiles: 1,
      totalSize: 1024,
      createdAt: new Date(),
    });

    const study = await db.studies.get(studyId);
    expect(study).toBeDefined();
    expect(study?.metadata.patientName).toBe('John Doe');
    expect(study?.status).toBe('queued');
  });

  it('should add files to a study', async () => {
    const studyId = await db.studies.add({
      status: 'queued',
      metadata: {
        patientName: 'Jane Doe',
        studyDate: '2023-01-02',
        modality: 'MR',
      },
      totalFiles: 2,
      totalSize: 2048,
      createdAt: new Date(),
    });

    const fileId = await db.files.add({
      studyId,
      fileName: 'image1.dcm',
      fileType: 'application/dicom',
      size: 1024,
      blob: new Blob(['dummy data']),
      uploadedChunks: [],
    });

    const file = await db.files.get(fileId);
    expect(file).toBeDefined();
    expect(file?.fileName).toBe('image1.dcm');
    expect(file?.studyId).toBe(studyId);

    const filesByUser = await db.files.where('studyId').equals(studyId).toArray();
    expect(filesByUser).toHaveLength(1);
    expect(filesByUser[0].fileName).toBe('image1.dcm');
  });

  it('should manage chunk records', async () => {
    // Create a dummy file record dependency
    const studyId = await db.studies.add({
      status: 'queued',
      metadata: { patientName: 'A', studyDate: 'B', modality: 'C' },
      totalFiles: 1,
      totalSize: 100,
      createdAt: new Date(),
    });
    const fileId = await db.files.add({
      studyId,
      fileName: 'f.dcm',
      fileType: 'dcm',
      size: 100,
      blob: new Blob([]),
      uploadedChunks: [],
    });

    await db.chunks.add({ fileId, index: 0, uploaded: true });
    await db.chunks.add({ fileId, index: 1, uploaded: false });

    const chunks = await db.chunks.where('fileId').equals(fileId).toArray();
    expect(chunks).toHaveLength(2);

    const uploadedChunk = await db.chunks.where({ fileId: fileId, index: 0 }).first();
    expect(uploadedChunk?.uploaded).toBe(true);
  });
});
