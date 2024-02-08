import { Context } from 'hono';
import { Patient } from '../models';
import { IUserDoc } from '../models/User';
import { EventType, IHistoryEvent } from '../models/Patient';
import { HTTPException } from 'hono/http-exception';

/**
 * @api {get} /patients Get Patients
 * @apiGroup Patients
 * @access Public
 */
export const getPatients = async (c: Context) => {
    const { limit = 15, page = 0 } = c.req.query();

    const patients = await Patient.find({}, null, { limit: limit as number, skip: (page as number) * (limit as number) });

    return c.json({ patients });
};

/**
 * @api {get} /patientsCount Get Patients Count
 * @apiGroup Patients
 * @access Public
 */
export const getPatientsCount = async (c: Context) => {
    const count = await Patient.countDocuments();

    return c.json({ count });
};

/**
 * @api {get} /patients/recent/:limit Get Recent Patients
 * @apiGroup Patients
 * @access Public
 */
export const getRecentPatients = async (c: Context) => {
    const { limit = 3 } = c.req.param();

    const patients = await Patient.find({}, null, { limit: limit as number, sort: { createdAt: -1 } });

    return c.json({ patients });
};

/**
 * @api {post} /patients Create Patient
 * @apiGroup Patients
 * @access Public
 */
export const createPatient = async (c: Context) => {
    const { patient_id, content, sharedWith, accessRequests } = await c.req.json();

    if (!patient_id) {
        c.status(400);
        throw new Error('Patient ID is required');
    }

    const patientExists = await Patient.findOne({ patient_id });

    if (patientExists) {
        throw new HTTPException(400, { message: 'Patient with id already exists' });
    }

    const user: IUserDoc = c.get('user');

    if (!user) {
        c.status(401);
        throw new Error('Not authorized');
    }

    if (!user.address) {
        c.status(400);
        throw new Error('No address found for user. Link your MetaMask to your account.');
    }

    const createdEvent: IHistoryEvent = {
        eventType: EventType.CREATED,
        timestamp: new Date(),
        by: user.address,
    };

    const history = [createdEvent];

    const patient = await Patient.create({
        patient_id,
        owner: user.address,
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
    return c.json({ patient });
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

    return c.json({ patient });
};

/**
 * @api {post} /patients/:patient_id/transfer-ownership Transfer Ownership
 * @apiGroup Patients
 * @access Private
 */
export const transferOwnership = async (c: Context) => {
    const { patient_id } = c.req.param();
    const { address } = await c.req.json();

    const patient = await Patient.findOne({ patient_id });

    if (!patient) {
        c.status(404);
        throw new Error('Patient not found');
    }

    const user: IUserDoc = c.get('user');

    if (!user) {
        c.status(401);
        throw new Error('Not authorized');
    }

    if (!user.address) {
        c.status(400);
        throw new Error('No address found for user. Link your MetaMask to your account.');
    }

    if (patient.owner === user.address) {
        c.status(400);
        throw new Error('You are the owner of this patient');
    }

    const transferredEvent: IHistoryEvent = {
        eventType: EventType.TRANSFERRED_OWNERSHIP,
        timestamp: new Date(),
        to: address,
    };

    const history = [transferredEvent, ...patient.history];

    const updatedPatient = await Patient.findOneAndUpdate({ patient_id }, { owner: address, history }, { new: true });

    return c.json({ patient: updatedPatient, message: 'Ownership transferred' });
};

/**
 * @api {post} /patients/:patient_id/request-access Request Access
 * @apiGroup Patients
 * @access Private
 */
export const requestAccess = async (c: Context) => {
    const { patient_id } = c.req.param();

    const patient = await Patient.findOne({ patient_id });

    if (!patient) {
        c.status(404);
        throw new Error('Patient not found');
    }

    const user: IUserDoc = c.get('user');

    if (!user) {
        c.status(401);
        throw new Error('Not authorized');
    }

    if (!user.address) {
        c.status(400);
        throw new Error('No address found for user. Link your MetaMask to your account.');
    }

    if (patient.owner === user.address) {
        c.status(400);
        throw new Error('You are the owner of this patient');
    }

    if (patient.sharedWith.has(user.address)) {
        c.status(400);
        throw new Error('You already have access to this patient');
    }

    const accessRequests = [...patient.accessRequests, user.address];

    const requestedEvent: IHistoryEvent = {
        eventType: EventType.REQUESTED_ACCESS,
        timestamp: new Date(),
        to: user.address,
    };

    const history = [requestedEvent, ...patient.history];

    const updatedPatient = await Patient.findOneAndUpdate({ patient_id }, { accessRequests, history }, { new: true });

    return c.json({ patient: updatedPatient, message: 'Access requested' });
};

/**
 * @api {post} /patients/:patient_id/cancel-request Cancel Request
 * @apiGroup Patients
 * @access Private
 */
export const cancelRequest = async (c: Context) => {
    const { patient_id } = c.req.param();

    const patient = await Patient.findOne({ patient_id });

    if (!patient) {
        c.status(404);
        throw new Error('Patient not found');
    }

    const user: IUserDoc = c.get('user');

    if (!user) {
        c.status(401);
        throw new Error('Not authorized');
    }

    if (!user.address) {
        c.status(400);
        throw new Error('No address found for user. Link your MetaMask to your account.');
    }

    if (!patient.accessRequests.includes(user.address)) {
        c.status(400);
        throw new Error('No access request found for this address');
    }

    const accessRequests = patient.accessRequests.filter((req) => req !== user.address);

    const cancelledEvent: IHistoryEvent = {
        eventType: EventType.CANCELLED_REQUEST,
        timestamp: new Date(),
        by: user.address,
    };

    const history = [cancelledEvent, ...patient.history];

    const updatedPatient = await Patient.findOneAndUpdate({ patient_id }, { accessRequests, history }, { new: true });

    return c.json({ patient: updatedPatient, message: 'Access request cancelled' });
};

/**
 * @api {post} /patients/:patient_id/accept-request Accept Request
 * @apiGroup Patients
 * @access Private
 */
export const acceptRequest = async (c: Context) => {
    const { patient_id } = c.req.param();
    const { address, files } = await c.req.json();

    if (!address) {
        c.status(400);
        throw new Error('Address is required');
    }

    if (!files || files.length === 0) {
        c.status(400);
        throw new Error('Files are required');
    }

    const patient = await Patient.findOne({ patient_id });

    if (!patient) {
        c.status(404);
        throw new Error('Patient not found');
    }

    const user: IUserDoc = c.get('user');

    if (!user) {
        c.status(401);
        throw new Error('Not authorized');
    }

    if (!user.address) {
        c.status(400);
        throw new Error('No address found for user. Link your MetaMask to your account.');
    }

    if (patient.owner !== user.address) {
        c.status(400);
        throw new Error('You are not the owner of this patient');
    }

    if (!patient.accessRequests.includes(address)) {
        c.status(400);
        throw new Error('No access request found for this address');
    }

    const accessRequests = patient.accessRequests.filter((req) => req !== address);

    const sharedWith = new Map(patient.sharedWith);

    const filesList = files.map((f: File) => f.name);

    sharedWith.set(address, filesList);

    const acceptedEvent: IHistoryEvent = {
        eventType: EventType.GRANTED_ACCESS,
        timestamp: new Date(),
        with: address,
    };

    const history = [acceptedEvent, ...patient.history];

    const updatedPatient = await Patient.findOneAndUpdate({ patient_id }, { sharedWith, accessRequests, history }, { new: true });

    return c.json({ patient: updatedPatient, message: 'Access request accepted' });
};

/**
 * @api {post} /patients/:patient_id/reject-request Reject Request
 * @apiGroup Patients
 * @access Private
 */
export const rejectRequest = async (c: Context) => {
    const { patient_id } = c.req.param();
    const { address } = await c.req.json();

    const patient = await Patient.findOne({ patient_id });

    if (!patient) {
        c.status(404);
        throw new Error('Patient not found');
    }

    const user: IUserDoc = c.get('user');

    if (!user) {
        c.status(401);
        throw new Error('Not authorized');
    }

    if (!user.address) {
        c.status(400);
        throw new Error('No address found for user. Link your MetaMask to your account.');
    }

    if (patient.owner !== user.address) {
        c.status(400);
        throw new Error('You are not the owner of this patient');
    }

    if (!patient.accessRequests.includes(address)) {
        c.status(400);
        throw new Error('No access request found for this address');
    }

    const accessRequests = patient.accessRequests.filter((req) => req !== address);

    const cancelledEvent: IHistoryEvent = {
        eventType: EventType.REJECTED_REQUEST,
        timestamp: new Date(),
        for: address,
    };

    const history = [cancelledEvent, ...patient.history];

    const updatedPatient = await Patient.findOneAndUpdate({ patient_id }, { accessRequests, history }, { new: true });

    return c.json({ patient: updatedPatient, message: 'Access request rejected' });
};

/**
 * @api {post} /patients/:patient_id/share-with Share With
 * @apiGroup Patients
 * @access Private
 */
export const shareWith = async (c: Context) => {
    const { patient_id } = c.req.param();
    const { address, files } = await c.req.parseBody();

    if (!address) {
        c.status(400);
        throw new Error('Address is required');
    }

    if (!files || files.length === 0) {
        c.status(400);
        throw new Error('Files are required');
    }

    const patient = await Patient.findOne({ patient_id });

    if (!patient) {
        c.status(404);
        throw new Error('Patient not found');
    }

    const user: IUserDoc = c.get('user');

    if (!user) {
        c.status(401);
        throw new Error('Not authorized');
    }

    if (!user.address) {
        c.status(400);
        throw new Error('No address found for user. Link your MetaMask to your account.');
    }

    if (patient.owner !== user.address) {
        c.status(400);
        throw new Error('You are not the owner of this patient');
    }

    if (patient.sharedWith.has(address as string)) {
        c.status(400);
        throw new Error('Patient already shared with this address');
    }

    const sharedWith = new Map(patient.sharedWith);

    const filesList = (files as File[]).map((f) => f.name);

    sharedWith.set(address as string, filesList);

    const sharedEvent: IHistoryEvent = {
        eventType: EventType.SHARED_WITH,
        timestamp: new Date(),
        with: address as string,
    };

    const history = [sharedEvent, ...patient.history];

    const updatedPatient = await Patient.findOneAndUpdate({ patient_id }, { sharedWith, history }, { new: true });

    return c.json({ patient: updatedPatient, message: 'Patient shared' });
};

/**
 * @api {post} /patients/:patient_id/unshare-with Unshare With
 * @apiGroup Patients
 * @access Private
 */
export const unshareWith = async (c: Context) => {
    const { patient_id } = c.req.param();
    const { address } = await c.req.json();

    if (!address) {
        c.status(400);
        throw new Error('Address is required');
    }

    const patient = await Patient.findOne({ patient_id });

    if (!patient) {
        c.status(404);
        throw new Error('Patient not found');
    }

    const user: IUserDoc = c.get('user');

    if (!user) {
        c.status(401);
        throw new Error('Not authorized');
    }

    if (!user.address) {
        c.status(400);
        throw new Error('No address found for user. Link your MetaMask to your account.');
    }

    if (patient.owner !== user.address) {
        c.status(400);
        throw new Error('You are not the owner of this patient');
    }

    if (!patient.sharedWith.has(address)) {
        c.status(400);
        throw new Error('Patient not shared with this address');
    }

    const sharedWith = new Map(patient.sharedWith);

    sharedWith.delete(address);

    const unsharedEvent: IHistoryEvent = {
        eventType: EventType.UN_SHARED_WITH,
        timestamp: new Date(),
        with: address,
    };

    const history = [unsharedEvent, ...patient.history];

    const updatedPatient = await Patient.findOneAndUpdate({ patient_id }, { sharedWith, history }, { new: true });

    return c.json({ patient: updatedPatient, message: 'Patient unshared' });
};

/**
 * @api {post} /patients/:patient_id/add-file Add File
 * @apiGroup Patients
 * @access Private
 */
export const addFile = async (c: Context) => {
    const { patient_id } = c.req.param();
    const { file } = await c.req.parseBody();

    const patient = await Patient.findOne({ patient_id });

    if (!patient) {
        c.status(404);
        throw new Error('Patient not found');
    }

    const user: IUserDoc = c.get('user');

    if (!user) {
        c.status(401);
        throw new Error('Not authorized');
    }

    if (!user.address) {
        c.status(400);
        throw new Error('No address found for user. Link your MetaMask to your account.');
    }

    if (!file || !(file as File).name || !(file as File).type || !(file as File).size) {
        c.status(400);
        throw new Error('File is required');
    }

    if (patient.owner !== user.address) {
        c.status(400);
        throw new Error('You are not the owner of this patient');
    }

    const content: File[] = [...patient.content];

    if (content.some((f) => (f as File).name === (file as File).name)) {
        c.status(400);
        throw new Error('File with this name already exists');
    }

    content.push(file as File);

    const addedEvent: IHistoryEvent = {
        eventType: EventType.FILE_ADDED,
        timestamp: new Date(),
        fileName: (file as File).name,
    };

    const history = [addedEvent, ...patient.history];

    const updatedPatient = await Patient.findOneAndUpdate({ patient_id }, { content, history }, { new: true });

    return c.json({ patient: updatedPatient, message: 'File added' });
};

/**
 * @api {post} /patients/:patient_id/remove-file Remove File
 * @apiGroup Patients
 * @access Private
 */
export const removeFile = async (c: Context) => {
    const { patient_id } = c.req.param();
    const { fileName } = await c.req.json();

    if (!fileName) {
        c.status(400);
        throw new Error('File name is required');
    }

    const patient = await Patient.findOne({ patient_id });

    if (!patient) {
        c.status(404);
        throw new Error('Patient not found');
    }

    const user: IUserDoc = c.get('user');

    if (!user) {
        c.status(401);
        throw new Error('Not authorized');
    }

    if (!user.address) {
        c.status(400);
        throw new Error('No address found for user. Link your MetaMask to your account.');
    }

    if (patient.owner !== user.address) {
        c.status(400);
        throw new Error('You are not the owner of this patient');
    }

    if (!patient.content.some((file) => (file as File).name === fileName)) {
        c.status(400);
        throw new Error('File not found on patient');
    }

    const content = patient.content.filter((file) => (file as File).name !== fileName);

    const removedEvent: IHistoryEvent = {
        eventType: EventType.FILE_REMOVED,
        timestamp: new Date(),
        fileName,
    };

    const history = [removedEvent, ...patient.history];

    const updatedPatient = await Patient.findOneAndUpdate({ patient_id }, { content, history }, { new: true });

    return c.json({ patient: updatedPatient, message: 'File removed' });
};

/**
 * @api {post} /patients/:patient_id/edit-file Edit File
 * @apiGroup Patients
 * @access Private
 */
export const editFile = async (c: Context) => {
    const { patient_id } = c.req.param();
    const { fileName, file } = await c.req.parseBody();

    if (!fileName) {
        c.status(400);
        throw new Error('File name is required');
    }

    if (!file || !(file as File).name || !(file as File).type || !(file as File).size) {
        c.status(400);
        throw new Error('File is required');
    }

    const patient = await Patient.findOne({ patient_id });

    if (!patient) {
        c.status(404);
        throw new Error('Patient not found');
    }

    const content = patient.content.map((f) => {
        if ((f as File).name === fileName) {
            return file as File;
        }

        return f;
    });

    const updatedEvent: IHistoryEvent = {
        eventType: EventType.FILE_UPDATED,
        timestamp: new Date(),
        fileName: (file as File).name,
    };

    const history = [updatedEvent, ...patient.history];

    const updatedPatient = await Patient.findOneAndUpdate({ patient_id }, { content, history }, { new: true });

    return c.json({ patient: updatedPatient, message: 'File updated' });
};
