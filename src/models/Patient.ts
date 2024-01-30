import mongoose, { Document, Schema, model } from 'mongoose';

interface IPatient {
    patient_id: string;
    owner: string;
    createdDate: Date;
    content: any[];
    sharedWith: Map<string, string>;
    history: any[];
    accessRequests: string[];
}

interface IPatientDoc extends IPatient, Document {}

const patientSchema = new Schema<IPatientDoc>(
    {   
        patient_id: { type: String, required: true },
        owner: { type: String, required: true },
        content: [{ type: mongoose.Schema.Types.Mixed }],
        sharedWith: { type: Map, of: String },
        history: [{ type: mongoose.Schema.Types.Mixed }],
        accessRequests: [{ type: String }],
    },
    {
        timestamps: true,
    }
);

const Patient = model('Patient', patientSchema);
export default Patient;
