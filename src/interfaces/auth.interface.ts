import { Request } from "express";

export interface IUser {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    company_id?: string | null;
    onboarding_completed: boolean;
    stripe_account_id?: string | null;
    stripe_onboarded: boolean;
}

export interface AuthRequest extends Request {
    user?: IUser;
}
