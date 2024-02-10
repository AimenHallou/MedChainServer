import { Hono } from 'hono';
import { patient } from '../controllers';
import { protect } from '../middlewares';

const patients = new Hono();

patients.get('/', (c) => patient.getPatients(c));

patients.get('/count', (c) => patient.getPatientsCount(c));

patients.get('/recent/:limit', (c) => patient.getRecentPatients(c));

patients.get('/:patient_id', (c) => patient.getPatientByPatientId(c));

patients.post('/', protect, (c) => patient.createPatient(c));

patients.post('/:patient_id/accept-request', protect, (c) => patient.acceptRequest(c));

patients.post('/:patient_id/add-files', protect, (c) => patient.addFiles(c));

patients.post('/:patient_id/remove-file', protect, (c) => patient.removeFile(c));

patients.post('/:patient_id/reject-request', protect, (c) => patient.rejectRequest(c));

patients.post('/:patient_id/edit-file', protect, (c) => patient.editFile(c));

patients.post('/:patient_id/request-access', protect, (c) => patient.requestAccess(c));

patients.post('/:patient_id/cancel-request', protect, (c) => patient.cancelRequest(c));

patients.post('/:patient_id/share-with', protect, (c) => patient.shareWith(c));

patients.post('/:patient_id/unshare-with', protect, (c) => patient.unshareWith(c));

patients.post('/:patient_id/transfer-ownership', protect, (c) => patient.transferOwnership(c));

export default patients;
