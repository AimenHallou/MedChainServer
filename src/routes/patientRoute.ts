import { Hono } from 'hono';
import { patient } from '../controllers';
import { protect } from '../middlewares';

const patients = new Hono();

patients.get('/', protect, (c) => patient.getPatients(c));

patients.get('/my-patients', protect, (c) => patient.getMyPatients(c));

patients.get('/shared-with-me', protect, (c) => patient.getSharedWithMe(c));

patients.get('/count', (c) => patient.getPatientsCount(c));

patients.get('/recent/:limit', protect, (c) => patient.getRecentPatients(c));

patients.get('/:patient_id', protect, (c) => patient.getPatientByPatientId(c));

patients.post('/', protect, (c) => patient.createPatient(c));

patients.post('/:patient_id/add-files', protect, (c) => patient.addFiles(c));

patients.post('/:patient_id/edit-file', protect, (c) => patient.editFile(c));

patients.delete('/:patient_id/delete-files', protect, (c) => patient.deleteFiles(c));

patients.post('/:patient_id/share-files', protect, (c) => patient.shareFiles(c));

patients.post('/:patient_id/request-access', protect, (c) => patient.requestAccess(c));

patients.post('/:patient_id/manage-access', protect, (c) => patient.manageAccess(c));

patients.post('/:patient_id/cancel-access-request', protect, (c) => patient.cancelRequest(c));

patients.post('/:patient_id/reject-access-request', protect, (c) => patient.rejectRequest(c));

patients.post('/:patient_id/transfer-ownership', protect, (c) => patient.transferOwnership(c));

export default patients;
