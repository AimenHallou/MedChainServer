import { Context } from 'hono';
import { Patient } from '../models';

/**
 * @api {get} /patients Get All Patients
 * @apiGroup Patients
 * @access Public
 */
export const getPatients = async (c: Context) => {
    const patients = await Patient.find();

    return c.json({ patients });
};

/**
 * @api {post} /patients Create Patient
 * @apiGroup Patients
 * @access Public
 */
export const createPatient = async (c: Context) => {
    const { patient_id, owner, createdDate, content, sharedWith, history, accessRequests } = await c.req.json();

    const patient = await Patient.create({
        patient_id,
        owner,
        createdDate,
        content,
        sharedWith,
        history,
        accessRequests,
    });

    if (!patient) {
        c.status(400);
        throw new Error('Invalid patient data');
    }

    c.status(201);
    return c.json(patient);
};

/**
 * @api {get} /patients/:patient_id Get Patient By Patient ID
 * @apiGroup Patients
 * @access Public
 */
export const getPatientByPatientId = async (c: Context) => {
    const { patient_id } = c.req.param();

    const patient = await Patient.findOne({ patient_id });

    if (!patient) {
        c.status(404);
        throw new Error('Patient not found');
    }

    return c.json(patient);
};
