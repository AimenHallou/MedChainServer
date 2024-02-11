import { Hono } from 'hono';
import { patient } from '../controllers';
import { protect } from '../middlewares';

const patients = new Hono();

patients.get('/', protect, (c) => patient.getPatients(c));

patients.get('/count', protect, (c) => patient.getPatientsCount(c));

patients.get('/recent/:limit', protect, (c) => patient.getRecentPatients(c));

patients.get('/:patient_id', protect, (c) => patient.getPatientByPatientId(c));

patients.post('/', protect, (c) => patient.createPatient(c));

patients.post('/:patient_id/accept-request', protect, (c) => patient.acceptRequest(c));

patients.post('/:patient_id/add-files', protect, (c) => patient.addFiles(c));

patients.delete('/:patient_id/delete-files', protect, (c) => patient.deleteFiles(c));

patients.post('/:patient_id/share-files', protect, (c) => patient.shareFiles(c));

patients.post('/:patient_id/reject-request', protect, (c) => patient.rejectRequest(c));

patients.post('/:patient_id/request-access', protect, (c) => patient.requestAccess(c));

patients.post('/:patient_id/cancel-request', protect, (c) => patient.cancelRequest(c));

patients.post('/:patient_id/unshare-with', protect, (c) => patient.unshareWith(c));

patients.post('/:patient_id/transfer-ownership', protect, (c) => patient.transferOwnership(c));

export default patients;
