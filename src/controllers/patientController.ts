import { Context } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { Patient } from '../models';
import { EventType, IFile, IFileDoc, IHistoryEvent } from '../models/Patient';
import User, { IUser, IUserDoc } from '../models/User';

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
 * @api {get} /patients/my-patients Get My Patients
 * @apiGroup Patients
 * @access Private
 */
export const getMyPatients = async (c: Context) => {
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

    const user: IUserDoc = c.get('user');

    if (!user) {
        throw new HTTPException(401, { message: 'Not authorized' });
    }

    const totalCount = await Patient.countDocuments({ owner_id: user._id, ...searchQuery });
    const patients = await Patient.find({ owner_id: user._id, ...searchQuery }, null, {
        limit: limit as number,
        skip: (page as number) * (limit as number),
    }).sort(sort);

    const hasMore = ((page as number) + 1) * (limit as number) < totalCount;

    return c.json({ patients, hasMore, totalCount });
};

/**
 * @api {get} /patients/shared-with-me Get Shared With Me
 * @apiGroup Patients
 * @access Private
 */
export const getSharedWithMe = async (c: Context) => {
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

    const user: IUserDoc = c.get('user');

    if (!user) {
        throw new HTTPException(401, { message: 'Not authorized' });
    }

    const totalCount = await Patient.countDocuments({ sharedWith: { $elemMatch: { $eq: user._id } }, ...searchQuery });
    const patients = await Patient.find({ sharedWith: { $elemMatch: { $eq: user._id } }, ...searchQuery }, null, {
        limit: limit as number,
        skip: (page as number) * (limit as number),
    }).sort(sort);

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

    const createdEvent: IHistoryEvent = {
        eventType: EventType.CREATED,
        timestamp: new Date(),
        by: user._id,
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

    if (user._id.toString() === owner?._id.toString()) {
        const sharedList: { user: IUserDoc; files: IFileDoc[] }[] = [];

        const arrFromSharedWith = Array.from(patient.sharedWith, ([key, value]) => ({ key, value }));

        await Promise.all(
            arrFromSharedWith.map(async (i) => {
                const { key, value } = i;
                const user = await User.findById(key);
                const files: IFileDoc[] = [];

                patient.content.forEach((f) => {
                    if (value.includes(f._id?.toString() || '')) {
                        files.push(f);
                    }
                });

                if (user && files && user._id.toString() !== patient.owner_id) {
                    sharedList.push({ user, files });
                }
            })
        );

        const accessRequests: IUserDoc[] = [];

        await Promise.all(
            patient.accessRequests.map(async (id) => {
                const user = await User.findById(id);

                if (user && user._id.toString() !== patient.owner_id) {
                    accessRequests.push(user);
                }
            })
        );

        return c.json({ patient, owner, sharedList, accessRequests });
    }

    const sharedWith = new Map(patient.sharedWith);

    if (sharedWith.has(user._id.toString())) {
        const files = sharedWith.get(user._id.toString());

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
    const { username, password } = await c.req.json();
    if (!username) {
        throw new HTTPException(400, { message: 'Username of recipient is required' });
    }

    if (!password) {
        throw new HTTPException(400, { message: 'Password is required' });
    }

    const patient = await Patient.findOne({ patient_id });

    if (!patient) {
        throw new HTTPException(404, { message: 'Patient not found' });
    }

    const recipient = await User.findOne({ username });

    if (!recipient) {
        throw new HTTPException(404, { message: 'Recipient not found' });
    }

    let user = c.get('user');

    user = await User.findById(user._id);

    if (!user) {
        throw new HTTPException(401, { message: 'Not authorized' });
    }

    if (!(await user.mathPassword(password.toString()))) {
        throw new HTTPException(400, { message: 'Invalid credentials' });
    }

    if (user._id.toString() === recipient._id.toString()) {
        throw new HTTPException(400, { message: 'You cannot transfer ownership to yourself' });
    }

    if (patient.owner_id !== user._id.toString()) {
        throw new HTTPException(400, { message: 'You are not the owner of this patient' });
    }

    const transferredEvent: IHistoryEvent = {
        eventType: EventType.TRANSFERRED_OWNERSHIP,
        timestamp: new Date(),
        to: recipient._id.toString(),
    };

    const history = [transferredEvent, ...patient.history];

    const updatedPatient = await Patient.findOneAndUpdate({ patient_id }, { owner_id: recipient._id.toString(), history }, { new: true });

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
        throw new HTTPException(404, { message: 'Patient not found' });
    }

    const user: IUserDoc = c.get('user');

    if (!user) {
        throw new HTTPException(401, { message: 'Not authorized' });
    }

    if (patient.owner_id === user._id.toString()) {
        throw new HTTPException(400, { message: 'You are the owner of this patient' });
    }

    if (patient.sharedWith.has(user._id.toString())) {
        throw new HTTPException(400, { message: 'Patient already shared with this address' });
    }

    if (patient.accessRequests.includes(user._id.toString())) {
        throw new HTTPException(400, { message: 'Access request already sent' });
    }

    const accessRequests = [...patient.accessRequests, user._id.toString()];

    const requestedEvent: IHistoryEvent = {
        eventType: EventType.REQUESTED_ACCESS,
        timestamp: new Date(),
        by: user._id.toString(),
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
        throw new HTTPException(404, { message: 'Patient not found' });
    }

    const user: IUserDoc = c.get('user');

    if (!user) {
        throw new HTTPException(401, { message: 'Not authorized' });
    }

    if (!patient.accessRequests.includes(user._id.toString())) {
        throw new HTTPException(400, { message: 'No access request found for this id' });
    }

    const accessRequests = patient.accessRequests.filter((req) => req !== user._id.toString());

    const cancelledEvent: IHistoryEvent = {
        eventType: EventType.CANCELLED_REQUEST,
        timestamp: new Date(),
        by: user._id.toString(),
    };

    const history = [cancelledEvent, ...patient.history];

    const updatedPatient = await Patient.findOneAndUpdate({ patient_id }, { accessRequests, history }, { new: true });

    return c.json({ patient: updatedPatient, message: 'Access request cancelled' });
};

/**
 * @api {post} /patients/:patient_id/reject-request Reject Request
 * @apiGroup Patients
 * @access Private
 */
export const rejectRequest = async (c: Context) => {
    const { patient_id } = c.req.param();
    const { id } = await c.req.json();

    const patient = await Patient.findOne({ patient_id });

    if (!patient) {
        throw new HTTPException(404, { message: 'Patient not found' });
    }

    const user: IUserDoc = c.get('user');

    if (!user) {
        throw new HTTPException(401, { message: 'Not authorized' });
    }

    if (patient.owner_id !== user._id.toString()) {
        throw new HTTPException(400, { message: 'You are not the owner of this patient' });
    }

    if (!patient.accessRequests.includes(id)) {
        throw new HTTPException(400, { message: 'No access request found for this id' });
    }

    const accessRequests = patient.accessRequests.filter((req) => req !== id);

    const cancelledEvent: IHistoryEvent = {
        eventType: EventType.REJECTED_REQUEST,
        timestamp: new Date(),
        for: id,
    };

    const history = [cancelledEvent, ...patient.history];

    const updatedPatient = await Patient.findOneAndUpdate({ patient_id }, { accessRequests, history }, { new: true });

    return c.json({ patient: updatedPatient, message: 'Access request rejected' });
};

/**
 * @api {post} /patients/:patient_id/add-file Add File
 * @apiGroup Patients
 * @access Private
 */
export const addFiles = async (c: Context) => {
    const { patient_id } = c.req.param();
    const { files } = await c.req.json();

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

    if (patient.owner_id !== user._id.toString()) {
        throw new HTTPException(400, { message: 'You are not the owner of this patient' });
    }

    const history = [...patient.history];

    const mappedFiles = (files as IFile[]).map((f) => {
        const event: IHistoryEvent = {
            eventType: EventType.FILE_ADDED,
            timestamp: new Date(),
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
 * @api {post} /patients/:patient_id/edit-file Edit File
 * @apiGroup Patients
 * @access Private
 */
export const editFile = async (c: Context) => {
    const { patient_id } = c.req.param();
    const { fileId, name, dataType } = await c.req.json();

    if (!fileId) {
        throw new HTTPException(400, { message: 'File ID is required' });
    }

    if (!name) {
        throw new HTTPException(400, { message: 'Name is required' });
    }

    const patient = await Patient.findOne({ patient_id });

    if (!patient) {
        throw new HTTPException(404, { message: 'Patient not found' });
    }

    const user: IUserDoc = c.get('user');

    if (!user) {
        throw new HTTPException(401, { message: 'Not authorized' });
    }

    if (patient.owner_id !== user._id.toString()) {
        throw new HTTPException(400, { message: 'You are not the owner of this patient' });
    }

    const history = [...patient.history];

    const event: IHistoryEvent = {
        eventType: EventType.FILE_UPDATED,
        timestamp: new Date(),
    };

    history.unshift(event);

    const content = patient.content.map((f) => {
        if (f._id?.toString() === fileId) {
            f.name = name;
            f.dataType = dataType;
            return f;
        }

        return f;
    });

    const updatedPatient = await Patient.findOneAndUpdate({ patient_id }, { content, history }, { new: true });

    return c.json({ patient: updatedPatient, message: 'File edited' });
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

    if (patient.owner_id !== user._id.toString()) {
        c.status(400);
        throw new Error('You are not the owner of this patient');
    }

    const history = [...patient.history];

    fileIds.forEach((id: string) => {
        const event: IHistoryEvent = {
            eventType: EventType.FILE_REMOVED,
            timestamp: new Date(),
        };

        history.unshift(event);
    });

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
    const { username, fileIds } = await c.req.json();

    if (!username) {
        throw new HTTPException(400, { message: 'Username is required' });
    }

    if (!fileIds || fileIds.length === 0) {
        throw new HTTPException(400, { message: 'File IDs are required' });
    }

    const recipient = await User.findOne({ username });

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

    if (user._id.toString() === recipient._id.toString()) {
        throw new HTTPException(400, { message: 'You cannot share with yourself' });
    }

    if (patient.owner_id !== user._id.toString()) {
        throw new HTTPException(400, { message: 'You are not the owner of this patient' });
    }

    const sharedWith = new Map(patient.sharedWith);

    const sharedWithfiles = new Set(sharedWith.get(recipient._id.toString()) || []);

    fileIds.forEach((id: string) => {
        sharedWithfiles.add(id);
    });

    const history = [...patient.history];

    if (sharedWithfiles.size > (sharedWith.get(recipient._id.toString())?.length || 0)) {
        const sharedEvent: IHistoryEvent = {
            eventType: EventType.SHARED_WITH,
            timestamp: new Date(),
            with: recipient._id.toString(),
        };

        history.unshift(sharedEvent);
    }

    sharedWith.set(recipient._id.toString(), Array.from(sharedWithfiles));

    const accessRequests = patient.accessRequests.filter((req) => req !== recipient._id.toString());

    const updatedPatient = await Patient.findOneAndUpdate({ patient_id }, { sharedWith, history, accessRequests }, { new: true });

    return c.json({ patient: updatedPatient, message: 'Patient shared' });
};

export const manageAccess = async (c: Context) => {
    const { patient_id } = c.req.param();
    const { username, fileIds = [] } = await c.req.json();

    if (!username) {
        throw new HTTPException(400, { message: 'Username is required' });
    }

    if (!fileIds) {
        throw new HTTPException(400, { message: 'File IDs are required' });
    }

    const recipient = await User.findOne({ username });

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

    if (user._id.toString() === recipient._id.toString()) {
        throw new HTTPException(400, { message: 'You cannot share with yourself' });
    }

    if (patient.owner_id !== user._id.toString()) {
        throw new HTTPException(400, { message: 'You are not the owner of this patient' });
    }

    const sharedWith = new Map(patient.sharedWith);

    const sharedWithfiles = new Set(fileIds as string[]);

    const history = [...patient.history];

    if (sharedWithfiles.size > (sharedWith.get(recipient._id.toString())?.length || 0)) {
        const sharedEvent: IHistoryEvent = {
            eventType: EventType.SHARED_WITH,
            timestamp: new Date(),
            with: recipient._id.toString(),
        };

        history.unshift(sharedEvent);
    }

    sharedWith.set(recipient._id.toString(), Array.from(sharedWithfiles));

    if (sharedWithfiles.size === 0) {
        const revokedEvent: IHistoryEvent = {
            eventType: EventType.REVOKED_ACCESS,
            timestamp: new Date(),
            with: recipient._id.toString(),
        };

        history.unshift(revokedEvent);

        sharedWith.delete(recipient._id.toString());
    }

    const accessRequests = patient.accessRequests.filter((req) => req !== recipient._id.toString());

    const updatedPatient = await Patient.findOneAndUpdate({ patient_id }, { sharedWith, history, accessRequests }, { new: true });

    return c.json({ patient: updatedPatient, message: 'Patient shared' });
};
