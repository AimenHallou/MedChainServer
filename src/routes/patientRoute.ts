import { Hono } from 'hono';
import { patient } from '../controllers';

const patients = new Hono();

// Get All Users
patients.get('/', (c) => patient.getPatients(c));

// Get Patient By Patient ID
patients.get('/patient_id', (c) => patient.getPatientByPatientId(c));

patients.post('/', (c) => patient.createPatient(c));

export default patients;
