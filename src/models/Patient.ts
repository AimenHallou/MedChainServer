import mongoose, { Document, Schema, model } from 'mongoose';

// Define an enum for the possible values of a field in the history objects
export enum EventType {
    CREATED = 'created',
    UPDATED = 'updated',
    TRANSFERRED_OWNERSHIP = 'transferred_ownership',
    REQUESTED_ACCESS = 'requested_access',
    CANCELLED_REQUEST = 'cancelled_request',
    REJECTED_REQUEST = 'rejected_request',
    GRANTED_ACCESS = 'granted_access',
    REVOKED_ACCESS = 'revoked_access',
    CANCELLED_ACCESS_REQUEST = 'cancelled_access_request',
    SHARED_WITH = 'shared_with',
    UN_SHARED_WITH = 'unshared_with',
    FILE_ADDED = 'file_added',
    FILE_REMOVED = 'file_removed',
    FILE_UPDATED = 'file_updated',
}

export interface IHistoryEvent {
    eventType: EventType;
    timestamp: Date;
    by?: string;
    to?: string;
    for?: string;
    fileName?: string;
    with?: string;
}

const historyEventSchema = new Schema<IHistoryEvent>({
    eventType: {
        type: String,
        enum: Object.values(EventType), // Use the values of the enum as possible values
        required: true,
    },
    by: {
        type: String,
        required: false,
    },
    to: {
        type: String,
        required: false,
    },
    for: {
        type: String,
        required: false,
    },
    fileName: {
        type: String,
        required: false,
    },
    with: {
        type: String,
        required: false,
    },
    timestamp: {
        type: Date,
        default: Date.now,
    },
});

export interface IPatient {
    patient_id: string;
    owner: string;
    createdDate: Date;
    content: any[];
    sharedWith: Map<string, string[]>;
    history: IHistoryEvent[];
    accessRequests: string[];
}

export interface IPatientDoc extends IPatient, Document {}

const patientSchema = new Schema<IPatientDoc>(
    {
        patient_id: { type: String, required: true },
        owner: { type: String, required: true },
        content: [{ type: mongoose.Schema.Types.Mixed }],
        sharedWith: { type: Map, of: String },
        history: [historyEventSchema],
        accessRequests: [{ type: String }],
    },
    {
        timestamps: true,
    }
);

const Patient = model('Patient', patientSchema);
export default Patient;
