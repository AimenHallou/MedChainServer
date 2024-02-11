import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { Patient } from '../models';
import { EventType, IFile, IHistoryEvent } from '../models/Patient';
import User, { IUserDoc } from '../models/User';

/**
 * @api {get} /patients Get Patients
 * @apiGroup Patients
 * @access Public
 */
export const getPatients = async (c: Context) => {
    const { limit = 15, page = 0, filter, sortBy = 'createdAt', sortOrder = -1 } = c.req.query();

    let searchQuery = {};

    if (filter) {
        searchQuery = {
            $or: [{ patient_id: { $regex: filter, $options: 'i' } }, { owner: { $regex: filter, $options: 'i' } }],
        };
    }

    let sort = {};

    if (sortBy === 'createdAt') {
        sort = { createdAt: Number(sortOrder) };
    } else if (sortBy === 'patient_id') {
        sort = { patient_id: Number(sortOrder) };
    }

    const totalCount = await Patient.countDocuments(searchQuery);
    const patients = await Patient.find(searchQuery, null, { limit: limit as number, skip: (page as number) * (limit as number) }).sort(sort);

    const hasMore = ((page as number) + 1) * (limit as number) < totalCount;

    return c.json({ patients, hasMore, totalCount });
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
        throw new HTTPException(400, { message: 'Patient id is required' });
    }

    const patientExists = await Patient.findOne({ patient_id });

    if (patientExists) {
        throw new HTTPException(400, { message: 'Patient with id already exists' });
    }

    const user: IUserDoc = c.get('user');

    if (!user) {
        throw new HTTPException(401, { message: 'Not authorized' });
    }

    if (!user.address) {
        throw new HTTPException(400, { message: 'No address found for user. Link your MetaMask to your account.' });
    }

    const createdEvent: IHistoryEvent = {
        eventType: EventType.CREATED,
        timestamp: new Date(),
        by: user.address,
    };

    const history = [createdEvent];

    const patient = await Patient.create({
        patient_id,
        owner_id: user._id,
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
        throw new HTTPException(404, { message: 'Patient not found' });
    }

    const owner = await User.findById(patient.owner_id);

    const user: IUserDoc = c.get('user');

    if (!user) {
        patient.content = [];
        return c.json({ patient, owner });
    }

    if (user.address === owner?.address) {
        return c.json({ patient, owner });
    }

    const sharedWith = new Map(patient.sharedWith);

    if (sharedWith.has(user.address)) {
        const files = sharedWith.get(user.address);

        patient.content = patient.content.filter((f) => files?.includes(f._id || ''));

        return c.json({ patient, owner });
    }

    patient.content = [];

    return c.json({ patient, owner });
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

    if (patient.owner_id === user._id.toString()) {
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

    if (patient.owner_id === user._id.toString()) {
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

    if (patient.owner_id !== user._id.toString()) {
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

    if (patient.owner_id !== user._id.toString()) {
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

    if (patient.owner_id !== user._id.toString()) {
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
export const addFiles = async (c: Context) => {
    const { patient_id } = c.req.param();
    const { files } = await c.req.json();

    console.log(files);

    if (!files || files.length === 0) {
        throw new HTTPException(400, { message: 'Files are required' });
    }

    const patient = await Patient.findOne({ patient_id });

    if (!patient) {
        throw new HTTPException(404, { message: 'Patient not found' });
    }

    const user: IUserDoc = c.get('user');

    if (!user) {
        throw new HTTPException(401, { message: 'Not authorized' });
    }

    if (!user.address) {
        throw new HTTPException(400, { message: 'No address found for user. Link your MetaMask to your account.' });
    }

    if (patient.owner_id !== user._id.toString()) {
        throw new HTTPException(400, { message: 'You are not the owner of this patient' });
    }

    const history = [...patient.history];

    const mappedFiles = (files as IFile[]).map((f) => {
        const event: IHistoryEvent = {
            eventType: EventType.FILE_ADDED,
            timestamp: new Date(),
            fileName: f.name,
        };

        history.unshift(event);

        return {
            base64: f.base64!,
            name: f.name,
            dataType: f.dataType,
        };
    });

    const content: IFile[] = [...patient.content, ...mappedFiles];

    const updatedPatient = await Patient.findOneAndUpdate({ patient_id }, { content, history }, { new: true });

    return c.json({ patient: updatedPatient, message: 'File added' });
};

/**
 * @api {delete} /patients/:patient_id/delete-files Delete Files
 * @apiGroup Patients
 * @access Private
 */
export const deleteFiles = async (c: Context) => {
    const { patient_id } = c.req.param();
    const { fileIds } = await c.req.json();

    if (!fileIds || fileIds.length === 0) {
        c.status(400);
        throw new Error('File IDs are required');
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

    if (patient.owner_id !== user._id.toString()) {
        c.status(400);
        throw new Error('You are not the owner of this patient');
    }

    const content = patient.content.filter((f) => {
        return !fileIds.includes(f._id?.toString());
    });

    const updatedPatient = await Patient.findOneAndUpdate({ patient_id }, { content }, { new: true });

    return c.json({ patient: updatedPatient, message: 'Files removed' });
};

/**
 * @api {post} /patients/:patient_id/share-files Share With
 * @apiGroup Patients
 * @access Private
 */
export const shareFiles = async (c: Context) => {
    const { patient_id } = c.req.param();
    const { address, fileIds } = await c.req.json();

    if (!address) {
        throw new HTTPException(400, { message: 'Address is required' });
    }

    if (!fileIds || fileIds.length === 0) {
        throw new HTTPException(400, { message: 'File IDs are required' });
    }

    const recipient = await User.findOne({ address });

    if (!recipient) {
        throw new HTTPException(404, { message: 'Recipient not found' });
    }

    const patient = await Patient.findOne({ patient_id });

    if (!patient) {
        throw new HTTPException(404, { message: 'Patient not found' });
    }

    const user: IUserDoc = c.get('user');

    if (!user) {
        throw new HTTPException(401, { message: 'Not authorized' });
    }

    if (!user.address) {
        throw new HTTPException(400, { message: 'No address found for user. Link your MetaMask to your account.' });
    }

    if (user.address === address) {
        throw new HTTPException(400, { message: 'You cannot share with yourself' });
    }

    if (patient.owner_id !== user._id.toString()) {
        throw new HTTPException(400, { message: 'You are not the owner of this patient' });
    }

    const sharedWith = new Map(patient.sharedWith);

    const sharedWithfiles = new Set(sharedWith.get(address as string) || []);

    fileIds.forEach((id: string) => {
        sharedWithfiles.add(id);
    });

    const history = [...patient.history];

    if (sharedWithfiles.size > (sharedWith.get(address as string)?.length || 0)) {
        const sharedEvent: IHistoryEvent = {
            eventType: EventType.SHARED_WITH,
            timestamp: new Date(),
            with: address as string,
        };

        history.unshift(sharedEvent);
    }

    sharedWith.set(address as string, Array.from(sharedWithfiles));

    const updatedPatient = await Patient.findOneAndUpdate({ patient_id }, { sharedWith, history }, { new: true });

    console.log(updatedPatient?.sharedWith);
    return c.json({ patient: updatedPatient, message: 'Patient shared' });
};
